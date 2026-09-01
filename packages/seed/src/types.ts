export const SESSION_ID = "session-bench-001";
export const SEED = 20260315;
export const MESSAGE_COUNT = 10_000;
export const RENDERER_VERSION = "v1";
export const WIDTH_BUCKETS = [400, 800, 1440] as const;

export type WidthBucket = (typeof WIDTH_BUCKETS)[number];
export type Role = "user" | "assistant";
export type MessageKind = "short" | "paragraph" | "code" | "image";
export type HeightClass = "xs" | "sm" | "md" | "lg" | "xl";

export type SeedMessage = {
  id: string;
  sessionId: string;
  role: Role;
  timestamp: number;
  kind: MessageKind;
  text: string;
  codeLang?: string;
  imageWidth?: number;
  imageHeight?: number;
  heightClass: HeightClass;
  sortIndex: number;
};

export type MessageIndexRow = {
  id: string;
  timestamp: number;
  heightClass: HeightClass;
  measuredPx: number | null;
};

export type HeightMeasurement = {
  messageId: string;
  widthBucket: WidthBucket;
  px: number;
};
