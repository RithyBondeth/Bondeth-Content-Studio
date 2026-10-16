export const FORMATS = {
  vertical: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
} as const;

export type VideoFormat = keyof typeof FORMATS;

export const FORMAT_NAMES = Object.keys(FORMATS) as VideoFormat[];
