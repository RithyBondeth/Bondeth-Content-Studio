import {
  linearTiming,
  TransitionSeries,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import type { Transition } from "../spec/schema";

type ZoomProps = Record<string, never>;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * The old scene rushes past the camera and fades, then the new one grows into
 * place. The two halves don't overlap, so the text never doubles up.
 */
const ZoomPresentation: TransitionPresentation<ZoomProps>["component"] = ({
  children,
  presentationDirection,
  presentationProgress,
}) => {
  const entering = presentationDirection === "entering";
  const scale = entering
    ? interpolate(presentationProgress, [0.5, 1], [0.8, 1], clamp)
    : interpolate(presentationProgress, [0, 0.5], [1, 1.3], clamp);
  const opacity = entering
    ? interpolate(presentationProgress, [0.5, 0.8], [0, 1], clamp)
    : interpolate(presentationProgress, [0.2, 0.5], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
};

const zoom = (): TransitionPresentation<ZoomProps> => ({
  component: ZoomPresentation,
  props: {},
});

/**
 * The <TransitionSeries.Transition> into a scene. Returned as an element rather
 * than wrapped in a component, because TransitionSeries only accepts its own
 * children directly.
 */
export const renderTransition = (
  key: string,
  transition: Exclude<Transition, "cut">,
  durationInFrames: number,
) => {
  const timing = linearTiming({
    durationInFrames,
    easing: Easing.inOut(Easing.cubic),
  });
  switch (transition) {
    case "fade":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={fade()}
          timing={timing}
        />
      );
    case "slide":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={slide({ direction: "from-right" })}
          timing={timing}
        />
      );
    case "wipe":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={wipe({ direction: "from-left" })}
          timing={timing}
        />
      );
    case "zoom":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={zoom()}
          timing={timing}
        />
      );
  }
};
