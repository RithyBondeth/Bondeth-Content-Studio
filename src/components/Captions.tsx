import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { toCaptionPages } from "../lib/captions";
import { useLayout } from "../lib/use-layout";
import type { WordTiming } from "../spec/schema";
import { theme } from "../theme/tokens";

type CaptionsProps = {
  /** Word timings relative to the start of the scene. */
  words: WordTiming[];
};

/** How long a page stays up after its last word, if nothing replaces it. */
const LINGER_SECONDS = 0.5;

/** Short-form style captions: a few words at a time, current word highlighted. */
export const Captions: React.FC<CaptionsProps> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, isVertical, captionZone, paddingX } = useLayout();
  const time = frame / fps;

  const pages = toCaptionPages(words, isVertical ? 3 : 6);
  const pageIndex = pages.findIndex((page, index) => {
    const next = pages[index + 1];
    const end = next ? next.start : page.end + LINGER_SECONDS;
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
                color: isSpoken ? theme.colors.text : theme.colors.textMuted,
                textShadow: isActive
                  ? "none"
                  : `0 ${4 * unit}px ${18 * unit}px rgba(0, 0, 0, 0.8)`,
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
