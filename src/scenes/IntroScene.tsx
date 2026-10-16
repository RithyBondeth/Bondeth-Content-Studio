import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand } from "../brand";
import { Background } from "../components/Background";
import { LowerThird } from "../components/LowerThird";
import { Pill } from "../components/Pill";
import type { Lesson } from "../lessons/types";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";

type IntroSceneProps = {
  lesson: Lesson;
};

export const IntroScene: React.FC<IntroSceneProps> = ({ lesson }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, isVertical, paddingX, paddingY } = useLayout();

  const pillEnter = spring({ frame, fps, config: { damping: 200 } });
  const titleEnter = spring({
    frame,
    fps,
    delay: 6,
    config: { damping: 200 },
  });
  const subtitleOpacity = interpolate(frame, [18, 30], [0, 1], {
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
          gap: 36 * unit,
        }}
      >
        <div style={{ display: "flex", gap: 16 * unit, opacity: pillEnter }}>
          <Pill variant="accent">{brand.handle}</Pill>
          <Pill>{lesson.language}</Pill>
        </div>
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: (isVertical ? 110 : 120) * unit,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: theme.colors.text,
            opacity: titleEnter,
            transform: `translateY(${interpolate(titleEnter, [0, 1], [40, 0]) * unit}px)`,
          }}
        >
          {lesson.title}
        </div>
        {lesson.subtitle ? (
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: 44 * unit,
              lineHeight: 1.3,
              color: theme.colors.textMuted,
              opacity: subtitleOpacity,
              maxWidth: 1400 * unit,
            }}
          >
            {lesson.subtitle}
          </div>
        ) : null}
      </AbsoluteFill>
      <Sequence from={25} layout="none">
        <div
          style={{
            position: "absolute",
            left: paddingX,
            bottom: paddingY,
          }}
        >
          <LowerThird name={brand.name} role={brand.role} />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
