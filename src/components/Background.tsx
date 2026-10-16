import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme/tokens";

/** Dark backdrop with slowly drifting accent glows and a faint dot grid. */
export const Background: React.FC<{
  /** Frame in the video where the current sequence starts, so the drift stays continuous across scenes. */
  frameOffset?: number;
}> = ({ frameOffset = 0 }) => {
  const frame = useCurrentFrame() + frameOffset;
  const drift = Math.sin(frame / 90) * 6;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${15 + drift}% ${10 + drift}%, ${theme.colors.accent}33, transparent 45%), radial-gradient(circle at ${88 - drift}% ${92 - drift}%, ${theme.colors.accent}22, transparent 40%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${theme.colors.surfaceBorder} 1.5px, transparent 1.5px)`,
          backgroundSize: "36px 36px",
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
