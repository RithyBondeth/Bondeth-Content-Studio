import type { Scene, WordTiming } from "../spec/schema";
import { getSceneSeconds } from "./timing";

export type CaptionPage = {
  words: WordTiming[];
  start: number;
  end: number;
};

/**
 * Spreads a narration's words across a time span, weighted by word length.
 * Used for captions when a scene has no voice-over timings yet.
 */
export const estimateWordTimings = (
  narration: string,
  durationInSeconds: number,
): WordTiming[] => {
  const words = narration.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const start = 0.15;
  const span = Math.max(0.5, durationInSeconds - start - 0.3);
  const weights = words.map((word) => word.length + 2);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let cursor = start;
  return words.map((text, index) => {
    const length = (weights[index]! / totalWeight) * span;
    const timing = { text, start: cursor, end: cursor + length };
    cursor += length;
    return timing;
  });
};

/** The scene's word timings: from the voice-over, or estimated until it's recorded. */
export const getSceneWords = (scene: Scene): WordTiming[] =>
  scene.audio?.words ??
  estimateWordTimings(scene.narration, getSceneSeconds(scene));

const SENTENCE_END = /[.!?…:;]$/;

/**
 * Groups words into short caption pages. A page ends at `maxWords`, at the
 * end of a sentence, or before a noticeable pause.
 */
export const toCaptionPages = (
  words: WordTiming[],
  maxWords: number,
): CaptionPage[] => {
  const pages: CaptionPage[] = [];
  let current: WordTiming[] = [];

  const flush = () => {
    if (current.length > 0) {
      pages.push({
        words: current,
        start: current[0]!.start,
        end: current[current.length - 1]!.end,
      });
      current = [];
    }
  };

  words.forEach((word, index) => {
    current.push(word);
    const next = words[index + 1];
    const pauseFollows = next !== undefined && next.start - word.end > 0.45;
    if (
      current.length >= maxWords ||
      SENTENCE_END.test(word.text) ||
      pauseFollows
    ) {
      flush();
    }
  });
  flush();

  return pages;
};
