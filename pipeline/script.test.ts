import assert from "node:assert/strict";
import { test } from "node:test";
import { draftToSpec } from "./script";

test("converts Claude's draft into a valid spec, dropping nulls", () => {
  const spec = draftToSpec(
    {
      title: "Test",
      scenes: [
        {
          type: "title",
          heading: "Hello",
          subheading: null,
          narration: "Hello there.",
          emoji: null,
          transition: "fade",
        },
        {
          type: "list",
          heading: "Tips",
          items: ["a", "b", "c", "d", "e", "f", "g"],
          cues: ["one", "two", "three", "four", "five", "six", "seven"],
          style: "checks",
          narration: "Some tips.",
          emoji: "✅",
          transition: "slide",
        },
        {
          type: "code",
          language: "python",
          fileName: null,
          steps: [
            { code: "print(1)", highlight: null, cue: null },
            { code: "print(2)", highlight: "1", cue: "then two" },
          ],
          narration: "Print one.",
          emoji: null,
          transition: "fade",
        },
        {
          type: "cta",
          heading: "Bye",
          action: "Follow",
          narration: "Follow me.",
          emoji: null,
          transition: "fade",
        },
      ],
    },
    "en",
  );

  const [title, list, code] = spec.scenes;
  assert.equal(title?.type, "title");
  assert.equal(
    title && "subheading" in title ? title.subheading : "missing",
    undefined,
  );
  assert.equal(list?.type === "list" && list.items.length, 6);
  assert.equal(list?.emoji, "✅");
  assert.equal(list?.transition, "slide");
  assert.deepEqual(list?.type === "list" && list.cues, [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
  ]);
  assert.deepEqual(code?.type === "code" && code.steps, [
    { code: "print(1)", highlight: undefined, cue: undefined },
    { code: "print(2)", highlight: "1", cue: "then two" },
  ]);
});

test("rejects drafts that can't become a valid spec", () => {
  assert.throws(() =>
    draftToSpec(
      {
        title: "Broken",
        scenes: [
          {
            type: "list",
            heading: "Empty",
            items: [],
            cues: null,
            style: "bullets",
            narration: "x",
            emoji: null,
            transition: "fade",
          },
        ],
      },
      "en",
    ),
  );
});
