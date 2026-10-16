import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../brand";
import { Background } from "../components/Background";
import { Pill } from "../components/Pill";
import type { Lesson } from "../lessons/types";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";

type OutroSceneProps = {
  lesson: Lesson;
};

export const OutroScene: React.FC<OutroSceneProps> = ({ lesson }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, paddingX, paddingY } = useLayout();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const ctaEnter = spring({ frame, fps, delay: 10, config: { damping: 12 } });
  const footerOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          padding: `${paddingY}px ${paddingX}px`,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          gap: 48 * unit,
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: 100 * unit,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: theme.colors.text,
            opacity: enter,
            transform: `translateY(${interpolate(enter, [0, 1], [30, 0]) * unit}px)`,
          }}
        >
          {lesson.outro?.message ?? "Thanks for watching!"}
        </div>
        <div style={{ transform: `scale(${ctaEnter})` }}>
          <Pill variant="accent">Follow {brand.handle} for more</Pill>
        </div>
        {lesson.outro?.nextUp ? (
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: 40 * unit,
              color: theme.colors.textMuted,
              opacity: footerOpacity,
            }}
          >
            Next up:{" "}
            <span style={{ color: theme.colors.text }}>
              {lesson.outro.nextUp}
            </span>
          </div>
        ) : null}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: paddingY,
          fontFamily: theme.fonts.mono,
          fontSize: 28 * unit,
          color: theme.colors.textMuted,
          opacity: footerOpacity,
        }}
      >
        {brand.website}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
