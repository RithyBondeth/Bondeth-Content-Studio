import { useCurrentFrame } from "remotion";
import { Emoji } from "../components/Emoji";
import { SceneFrame } from "../components/SceneFrame";
import { progressBetween, riseIn } from "../lib/animation";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";
import type { SceneProps } from "./types";

type Side = SceneProps<"comparison">["scene"]["left"];

const SideCard: React.FC<{
  side: Side;
  start: number;
  accent: boolean;
}> = ({ side, start, accent }) => {
  const frame = useCurrentFrame();
  const { unit, isVertical } = useLayout();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 22 * unit,
        padding: `${40 * unit}px ${44 * unit}px`,
        borderRadius: theme.radius.lg * unit,
        backgroundColor: theme.colors.surface,
        border: `${3 * unit}px solid ${accent ? theme.colors.accent : theme.colors.surfaceBorder}`,
        ...riseIn(progressBetween(frame, start, start + 12), 30 * unit),
      }}
    >
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontWeight: 800,
          fontSize: (isVertical ? 64 : 52) * unit,
          color: accent ? theme.colors.accentBright : theme.colors.text,
        }}
      >
        {side.label}
      </div>
      {side.points.map((point, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            gap: 18 * unit,
            fontFamily: theme.fonts.sans,
            fontSize: (isVertical ? 48 : 38) * unit,
            lineHeight: 1.3,
            color: theme.colors.text,
            opacity: progressBetween(
              frame,
              start + 10 + index * 6,
              start + 20 + index * 6,
            ),
          }}
        >
          <span style={{ color: theme.colors.textMuted }}>•</span>
          {point}
        </div>
      ))}
    </div>
  );
};

export const ComparisonScene: React.FC<SceneProps<"comparison">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const frame = useCurrentFrame();
  const { unit, isVertical } = useLayout();
  // The second side appears about a third of the way through.
  const rightStart = Math.max(18, Math.round(durationInFrames * 0.33));

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      {scene.heading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24 * unit,
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: (isVertical ? 72 : 68) * unit,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: theme.colors.text,
            ...riseIn(progressBetween(frame, 0, 12), 20 * unit),
          }}
        >
          {scene.emoji ? <Emoji emoji={scene.emoji} size={84} /> : null}
          {scene.heading}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          gap: 32 * unit,
        }}
      >
        <SideCard side={scene.left} start={6} accent={false} />
        <SideCard side={scene.right} start={rightStart} accent />
      </div>
    </SceneFrame>
  );
};
