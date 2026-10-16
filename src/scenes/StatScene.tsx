import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Emoji } from "../components/Emoji";
import { SceneFrame } from "../components/SceneFrame";
import { progressBetween, riseIn, useEnter } from "../lib/animation";
import { getSceneWords } from "../lib/captions";
import { getCueFrame } from "../lib/cues";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";
import type { SceneProps } from "./types";

const COUNT_FRAMES = 36;

/** Counts the numeric part of values like "73%", "$1,200", or "2.5x" up from zero, starting at `start`. */
const useCountUp = (value: string, start: number) => {
  const frame = useCurrentFrame();
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value);
  if (!match) {
    return value;
  }

  const [, prefix = "", digits = "", suffix = ""] = match;
  const target = Number(digits.replace(/,/g, ""));
  const decimals = digits.split(".")[1]?.length ?? 0;
  const useGrouping = digits.includes(",");

  const current = interpolate(
    frame,
    [start, start + COUNT_FRAMES],
    [0, target],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  const formatted = current.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  });
  return `${prefix}${formatted}${suffix}`;
};

export const StatScene: React.FC<SceneProps<"stat">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, isVertical } = useLayout();
  // The count-up starts as the number is spoken.
  const countStart = getCueFrame(getSceneWords(scene), scene.cue, 4, fps);
  const display = useCountUp(scene.value, countStart);
  const pop = useEnter(0, 14);
  const valueSize = (scene.value.length > 6 ? 190 : 260) * unit;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isVertical ? "flex-start" : "center",
          textAlign: isVertical ? "left" : "center",
          gap: 24 * unit,
        }}
      >
        {scene.emoji ? <Emoji emoji={scene.emoji} size={110} /> : null}
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: valueSize,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
            color: theme.colors.accentBright,
            transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
            opacity: pop,
          }}
        >
          {display}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 600,
            fontSize: (isVertical ? 60 : 56) * unit,
            lineHeight: 1.25,
            color: theme.colors.text,
            maxWidth: 1300 * unit,
            ...riseIn(progressBetween(frame, 14, 26), 20 * unit),
          }}
        >
          {scene.label}
        </div>
        {scene.source ? (
          <div
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 26 * unit,
              color: theme.colors.textMuted,
              opacity: progressBetween(frame, 24, 36),
            }}
          >
            Source: {scene.source}
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};
