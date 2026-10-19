import { useCurrentFrame } from "remotion";
import { KineticText } from "../components/KineticText";
import { SceneFrame, useReveal } from "../components/SceneFrame";
import { progressBetween, useEnter } from "../lib/animation";
import { useLayout } from "../lib/use-layout";
import { useTheme } from "../theme/context";
import type { SceneProps } from "./types";

export const QuoteScene: React.FC<SceneProps<"quote">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const reveal = useReveal();
  const { unit, isVertical } = useLayout();
  const mark = useEnter(0, 14);
  const words = scene.quote.split(/\s+/).length;
  const fontSize = (words > 20 ? 58 : isVertical ? 76 : 72) * unit;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontWeight: 800,
          fontSize: 240 * unit,
          lineHeight: 0.6,
          height: 120 * unit,
          color: theme.colors.accent,
          transform: `scale(${mark})`,
          transformOrigin: "left bottom",
        }}
      >
        “
      </div>
      <KineticText
        text={scene.quote}
        fontSize={fontSize}
        fontWeight={600}
        delay={6}
        stagger={1.5}
      />
      {scene.author ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20 * unit,
            fontFamily: theme.fonts.sans,
            fontSize: 40 * unit,
            color: theme.colors.textMuted,
            ...reveal(
              progressBetween(frame, 10 + words * 1.5, 22 + words * 1.5),
              16 * unit,
            ),
          }}
        >
          <div
            style={{
              width: 48 * unit,
              height: 4 * unit,
              backgroundColor: theme.colors.accent,
            }}
          />
          {scene.author}
        </div>
      ) : null}
    </SceneFrame>
  );
};
