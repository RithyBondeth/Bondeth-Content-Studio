import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Emoji } from "../components/Emoji";
import { SceneFrame, useReveal } from "../components/SceneFrame";
import { progressBetween } from "../lib/animation";
import { fitFontSize } from "../lib/chart";
import { getTimelineEventStarts } from "../lib/reveals";
import { useLayout } from "../lib/use-layout";
import type { TimelineEvent } from "../spec/schema";
import { useTheme } from "../theme/context";
import type { SceneProps } from "./types";

/** Frames the line takes to reach the next event's dot. */
const LINE_FRAMES = 10;

/**
 * How far along the line has drawn, from 0 to `count - 1` dots: it reaches
 * each event's dot as that event appears.
 */
const lineReach = (frame: number, starts: number[]) => {
  let reach = 0;
  starts.forEach((start, index) => {
    if (index === 0) return;
    reach += progressBetween(frame, start - LINE_FRAMES, start);
  });
  return reach;
};

/** The dot for an event: pops in, then glows while it's the latest one. */
const Dot: React.FC<{ start: number; latest: boolean; size: number }> = ({
  start,
  latest,
  size,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit } = useLayout();
  const pop = spring({ frame, fps, delay: start, config: { damping: 12 } });
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.pill,
        backgroundColor: latest ? theme.colors.accent : theme.colors.surface,
        border: `${5 * unit}px solid ${theme.colors.accent}`,
        boxShadow: latest
          ? `0 0 ${36 * unit}px ${theme.colors.lineHighlight}`
          : undefined,
        transform: `scale(${pop})`,
      }}
    />
  );
};

const EventText: React.FC<{
  event: TimelineEvent;
  start: number;
  align: "left" | "center";
  dateSize: number;
  labelSize: number;
}> = ({ event, start, align, dateSize, labelSize }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const reveal = useReveal();
  const { unit } = useLayout();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6 * unit,
        textAlign: align,
        ...reveal(progressBetween(frame, start + 2, start + 14), 22 * unit),
      }}
    >
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontWeight: 700,
          fontSize: dateSize,
          color: theme.colors.accentBright,
        }}
      >
        {event.date}
      </div>
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontWeight: 700,
          fontSize: labelSize,
          lineHeight: 1.15,
          color: theme.colors.text,
        }}
      >
        {event.label}
      </div>
      {event.detail ? (
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: labelSize * 0.68,
            lineHeight: 1.3,
            color: theme.colors.textMuted,
          }}
        >
          {event.detail}
        </div>
      ) : null}
    </div>
  );
};

export const TimelineScene: React.FC<SceneProps<"timeline">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const reveal = useReveal();
  const { fps } = useVideoConfig();
  const { unit, isVertical, width, paddingX } = useLayout();
  const count = scene.events.length;
  const starts = getTimelineEventStarts(scene, durationInFrames, fps);
  const reach = lineReach(frame, starts);
  const latest = starts.filter((start) => frame >= start).length - 1;

  const dot = (isVertical ? 52 : 40) * unit;
  const line = 6 * unit;
  const contentWidth = width - paddingX * 2;
  const columnWidth = contentWidth / count;
  const labelWidth = isVertical
    ? contentWidth - dot - 48 * unit
    : columnWidth - 24 * unit;
  const labelSize = fitFontSize(
    scene.events.map((event) => event.label),
    (isVertical ? 66 : count > 4 ? 38 : 44) * unit,
    labelWidth,
  );
  const dateSize = labelSize * 0.82;
  const hasHeading = Boolean(scene.heading || scene.emoji);

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

  if (isVertical) {
    // Events stacked down a line on the left, which grows from dot to dot.
    const rowGap = (count > 4 ? 56 : 80) * unit;
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
            flexDirection: "column",
            gap: rowGap,
          }}
        >
          {scene.events.map((event, index) => {
            // The segment from this dot to the next, drawn as the next one appears.
            const segment = Math.min(1, Math.max(0, reach - index));
            return (
              <div
                key={index}
                style={{
                  position: "relative",
                  display: "flex",
                  gap: 40 * unit,
                  alignItems: "flex-start",
                }}
              >
                {index < count - 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: dot / 2 - line / 2,
                      top: dot / 2,
                      width: line,
                      // Down to the next row's dot.
                      height: `calc(${(segment * 100).toFixed(2)}% + ${segment * rowGap}px)`,
                      borderRadius: line,
                      backgroundColor: theme.colors.accent,
                      opacity: 0.6,
                    }}
                  />
                ) : null}
                <div style={{ flexShrink: 0, marginTop: dateSize * 0.15 }}>
                  <Dot
                    start={starts[index]!}
                    latest={index === latest}
                    size={dot}
                  />
                </div>
                <EventText
                  event={event}
                  start={starts[index]!}
                  align="left"
                  dateSize={dateSize}
                  labelSize={labelSize}
                />
              </div>
            );
          })}
        </div>
      </SceneFrame>
    );
  }

  // Landscape: a horizontal line with dates above it and labels below.
  const lineSpan = columnWidth * (count - 1);
  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      {heading}
      <div style={{ position: "relative", width: contentWidth }}>
        <div
          style={{
            position: "absolute",
            left: columnWidth / 2,
            top: dot / 2 - line / 2,
            width: lineSpan,
            height: line,
            borderRadius: line,
            backgroundColor: theme.colors.surfaceBorder,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: columnWidth / 2,
            top: dot / 2 - line / 2,
            width: (lineSpan * reach) / Math.max(1, count - 1),
            height: line,
            borderRadius: line,
            backgroundColor: theme.colors.accent,
          }}
        />
        <div style={{ display: "flex" }}>
          {scene.events.map((event, index) => (
            <div
              key={index}
              style={{
                width: columnWidth,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 28 * unit,
                padding: `0 ${12 * unit}px`,
              }}
            >
              <Dot
                start={starts[index]!}
                latest={index === latest}
                size={dot}
              />
              <EventText
                event={event}
                start={starts[index]!}
                align="center"
                dateSize={dateSize}
                labelSize={labelSize}
              />
            </div>
          ))}
        </div>
      </div>
    </SceneFrame>
  );
};
