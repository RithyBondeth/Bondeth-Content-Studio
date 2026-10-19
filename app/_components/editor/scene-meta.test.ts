import assert from "node:assert/strict";
import { test } from "node:test";
import { droppedFields } from "./scene-meta";

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
