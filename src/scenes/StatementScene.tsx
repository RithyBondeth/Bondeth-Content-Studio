import { Emoji } from "../components/Emoji";
import { KineticText } from "../components/KineticText";
import { SceneFrame } from "../components/SceneFrame";
import { useLayout } from "../lib/use-layout";
import type { SceneProps } from "./types";

export const StatementScene: React.FC<SceneProps<"statement">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const { unit, isVertical } = useLayout();
  const words = scene.text.split(/\s+/).length;
  // Long statements get smaller text so they still fit.
  const base = isVertical ? 104 : 96;
  const fontSize =
    (words > 14 ? base * 0.72 : words > 8 ? base * 0.86 : base) * unit;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      {scene.emoji ? <Emoji emoji={scene.emoji} size={140} /> : null}
      <KineticText
        text={scene.text}
        highlight={scene.highlight}
        fontSize={fontSize}
        delay={4}
        stagger={2}
      />
    </SceneFrame>
  );
};
