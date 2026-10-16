import type { Lesson } from "../lessons/types";

export const FPS = 30;

const INTRO_SECONDS = 3.5;
const OUTRO_SECONDS = 4;
const DEFAULT_STEP_SECONDS = 5;

/** Length of the fade between intro, walkthrough, and outro. */
export const TRANSITION_FRAMES = 15;

export type LessonTiming = {
  intro: number;
  steps: number[];
  walkthrough: number;
  outro: number;
  total: number;
};

export const getLessonTiming = (lesson: Lesson): LessonTiming => {
  const toFrames = (seconds: number) => Math.round(seconds * FPS);

  const intro = toFrames(INTRO_SECONDS);
  const outro = toFrames(OUTRO_SECONDS);
  const steps = lesson.steps.map((step) =>
    toFrames(step.durationInSeconds ?? DEFAULT_STEP_SECONDS),
  );
  const walkthrough = steps.reduce((sum, frames) => sum + frames, 0);

  // Each of the two transitions overlaps the scenes on either side of it.
  const total = intro + walkthrough + outro - 2 * TRANSITION_FRAMES;

  return { intro, steps, walkthrough, outro, total };
};
