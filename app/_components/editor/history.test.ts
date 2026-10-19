import assert from "node:assert/strict";
import { test } from "node:test";
import {
  commit,
  createHistory,
  firstChangedScene,
  HISTORY_LIMIT,
  MERGE_WINDOW_MS,
  redo,
  undo,
} from "./history";

test("undo and redo step back and forth through changes", () => {
  let history = createHistory("a");
  history = commit(history, "b", { at: 0 });
  history = commit(history, "c", { at: 5000 });
  history = undo(history);
  assert.equal(history.present, "b");
  history = undo(history);
  assert.equal(history.present, "a");
  // Nothing left to undo.
  assert.equal(undo(history), history);
  history = redo(redo(history));
  assert.equal(history.present, "c");
  assert.equal(redo(history), history);
});

test("quick edits to the same thing merge into one step", () => {
  let history = createHistory("");
  for (const [index, text] of ["H", "He", "Hel", "Hell", "Hello"].entries()) {
    history = commit(history, text, { group: "scene-0", at: index * 200 });
  }
  assert.equal(undo(history).present, "");
});

test("a pause, another scene, or a structural change starts a new step", () => {
  let history = createHistory("");
  history = commit(history, "a", { group: "scene-0", at: 0 });
  history = commit(history, "ab", {
    group: "scene-0",
    at: MERGE_WINDOW_MS + 1,
  });
  assert.equal(undo(history).present, "a");

  history = commit(history, "abc", {
    group: "scene-1",
    at: MERGE_WINDOW_MS + 2,
  });
  assert.equal(undo(history).present, "ab");

  // No group: always its own step, and the next edit doesn't join it.
  history = commit(history, "abcd", { at: MERGE_WINDOW_MS + 3 });
  history = commit(history, "abcde", {
    group: "scene-1",
    at: MERGE_WINDOW_MS + 4,
  });
  assert.equal(undo(history).present, "abcd");
  assert.equal(undo(undo(history)).present, "abc");
});

test("typing right after an undo doesn't merge into the undone step", () => {
  let history = createHistory("a");
  history = commit(history, "ab", { group: "scene-0", at: 0 });
  history = undo(history);
  history = commit(history, "ax", { group: "scene-0", at: 10 });
  assert.equal(undo(history).present, "a");
});

test("a new change clears redo", () => {
  let history = createHistory("a");
  history = commit(history, "b", { at: 0 });
  history = undo(history);
  history = commit(history, "c", { at: 10 });
  assert.equal(redo(history), history);
});

test("setting the same value changes nothing", () => {
  const history = commit(createHistory("a"), "b", { at: 0 });
  assert.equal(commit(history, history.present, { at: 10 }), history);
});

test("only the most recent steps are kept", () => {
  let history = createHistory(0);
  for (let value = 1; value <= HISTORY_LIMIT + 20; value++) {
    history = commit(history, value, { at: value * 5000 });
  }
  assert.equal(history.past.length, HISTORY_LIMIT);
  assert.equal(history.past[0], 20);
});

test("finds the first scene an undo changes", () => {
  const before = { scenes: [{ a: 1 }, { b: 2 }, { c: 3 }] };
  assert.equal(
    firstChangedScene(before, { scenes: [{ a: 1 }, { b: 9 }, { c: 3 }] }),
    1,
  );
  // A removed last scene points at the new last scene.
  assert.equal(firstChangedScene(before, { scenes: [{ a: 1 }, { b: 2 }] }), 1);
  assert.equal(firstChangedScene(before, before), null);
});
