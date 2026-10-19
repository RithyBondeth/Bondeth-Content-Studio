import { FORMATS } from "./formats";
import {
  composePost,
  PLATFORM_RULES,
  type Platform,
  type PlatformPost,
} from "./publish";

/**
 * The "download for posting" bundle: one zip per platform with the video,
 * cover, post text, and captions, plus a README saying what's inside and
 * what's still missing. These helpers write the text; pipeline/bundle.ts
 * gathers the files.
 */

export type BundlePiece = "video" | "cover" | "post" | "captions";

export const BUNDLE_PIECES: BundlePiece[] = [
  "video",
  "cover",
  "post",
  "captions",
];

export const BUNDLE_PIECE_LABELS: Record<BundlePiece, string> = {
  video: "Video",
  cover: "Cover image",
  post: "Post text",
  captions: "Captions",
};

/** What a bundle holds: each file's name in the zip, and the pieces it couldn't find. */
export type BundleContents = {
  files: { piece: BundlePiece; name: string }[];
  missing: BundlePiece[];
};

export const bundleFileName = (videoKey: string, platform: Platform) =>
  `${videoKey}-${platform}.zip`;

/** post.txt: the title (where the platform has one) and the full post, ready to paste. */
export const postFileText = (platform: Platform, post: PlatformPost) => {
  const rules = PLATFORM_RULES[platform];
  const parts = [`${rules.label}\n`];
  if (rules.titleLimit !== null) parts.push(`Title:\n${post.title ?? ""}\n`);
  parts.push(`${rules.textLabel}:\n${composePost(post)}\n`);
  return parts.join("\n");
};

/** How to make each missing piece, from the studio or the command line. */
const fixFor = (
  piece: BundlePiece,
  platform: Platform,
  command: { plan: string; video: number },
) => {
  const { format } = PLATFORM_RULES[platform];
  const flags = `${command.plan} --video ${command.video}`;
  switch (piece) {
    case "video":
      return `Render the ${format} video (Render panel, or: npm run pipeline -- render ${flags} --format ${format}).`;
    case "cover":
      return `Export the covers (Publish panel, or: npm run pipeline -- publish ${flags}).`;
    case "post":
      return `Write the posts (Publish panel, or: npm run pipeline -- publish ${flags}).`;
    case "captions":
      return "Add narration to the scenes so there's something to caption.";
  }
};

const describe = (piece: BundlePiece, platform: Platform) => {
  const { format, label } = PLATFORM_RULES[platform];
  const { width, height } = FORMATS[format];
  switch (piece) {
    case "video":
      return `the ${format} video to upload (${width}×${height})`;
    case "cover":
      return `the cover or thumbnail image for ${label}`;
    case "post":
      return `the title, text and hashtags to paste into ${label}`;
    case "captions":
      return "captions to upload, if the platform takes them (SRT works on YouTube; WebVTT is the web standard)";
  }
};

export const bundleReadme = ({
  title,
  platform,
  contents,
  command,
}: {
  title: string;
  platform: Platform;
  contents: BundleContents;
  /** For the commands that make missing pieces. */
  command: { plan: string; video: number };
}) => {
  const { label } = PLATFORM_RULES[platform];
  const lines = [`${title}`, `Ready to post on ${label}.`, "", "Inside:"];
  for (const file of contents.files) {
    lines.push(`  - ${file.name}: ${describe(file.piece, platform)}`);
  }
  lines.push("  - README.txt: this file");
  if (contents.missing.length) {
    lines.push("", "Missing (make these, then download again):");
    for (const piece of contents.missing) {
      lines.push(
        `  - ${BUNDLE_PIECE_LABELS[piece]}: ${fixFor(piece, platform, command)}`,
      );
    }
  }
  lines.push(
    "",
    "The captions are timed from the current script. If you change the script after rendering, render again so they still match.",
    "",
  );
  return lines.join("\n");
};
