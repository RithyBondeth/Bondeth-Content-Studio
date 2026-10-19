import assert from "node:assert/strict";
import { test } from "node:test";
import { videoSpecSchema } from "../spec/schema";
import {
  getFloatingShapes,
  getParticles,
  particleAt,
} from "./background-motion";
import { BACKGROUND_STYLES } from "./backgrounds";

test("the same seed always gives the same shapes and particles", () => {
  assert.deepEqual(getFloatingShapes("a"), getFloatingShapes("a"));
  assert.deepEqual(getParticles("a"), getParticles("a"));
  assert.notDeepEqual(getFloatingShapes("a"), getFloatingShapes("b"));
  assert.notDeepEqual(getParticles("a"), getParticles("b"));
});

test("shapes rest inside the frame, one per cell, without clumping", () => {
  const shapes = getFloatingShapes("seed", 9);
  assert.equal(shapes.length, 9);
  shapes.forEach((shape, index) => {
    assert.ok(shape.x > 0 && shape.x < 1);
    assert.ok(shape.y > 0 && shape.y < 1);
    const column = Math.floor(shape.x * 3);
    const row = Math.floor(shape.y * 3);
    assert.equal(row * 3 + column, index);
    assert.ok(shape.opacity > 0 && shape.opacity < 0.3, "stays subtle");
  });
});

test("particles rise and wrap around without leaving the frame for long", () => {
  const [particle] = getParticles("seed", 1);
  const fps = 30;
  const start = particleAt(particle!, 0, fps);
  const later = particleAt(particle!, fps, fps);
  assert.ok(later.y < start.y, "moves up");
  for (let frame = 0; frame < 30 * 120; frame += 7) {
    const { y, opacity } = particleAt(particle!, frame, fps);
    assert.ok(y >= -0.05 && y <= 1.05);
    assert.ok(opacity >= 0 && opacity <= 0.7);
  }
});

test("a spec can pick any background, and leaving it out is allowed", () => {
  const base = {
    version: 1,
    title: "T",
    scenes: [{ type: "statement", text: "x", narration: "x" }],
  } as const;
  assert.equal(videoSpecSchema.parse(base).background, undefined);
  for (const background of BACKGROUND_STYLES) {
    assert.equal(
      videoSpecSchema.parse({ ...base, background }).background,
      background,
    );
  }
  assert.throws(() => videoSpecSchema.parse({ ...base, background: "lava" }));
});
