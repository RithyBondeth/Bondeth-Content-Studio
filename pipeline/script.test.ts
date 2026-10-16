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
        },
        {
          type: "list",
          heading: "Tips",
          items: ["a", "b", "c", "d", "e", "f", "g"],
          style: "checks",
          narration: "Some tips.",
          emoji: "✅",
        },
        {
          type: "code",
          language: "python",
          fileName: null,
          steps: [{ code: "print(1)", highlight: null }],
          narration: "Print one.",
          emoji: null,
        },
        {
          type: "cta",
          heading: "Bye",
          action: "Follow",
          narration: "Follow me.",
          emoji: null,
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
  assert.deepEqual(code?.type === "code" && code.steps, [
    { code: "print(1)", highlight: undefined },
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
            style: "bullets",
            narration: "x",
            emoji: null,
          },
        ],
      },
      "en",
    ),
  );
});
