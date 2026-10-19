import { narrationWeight, speechWindow } from "./recording";

/**
 * Splitting one voice-over take that covers the whole video into one piece
 * per scene. There's no speech-to-text, so the cuts go in pauses: the take
 * is split at the pauses closest to where each scene should end, judging by
 * how long each scene's narration is (or by when the creator moved on to
 * the next scene while recording).
 */

/** A stretch of a recording, in seconds. */
export type Span = { startInSeconds: number; endInSeconds: number };

/** A take shorter than this per scene is too short to split. */
const MIN_SECONDS_PER_SCENE = 0.5;
/**
 * A longer pause is a likelier place for a new scene: each second of pause
 * (up to MAX_PAUSE_CREDIT) is worth this many seconds of distance from where
 * the cut was expected.
 */
const PAUSE_BONUS = 2;
const MAX_PAUSE_CREDIT = 1.5;

/** The quiet gaps between the parts where someone speaks. */
export const pausesBetween = (audible: Span[]): Span[] =>
  audible.slice(1).map((part, index) => ({
    startInSeconds: audible[index]!.endInSeconds,
    endInSeconds: part.startInSeconds,
  }));

/** Where a cut in a pause goes: its middle, so both scenes get some quiet. */
export const cutTime = (pause: Span) =>
  (pause.startInSeconds + pause.endInSeconds) / 2;

/**
 * Where each scene should end if the take is read at an even pace from
 * `start` to `end`: one time per boundary between scenes.
 */
export const expectedCuts = (weights: number[], start: number, end: number) => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return weights.slice(1).map(() => start);
  let sum = 0;
  return weights.slice(0, -1).map((weight) => {
    sum += weight;
    return start + ((end - start) * sum) / total;
  });
};

/**
 * Picks one pause for each expected cut, in order and each pause at most
 * once, keeping the cuts as close as possible to where they were expected
 * while preferring longer pauses. Returns the pauses' indices, or null when
 * there aren't enough pauses.
 */
export const chooseCuts = (pauses: Span[], expected: number[]) => {
  const boundaries = expected.length;
  if (boundaries === 0) return [];
  if (pauses.length < boundaries) return null;

  const cost = (boundary: number, pause: Span) =>
    Math.abs(cutTime(pause) - expected[boundary]!) -
    PAUSE_BONUS *
      Math.min(MAX_PAUSE_CREDIT, pause.endInSeconds - pause.startInSeconds);

  // best[b][p]: the lowest total cost with boundary b in pause p, and the
  // pause boundary b - 1 used to get there.
  const best: { total: number; from: number }[][] = [];
  for (let b = 0; b < boundaries; b++) {
    const row: { total: number; from: number }[] = [];
    let cheapest = { total: Infinity, from: -1 };
    for (let p = 0; p < pauses.length; p++) {
      // Boundary b - 1 must be in an earlier pause than p.
      if (b > 0 && p > 0 && best[b - 1]![p - 1]!.total < cheapest.total) {
        cheapest = { total: best[b - 1]![p - 1]!.total, from: p - 1 };
      }
      const reachable =
        p >= b &&
        pauses.length - p >= boundaries - b &&
        (b === 0 || cheapest.from >= 0);
      row.push(
        reachable
          ? {
              total: (b === 0 ? 0 : cheapest.total) + cost(b, pauses[p]!),
              from: b === 0 ? -1 : cheapest.from,
            }
          : { total: Infinity, from: -1 },
      );
    }
    best.push(row);
  }

  const last = best[boundaries - 1]!;
  let pause = last.reduce(
    (min, cell, p) => (cell.total < last[min]!.total ? p : min),
    0,
  );
  const chosen: number[] = [];
  for (let b = boundaries - 1; b >= 0; b--) {
    chosen.unshift(pause);
    pause = best[b]![pause]!.from;
  }
  return chosen;
};

/**
 * Moves one cut to the previous (-1) or next (+1) pause, as long as it stays
 * between its neighbours. Returns null when it can't move that way.
 */
export const nudgeCut = (
  cuts: number[],
  boundary: number,
  direction: -1 | 1,
  pauseCount: number,
) => {
  const next = cuts[boundary]! + direction;
  const lowest = boundary === 0 ? 0 : cuts[boundary - 1]! + 1;
  const highest =
    boundary === cuts.length - 1 ? pauseCount - 1 : cuts[boundary + 1]! - 1;
  if (next < lowest || next > highest) return null;
  return cuts.map((cut, index) => (index === boundary ? next : cut));
};

/**
 * Plans how to split a take: finds the pauses and picks one per boundary
 * between scenes. `hints` are the times (in seconds) the creator moved on to
 * the next scene while recording; used instead of the narration lengths when
 * there's one per boundary. Throws a message for the creator when the take
 * can't be split.
 */
export const planTake = ({
  audible,
  narrations,
  hints,
}: {
  audible: Span[];
  narrations: string[];
  hints?: number[];
}) => {
  const scenes = narrations.length;
  if (scenes === 0) throw new Error("Add a scene first.");
  if (audible.length === 0) {
    throw new Error(
      "We couldn't hear anything. Check your microphone and try again.",
    );
  }
  const start = audible[0]!.startInSeconds;
  const end = audible.at(-1)!.endInSeconds;
  if (end - start < MIN_SECONDS_PER_SCENE * scenes) {
    throw new Error(
      `That take is only ${(end - start).toFixed(1)}s of speech, too short for ${scenes} scenes. Read the whole script in one go.`,
    );
  }

  const pauses = pausesBetween(audible);
  const useHints =
    hints?.length === scenes - 1 &&
    hints.every((hint, index) => index === 0 || hint > hints[index - 1]!);
  const expected = useHints
    ? hints
    : expectedCuts(narrations.map(narrationWeight), start, end);
  const cuts = chooseCuts(pauses, expected);
  if (!cuts) {
    throw new Error(
      `We found ${pauses.length} pause${pauses.length === 1 ? "" : "s"} but need ${scenes - 1} to split ${scenes} scenes. Pause for a second between scenes and try again.`,
    );
  }
  return { pauses, cuts };
};

/**
 * The part of a take from `from` to `to` seconds to keep for one scene:
 * trimmed to just before the first word and just after the last, like a
 * per-scene recording. Null when nobody speaks in it.
 */
export const pieceWindow = (audible: Span[], from: number, to: number) => {
  const inside = audible
    .map((part) => ({
      startInSeconds: Math.max(part.startInSeconds, from) - from,
      endInSeconds: Math.min(part.endInSeconds, to) - from,
    }))
    .filter((part) => part.endInSeconds > part.startInSeconds);
  const window = speechWindow(inside, to - from);
  if (!window) return null;
  return {
    /** Where to cut, in seconds from the start of the take. */
    start: from + window.start,
    end: from + window.end,
    /** Where speech begins and ends, in seconds from the piece's start. */
    speechStart: window.speechStart,
    speechEnd: window.speechEnd,
  };
};

/**
 * Each scene's piece of a take, given the cut times between scenes.
 * Throws when a cut is out of order or a scene's piece has no speech.
 */
export const takePieces = (
  audible: Span[],
  cuts: number[],
  durationInSeconds: number,
) => {
  const bounds = [0, ...cuts, durationInSeconds];
  return bounds.slice(1).map((to, scene) => {
    const from = bounds[scene]!;
    const window = to > from ? pieceWindow(audible, from, to) : null;
    if (!window) {
      throw new Error(
        `Scene ${scene + 1} would be silent. Move the cuts around it and try again.`,
      );
    }
    return window;
  });
};
