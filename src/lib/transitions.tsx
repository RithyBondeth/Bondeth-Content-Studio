import {
  linearTiming,
  TransitionSeries,
  type TransitionPresentation,
} from "@remotion/transitions";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { iris } from "@remotion/transitions/iris";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import type { Transition } from "../spec/schema";

type NoProps = Record<string, never>;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/**
 * The old scene rushes past the camera and fades, then the new one grows into
 * place. The two halves don't overlap, so the text never doubles up.
 */
const ZoomPresentation: TransitionPresentation<NoProps>["component"] = ({
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

const zoom = (): TransitionPresentation<NoProps> => ({
  component: ZoomPresentation,
  props: {},
});

/**
 * The old scene melts into a blur as the new one comes into focus. Like the
 * zoom, the halves barely overlap, so two blocks of text never mix.
 */
const BlurPresentation: TransitionPresentation<NoProps>["component"] = ({
  children,
  presentationDirection,
  presentationProgress,
}) => {
  const entering = presentationDirection === "entering";
  const blur = entering
    ? interpolate(presentationProgress, [0.4, 1], [24, 0], clamp)
    : interpolate(presentationProgress, [0, 0.6], [0, 24], clamp);
  const opacity = entering
    ? interpolate(presentationProgress, [0.4, 0.75], [0, 1], clamp)
    : interpolate(presentationProgress, [0.25, 0.6], [1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity,
        filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const blurThrough = (): TransitionPresentation<NoProps> => ({
  component: BlurPresentation,
  props: {},
});

/** The new scene opens from a seam down the middle, like a pair of doors. */
const SplitPresentation: TransitionPresentation<NoProps>["component"] = ({
  children,
  presentationDirection,
  presentationProgress,
}) => {
  if (presentationDirection === "exiting") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }
  const closed = (1 - presentationProgress) * 50;
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 ${closed}% 0 ${closed}%)` }}>
      {children}
    </AbsoluteFill>
  );
};

const split = (): TransitionPresentation<NoProps> => ({
  component: SplitPresentation,
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
  /** The video's size, for the shape-based reveals (iris and clock). */
  size: { width: number; height: number },
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
    case "push":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={slide({ direction: "from-bottom" })}
          timing={timing}
        />
      );
    case "iris":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={iris(size)}
          timing={timing}
        />
      );
    case "clock":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={clockWipe(size)}
          timing={timing}
        />
      );
    case "flip":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={flip({ direction: "from-right" })}
          timing={timing}
        />
      );
    case "blur":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={blurThrough()}
          timing={timing}
        />
      );
    case "split":
      return (
        <TransitionSeries.Transition
          key={key}
          presentation={split()}
          timing={timing}
        />
      );
  }
};
