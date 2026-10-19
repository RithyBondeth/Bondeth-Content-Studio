import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  CAPTION_LINGER_SECONDS,
  captionWordsPerPage,
  toCaptionPages,
} from "../lib/captions";
import { withAlpha } from "../lib/color";
import { useLayout } from "../lib/use-layout";
import type { WordTiming } from "../spec/schema";
import { useTheme } from "../theme/context";

type CaptionsProps = {
  /** Word timings relative to the start of the scene. */
  words: WordTiming[];
};

/** Short-form style captions: a few words at a time, current word highlighted. */
export const Captions: React.FC<CaptionsProps> = ({ words }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, isVertical, captionZone, paddingX } = useLayout();
  const time = frame / fps;

  const pages = toCaptionPages(words, captionWordsPerPage(isVertical));
  const pageIndex = pages.findIndex((page, index) => {
    const next = pages[index + 1];
    const end = next ? next.start : page.end + CAPTION_LINGER_SECONDS;
    return time >= page.start && time < end;
  });
  const page = pages[pageIndex];
  if (!page) {
    return null;
  }

  const enter = spring({
    frame: frame - Math.round(page.start * fps),
    fps,
    config: { damping: 14, mass: 0.6 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        top: "auto",
        height: captionZone,
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingBottom: (isVertical ? 140 : 40) * unit,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: `${6 * unit}px ${4 * unit}px`,
          fontFamily: theme.fonts.sans,
          fontWeight: 800,
          fontSize: (isVertical ? 76 : 54) * unit,
          lineHeight: 1.15,
          textAlign: "center",
          transform: `scale(${0.85 + enter * 0.15})`,
          opacity: Math.min(1, enter * 1.5),
        }}
      >
        {page.words.map((word, index) => {
          const isActive = time >= word.start && time < word.end;
          const isSpoken = time >= word.start;
          return (
            <span
              key={index}
              style={{
                padding: `${2 * unit}px ${14 * unit}px`,
                borderRadius: theme.radius.sm * unit,
                backgroundColor: isActive ? theme.colors.accent : "transparent",
                color: isActive
                  ? theme.colors.captionActiveText
                  : isSpoken
                    ? theme.colors.text
                    : theme.colors.textMuted,
                textShadow: isActive
                  ? "none"
                  : `0 ${4 * unit}px ${18 * unit}px ${theme.isDark ? "rgba(0, 0, 0, 0.8)" : withAlpha(theme.colors.background, 0.9)}`,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
