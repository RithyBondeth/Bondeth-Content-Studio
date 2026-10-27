import assert from "node:assert/strict";
import { test } from "node:test";
import { getVideoTiming } from "../lib/timing";
import { sceneSchema, videoSpecSchema, type Scene } from "../spec/schema";
import {
  getSnapshotFrameNumber,
  SNAPSHOT_FRAMES,
  SNAPSHOT_VIDEOS,
} from "./frames";

const sceneOf = (video: keyof typeof SNAPSHOT_VIDEOS, index: number): Scene =>
  videoSpecSchema.parse(SNAPSHOT_VIDEOS[video]).scenes[index]!;

test("snapshot frames cover every scene type and diagram layout", () => {
  const covered = new Set(
    SNAPSHOT_FRAMES.filter((frame) => frame.at === "settled").map((frame) => {
      const scene = sceneOf(frame.video, frame.scene);
      return scene.type === "diagram"
        ? `diagram-${scene.layout ?? "flow"}`
        : scene.type;
    }),
  );
  const expected = sceneSchema.options
    .map((option) => option.shape.type.value)
    .flatMap((type) =>
      type === "diagram"
        ? ["diagram-flow", "diagram-cycle", "diagram-hub"]
        : [type],
    );
  assert.deepEqual([...covered].sort(), expected.sort());
});

test("snapshot frames use both formats and catch a transition", () => {
  const formats = new Set(SNAPSHOT_FRAMES.map((frame) => frame.format));
  assert.deepEqual([...formats].sort(), ["landscape", "vertical"]);
  assert.ok(SNAPSHOT_FRAMES.some((frame) => frame.at === "mid-transition"));
});

test("snapshot names are unique and every frame is inside its video", () => {
  const names = SNAPSHOT_FRAMES.map((frame) => frame.name);
  assert.equal(new Set(names).size, names.length);
  for (const frame of SNAPSHOT_FRAMES) {
    const timing = getVideoTiming(
      videoSpecSchema.parse(SNAPSHOT_VIDEOS[frame.video]),
    );
    const number = getSnapshotFrameNumber(timing, frame);
    assert.ok(number >= 0 && number < timing.total, frame.name);
  }
});
