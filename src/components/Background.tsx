import { AbsoluteFill } from "remotion";
import { theme } from "../theme/tokens";

/** Dark backdrop with a soft accent glow and a faint dot grid. */
export const Background: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 15% 10%, ${theme.colors.accent}33, transparent 45%), radial-gradient(circle at 90% 95%, ${theme.colors.accent}22, transparent 40%)`,
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
