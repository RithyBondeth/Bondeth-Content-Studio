import type { CodeStep } from "../spec/schema";
import { findAddedLines } from "./diff-lines";
import {
  highlightCode,
  normalizeCode,
  type HighlightedLine,
} from "./highlight";
import type { SupportedLanguage } from "./languages";
import { parseLineRanges } from "./line-ranges";

/** A code step with its code highlighted and diffed against the previous step. */
export type PreparedCodeStep = {
  lines: HighlightedLine[];
  addedLines: boolean[];
  highlightedLines: number[];
};

export const prepareCodeSteps = async (
  steps: CodeStep[],
  language: SupportedLanguage,
): Promise<PreparedCodeStep[]> => {
  const plainLines = steps.map((step) =>
    normalizeCode(step.code).split(/\r?\n/),
  );

  return Promise.all(
    steps.map(async (step, index) => ({
      lines: await highlightCode(step.code, language),
      addedLines: findAddedLines(
        plainLines[index - 1] ?? [],
        plainLines[index]!,
      ),
      highlightedLines: parseLineRanges(step.highlight),
    })),
  );
};
