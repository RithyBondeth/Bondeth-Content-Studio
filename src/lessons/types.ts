import type { SupportedLanguage } from "../lib/highlight";

export type CodeStep = {
  /** The full code shown during this step. Lines added since the previous step animate in. */
  code: string;
  /** On-screen caption explaining the step. */
  caption: string;
  /** Lines to highlight, 1-based. Accepts numbers and ranges, e.g. "2,4-6". */
  highlight?: string;
  /** Optional file name shown in the editor title bar. Defaults to the lesson's file name. */
  fileName?: string;
  /** How long this step stays on screen. Defaults to 5 seconds. */
  durationInSeconds?: number;
};

export type Lesson = {
  /** Used to build composition IDs, e.g. "react-use-state" -> "react-use-state-landscape". Letters, numbers, and hyphens only. */
  slug: string;
  title: string;
  subtitle?: string;
  language: SupportedLanguage;
  fileName?: string;
  steps: CodeStep[];
  outro?: {
    message?: string;
    nextUp?: string;
  };
};
