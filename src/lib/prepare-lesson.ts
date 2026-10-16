import type { Lesson } from "../lessons/types";
import { findAddedLines } from "./diff-lines";
import {
  highlightCode,
  normalizeCode,
  type HighlightedLine,
} from "./highlight";
import { parseLineRanges } from "./line-ranges";

/** A step with its code already highlighted and diffed against the previous step. */
export type PreparedStep = {
  lines: HighlightedLine[];
  addedLines: boolean[];
  highlightedLines: number[];
};

const SLUG_PATTERN = /^[a-zA-Z0-9-]+$/;

export const validateLesson = (lesson: Lesson) => {
  if (!SLUG_PATTERN.test(lesson.slug)) {
    throw new Error(
      `Lesson slug "${lesson.slug}" may only contain letters, numbers, and hyphens.`,
    );
  }
  if (lesson.steps.length === 0) {
    throw new Error(`Lesson "${lesson.slug}" needs at least one step.`);
  }
  lesson.steps.forEach((step, index) => {
    if (step.durationInSeconds !== undefined && step.durationInSeconds < 1) {
      throw new Error(
        `Step ${index + 1} of "${lesson.slug}" must last at least 1 second.`,
      );
    }
  });
};

export const prepareLesson = async (
  lesson: Lesson,
): Promise<PreparedStep[]> => {
  validateLesson(lesson);

  const plainLines = lesson.steps.map((step) =>
    normalizeCode(step.code).split(/\r?\n/),
  );

  return Promise.all(
    lesson.steps.map(async (step, index) => ({
      lines: await highlightCode(step.code, lesson.language),
      addedLines: findAddedLines(
        plainLines[index - 1] ?? [],
        plainLines[index]!,
      ),
      highlightedLines: parseLineRanges(step.highlight),
    })),
  );
};
