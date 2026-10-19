import assert from "node:assert/strict";
import { test } from "node:test";
import type { VideoSpecInput } from "../src/spec/schema";
import { scriptPrompt } from "./prompts";
import type { ContentPlan } from "./schemas";
import { applyBrandKit, draftToSpec, kitCreator } from "./script";

test("converts Claude's draft into a valid spec, dropping nulls", () => {
  const spec = draftToSpec(
    {
      title: "Test",
      music: "curious",
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
  assert.deepEqual(spec.music, { src: "music/curious.wav", volume: 0.15 });
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
        music: "none",
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

test("leaves music off when the draft picks none", () => {
  const spec = draftToSpec(
    {
      title: "Quiet",
      music: "none",
      scenes: [
        {
          type: "title",
          heading: "Hi",
          subheading: null,
          narration: "Hi.",
          emoji: null,
          transition: "fade",
        },
      ],
    },
    "en",
  );
  assert.equal(spec.music, undefined);
});

const chartDraft = (
  points: { label: string; value: number; cue: string | null }[],
) => ({
  title: "Chart",
  music: "none" as const,
  scenes: [
    {
      type: "chart" as const,
      heading: "Scattering",
      style: "bar" as const,
      points,
      unit: null,
      source: "Rayleigh scattering",
      narration: "Red, then green, then blue.",
      emoji: null,
      transition: "fade" as const,
    },
  ],
});

test("converts chart drafts, keeping values exactly and at most 6 points", () => {
  const spec = draftToSpec(
    chartDraft([
      { label: "Red", value: 1, cue: "Red" },
      { label: "Green", value: 3.04, cue: null },
      { label: "Blue", value: 5.86, cue: "blue" },
      { label: "d", value: 4, cue: null },
      { label: "e", value: 5, cue: null },
      { label: "f", value: 6, cue: null },
      { label: "g", value: 7, cue: null },
    ]),
    "en",
  );
  const [chart] = spec.scenes;
  assert.equal(chart?.type, "chart");
  if (chart?.type !== "chart") return;
  assert.equal(chart.points.length, 6);
  assert.deepEqual(chart.points.slice(0, 3), [
    { label: "Red", value: 1, cue: "Red" },
    { label: "Green", value: 3.04, cue: undefined },
    { label: "Blue", value: 5.86, cue: "blue" },
  ]);
  assert.equal(chart.unit, undefined);
  assert.equal(chart.style, "bar");
  assert.equal(chart.source, "Rayleigh scattering");
});

test("rejects charts with negative values or a single point", () => {
  assert.throws(() =>
    draftToSpec(
      chartDraft([
        { label: "a", value: 1, cue: null },
        { label: "b", value: -2, cue: null },
      ]),
      "en",
    ),
  );
  assert.throws(() =>
    draftToSpec(chartDraft([{ label: "a", value: 1, cue: null }]), "en"),
  );
});

test("image drafts become scenes that the image step can fill in", () => {
  const spec = draftToSpec(
    {
      title: "Test",
      music: "none",
      scenes: [
        {
          type: "image",
          kind: "illustration",
          description: "Light scattering off air molecules",
          searchTerms: "blue sky",
          caption: null,
          layout: "framed",
          motion: "zoom-out",
          narration: "Light bounces around.",
          emoji: null,
          transition: "fade",
        },
        {
          type: "image",
          kind: "photo",
          description: "A clear blue sky over hills",
          searchTerms: "blue sky hills",
          caption: "Look up",
          layout: "full",
          motion: "pan-left",
          narration: "Look up on a clear day.",
          emoji: null,
          transition: "fade",
        },
      ],
    },
    "en",
  );
  const [illustration, photo] = spec.scenes;
  assert.deepEqual(illustration, {
    type: "image",
    alt: "Light scattering off air molecules",
    search: "blue sky",
    // Illustrations are generated from their description.
    prompt: "Light scattering off air molecules",
    caption: undefined,
    layout: "framed",
    motion: "zoom-out",
    narration: "Light bounces around.",
    emoji: undefined,
    transition: "fade",
  });
  assert.equal(photo?.type === "image" && photo.prompt, undefined);
  assert.equal(photo?.type === "image" && photo.src, undefined);
});

test("diagram drafts keep at most 6 nodes and drop null icons and cues", () => {
  const spec = draftToSpec(
    {
      title: "Test",
      music: "none",
      scenes: [
        {
          type: "diagram",
          heading: null,
          layout: "cycle",
          nodes: Array.from({ length: 7 }, (_, index) => ({
            label: `Step ${index + 1}`,
            icon: index === 0 ? "droplet" : null,
            cue: index === 0 ? "water" : null,
          })),
          narration: "Water goes round and round.",
          emoji: null,
          transition: "fade",
        },
      ],
    },
    "en",
  );
  const [diagram] = spec.scenes;
  assert.ok(diagram?.type === "diagram");
  assert.equal(diagram.nodes.length, 6);
  assert.deepEqual(diagram.nodes[0], {
    label: "Step 1",
    icon: "droplet",
    cue: "water",
  });
  assert.deepEqual(diagram.nodes[1], {
    label: "Step 2",
    icon: undefined,
    cue: undefined,
  });
});

const plainSpec: VideoSpecInput = {
  version: 1,
  title: "Test",
  scenes: [{ type: "title", heading: "Hi", narration: "Hi." }],
};

test("a brand kit gives new videos its theme and creator", () => {
  const spec = applyBrandKit(plainSpec, {
    name: " Ms. Rivera ",
    handle: "@rivera",
    website: "",
    theme: { preset: "chalkboard", accent: "#22C55E" },
  });
  assert.deepEqual(spec.theme, { preset: "chalkboard", accent: "#22C55E" });
  // Empty fields are dropped, so the video doesn't show a blank website.
  assert.deepEqual(spec.brand, { name: "Ms. Rivera", handle: "@rivera" });
});

test("without a brand kit, new videos keep the default look", () => {
  assert.deepEqual(applyBrandKit(plainSpec, undefined), plainSpec);
  assert.deepEqual(applyBrandKit(plainSpec, { name: "  " }), plainSpec);
  assert.equal(kitCreator({ handle: "" }), undefined);
});

const plan: ContentPlan = {
  title: "Series",
  audience: "Students",
  goal: "Learn",
  tone: "Friendly",
  pillars: [],
  videos: [
    {
      title: "Video",
      pillar: "",
      hook: "",
      angle: "",
      keyPoints: [],
      callToAction: "Follow",
    },
  ],
  schedule: { postsPerWeek: 3, notes: "" },
};

test("the script prompt names the project's creator when it has a brand kit", () => {
  const prompt = scriptPrompt(plan, 0, {
    seconds: 45,
    language: "en",
    creator: { name: "Ms. Rivera", handle: "@rivera" },
  });
  assert.match(prompt, /Creator: Ms\. Rivera/);
  assert.match(prompt, /Creator handle: @rivera/);
  assert.doesNotMatch(prompt, /@bondeth/);
});

test("the script prompt falls back to the default handle", () => {
  const prompt = scriptPrompt(plan, 0, { seconds: 45, language: "en" });
  assert.match(prompt, /Creator handle: @bondeth/);
});
