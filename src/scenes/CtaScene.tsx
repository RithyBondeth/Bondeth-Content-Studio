import { useCurrentFrame } from "remotion";
import { Emoji } from "../components/Emoji";
import { KineticText } from "../components/KineticText";
import { SceneFrame } from "../components/SceneFrame";
import { progressBetween, useEnter } from "../lib/animation";
import { useLayout } from "../lib/use-layout";
import { useBrand, useTheme } from "../theme/context";
import type { SceneProps } from "./types";

export const CtaScene: React.FC<SceneProps<"cta">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const theme = useTheme();
  const brand = useBrand();
  const credit = [brand.handle, brand.website].filter(Boolean).join(" · ");
  const frame = useCurrentFrame();
  const { unit, isVertical } = useLayout();
  const words = scene.heading.split(/\s+/).length;
  const buttonDelay = 6 + words * 3;
  const button = useEnter(buttonDelay, 12);
  // A gentle pulse once the button is in.
  const pulse =
    frame > buttonDelay + 15
      ? 1 + Math.sin((frame - buttonDelay) / 7) * 0.03
      : 1;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      {scene.emoji ? <Emoji emoji={scene.emoji} size={150} /> : null}
      <KineticText
        text={scene.heading}
        fontSize={(isVertical ? 100 : 104) * unit}
        delay={4}
      />
      <div
        style={{
          alignSelf: "flex-start",
          padding: `${26 * unit}px ${52 * unit}px`,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.accent,
          color: theme.colors.accentText,
          fontFamily: theme.fonts.sans,
          fontWeight: 800,
          fontSize: 50 * unit,
          boxShadow: `0 ${18 * unit}px ${50 * unit}px ${theme.colors.accent}66`,
          transform: `scale(${button * pulse})`,
          transformOrigin: "left center",
        }}
      >
        {scene.action}
      </div>
      {credit ? (
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 34 * unit,
            color: theme.colors.textMuted,
            opacity: progressBetween(frame, buttonDelay + 10, buttonDelay + 22),
          }}
        >
          {credit}
        </div>
      ) : null}
    </SceneFrame>
  );
};
