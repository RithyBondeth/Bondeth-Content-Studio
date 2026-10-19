import type { Scene, WordTiming } from "../spec/schema";
import { getSceneWords } from "./captions";

/** Start a cued animation this many frames before its word, so it lands as the word is heard. */
export const CUE_LEAD_FRAMES = 4;

/** Lowercase letters and digits only, so "Blue," matches "blue". */
const normalize = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

/**
 * Finds `phrase` in the words, starting at `fromIndex`. Returns the index of
 * its first word and how many words it covers, or undefined if it isn't there.
 * Case and punctuation are ignored, and the phrase may span several words.
 * Words are compared without spaces, so "well known" also matches "well-known".
 */
export const findPhrase = (
  words: WordTiming[],
  phrase: string,
  fromIndex = 0,
): { index: number; length: number } | undefined => {
  const target = normalize(phrase);
  if (!target) {
    return undefined;
  }
  const tokens = words.map((word) => normalize(word.text));

  for (let start = Math.max(0, fromIndex); start < tokens.length; start++) {
    // A phrase starts on a spoken word, not on punctuation.
    if (!tokens[start] || !target.startsWith(tokens[start]!)) {
      continue;
    }
    let joined = "";
    for (let end = start; end < tokens.length; end++) {
      joined += tokens[end];
      if (joined === target) {
        return { index: start, length: end - start + 1 };
      }
      if (!target.startsWith(joined)) {
        break;
      }
    }
  }
  return undefined;
};

/**
 * Finds each cue in the words, in order: a cue is searched for after the
 * previous cue's match, so a phrase said twice matches its next mention.
 * Missing cues, and cues that aren't found, are undefined.
 */
export const matchCues = (
  words: WordTiming[],
  cues: (string | undefined)[],
): ({ index: number; length: number } | undefined)[] => {
  let searchFrom = 0;
  return cues.map((cue) => {
    const match = cue ? findPhrase(words, cue, searchFrom) : undefined;
    if (match) {
      searchFrom = match.index + match.length;
    }
    return match;
  });
};

/**
 * Start frame for each cue, relative to the scene's first frame. Cues are
 * searched in order, so a phrase said twice matches the next mention after
 * the previous cue. A missing cue, or one that isn't in the narration, uses
 * its fallback frame. Frames never go backwards, so items keep their order.
 */
export const getCueFrames = ({
  words,
  cues,
  fallbacks,
  fps,
}: {
  words: WordTiming[];
  cues: (string | undefined)[];
  fallbacks: number[];
  fps: number;
}): number[] => {
  const matches = matchCues(
    words,
    fallbacks.map((_, index) => cues[index]),
  );
  let previous = 0;
  return fallbacks.map((fallback, index) => {
    const match = matches[index];
    const frame = match
      ? Math.max(
          0,
          Math.round(words[match.index]!.start * fps) - CUE_LEAD_FRAMES,
        )
      : fallback;
    previous = Math.max(previous, frame);
    return previous;
  });
};

/** Start frame for a single cue, or `fallback` when it isn't found. */
export const getCueFrame = (
  words: WordTiming[],
  cue: string | undefined,
  fallback: number,
  fps: number,
) => getCueFrames({ words, cues: [cue], fallbacks: [fallback], fps })[0]!;

/** The scene's cues in the order its scene template matches them, with their paths in the spec. */
const getSceneCues = (
  scene: Scene,
): { path: string; cue: string | undefined }[] => {
  switch (scene.type) {
    case "list":
      return scene.items.map((_, index) => ({
        path: `cues.${index}`,
        cue: scene.cues?.[index],
      }));
    case "chart":
      return scene.points.map((point, index) => ({
        path: `points.${index}.cue`,
        cue: point.cue,
      }));
    case "diagram":
      return scene.nodes.map((node, index) => ({
        path: `nodes.${index}.cue`,
        cue: node.cue,
      }));
    case "stat":
      return [{ path: "cue", cue: scene.cue }];
    case "comparison":
      return [
        { path: "left.cue", cue: scene.left.cue },
        { path: "right.cue", cue: scene.right.cue },
      ];
    case "code":
      // The first step is always shown from the start, so its cue is ignored.
      return scene.steps.map((step, index) => ({
        path: `steps.${index}.cue`,
        cue: index === 0 ? undefined : step.cue,
      }));
    default:
      return [];
  }
};

/**
 * Paths of the scene's cues that aren't in its narration, such as "cues.2",
 * "cue", "left.cue", "points.1.cue", or "steps.1.cue". Cues are matched in order, like the
 * scene templates do, so a cue only said before the previous cue is unmatched.
 * These cues fall back to fixed timing when the video renders.
 */
export const findUnmatchedCues = (scene: Scene): string[] => {
  const sceneCues = getSceneCues(scene);
  if (!sceneCues.some(({ cue }) => cue?.trim())) {
    return [];
  }
  const matches = matchCues(
    getSceneWords(scene),
    sceneCues.map(({ cue }) => cue),
  );
  return sceneCues
    .filter(({ cue }, index) => cue?.trim() && !matches[index])
    .map(({ path }) => path);
};

/**
 * Carries list cues over when the items are edited, so each cue stays with
 * its item when lines are added, removed, or reordered. Items with the same
 * text keep their cue; an edited item keeps the cue at its position. Returns
 * one cue per item, or undefined when no item has a cue.
 */
export const moveCuesWithItems = (
  previousItems: string[],
  items: string[],
  cues: string[] | undefined,
): string[] | undefined => {
  if (!cues) {
    return undefined;
  }
  const cueAt = (index: number) => cues[index] ?? "";
  const next: (string | undefined)[] = items.map(() => undefined);

  // Unchanged lines at the start and end keep their cues.
  let head = 0;
  while (
    head < items.length &&
    head < previousItems.length &&
    items[head] === previousItems[head]
  ) {
    next[head] = cueAt(head);
    head++;
  }
  let tail = 0;
  while (
    tail < items.length - head &&
    tail < previousItems.length - head &&
    items[items.length - 1 - tail] ===
      previousItems[previousItems.length - 1 - tail]
  ) {
    next[items.length - 1 - tail] = cueAt(previousItems.length - 1 - tail);
    tail++;
  }

  // In the changed middle, moved lines find their cue by text, and edited
  // lines keep the cue at their position if no lines were added or removed.
  const oldMiddle = previousItems
    .slice(head, previousItems.length - tail)
    .map((_, offset) => head + offset);
  const unclaimed = new Set(oldMiddle);
  const newMiddle = items
    .slice(head, items.length - tail)
    .map((_, offset) => head + offset);
  for (const index of newMiddle) {
    const same = oldMiddle.find(
      (old) => unclaimed.has(old) && previousItems[old] === items[index],
    );
    if (same !== undefined) {
      next[index] = cueAt(same);
      unclaimed.delete(same);
    }
  }
  if (oldMiddle.length === newMiddle.length) {
    newMiddle.forEach((index, offset) => {
      const old = oldMiddle[offset]!;
      if (next[index] === undefined && unclaimed.has(old)) {
        next[index] = cueAt(old);
        unclaimed.delete(old);
      }
    });
  }

  const result = next.map((cue) => cue ?? "");
  return result.some((cue) => cue.trim()) ? result : undefined;
};
