/**
 * Undo and redo for the video editor. Each change to the spec is a step.
 * Typing makes many changes a second, so quick edits to the same scene are
 * merged into one step; anything else, like adding or moving a scene,
 * always starts a new one.
 */

/** Steps kept to undo. Older ones are dropped. */
export const HISTORY_LIMIT = 100;

/** Edits closer together than this are merged into one step. */
export const MERGE_WINDOW_MS = 1000;

export type History<T> = {
  past: T[];
  present: T;
  future: T[];
  /** What the last edit changed, so the next one can join its step. Null after an undo, redo or new step. */
  lastEdit: { group: string; at: number } | null;
};

export type Commit = {
  /**
   * Edits with the same group made within the merge window become one step,
   * e.g. "scene-2" while typing in scene 2. Leave it out for changes that
   * should always be their own step.
   */
  group?: string;
  /** When the change was made, in milliseconds. */
  at: number;
};

export const createHistory = <T>(present: T): History<T> => ({
  past: [],
  present,
  future: [],
  lastEdit: null,
});

/** Records a change. Redo is no longer possible after one. */
export const commit = <T>(
  history: History<T>,
  next: T,
  { group, at }: Commit,
): History<T> => {
  if (Object.is(next, history.present)) {
    return history;
  }
  const merge =
    group !== undefined &&
    history.lastEdit?.group === group &&
    at - history.lastEdit.at < MERGE_WINDOW_MS;
  return {
    past: merge
      ? history.past
      : [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastEdit: group === undefined ? null : { group, at },
  };
};

export const undo = <T>(history: History<T>): History<T> => {
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return history;
  }
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    lastEdit: null,
  };
};

export const redo = <T>(history: History<T>): History<T> => {
  const [next, ...future] = history.future;
  if (next === undefined) {
    return history;
  }
  return {
    past: [...history.past, history.present],
    present: next,
    future,
    lastEdit: null,
  };
};

/**
 * The first scene that differs between two versions of a video, so the
 * editor can show what an undo or redo changed. Null when only video-wide
 * settings differ.
 */
export const firstChangedScene = (
  before: { scenes: unknown[] },
  after: { scenes: unknown[] },
): number | null => {
  const length = Math.max(before.scenes.length, after.scenes.length);
  for (let index = 0; index < length; index++) {
    if (
      JSON.stringify(before.scenes[index]) !==
      JSON.stringify(after.scenes[index])
    ) {
      return Math.min(index, after.scenes.length - 1);
    }
  }
  return null;
};
