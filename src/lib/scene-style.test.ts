import assert from "node:assert/strict";
import { test } from "node:test";
import { TRANSITIONS } from "../spec/schema";
import {
  DEFAULT_ENTRANCES,
  DEFAULT_TRANSITIONS,
  getSceneEntrance,
  getSceneTransition,
} from "./scene-style";

test("a scene's own transition wins", () => {
  for (const transition of TRANSITIONS) {
    assert.equal(getSceneTransition({ transition }, 3), transition);
  }
});

test("scenes without a transition take turns, starting with a fade", () => {
  const picked = Array.from({ length: 13 }, (_, index) =>
    getSceneTransition({}, index),
  );
  assert.equal(picked[1], "fade");
  for (let index = 2; index < picked.length; index++) {
    assert.notEqual(picked[index], picked[index - 1]);
  }
  assert.deepEqual(new Set(picked.slice(1)), new Set(DEFAULT_TRANSITIONS));
});

test("the default rotation never cuts", () => {
  assert.ok(!DEFAULT_TRANSITIONS.includes("cut"));
  assert.equal(new Set(DEFAULT_TRANSITIONS).size, DEFAULT_TRANSITIONS.length);
});

test("a scene's own entrance wins", () => {
  const scenes = [
    { type: "list" as const },
    { type: "list" as const, entrance: "typewriter" as const },
  ];
  assert.equal(getSceneEntrance(scenes, 1), "typewriter");
});

test("scenes of the same type take turns through the default entrances", () => {
  const scenes = [
    { type: "title" as const },
    { type: "list" as const },
    { type: "statement" as const },
    { type: "list" as const },
    { type: "list" as const, entrance: "blur" as const },
    { type: "list" as const },
  ];
  assert.deepEqual(
    scenes.map((_, index) => getSceneEntrance(scenes, index)),
    // Each type starts with a rise; picked entrances still count as a turn.
    ["rise", "rise", "rise", "slide", "blur", "rise"],
  );
  assert.deepEqual([...DEFAULT_ENTRANCES], ["rise", "slide", "pop"]);
});
