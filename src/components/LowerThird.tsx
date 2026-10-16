import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";

type LowerThirdProps = {
  name: string;
  role: string;
};

/** Name-and-role bar that slides in from the left. Place it inside a Sequence to control when it appears. */
export const LowerThird: React.FC<LowerThirdProps> = ({ name, role }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit } = useLayout();

  const enter = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 20 * unit,
        opacity: enter,
        transform: `translateX(${interpolate(enter, [0, 1], [-40, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 8 * unit,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.accent,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 * unit }}>
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 600,
            fontSize: 36 * unit,
            color: theme.colors.text,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 26 * unit,
            color: theme.colors.textMuted,
          }}
        >
          {role}
        </div>
      </div>
    </div>
  );
};
