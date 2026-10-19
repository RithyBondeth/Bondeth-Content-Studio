import { TransitionSeries } from "@remotion/transitions";
import { Fragment, useMemo } from "react";
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  Sequence,
  staticFile,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { Background } from "../components/Background";
import { Captions } from "../components/Captions";
import { SceneFadeContext } from "../components/SceneFrame";
import { getSceneWords } from "../lib/captions";
import { getDuckFactor, getNarrationSpans, type Span } from "../lib/ducking";
import { prepareCodeSteps, type PreparedCodeStep } from "../lib/prepare-code";
import { getSoundSchedule, SOUNDS } from "../lib/sfx";
import { FPS, getVideoTiming } from "../lib/timing";
import { renderTransition } from "../lib/transitions";
import { ChartScene } from "../scenes/ChartScene";
import { CodeScene } from "../scenes/CodeScene";
import { ComparisonScene } from "../scenes/ComparisonScene";
import { CtaScene } from "../scenes/CtaScene";
import { ListScene } from "../scenes/ListScene";
import { QuoteScene } from "../scenes/QuoteScene";
import { StatementScene } from "../scenes/StatementScene";
import { StatScene } from "../scenes/StatScene";
import { TitleScene } from "../scenes/TitleScene";
import {
  videoSpecSchema,
  type Scene,
  type VideoSpec,
  type VideoSpecInput,
} from "../spec/schema";

export type ExplainerVideoProps = {
  spec: VideoSpecInput;
  /** Highlighted code for each code scene, keyed by scene index. Filled in by calculateMetadata. */
  codeSteps?: Record<number, PreparedCodeStep[]>;
};

/** Validates the spec, highlights code, and sets the video length. */
export const calculateExplainerMetadata: CalculateMetadataFunction<
  ExplainerVideoProps
> = async ({ props }) => {
  const result = videoSpecSchema.safeParse(props.spec);
  if (!result.success) {
    throw new Error(`Invalid video spec:\n${result.error.message}`);
  }
  const spec = result.data;

  const codeSteps: Record<number, PreparedCodeStep[]> = {};
  await Promise.all(
    spec.scenes.map(async (scene, index) => {
      if (scene.type === "code") {
        codeSteps[index] = await prepareCodeSteps(scene.steps, scene.language);
      }
    }),
  );

  return {
    durationInFrames: getVideoTiming(spec).total,
    fps: FPS,
    props: { spec, codeSteps },
  };
};

/** Files in public/ are referenced by relative path; anything with a scheme is used as-is. */
const resolveMedia = (src: string) =>
  /^[a-z]+:/i.test(src) ? src : staticFile(src);

type SceneViewProps = {
  scene: Scene;
  durationInFrames: number;
  reserveCaptions: boolean;
  codeSteps?: PreparedCodeStep[];
};

const SceneView: React.FC<SceneViewProps> = ({ scene, ...rest }) => {
  switch (scene.type) {
    case "title":
      return <TitleScene scene={scene} {...rest} />;
    case "statement":
      return <StatementScene scene={scene} {...rest} />;
    case "list":
      return <ListScene scene={scene} {...rest} />;
    case "stat":
      return <StatScene scene={scene} {...rest} />;
    case "chart":
      return <ChartScene scene={scene} {...rest} />;
    case "quote":
      return <QuoteScene scene={scene} {...rest} />;
    case "comparison":
      return <ComparisonScene scene={scene} {...rest} />;
    case "code":
      return <CodeScene scene={scene} {...rest} />;
    case "cta":
      return <CtaScene scene={scene} {...rest} />;
  }
};

const Music: React.FC<{
  music: NonNullable<VideoSpec["music"]>;
  /** When the voice-over is playing; the music ducks under it. */
  narration: Span[];
}> = ({ music, narration }) => {
  const { durationInFrames, fps } = useVideoConfig();
  return (
    <Html5Audio
      src={resolveMedia(music.src)}
      loop
      // Fade in over 1s and out over the last 2s, and duck under the narration.
      volume={(frame) =>
        music.volume *
        getDuckFactor(frame, narration) *
        interpolate(
          frame,
          [0, fps, durationInFrames - 2 * fps, durationInFrames],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      }
    />
  );
};

/** A full video: scenes in order, each with its voice-over and captions. */
export const ExplainerVideo: React.FC<ExplainerVideoProps> = (props) => {
  const spec = useMemo(() => videoSpecSchema.parse(props.spec), [props.spec]);
  const timing = useMemo(() => getVideoTiming(spec), [spec]);
  const narration = useMemo(
    () => getNarrationSpans(spec.scenes, timing.starts, FPS),
    [spec, timing],
  );
  const sounds = useMemo(
    () => getSoundSchedule(spec, timing, FPS),
    [spec, timing],
  );
  const last = spec.scenes.length - 1;

  return (
    <AbsoluteFill>
      <Background />
      {spec.music ? <Music music={spec.music} narration={narration} /> : null}

      {/* Sound effects, at most one per frame. */}
      {sounds.map(({ sound, frame }) => (
        <Sequence
          key={`${sound}-${frame}`}
          from={frame}
          durationInFrames={SOUNDS[sound].durationInFrames}
          layout="none"
          name={`sfx: ${sound}`}
        >
          <Html5Audio
            src={staticFile(SOUNDS[sound].src)}
            volume={SOUNDS[sound].volume}
          />
        </Sequence>
      ))}

      {/* Visuals. Each scene stays up while the next one transitions in over it. */}
      <TransitionSeries>
        {spec.scenes.map((scene, index) => {
          const transitionFrames = timing.transitions[index]!;
          const transition = scene.transition ?? "fade";
          return (
            <Fragment key={index}>
              {transitionFrames > 0 && transition !== "cut"
                ? renderTransition(
                    `transition-${index}`,
                    transition,
                    transitionFrames,
                  )
                : null}
              <TransitionSeries.Sequence
                durationInFrames={timing.sequences[index]!}
                name={`${index + 1}. ${scene.type}`}
              >
                {/* Each scene has its own backdrop, so wipes and slides reveal a whole frame. */}
                <Background frameOffset={timing.starts[index]} />
                <SceneFadeContext.Provider
                  value={{ fadeIn: index === 0, fadeOut: index === last }}
                >
                  <SceneView
                    scene={scene}
                    durationInFrames={timing.scenes[index]!}
                    reserveCaptions={spec.captions}
                    codeSteps={props.codeSteps?.[index]}
                  />
                </SceneFadeContext.Provider>
              </TransitionSeries.Sequence>
            </Fragment>
          );
        })}
      </TransitionSeries>

      {/* Voice-over and captions run on their own timeline, so they never overlap or move with a transition. */}
      {spec.scenes.map((scene, index) => {
        return (
          <Sequence
            key={index}
            from={timing.starts[index]}
            durationInFrames={timing.scenes[index]}
            name={`${index + 1}. voice-over`}
          >
            {scene.audio ? (
              <Html5Audio src={resolveMedia(scene.audio.src)} />
            ) : null}
            {spec.captions ? <Captions words={getSceneWords(scene)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
