import assert from "node:assert/strict";
import { test } from "node:test";
import { nextStep, stageOf } from "./next-step";

const video = (
  status: "draft" | "scripted" | "voiced",
  rendered = false,
  hasPosts = false,
) => ({ status, rendered, hasPosts });

test("each video moves through script, voice, render and publish", () => {
  assert.equal(stageOf(video("draft")), "script");
  assert.equal(stageOf(video("scripted")), "voice");
  assert.equal(stageOf(video("voiced")), "render");
  assert.equal(stageOf(video("voiced", true)), "publish");
  assert.equal(stageOf(video("voiced", true, true)), null);
});

test("a video rendered without a voice-over goes on to publishing", () => {
  assert.equal(stageOf(video("scripted", true)), "publish");
});

test("the next step is the earliest video that isn't ready", () => {
  assert.deepEqual(
    nextStep([video("voiced", true, true), video("scripted"), video("draft")]),
    { index: 1, stage: "voice" },
  );
  assert.equal(nextStep([video("voiced", true, true)]), null);
  assert.equal(nextStep([]), null);
});
