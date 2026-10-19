import assert from "node:assert/strict";
import { test } from "node:test";
import { PLATFORMS } from "../src/lib/publish";
import type { VideoSpecInput } from "../src/spec/schema";
import { publishPrompt } from "./prompts";
import { draftToPublishKit } from "./publish";
import type { ContentPlan, PublishDraft } from "./schemas";

const spec: VideoSpecInput = {
  version: 1,
  title: "Why is the sky blue?",
  scenes: [
    { type: "statement", text: "Look up", narration: "Look up." },
    { type: "title", heading: "Why blue?", narration: "Why is it blue?" },
    { type: "cta", heading: "Follow", action: "Follow", narration: "Follow." },
  ],
};

const draftPost = (title: string | null) => ({
  title,
  text: "Sunlight scatters in the air.",
  callToAction: "Follow for more.",
  hashtags: ["science", "#Physics", "sky colour", "science"],
});

const draft: PublishDraft = {
  tiktok: draftPost(null),
  shorts: draftPost("Why is the sky blue?"),
  reels: draftPost(null),
  youtube: draftPost("Why is the sky blue? Rayleigh scattering explained"),
};

test("Claude's draft becomes a kit with tidy hashtags", () => {
  const kit = draftToPublishKit(draft, spec, null);
  assert.equal(kit.version, 1);
  assert.ok(kit.generatedAt);
  for (const platform of PLATFORMS) {
    assert.deepEqual(kit.posts![platform].hashtags, [
      "#science",
      "#Physics",
      "#SkyColour",
    ]);
  }
  assert.equal(kit.posts!.tiktok.title, null);
  assert.equal(kit.posts!.shorts.title, "Why is the sky blue?");
});

test("a new kit's cover is the title scene; a regenerated one keeps its cover", () => {
  assert.equal(draftToPublishKit(draft, spec, null).coverScene, 1);
  assert.equal(
    draftToPublishKit(draft, spec, { version: 1, coverScene: 2 }).coverScene,
    2,
  );
  // A cover scene that no longer exists moves to the last scene.
  assert.equal(
    draftToPublishKit(draft, spec, { version: 1, coverScene: 9 }).coverScene,
    2,
  );
});

test("the prompt includes the plan, the narration, and the language", () => {
  const plan: ContentPlan = {
    title: "Everyday science",
    audience: "Curious teenagers",
    goal: "Understand the world",
    tone: "Friendly",
    pillars: [{ name: "Light", description: "How light works" }],
    videos: [
      {
        title: "Sky",
        pillar: "Light",
        hook: "Ever wondered why the sky is blue?",
        angle: "Simple physics",
        keyPoints: ["Scattering"],
        callToAction: "Follow for part 2",
      },
    ],
    schedule: { postsPerWeek: 3, notes: "" },
  };
  const prompt = publishPrompt(plan, 0, spec, {
    language: "es",
    creator: { handle: "@teach" },
  });
  for (const expected of [
    "Audience: Curious teenagers",
    "Pillar: Light",
    "Hook: Ever wondered why the sky is blue?",
    "Call to action: Follow for part 2",
    "Why is it blue?",
    "Language: es",
    "@teach",
  ]) {
    assert.ok(prompt.includes(expected), expected);
  }
});
