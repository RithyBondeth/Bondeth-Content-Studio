import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Emoji } from "../components/Emoji";
import { SceneFrame, useReveal } from "../components/SceneFrame";
import { progressBetween } from "../lib/animation";
import { fitFontSize } from "../lib/chart";
import {
  arrivalAngle,
  getConnectorStarts,
  getDiagramGeometry,
  type Connector,
  type LabelSide,
} from "../lib/diagram";
import { ICONS } from "../lib/icons";
import { getDiagramNodeStarts } from "../lib/reveals";
import { useLayout } from "../lib/use-layout";
import type { DiagramNode } from "../spec/schema";
import { useTheme } from "../theme/context";
import type { SceneProps } from "./types";

/** How long a connector takes to draw from one node to the next. */
const DRAW_FRAMES = 14;

/** A curved or straight arrow that draws itself in from its start. */
const Arrow: React.FC<{ connector: Connector; start: number }> = ({
  connector,
  start,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { unit } = useLayout();
  const drawn = progressBetween(frame, start, start + DRAW_FRAMES);
  const head = progressBetween(
    frame,
    start + DRAW_FRAMES * 0.7,
    start + DRAW_FRAMES,
  );
  if (drawn === 0) {
    return null;
  }
  const { start: from, control, end } = connector;
  const size = 22 * unit;
  return (
    <g>
      <path
        d={`M ${from.x} ${from.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`}
        fill="none"
        stroke={theme.colors.accent}
        strokeWidth={6 * unit}
        strokeLinecap="round"
        // pathLength lets the dash cover the curve as a fraction, whatever its real length.
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - drawn}
      />
      <polygon
        points={`0,0 ${-size},${-size * 0.6} ${-size},${size * 0.6}`}
        fill={theme.colors.accent}
        transform={`translate(${end.x} ${end.y}) rotate(${arrivalAngle(connector)}) scale(${head})`}
      />
    </g>
  );
};

/** A round badge with the node's icon, or its number when it has none. */
const Badge: React.FC<{
  node: DiagramNode;
  number: number;
  size: number;
  start: number;
}> = ({ node, number, size, start }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit } = useLayout();
  const pop = spring({ frame, fps, delay: start, config: { damping: 12 } });
  const Icon = node.icon ? ICONS[node.icon] : null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.pill,
        display: "grid",
        placeItems: "center",
        backgroundColor: theme.colors.surface,
        border: `${4 * unit}px solid ${theme.colors.accent}`,
        boxShadow: `0 0 ${40 * unit}px ${theme.colors.lineHighlight}`,
        color: theme.colors.accentBright,
        transform: `scale(${pop})`,
      }}
    >
      {Icon ? (
        <Icon size={size * 0.46} strokeWidth={2} absoluteStrokeWidth={false} />
      ) : (
        <span
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: size * 0.4,
          }}
        >
          {number}
        </span>
      )}
    </div>
  );
};

/**
 * Where a label goes beside its badge. Labels at the sides are centred on
 * the badge, and ones above it hang from their bottom edge, so long labels
 * grow away from the badge.
 */
const labelPlacement = (
  side: LabelSide,
  x: number,
  y: number,
  /** From the badge's centre to the label. */
  offset: number,
  width: number,
) => {
  switch (side) {
    case "above":
      return {
        left: x - width / 2,
        top: y - offset,
        textAlign: "center",
        shift: "-100%",
      } as const;
    case "below":
      return {
        left: x - width / 2,
        top: y + offset,
        textAlign: "center",
        shift: "0%",
      } as const;
    case "left":
      return {
        left: x - offset - width,
        top: y,
        textAlign: "right",
        shift: "-50%",
      } as const;
    case "right":
      return {
        left: x + offset,
        top: y,
        textAlign: "left",
        shift: "-50%",
      } as const;
  }
};

export const DiagramScene: React.FC<SceneProps<"diagram">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const reveal = useReveal();
  const { fps } = useVideoConfig();
  const { unit, isVertical, width, height, paddingX, paddingTop, captionZone } =
    useLayout();
  const layout = scene.layout ?? "flow";
  const count = scene.nodes.length;

  const hasHeading = Boolean(scene.heading || scene.emoji);
  const headingSize = (isVertical ? 80 : 68) * unit;
  const contentWidth = width - paddingX * 2;
  const contentHeight =
    height -
    paddingTop -
    (reserveCaptions ? captionZone : paddingTop) -
    (hasHeading ? headingSize * 1.2 + 40 * unit : 0);

  const wideFlow = layout === "flow" && !isVertical;
  const badge = (wideFlow && count > 4 ? 120 : isVertical ? 150 : 140) * unit;
  // Gap between a badge and its label.
  const labelGap = 22 * unit;
  const labelWidth = wideFlow
    ? contentWidth / count - 24 * unit
    : layout === "flow"
      ? contentWidth - badge - labelGap
      : isVertical
        ? 0.3 * contentWidth
        : 340 * unit;
  const labelSize = fitFontSize(
    scene.nodes.map((node) => node.label),
    (isVertical ? 52 : 40) * unit,
    labelWidth,
  );
  const geometry = getDiagramGeometry(layout, count, {
    width: contentWidth,
    height: contentHeight,
    badge,
    // Room for two lines.
    labelHeight: labelSize * 1.2 * 2 + labelGap,
    labelWidth: labelWidth + labelGap,
    vertical: isVertical,
  });

  // Each node pops in as the narrator says its cue; arrows arrive with it.
  const starts = getDiagramNodeStarts(scene, durationInFrames, fps);
  const connectorStarts = getConnectorStarts(
    geometry.connectors,
    starts,
    DRAW_FRAMES,
  );

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      {hasHeading ? (
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
                fontSize: headingSize,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: theme.colors.text,
              }}
            >
              {scene.heading}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        style={{
          position: "relative",
          width: geometry.width,
          height: geometry.height,
          alignSelf: "center",
        }}
      >
        <svg
          width={geometry.width}
          height={geometry.height}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {geometry.connectors.map((connector, index) => (
            <Arrow
              key={index}
              connector={connector}
              start={connectorStarts[index]!}
            />
          ))}
        </svg>
        {scene.nodes.map((node, index) => {
          const { x, y } = geometry.nodes[index]!;
          const start = starts[index]!;
          const side = geometry.labelSides[index]!;
          const shown = progressBetween(frame, start + 4, start + 14);
          const rise = (1 - shown) * 14 * unit;
          const { left, top, textAlign, shift } = labelPlacement(
            side,
            x,
            y,
            badge / 2 + labelGap,
            labelWidth,
          );
          return (
            <div key={index}>
              <div
                style={{
                  position: "absolute",
                  left: x - badge / 2,
                  top: y - badge / 2,
                }}
              >
                <Badge
                  node={node}
                  number={index + 1}
                  size={badge}
                  start={start}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  width: labelWidth,
                  left,
                  top,
                  textAlign,
                  fontFamily: theme.fonts.sans,
                  fontWeight: 600,
                  fontSize: labelSize,
                  lineHeight: 1.2,
                  color: theme.colors.text,
                  opacity: shown,
                  transform: `translateY(calc(${shift} + ${rise}px))`,
                }}
              >
                {node.label}
              </div>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};
