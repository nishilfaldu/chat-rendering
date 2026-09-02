import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { WIDTH_BUCKETS, type WidthBucket } from "./types.ts";
import {
  expectedHeightCount,
  heightMeasurementCount,
  measurementsAreWarm,
  replaceHeights,
  sqlitePath,
} from "./db.ts";

const CHAT_URL = process.env.CHAT_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

async function chatIsUp(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok || response.status === 307 || response.status === 308;
  } catch {
    return false;
  }
}

async function waitForChat(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await chatIsUp(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`chat app did not start at ${url}`);
}

async function startChat(): Promise<ChildProcess> {
  const child = spawn("pnpm", ["--filter", "chat", "dev"], {
    stdio: "inherit",
    cwd: path.dirname(path.dirname(sqlitePath())),
    env: { ...process.env },
  });
  await waitForChat(CHAT_URL, 60_000);
  return child;
}

export async function measureHeights(options?: { force?: boolean }): Promise<{ count: number }> {
  if (!options?.force && measurementsAreWarm()) {
    return { count: heightMeasurementCount() };
  }

  let child: ChildProcess | undefined;
  if (!(await chatIsUp(CHAT_URL))) {
    child = await startChat();
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const rows: Array<{ messageId: string; widthBucket: WidthBucket; px: number }> = [];
    for (const bucket of WIDTH_BUCKETS) {
      const page = await browser.newPage();
      page.setDefaultTimeout(180_000);
      await page.setViewport({ width: Math.max(bucket + 80, 500), height: 900 });
      await page.goto(`${CHAT_URL}/internal/measure?w=${bucket}`, {
        waitUntil: "domcontentloaded",
        timeout: 180_000,
      });
      await page.waitForFunction(
        () => document.querySelectorAll("[data-message-id]").length >= 10000,
        { timeout: 180_000 },
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const measured = await page.evaluate((widthBucket: number) => {
        return [...document.querySelectorAll("[data-message-id]")].map((node) => ({
          messageId: node.getAttribute("data-message-id") ?? "",
          widthBucket,
          px: (node as HTMLElement).offsetHeight,
        }));
      }, bucket);
      rows.push(
        ...measured
          .filter((row) => row.messageId.length > 0 && row.px > 0)
          .map((row) => ({
            messageId: row.messageId,
            widthBucket: row.widthBucket as WidthBucket,
            px: row.px,
          })),
      );
      console.log(`measured bucket ${bucket}: ${measured.length} rows`);
      await page.close();
    }
    replaceHeights(rows);
  } finally {
    await browser.close();
    if (child?.pid) {
      try {
        process.kill(child.pid);
      } catch {
        // already exited
      }
    }
  }

  const count = heightMeasurementCount();
  if (count < expectedHeightCount()) {
    throw new Error(`expected ${expectedHeightCount()} height rows, got ${count}`);
  }
  return { count };
}
