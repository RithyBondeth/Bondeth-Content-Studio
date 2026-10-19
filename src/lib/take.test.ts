import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chooseCuts,
  cutTime,
  expectedCuts,
  nudgeCut,
  pausesBetween,
  pieceWindow,
  planTake,
  takePieces,
  type Span,
} from "./take";

const span = (startInSeconds: number, endInSeconds: number): Span => ({
  startInSeconds,
  endInSeconds,
});

test("pauses are the gaps between the audible parts", () => {
  assert.deepEqual(pausesBetween([span(0.5, 2), span(2.4, 4), span(5, 6)]), [
    span(2, 2.4),
    span(4, 5),
  ]);
  assert.deepEqual(pausesBetween([span(0, 1)]), []);
  assert.equal(cutTime(span(4, 5)), 4.5);
});

test("expected cuts split the speech in proportion to the weights", () => {
  assert.deepEqual(expectedCuts([1, 1], 0, 10), [5]);
  assert.deepEqual(expectedCuts([1, 3], 2, 10), [4]);
  assert.deepEqual(expectedCuts([2, 1, 1], 0, 8), [4, 6]);
  assert.deepEqual(expectedCuts([5], 0, 8), []);
});

test("each cut goes in the pause closest to where it was expected", () => {
  const pauses = [span(1, 1.4), span(3, 3.4), span(6, 6.4), span(9, 9.4)];
  assert.deepEqual(chooseCuts(pauses, [3.1, 6.3]), [1, 2]);
  assert.deepEqual(chooseCuts(pauses, [0.5]), [0]);
  assert.deepEqual(chooseCuts(pauses, []), []);
});

test("a long pause wins over a short one that's a little closer", () => {
  // A breath at 5s and a proper pause between scenes at 6s.
  const pauses = [span(4.9, 5.3), span(6, 7.5)];
  assert.deepEqual(chooseCuts(pauses, [5]), [1]);
  // But not when the long pause is far from where the scene should end.
  assert.deepEqual(chooseCuts([span(4.9, 5.3), span(15, 16.5)], [5]), [0]);
});

test("two cuts never share a pause, and stay in order", () => {
  // Both scenes are expected to end near the same pause.
  const pauses = [span(2, 2.5), span(5, 5.5), span(8, 8.5)];
  const cuts = chooseCuts(pauses, [5.1, 5.3])!;
  assert.equal(cuts.length, 2);
  assert.ok(cuts[0]! < cuts[1]!);
  // Uses every pause when there are exactly enough.
  assert.deepEqual(chooseCuts(pauses, [9, 9, 9]), [0, 1, 2]);
});

test("not enough pauses means no cuts", () => {
  assert.equal(chooseCuts([span(1, 2)], [1, 2]), null);
});

test("planTake splits by narration length", () => {
  // Three scenes; the middle one is twice as long.
  const audible = [span(0.2, 3), span(3.8, 6), span(6.6, 9.8), span(10.9, 14)];
  const { pauses, cuts } = planTake({
    audible,
    narrations: [
      "One short line here.",
      "A second line that is quite a lot longer than the first one.",
      "A short end.",
    ],
  });
  assert.equal(pauses.length, 3);
  assert.deepEqual(cuts, [0, 2]);
});

test("planTake follows the hints from Next scene while recording", () => {
  const audible = [span(0, 2), span(2.5, 4), span(4.5, 6), span(6.5, 8)];
  const narrations = ["Same length.", "Same length.", "Same length."];
  assert.deepEqual(
    planTake({ audible, narrations, hints: [2.3, 4.2] }).cuts,
    [0, 1],
  );
  assert.deepEqual(
    planTake({ audible, narrations, hints: [4.2, 6.3] }).cuts,
    [1, 2],
  );
  // Hints out of order are ignored.
  assert.equal(planTake({ audible, narrations, hints: [6, 2] }).cuts.length, 2);
});

test("planTake explains why a take can't be split", () => {
  assert.throws(
    () => planTake({ audible: [], narrations: ["Hi."] }),
    /couldn't hear anything/,
  );
  assert.throws(
    () => planTake({ audible: [span(0, 0.6)], narrations: ["A.", "B."] }),
    /too short for 2 scenes/,
  );
  assert.throws(
    () =>
      planTake({
        audible: [span(0, 5), span(5.5, 10)],
        narrations: ["A.", "B.", "C."],
      }),
    /found 1 pause but need 2.*Pause for a second between scenes/,
  );
  // One scene needs no pauses at all.
  assert.deepEqual(planTake({ audible: [span(0, 3)], narrations: ["A."] }), {
    pauses: [],
    cuts: [],
  });
});

test("nudging a cut moves it to the next pause, but not past its neighbours", () => {
  assert.deepEqual(nudgeCut([1, 3], 0, -1, 5), [0, 3]);
  assert.deepEqual(nudgeCut([1, 3], 0, 1, 5), [2, 3]);
  assert.equal(nudgeCut([1, 2], 0, 1, 5), null);
  assert.equal(nudgeCut([0, 3], 0, -1, 5), null);
  assert.equal(nudgeCut([1, 4], 1, 1, 5), null);
  assert.deepEqual(nudgeCut([1, 3], 1, 1, 5), [1, 4]);
});

test("a piece is trimmed to its speech, like a per-scene recording", () => {
  const audible = [span(0.5, 2), span(2.4, 4), span(5, 6)];
  const window = pieceWindow(audible, 4.5, 7)!;
  assert.equal(window.start, 4.85);
  assert.equal(window.end, 6.25);
  assert.ok(Math.abs(window.speechStart - 0.15) < 1e-9);
  assert.ok(Math.abs(window.speechEnd - 1.15) < 1e-9);
  assert.equal(pieceWindow(audible, 4.1, 4.9), null);
});

test("takePieces covers every scene and refuses a silent one", () => {
  const audible = [span(0.5, 2), span(2.4, 4), span(5, 6)];
  const pieces = takePieces(audible, [2.2, 4.5], 6.5);
  assert.equal(pieces.length, 3);
  assert.ok(pieces.every((piece) => piece.end > piece.start));
  assert.ok(pieces[0]!.end <= 2.2 && pieces[1]!.start >= 2.2);
  assert.throws(() => takePieces(audible, [4.2, 4.8], 6.5), /Scene 2/);
});
