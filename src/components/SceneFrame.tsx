import { createContext, useContext } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { entranceStyle } from "../lib/animation";
import { useLayout } from "../lib/use-layout";
import type { Entrance } from "../spec/schema";

type SceneFrameProps = {
  durationInFrames: number;
  /** Keep the bottom free for captions. */
  reserveCaptions: boolean;
  align?: "center" | "start";
  children: React.ReactNode;
};

const FADE_IN = 8;
const FADE_OUT = 6;

/**
 * Which edges of a scene fade on their own. Transitions between scenes handle
 * the fading, so only the start of the first scene and the end of the last
 * one fade here.
 */
export const SceneFadeContext = createContext({ fadeIn: true, fadeOut: true });

/** How the current scene's text and items come in. */
export const EntranceContext = createContext<Entrance>("rise");

/** The current scene's entrance. */
export const useEntrance = () => useContext(EntranceContext);

/**
 * A function that styles an element coming in with the scene's entrance,
 * given how far in it is (0 → 1) and how far it travels.
 */
export const useReveal = () => {
  const entrance = useContext(EntranceContext);
  return (progress: number, distance: number) =>
    entranceStyle(entrance, progress, distance);
};

/** Padded content area that fades in and out with its scene. */
export const SceneFrame: React.FC<SceneFrameProps> = ({
  durationInFrames,
  reserveCaptions,
  align = "center",
  children,
}) => {
  const frame = useCurrentFrame();
  const { paddingX, paddingTop, captionZone, unit } = useLayout();
  const { fadeIn, fadeOut } = useContext(SceneFadeContext);

  const opacity =
    (fadeIn
      ? interpolate(frame, [0, FADE_IN], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1) *
    (fadeOut
      ? interpolate(
          frame,
          [durationInFrames - FADE_OUT, durationInFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 1);
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
