import assert from "node:assert/strict";
import { test } from "node:test";
import { sceneSchema } from "../../../src/spec/schema";
import {
  convertScene,
  droppedFields,
  SCENE_META,
  SCENE_TYPE_ORDER,
} from "./scene-meta";

test("switching templates names the content that would be lost", () => {
  assert.deepEqual(
    droppedFields(
      {
        type: "code",
        language: "python",
        fileName: "main.py",
        steps: [{ code: "print(1)" }],
        narration: "Look at this.",
      },
      "statement",
    ),
    // The file name becomes the statement's text, so it isn't lost.
    ["language", "code steps"],
  );
  assert.deepEqual(
    droppedFields(
      {
        type: "list",
        heading: "Tips",
        items: ["One", "Two"],
        narration: "Two tips.",
      },
      "title",
    ),
    ["list items"],
  );
});

test("nothing is lost when the main text carries over", () => {
  assert.deepEqual(
    droppedFields(
      { type: "title", heading: "Hello", narration: "Hi." },
      "statement",
    ),
    [],
  );
  assert.deepEqual(
    droppedFields({ type: "title", heading: "Hi", narration: "" }, "title"),
    [],
  );
});

test("empty fields don't count as lost", () => {
  assert.deepEqual(
    droppedFields(
      {
        type: "statement",
        text: "One idea",
        highlight: [],
        narration: "An idea.",
      },
      "cta",
    ),
    [],
  );
});

test("timelines and steps keep their heading when switched", () => {
  assert.deepEqual(
    droppedFields(
      {
        type: "timeline",
        heading: "Space race",
        events: [
          { date: "1957", label: "Sputnik" },
          { date: "1969", label: "Moon landing" },
        ],
        narration: "It moved fast.",
      },
      "title",
    ),
    ["timeline events"],
  );
  assert.deepEqual(
    droppedFields(
      {
        type: "steps",
        heading: "Make tea",
        steps: [{ title: "Boil water" }, { title: "Steep" }],
        narration: "Two steps.",
      },
      "statement",
    ),
    // Not "code steps": these are the scene's own steps.
    ["steps"],
  );
});

test("every template's starter scene is valid and can be switched to any other", () => {
  for (const type of SCENE_TYPE_ORDER) {
    const scene = SCENE_META[type].create();
    assert.equal(sceneSchema.safeParse(scene).success, true, type);
    for (const other of SCENE_TYPE_ORDER) {
      const converted = convertScene(scene, other);
      assert.equal(converted.type, other);
      assert.equal(
        sceneSchema.safeParse(converted).success,
        true,
        `${type} → ${other}`,
      );
    }
  }
  assert.deepEqual(
    [...SCENE_TYPE_ORDER].sort(),
    Object.keys(SCENE_META).sort(),
  );
});
