import type { SceneAudio, WordTiming } from "../spec/schema";

/** Extra weight for a word that ends a sentence or clause: people pause there. */
const PAUSE_WEIGHT = { sentence: 4, clause: 2 };
const SENTENCE_END = /[.!?…]["')\]]*$/;
const CLAUSE_END = /[,;:—–-]["')\]]*$/;

/** How long each word, and the pause after it, takes to say, relatively. */
const weigh = (narration: string) => {
  const words = narration.split(/\s+/).filter(Boolean);
  const speaking = words.map((word) => word.length + 1);
  const pauses = words.map((word, index) => {
    if (index === words.length - 1) return 0;
    if (SENTENCE_END.test(word)) return PAUSE_WEIGHT.sentence;
    if (CLAUSE_END.test(word)) return PAUSE_WEIGHT.clause;
    return 0;
  });
  const total = [...speaking, ...pauses].reduce((sum, w) => sum + w, 0);
  return { words, speaking, pauses, total };
};

/**
 * Roughly how long a narration takes to read, relative to others: the same
 * weights spreadWords uses. Used to guess where one scene ends in a take
 * covering the whole video.
 */
export const narrationWeight = (narration: string) => weigh(narration).total;

/**
 * Spreads a narration's words across the part of a recording where someone
 * is speaking, from `start` to `end` seconds. There's no speech-to-text, so
 * longer words get more time and a word before a full stop or comma gets a
 * little pause after it.
 */
export const spreadWords = (
  narration: string,
  start: number,
  end: number,
): WordTiming[] => {
  const { words, speaking, pauses, total } = weigh(narration);
  if (words.length === 0) return [];
  const span = Math.max(0, end - start);
  const secondsPer = span / total;

  // Milliseconds are plenty for captions and keep spec.json readable.
  const ms = (seconds: number) => Math.round(seconds * 1000) / 1000;
  let cursor = start;
  return words.map((text, index) => {
    const wordStart = cursor;
    const wordEnd = wordStart + speaking[index]! * secondsPer;
    cursor = wordEnd + pauses[index]! * secondsPer;
    // The last word ends exactly at `end`, whatever rounding did.
    return {
      text,
      start: ms(wordStart),
      end: ms(index === words.length - 1 ? Math.max(wordStart, end) : wordEnd),
    };
  });
};

/** True when the creator recorded this voice-over themselves. */
export const isSelfRecorded = (audio: SceneAudio | undefined) =>
  Boolean(audio?.selfRecorded);

/**
 * True when a self-recorded voice-over no longer matches the narration, so
 * the scene should be recorded again. Spacing changes don't count.
 */
export const needsReRecord = (scene: {
  narration: string;
  audio?: SceneAudio;
}) => {
  const recorded = scene.audio?.selfRecorded;
  if (!recorded) return false;
  const tidy = (text: string) => text.trim().replace(/\s+/g, " ");
  return tidy(recorded.narration) !== tidy(scene.narration);
};

/** Quiet kept before the first word and after the last when trimming. */
const LEAD_IN_SECONDS = 0.15;
const LEAD_OUT_SECONDS = 0.25;

/**
 * Where to trim a recording so it starts just before the first word and
 * ends just after the last, cutting the wait after the countdown and the
 * pause before Stop. `audible` lists the parts where someone is speaking.
 * Returns null when nothing in the recording was loud enough.
 */
export const speechWindow = (
  audible: { startInSeconds: number; endInSeconds: number }[],
  durationInSeconds: number,
) => {
  if (audible.length === 0) return null;
  const first = Math.min(...audible.map((part) => part.startInSeconds));
  const last = Math.max(...audible.map((part) => part.endInSeconds));
  const start = Math.max(0, first - LEAD_IN_SECONDS);
  const end = Math.min(durationInSeconds, last + LEAD_OUT_SECONDS);
  return {
    start,
    end,
    /** Where speech begins and ends, in seconds from the trimmed start. */
    speechStart: first - start,
    speechEnd: Math.min(last, end) - start,
  };
};
