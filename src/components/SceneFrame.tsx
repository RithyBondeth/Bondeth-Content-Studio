import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useLayout } from "../lib/use-layout";

type SceneFrameProps = {
  durationInFrames: number;
  /** Keep the bottom free for captions. */
  reserveCaptions: boolean;
  align?: "center" | "start";
  children: React.ReactNode;
};

const FADE_IN = 8;
const FADE_OUT = 6;

/** Padded content area that fades in and out with its scene. */
export const SceneFrame: React.FC<SceneFrameProps> = ({
  durationInFrames,
  reserveCaptions,
  align = "center",
  children,
}) => {
  const frame = useCurrentFrame();
  const { paddingX, paddingTop, captionZone, unit } = useLayout();

  const opacity = interpolate(
    frame,
    [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const scale = interpolate(frame, [0, FADE_IN], [0.98, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
        paddingTop,
        paddingLeft: paddingX,
        paddingRight: paddingX,
        paddingBottom: reserveCaptions ? captionZone : paddingTop,
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: 40 * unit,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
