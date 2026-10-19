import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Emoji } from "../components/Emoji";
import { SceneFrame, useReveal } from "../components/SceneFrame";
import { progressBetween } from "../lib/animation";
import { fitFontSize } from "../lib/chart";
import { ICONS } from "../lib/icons";
import { getProcessStepStarts } from "../lib/reveals";
import { useLayout } from "../lib/use-layout";
import type { ProcessStep } from "../spec/schema";
import { useTheme } from "../theme/context";
import type { SceneProps } from "./types";

/**
 * A round badge with the step's icon and a small number tag, or just its
 * number when it has no icon. It fills with the accent while it's the step
 * being talked about.
 */
const StepBadge: React.FC<{
  step: ProcessStep;
  number: number;
  size: number;
  start: number;
  current: boolean;
}> = ({ step, number, size, start, current }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit } = useLayout();
  const pop = spring({ frame, fps, delay: start, config: { damping: 12 } });
  const Icon = step.icon ? ICONS[step.icon] : null;
  const tag = size * 0.42;
  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: theme.radius.pill,
        display: "grid",
        placeItems: "center",
        backgroundColor: current ? theme.colors.accent : theme.colors.surface,
        border: `${4 * unit}px solid ${theme.colors.accent}`,
        boxShadow: current
          ? `0 0 ${44 * unit}px ${theme.colors.lineHighlight}`
          : undefined,
        color: current ? theme.colors.accentText : theme.colors.accentBright,
        transform: `scale(${pop})`,
      }}
    >
      {Icon ? (
        <>
          <Icon
            size={size * 0.46}
            strokeWidth={2}
            absoluteStrokeWidth={false}
          />
          <span
            style={{
              position: "absolute",
              right: -tag * 0.18,
              top: -tag * 0.18,
              width: tag,
              height: tag,
              borderRadius: theme.radius.pill,
              display: "grid",
              placeItems: "center",
              backgroundColor: theme.colors.background,
              border: `${3 * unit}px solid ${theme.colors.accent}`,
              color: theme.colors.text,
              fontFamily: theme.fonts.sans,
              fontWeight: 800,
              fontSize: tag * 0.55,
            }}
          >
            {number}
          </span>
        </>
      ) : (
        <span
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: size * 0.42,
          }}
        >
          {number}
        </span>
      )}
    </div>
  );
};

const StepText: React.FC<{
  step: ProcessStep;
  titleSize: number;
  align: "left" | "center";
  /** Earlier steps fade back a little once the narration moves on. */
  dimmed: boolean;
}> = ({ step, titleSize, align, dimmed }) => {
  const theme = useTheme();
  const { unit } = useLayout();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8 * unit,
        textAlign: align,
        opacity: dimmed ? 0.6 : 1,
      }}
    >
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontWeight: 700,
          fontSize: titleSize,
          lineHeight: 1.15,
          color: theme.colors.text,
        }}
      >
        {step.title}
      </div>
      {step.detail ? (
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: titleSize * 0.7,
            lineHeight: 1.3,
            color: theme.colors.textMuted,
          }}
        >
          {step.detail}
        </div>
      ) : null}
    </div>
  );
};

/** A short connector that draws itself from one step toward the next. */
const Connector: React.FC<{
  start: number;
  vertical: boolean;
  length: number;
}> = ({ start, vertical, length }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { unit } = useLayout();
  const drawn = progressBetween(frame, start - 8, start);
  const thickness = 5 * unit;
  return (
    <div
      style={{
        width: vertical ? thickness : length * drawn,
        height: vertical ? length * drawn : thickness,
        borderRadius: thickness,
        backgroundColor: theme.colors.accent,
        opacity: 0.7,
      }}
    />
  );
};

export const StepsScene: React.FC<SceneProps<"steps">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const reveal = useReveal();
  const { fps } = useVideoConfig();
  const { unit, isVertical, width, paddingX } = useLayout();
  const count = scene.steps.length;
  const starts = getProcessStepStarts(scene, durationInFrames, fps);
  const current = starts.filter((start) => frame >= start).length - 1;

  const contentWidth = width - paddingX * 2;
  const badge = (isVertical ? 150 : count > 4 ? 110 : 130) * unit;
  const columnWidth = contentWidth / count;
  const titleWidth = isVertical
    ? contentWidth - badge - 40 * unit
    : columnWidth - 32 * unit;
  const titleSize = fitFontSize(
    scene.steps.map((step) => step.title),
    (isVertical ? 66 : count > 4 ? 38 : 44) * unit,
    titleWidth,
  );
  const hasHeading = Boolean(scene.heading || scene.emoji);
  // Space between a badge and the line to the next one.
  const linkGap = 18 * unit;

  const heading = hasHeading ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28 * unit,
        ...reveal(progressBetween(frame, 0, 12), 20 * unit),
      }}
    >
      {scene.emoji ? <Emoji emoji={scene.emoji} size={96} /> : null}
      {scene.heading ? (
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: (isVertical ? 80 : 68) * unit,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: theme.colors.text,
          }}
        >
          {scene.heading}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      {heading}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          alignItems: isVertical ? "stretch" : "flex-start",
        }}
      >
        {/* In landscape, lines join each badge to the next across the row. */}
        {isVertical
          ? null
          : scene.steps.slice(1).map((_, index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: columnWidth * (index + 0.5) + badge / 2 + linkGap,
                  top: badge / 2 - 2.5 * unit,
                }}
              >
                <Connector
                  start={starts[index + 1]!}
                  vertical={false}
                  length={columnWidth - badge - linkGap * 2}
                />
              </div>
            ))}
        {scene.steps.map((step, index) => {
          const start = starts[index]!;
          const shown = progressBetween(frame, start + 2, start + 14);
          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: isVertical ? "column" : "row",
                width: isVertical ? undefined : columnWidth,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isVertical ? "row" : "column",
                  alignItems: "center",
                  gap: (isVertical ? 40 : 26) * unit,
                  width: isVertical ? undefined : columnWidth,
                  padding: isVertical ? 0 : `0 ${16 * unit}px`,
                }}
              >
                <StepBadge
                  step={step}
                  number={index + 1}
                  size={badge}
                  start={start}
                  current={index === current}
                />
                <div style={reveal(shown, 22 * unit)}>
                  <StepText
                    step={step}
                    titleSize={titleSize}
                    align={isVertical ? "left" : "center"}
                    dimmed={index < current}
                  />
                </div>
              </div>
              {/* In portrait, a short line down to the next badge. */}
              {isVertical && index < count - 1 ? (
                <div
                  style={{
                    height: 64 * unit,
                    paddingLeft: badge / 2 - 2.5 * unit,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Connector
                    start={starts[index + 1]!}
                    vertical
                    length={64 * unit}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};
