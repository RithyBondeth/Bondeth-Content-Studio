import { useVideoConfig } from "remotion";

/** Sizes that adapt to landscape (16:9) and vertical (9:16) videos. */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const isVertical = height > width;
  // 1 at 1080p, so pixel values below read naturally at Full HD.
  const unit = Math.min(width, height) / 1080;

  return {
    width,
    height,
    isVertical,
    unit,
    paddingX: (isVertical ? 64 : 120) * unit,
    paddingY: (isVertical ? 140 : 72) * unit,
  };
};
