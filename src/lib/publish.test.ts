import assert from "node:assert/strict";
import { test } from "node:test";
import { getVideoTiming } from "./timing";
import { videoSpecSchema } from "../spec/schema";
import {
  blankPosts,
  charCount,
  checkPost,
  clampCoverScene,
  composePost,
  coverFrame,
  defaultCoverScene,
  fitPost,
  formatHashtag,
  formatHashtags,
  hasWrittenPosts,
  parseHashtagInput,
  PLATFORM_RULES,
  PLATFORMS,
  publishKitSchema,
  truncate,
  type PlatformPost,
  type PublishKit,
} from "./publish";

const post = (overrides: Partial<PlatformPost> = {}): PlatformPost => ({
  title: "Why is the sky blue?",
  text: "Sunlight is every colour at once. So why do we only see blue?",
  callToAction: "Follow for part 2.",
  hashtags: ["#Science", "#Physics", "#SkyColour"],
  ...overrides,
});

test("hashtags get a # and lose spaces and punctuation", () => {
  assert.equal(formatHashtag("science"), "#science");
  assert.equal(formatHashtag("#Science"), "#Science");
  assert.equal(formatHashtag("##science!"), "#science");
  assert.equal(formatHashtag("learn on tiktok"), "#LearnOnTiktok");
  assert.equal(formatHashtag("rayleigh-scattering"), "#RayleighScattering");
  assert.equal(formatHashtag("AI"), "#AI");
});

test("hashtags work in any script", () => {
  assert.equal(formatHashtag("ciencia fácil"), "#CienciaFácil");
  assert.equal(formatHashtag("វិទ្យាសាស្ត្រ"), "#វិទ្យាសាស្ត្រ");
});

test("empty hashtags are dropped", () => {
  assert.equal(formatHashtag("#"), null);
  assert.equal(formatHashtag("  !! "), null);
});

test("repeated hashtags are dropped, ignoring case, and the list is capped", () => {
  assert.deepEqual(
    formatHashtags(["Science", "#science", "physics", "", "space", "sky"], 3),
    ["#Science", "#physics", "#space"],
  );
});

test("typed hashtags can be separated by spaces, commas, or new lines", () => {
  assert.deepEqual(parseHashtagInput("#science, physics\n#sky"), [
    "#science",
    "#physics",
    "#sky",
  ]);
});

test("the full post is text, call to action, then hashtags", () => {
  assert.equal(
    composePost(post()),
    "Sunlight is every colour at once. So why do we only see blue?\n\nFollow for part 2.\n\n#Science #Physics #SkyColour",
  );
  assert.equal(
    composePost(post({ callToAction: " ", hashtags: [] })),
    "Sunlight is every colour at once. So why do we only see blue?",
  );
});

test("emoji count as two characters, like the platforms count them", () => {
  assert.equal(charCount("hi 👋"), 5);
});

test("truncate stays within the limit and breaks between words", () => {
  const text = "The quick brown fox jumps over the lazy dog";
  const cut = truncate(text, 20);
  assert.ok(charCount(cut) <= 20);
  assert.equal(cut, "The quick brown fox…");
  assert.equal(truncate("short", 20), "short");
});

test("every platform's limits match its documentation", () => {
  assert.equal(PLATFORM_RULES.tiktok.textLimit, 2200);
  assert.equal(PLATFORM_RULES.tiktok.titleLimit, null);
  assert.equal(PLATFORM_RULES.reels.textLimit, 2200);
  assert.equal(PLATFORM_RULES.reels.hashtags.max, 5);
  assert.equal(PLATFORM_RULES.shorts.titleLimit, 100);
  assert.equal(PLATFORM_RULES.youtube.titleLimit, 100);
  assert.equal(PLATFORM_RULES.youtube.textLimit, 5000);
  assert.equal(PLATFORM_RULES.youtube.format, "landscape");
});

test("a post that fits is left alone", () => {
  for (const platform of ["shorts", "youtube"] as const) {
    assert.deepEqual(fitPost(platform, post()), post());
    assert.deepEqual(checkPost(platform, post()), []);
  }
});

test("fitting a post respects every platform's limits", () => {
  const long = post({
    title: "A really long title ".repeat(10),
    text: "Lots of words here. ".repeat(400),
    hashtags: Array.from({ length: 12 }, (_, n) => `topic ${n}`),
  });
  for (const platform of PLATFORMS) {
    const rules = PLATFORM_RULES[platform];
    const fitted = fitPost(platform, long);
    assert.ok(charCount(composePost(fitted)) <= rules.textLimit, platform);
    assert.ok(fitted.hashtags.length <= rules.hashtags.max, platform);
    if (rules.titleLimit === null) assert.equal(fitted.title, null, platform);
    else assert.ok(charCount(fitted.title!) <= rules.titleLimit, platform);
    // The call to action and hashtags survive; the text is what gets shortened.
    assert.equal(fitted.callToAction, long.callToAction);
    assert.deepEqual(checkPost(platform, fitted), [], platform);
  }
});

test("YouTube posts lose angle brackets", () => {
  const fitted = fitPost(
    "youtube",
    post({ title: "Arrays <3", text: "a < b > c" }),
  );
  assert.equal(fitted.title, "Arrays 3");
  assert.equal(fitted.text, "a  b  c");
  assert.match(
    checkPost("youtube", post({ text: "x > y" })).join(" "),
    /< or >/,
  );
  assert.equal(fitPost("tiktok", post({ text: "x > y" })).text, "x > y");
});

test("problems are reported in plain language", () => {
  const problems = checkPost(
    "reels",
    post({
      title: null,
      text: "x".repeat(2300),
      hashtags: ["#a", "#b", "#c", "#d", "#e", "#f", "bad tag"],
    }),
  );
  assert.equal(problems.length, 3);
  assert.match(problems[0]!, /characters too long for Instagram Reels/);
  assert.match(problems[1]!, /at most 5 hashtags on Instagram Reels/);
  assert.match(problems[2]!, /Fix these hashtags: bad tag/);
  assert.deepEqual(checkPost("shorts", post({ title: " " })), ["Add a title."]);
});

test("a publish kit survives a round trip through JSON", () => {
  const kit: PublishKit = {
    version: 1,
    coverScene: 2,
    generatedAt: "2026-10-19T10:00:00.000Z",
    posts: {
      tiktok: post({ title: null }),
      shorts: post(),
      reels: post({ title: null }),
      youtube: post({ title: "Why is the sky blue? The physics, simply" }),
    },
  };
  assert.deepEqual(
    publishKitSchema.parse(JSON.parse(JSON.stringify(kit))),
    kit,
  );
  // A kit with only a cover scene is valid too.
  assert.deepEqual(publishKitSchema.parse({ version: 1, coverScene: 0 }), {
    version: 1,
    coverScene: 0,
  });
  assert.equal(
    publishKitSchema.safeParse({ version: 1, coverScene: -1 }).success,
    false,
  );
});

test("the cover defaults to the title scene", () => {
  assert.equal(
    defaultCoverScene([{ type: "statement" }, { type: "title" }]),
    1,
  );
  assert.equal(defaultCoverScene([{ type: "statement" }]), 0);
  assert.equal(clampCoverScene(9, 3), 2);
  assert.equal(clampCoverScene(-1, 3), 0);
});

test("the cover frame is inside its scene, after it has settled", () => {
  const spec = videoSpecSchema.parse({
    version: 1,
    title: "Test",
    scenes: [
      {
        type: "title",
        heading: "Hi",
        narration: "One two three four five six",
      },
      {
        type: "statement",
        text: "Hello",
        narration: "Seven eight nine ten eleven twelve thirteen",
      },
    ],
  });
  const timing = getVideoTiming(spec);
  for (const scene of [0, 1]) {
    const frame = coverFrame(timing, scene);
    const start = timing.starts[scene]!;
    assert.ok(frame >= start + timing.transitions[scene]! + 20);
    assert.ok(frame < start + timing.scenes[scene]!);
  }
  // A scene that no longer exists falls back to the last one.
  assert.equal(coverFrame(timing, 5), coverFrame(timing, 1));
});

test("blank posts opened to write by hand don't count as written", () => {
  assert.equal(hasWrittenPosts(undefined), false);
  const posts = blankPosts();
  assert.equal(hasWrittenPosts(posts), false);
  assert.equal(
    hasWrittenPosts({ ...posts, reels: { ...posts.reels, text: "Hi" } }),
    true,
  );
});
