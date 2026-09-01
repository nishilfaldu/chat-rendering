import type { HeightClass, SeedMessage, WidthBucket } from "./types.ts";

const CLASS_PX: Record<HeightClass, Record<WidthBucket, number>> = {
  xs: { 400: 64, 800: 56, 1440: 52 },
  sm: { 400: 108, 800: 88, 1440: 80 },
  md: { 400: 196, 800: 152, 1440: 136 },
  lg: { 400: 340, 800: 268, 1440: 228 },
  xl: { 400: 560, 800: 440, 1440: 372 },
};

export function predictHeightClass(input: {
  text: string;
  kind: SeedMessage["kind"];
  imageWidth?: number;
  imageHeight?: number;
}): HeightClass {
  if (input.kind === "image") {
    const w = input.imageWidth ?? 800;
    const h = input.imageHeight ?? 450;
    return h / w > 0.9 ? "xl" : "lg";
  }
  const fences = (input.text.match(/```/g) ?? []).length;
  const chars = input.text.length;
  if (fences >= 2 || input.kind === "code") {
    const lines = input.text.split("\n").length;
    return lines > 24 ? "xl" : "lg";
  }
  if (chars < 72) return "xs";
  if (chars < 220) return "sm";
  if (chars < 700) return "md";
  if (chars < 1600) return "lg";
  return "xl";
}

export function estimatePx(heightClass: HeightClass, bucket: WidthBucket): number {
  return CLASS_PX[heightClass][bucket];
}

export function widthBucket(px: number): WidthBucket {
  if (px < 600) return 400;
  if (px < 1120) return 800;
  return 1440;
}
