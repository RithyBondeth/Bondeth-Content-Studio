import { useCurrentFrame } from "remotion";
import { Emoji } from "../components/Emoji";
import { KineticText } from "../components/KineticText";
import { SceneFrame } from "../components/SceneFrame";
import { progressBetween, riseIn, useEnter } from "../lib/animation";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";
import type { SceneProps } from "./types";

export const TitleScene: React.FC<SceneProps<"title">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const frame = useCurrentFrame();
  const { unit, isVertical } = useLayout();
  const bar = useEnter(10);
  const headingWords = scene.heading.split(/\s+/).length;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      {scene.emoji ? <Emoji emoji={scene.emoji} size={170} /> : null}
      <KineticText
        text={scene.heading}
        fontSize={(isVertical ? 112 : 120) * unit}
        delay={4}
      />
      <div
        style={{
          width: 160 * unit * bar,
          height: 12 * unit,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.accent,
        }}
      />
      {scene.subheading ? (
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 46 * unit,
            lineHeight: 1.3,
            color: theme.colors.textMuted,
            maxWidth: 1400 * unit,
            ...riseIn(
              progressBetween(
                frame,
                8 + headingWords * 3,
                20 + headingWords * 3,
              ),
              20 * unit,
            ),
          }}
        >
          {scene.subheading}
        </div>
      ) : null}
    </SceneFrame>
  );
};
