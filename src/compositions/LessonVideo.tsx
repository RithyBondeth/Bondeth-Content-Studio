import { fade } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import type { CalculateMetadataFunction } from "remotion";
import type { Lesson } from "../lessons/types";
import { prepareLesson, type PreparedStep } from "../lib/prepare-lesson";
import { getLessonTiming, TRANSITION_FRAMES } from "../lib/timing";
import { CodeWalkthroughScene } from "../scenes/CodeWalkthroughScene";
import { IntroScene } from "../scenes/IntroScene";
import { OutroScene } from "../scenes/OutroScene";

export type LessonVideoProps = {
  lesson: Lesson;
  /** Filled in by `calculateLessonMetadata` before rendering. */
  preparedSteps?: PreparedStep[];
};

/** Highlights the code and sets the video length from the lesson's steps. */
export const calculateLessonMetadata: CalculateMetadataFunction<
  LessonVideoProps
> = async ({ props }) => {
  const preparedSteps = await prepareLesson(props.lesson);

  return {
    durationInFrames: getLessonTiming(props.lesson).total,
    props: { ...props, preparedSteps },
  };
};

const transition = () => (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
  />
);

/** A full lesson: intro, step-by-step code walkthrough, outro. */
export const LessonVideo: React.FC<LessonVideoProps> = ({
  lesson,
  preparedSteps,
}) => {
  if (!preparedSteps) {
    throw new Error(
      "LessonVideo needs preparedSteps. Register it with calculateMetadata={calculateLessonMetadata}.",
    );
  }

  const timing = getLessonTiming(lesson);

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={timing.intro} name="Intro">
        <IntroScene lesson={lesson} />
      </TransitionSeries.Sequence>
      {transition()}
      <TransitionSeries.Sequence
        durationInFrames={timing.walkthrough}
        name="Walkthrough"
      >
        <CodeWalkthroughScene
          lesson={lesson}
          steps={preparedSteps}
          stepDurations={timing.steps}
        />
      </TransitionSeries.Sequence>
      {transition()}
      <TransitionSeries.Sequence durationInFrames={timing.outro} name="Outro">
        <OutroScene lesson={lesson} />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
