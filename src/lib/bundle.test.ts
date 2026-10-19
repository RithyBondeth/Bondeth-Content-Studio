import assert from "node:assert/strict";
import { test } from "node:test";
import { bundleFileName, bundleReadme, postFileText } from "./bundle";

const post = {
  title: "Why is the sky blue?",
  text: "Sunlight scatters.",
  callToAction: "Follow for more.",
  hashtags: ["#Science", "#Sky"],
};

test("post.txt has the title only where the platform has one", () => {
  assert.equal(
    postFileText("youtube", post),
    "YouTube\n\nTitle:\nWhy is the sky blue?\n\nDescription:\nSunlight scatters.\n\nFollow for more.\n\n#Science #Sky\n",
  );
  const tiktok = postFileText("tiktok", { ...post, title: null });
  assert.ok(!tiktok.includes("Title:"));
  assert.ok(tiktok.startsWith("TikTok\n\nCaption:\nSunlight scatters."));
});

test("the README lists what's inside and how to make what's missing", () => {
  const readme = bundleReadme({
    title: "Why is the sky blue?",
    platform: "reels",
    contents: {
      files: [
        { piece: "post", name: "post.txt" },
        { piece: "captions", name: "01-sky-vertical.srt" },
      ],
      missing: ["video", "cover"],
    },
    command: { plan: "sky", video: 1 },
  });
  assert.match(readme, /Ready to post on Instagram Reels/);
  assert.match(readme, /- post\.txt: /);
  assert.match(readme, /- 01-sky-vertical\.srt: /);
  assert.match(
    readme,
    /Video: .*npm run pipeline -- render sky --video 1 --format vertical/,
  );
  assert.match(readme, /Cover image: .*publish sky --video 1/);
});

test("a complete bundle has no missing section", () => {
  const readme = bundleReadme({
    title: "T",
    platform: "youtube",
    contents: { files: [{ piece: "video", name: "v.mp4" }], missing: [] },
    command: { plan: "p", video: 2 },
  });
  assert.ok(!readme.includes("Missing"));
  assert.match(readme, /1920×1080/);
});

test("bundle file names", () => {
  assert.equal(bundleFileName("01-sky", "shorts"), "01-sky-shorts.zip");
});
