import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Emoji } from "../components/Emoji";
import { SceneFrame } from "../components/SceneFrame";
import { progressBetween, riseIn } from "../lib/animation";
import {
  countDecimals,
  fitFontSize,
  formatChartValue,
  getChartFractions,
  getLinePoints,
} from "../lib/chart";
import { getChartPointStarts } from "../lib/reveals";
import { useLayout } from "../lib/use-layout";
import type { ChartPoint } from "../spec/schema";
import { useTheme, type Theme } from "../theme/context";
import type { SceneProps } from "./types";

/** How long a bar takes to grow, and its value to count up. */
const GROW_FRAMES = 24;
/** How long a line segment takes to draw to its point. */
const DRAW_FRAMES = 14;

const easeOut = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.out(Easing.cubic),
} as const;

const barFill = (theme: Theme, direction: "top" | "right") =>
  `linear-gradient(to ${direction}, ${theme.colors.accent}, ${theme.colors.accentBright})`;

type ChartBodyProps = {
  points: ChartPoint[];
  starts: number[];
  /** The scene's unit, already applied by `format`. */
  format: (point: ChartPoint, progress: number) => string;
  contentWidth: number;
};

const valueStyle = (theme: Theme, size: number): React.CSSProperties => ({
  fontFamily: theme.fonts.sans,
  fontWeight: 800,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  fontVariantNumeric: "tabular-nums",
  color: theme.colors.accentBright,
  whiteSpace: "nowrap",
});

const labelStyle = (theme: Theme, size: number): React.CSSProperties => ({
  fontFamily: theme.fonts.sans,
  fontWeight: 600,
  fontSize: size,
  lineHeight: 1.2,
  color: theme.colors.text,
});

/** Landscape bars: columns that grow up from a shared baseline. */
const Columns: React.FC<ChartBodyProps> = ({
  points,
  starts,
  format,
  contentWidth,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { unit } = useLayout();
  const fractions = getChartFractions(points.map((point) => point.value));
  // Columns share the width; bars are capped so a few bars don't turn into slabs.
  const gap = 44 * unit;
  const columnWidth =
    (contentWidth - gap * (points.length - 1)) / points.length;
  const barWidth = Math.min(240 * unit, columnWidth);
  const plotHeight = 380 * unit;
  const valueSize = fitFontSize(
    points.map((point) => format(point, 1)),
    52 * unit,
    columnWidth,
    { wrap: false },
  );
  const labelSize = fitFontSize(
    points.map((point) => point.label),
    38 * unit,
    columnWidth,
  );
  const row: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          ...row,
          alignItems: "flex-end",
          height: plotHeight + valueSize * 1.5,
        }}
      >
        {points.map((point, index) => {
          const start = starts[index]!;
          const growth = interpolate(
            frame,
            [start, start + GROW_FRAMES],
            [0, 1],
            easeOut,
          );
          // Tiny values still get a sliver of bar once they've grown.
          const barHeight =
            fractions[index]! > 0
              ? Math.max(6 * unit, fractions[index]! * plotHeight) * growth
              : 0;
          return (
            <div
              key={index}
              style={{
                width: columnWidth,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16 * unit,
              }}
            >
              <div
                style={{
                  ...valueStyle(theme, valueSize),
                  opacity: progressBetween(frame, start, start + 6),
                }}
              >
                {format(point, growth)}
              </div>
              <div
                style={{
                  width: barWidth,
                  height: barHeight,
                  borderRadius: `${theme.radius.md * unit}px ${theme.radius.md * unit}px 0 0`,
                  background: barFill(theme, "top"),
                }}
              />
            </div>
          );
        })}
      </div>
      <Baseline />
      <div style={{ ...row, marginTop: 18 * unit }}>
        {points.map((point, index) => (
          <div
            key={index}
            style={{
              width: columnWidth,
              textAlign: "center",
              ...labelStyle(theme, labelSize),
              ...riseIn(
                progressBetween(frame, starts[index]!, starts[index]! + 10),
                16 * unit,
              ),
            }}
          >
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Vertical-video bars: rows that grow to the right, easy to read on a phone. */
const Rows: React.FC<ChartBodyProps> = ({
  points,
  starts,
  format,
  contentWidth,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { unit } = useLayout();
  const fractions = getChartFractions(points.map((point) => point.value));
  const valueSize = 50 * unit;
  const valueGap = 22 * unit;
  // Leave room after the longest bar for the widest value.
  const widestValue = Math.max(
    ...points.map((point) => format(point, 1).length),
  );
  const maxBarWidth = contentWidth - widestValue * valueSize * 0.62 - valueGap;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 * unit }}>
      {points.map((point, index) => {
        const start = starts[index]!;
        const growth = interpolate(
          frame,
          [start, start + GROW_FRAMES],
          [0, 1],
          easeOut,
        );
        const barWidth =
          fractions[index]! > 0
            ? Math.max(6 * unit, fractions[index]! * maxBarWidth) * growth
            : 0;
        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12 * unit,
              ...riseIn(progressBetween(frame, start, start + 10), 20 * unit),
            }}
          >
            <div style={labelStyle(theme, 44 * unit)}>{point.label}</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: barWidth,
                  height: 58 * unit,
                  borderRadius: `0 ${theme.radius.md * unit}px ${theme.radius.md * unit}px 0`,
                  background: barFill(theme, "right"),
                }}
              />
              <div
                style={{
                  ...valueStyle(theme, valueSize),
                  // Zero-length bars leave no gap before their value.
                  marginLeft: Math.min(valueGap, barWidth),
                }}
              >
                {format(point, growth)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** A line through the points, drawn segment by segment as each one comes up. */
const Line: React.FC<ChartBodyProps> = ({
  points,
  starts,
  format,
  contentWidth,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, isVertical } = useLayout();
  const columnWidth = contentWidth / points.length;
  const chipPadding = 10 * unit;
  const values = points.map((point) => format(point, 1));
  const valueSize = fitFontSize(
    values,
    (isVertical ? 46 : 48) * unit,
    columnWidth - chipPadding * 2,
    { wrap: false },
  );
  const labelSize = fitFontSize(
    points.map((point) => point.label),
    (isVertical ? 40 : 38) * unit,
    columnWidth - 16 * unit,
  );
  // Room above the highest point for its value.
  const headroom = valueSize * 1.9;
  const plotHeight = (isVertical ? 600 : 360) * unit;
  const positions = getLinePoints(
    points.map((point) => point.value),
    contentWidth,
    plotHeight,
  ).map(({ x, y }) => ({ x, y: y + headroom }));
  const stroke = 8 * unit;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          position: "relative",
          width: contentWidth,
          height: plotHeight + headroom,
        }}
      >
        <svg
          width={contentWidth}
          height={plotHeight + headroom}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {positions.slice(1).map((to, offset) => {
            const from = positions[offset]!;
            const start = starts[offset + 1]!;
            const drawn = interpolate(
              frame,
              [start, start + DRAW_FRAMES],
              [0, 1],
              easeOut,
            );
            return drawn > 0 ? (
              <line
                key={offset}
                x1={from.x}
                y1={from.y}
                x2={from.x + (to.x - from.x) * drawn}
                y2={from.y + (to.y - from.y) * drawn}
                stroke={theme.colors.accent}
                strokeWidth={stroke}
                strokeLinecap="round"
              />
            ) : null;
          })}
          {positions.map(({ x, y }, index) => {
            const pop = spring({
              frame,
              fps,
              delay: starts[index]!,
              config: { damping: 12 },
            });
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={Math.max(0, 15 * unit * pop)}
                fill={theme.colors.accentBright}
                stroke={theme.colors.background}
                strokeWidth={5 * unit}
              />
            );
          })}
        </svg>
        {points.map((point, index) => {
          const start = starts[index]!;
          const growth = interpolate(
            frame,
            [start, start + GROW_FRAMES],
            [0, 1],
            easeOut,
          );
          // Keep values at the ends from spilling past the chart's edges.
          const halfWidth =
            (values[index]!.length * valueSize * 0.6) / 2 + chipPadding;
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: Math.min(
                  Math.max(positions[index]!.x, halfWidth),
                  contentWidth - halfWidth,
                ),
                top: positions[index]!.y - 24 * unit,
                transform: "translate(-50%, -100%)",
                ...valueStyle(theme, valueSize),
                // A chip in the background color, so the line passes behind the value.
                padding: `${6 * unit}px ${chipPadding}px`,
                borderRadius: theme.radius.sm * unit,
                backgroundColor: theme.colors.background,
                opacity: progressBetween(frame, start, start + 6),
              }}
            >
              {format(point, growth)}
            </div>
          );
        })}
      </div>
      <Baseline />
      <div style={{ display: "flex", marginTop: 18 * unit }}>
        {points.map((point, index) => (
          <div
            key={index}
            style={{
              width: columnWidth,
              padding: `0 ${8 * unit}px`,
              textAlign: "center",
              ...labelStyle(theme, labelSize),
              ...riseIn(
                progressBetween(frame, starts[index]!, starts[index]! + 10),
                16 * unit,
              ),
            }}
          >
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/** The zero line under the bars or line; drawn in with the heading. */
const Baseline: React.FC = () => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { unit } = useLayout();
  return (
    <div
      style={{
        height: 4 * unit,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surfaceBorder,
        transform: `scaleX(${progressBetween(frame, 0, 14)})`,
        transformOrigin: "left center",
      }}
    />
  );
};

export const ChartScene: React.FC<SceneProps<"chart">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, isVertical, width, paddingX } = useLayout();
  const contentWidth = width - paddingX * 2;

  // Each bar grows, or each point is drawn, as the narrator says its cue.
  const starts = getChartPointStarts(scene, durationInFrames, fps);
  // Values count up with their bar, keeping the decimals they're written with.
  const format = (point: ChartPoint, progress: number) =>
    formatChartValue(
      point.value * progress,
      countDecimals(point.value),
      scene.unit,
    );
  const Body = scene.style === "line" ? Line : isVertical ? Rows : Columns;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28 * unit,
          ...riseIn(progressBetween(frame, 0, 12), 20 * unit),
        }}
      >
        {scene.emoji ? <Emoji emoji={scene.emoji} size={96} /> : null}
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: (isVertical ? 80 : 72) * unit,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: theme.colors.text,
          }}
        >
          {scene.heading}
        </div>
      </div>
      <Body
        points={scene.points}
        starts={starts}
        format={format}
        contentWidth={contentWidth}
      />
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
    </SceneFrame>
  );
};
