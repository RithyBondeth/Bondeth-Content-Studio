import { useCurrentFrame, useVideoConfig } from "remotion";
import { Emoji } from "../components/Emoji";
import { SceneFrame } from "../components/SceneFrame";
import { progressBetween, riseIn } from "../lib/animation";
import { getSceneWords } from "../lib/captions";
import { getCueFrames } from "../lib/cues";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";
import type { SceneProps } from "./types";

const Marker: React.FC<{
  style: "bullets" | "numbered" | "checks";
  index: number;
  size: number;
}> = ({ style, index, size }) => {
  const isDot = style === "bullets";
  return (
    <div
      style={{
        flexShrink: 0,
        width: isDot ? size * 0.32 : size,
        height: isDot ? size * 0.32 : size,
        marginTop: isDot ? size * 0.34 : 0,
        marginLeft: isDot ? size * 0.34 : 0,
        marginRight: isDot ? size * 0.34 : 0,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.accent,
        color: theme.colors.accentText,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.fonts.sans,
        fontWeight: 800,
        fontSize: size * 0.5,
      }}
    >
      {style === "numbered" ? index + 1 : style === "checks" ? "✓" : null}
    </div>
  );
};

export const ListScene: React.FC<SceneProps<"list">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { unit, isVertical } = useLayout();
  const style = scene.style ?? "bullets";

  // Each item appears as the narrator says its cue. Without one, items are
  // revealed evenly across the first 70% of the scene.
  const headingFrames = 12;
  const revealWindow = Math.max(
    scene.items.length * 8,
    durationInFrames * 0.7 - headingFrames,
  );
  const gap = revealWindow / scene.items.length;
  const starts = getCueFrames({
    words: getSceneWords(scene),
    cues: scene.items.map((_, index) => scene.cues?.[index]),
    fallbacks: scene.items.map((_, index) => headingFrames + index * gap),
    fps,
  });
  const itemSize = (isVertical ? 62 : 50) * unit;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28 * unit,
          ...riseIn(progressBetween(frame, 0, 12), 20 * unit),
        }}
      >
        {scene.emoji ? <Emoji emoji={scene.emoji} size={96} /> : null}
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 800,
            fontSize: (isVertical ? 80 : 76) * unit,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: theme.colors.text,
          }}
        >
          {scene.heading}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30 * unit }}>
        {scene.items.map((item, index) => {
          const start = starts[index]!;
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 28 * unit,
                ...riseIn(progressBetween(frame, start, start + 10), 24 * unit),
              }}
            >
              <Marker style={style} index={index} size={itemSize * 1.25} />
              <div
                style={{
                  fontFamily: theme.fonts.sans,
                  fontWeight: 600,
                  fontSize: itemSize,
                  lineHeight: 1.25,
                  color: theme.colors.text,
                }}
              >
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};
