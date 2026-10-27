import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { FORMAT_NAMES, type VideoFormat } from "../src/lib/formats";
import { videoSpecSchema, type VideoSpecInput } from "../src/spec/schema";
import { getVideoTiming, FPS } from "../src/lib/timing";
import { ROOT } from "./config";
import { createPlan } from "./plan";
import {
  composePost,
  clampCoverScene,
  PLATFORM_RULES,
  PLATFORMS,
  type Platform,
} from "../src/lib/publish";
import { blankPublishKit, createPublishKit } from "./publish";
import { openStudio, renderCover, renderVideo } from "./render";
import { createVideoSpec } from "./script";
import {
  bundlePath,
  captionPath,
  coverPath,
  exists,
  listPlans,
  loadPlan,
  loadPublishKit,
  loadSpec,
  mediaDir,
  outputPath,
  publishPath,
  savePublishKit,
  saveSpec,
  specPath,
  type PlanFile,
} from "./store";
import { BUNDLE_PIECE_LABELS } from "../src/lib/bundle";
import { buildBundle, writeCaptionFiles } from "./bundle";
import { addImages } from "./images";
import { filterVoices, voiceLabels } from "../src/lib/voice";
import { addVoiceOver } from "./voice";
import { listVoices } from "./voices";

const HELP = `Bondeth Studio pipeline: idea → content plan → script → voice-over → video

Usage: npm run pipeline -- <command> [options]

Commands:
  plan "<idea>"         Create a content plan with Claude
  script <plan>         Write scripts and scenes for the plan's videos, and find their images
  images <plan>         Find or generate images for image scenes that don't have one
  voice <plan>          Generate ElevenLabs voice-overs and caption timings
  render <plan>         Render videos to MP4
  preview <plan>        Open one video in Remotion Studio (--video, default 1)
  publish <plan>        Write titles, captions and hashtags per platform, and export cover images
  bundle <plan>         Zip each platform's video, cover, post text and captions, ready to post
  make "<idea>"         Do all of the above in one go
  list [plan]           Show plans, or the videos in one plan and their status
  voices [search]       List the voices in your ElevenLabs account

Options:
  --videos <n>          Number of videos to plan (plan, make; default 5)
  --audience <text>     Who the videos are for (plan, make)
  --tone <text>         Voice and style (plan, make)
  --language <code>     Narration language, e.g. en, es, km (plan, make; default en)
  --seconds <n>         Target length per video (script, make; default 45)
  --video <n|all>       Which video(s) to work on (script, images, voice, render, publish, bundle; default all)
  --format <name>       vertical, landscape, or both (render, make; default vertical)
  --no-voice            Skip the voice-over; captions are timed from the text (make)
  --voice <id>          ElevenLabs voice to record with; saved as each video's voice (voice, make)
  --platform <name>     tiktok, shorts, reels, or youtube (bundle; default all)
  --cover <n>           Scene to use as the cover image (publish; default: the title scene)
  --force               Rewrite scripts or publish kits that already exist (script, publish)

Examples:
  npm run pipeline -- plan "Personal finance basics for university students" --videos 7
  npm run pipeline -- script personal-finance-basics --video 1
  npm run pipeline -- voice personal-finance-basics --video 1
  npm run pipeline -- voices british
  npm run pipeline -- voice personal-finance-basics --voice JBFqnCBsd6RMkjVDRZzb
  npm run pipeline -- render personal-finance-basics --video 1 --format both
  npm run pipeline -- publish personal-finance-basics --video 1 --cover 3
  npm run pipeline -- bundle personal-finance-basics --video 1 --platform tiktok
  npm run pipeline -- make "Why history matters" --videos 3 --no-voice
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    videos: { type: "string" },
    audience: { type: "string" },
    tone: { type: "string" },
    language: { type: "string" },
    seconds: { type: "string" },
    video: { type: "string" },
    format: { type: "string" },
    "no-voice": { type: "boolean" },
    voice: { type: "string" },
    cover: { type: "string" },
    platform: { type: "string" },
    force: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

const log = (message: string) => console.log(message);
const step = (message: string) => console.log(`\n→ ${message}`);
const relative = (file: string) => path.relative(ROOT, file);

const parsePositiveInt = (
  value: string | undefined,
  name: string,
  fallback: number,
) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} must be a whole number above 0.`);
  }
  return parsed;
};

/** Resolves --video to 0-based indexes. */
const selectVideos = (plan: PlanFile): number[] => {
  const all = plan.plan.videos.map((_, index) => index);
  if (!values.video || values.video === "all") return all;
  const n = parsePositiveInt(values.video, "video", 1);
  if (n > all.length) {
    throw new Error(
      `Plan "${plan.slug}" has ${all.length} videos; there is no video ${n}.`,
    );
  }
  return [n - 1];
};

const selectFormats = (): VideoFormat[] => {
  const format = values.format ?? "vertical";
  if (format === "both") return [...FORMAT_NAMES];
  if ((FORMAT_NAMES as string[]).includes(format))
    return [format as VideoFormat];
  throw new Error(`--format must be one of: ${FORMAT_NAMES.join(", ")}, both.`);
};

const requireArg = (value: string | undefined, usage: string) => {
  if (!value)
    throw new Error(`Missing argument. Usage: npm run pipeline -- ${usage}`);
  return value;
};

/** Runs tasks with at most `limit` in flight. */
const runLimited = async <T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) => {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
        await task(item);
      }
    },
  );
  await Promise.all(workers);
};

const formatSeconds = (seconds: number) => `${Math.round(seconds)}s`;

const specSeconds = (spec: Parameters<typeof videoSpecSchema.parse>[0]) =>
  getVideoTiming(videoSpecSchema.parse(spec)).total / FPS;

// --- Commands ---

const plan = async (idea: string): Promise<PlanFile> => {
  step(`Planning: "${idea}"`);
  const file = await createPlan(idea, {
    videos: parsePositiveInt(values.videos, "videos", 5),
    audience: values.audience,
    tone: values.tone,
    language: values.language ?? "en",
  });

  const { plan: content } = file;
  log(`\n${content.title}`);
  log(`Audience: ${content.audience}`);
  log(`Goal: ${content.goal}`);
  log(`Tone: ${content.tone}`);
  log(`Pillars: ${content.pillars.map((pillar) => pillar.name).join(", ")}`);
  log(
    `Schedule: ${content.schedule.postsPerWeek} per week. ${content.schedule.notes}`,
  );
  log("");
  content.videos.forEach((video, index) => {
    log(`  ${index + 1}. ${video.title}`);
    log(`     Hook: ${video.hook}`);
  });
  log(`\nSaved content/${file.slug}/plan.json. Edit it if you like, then run:`);
  log(`  npm run pipeline -- script ${file.slug}`);
  return file;
};

const script = async (planSlug: string) => {
  const file = await loadPlan(planSlug);
  const seconds = parsePositiveInt(values.seconds, "seconds", 45);
  const indexes = selectVideos(file);
  step(`Writing ${indexes.length} script(s) for "${file.plan.title}"`);

  await runLimited(indexes, 3, async (index) => {
    const title = file.plan.videos[index]!.title;
    if (!values.force && (await loadSpec(file, index))) {
      log(`  ${index + 1}. ${title}: already written (use --force to rewrite)`);
      return;
    }
    const { spec, words } = await createVideoSpec(file, index, { seconds });
    await saveSpec(file, index, spec);
    log(
      `  ${index + 1}. ${title}: ${spec.scenes.length} scenes, ${words} words, about ${formatSeconds(specSeconds(spec))}`,
    );
    await findImages(file, index, spec);
  });
  log(`\nScripts are in content/${file.slug}/videos/. Edit them freely.`);
  log(`Preview: npm run pipeline -- preview ${file.slug} --video 1`);
  log(`Next:    npm run pipeline -- voice ${file.slug}`);
};

/** Fills in the video's missing images and saves them. Failures are reported, not thrown. */
const findImages = async (
  file: PlanFile,
  index: number,
  spec: VideoSpecInput,
) => {
  const title = file.plan.videos[index]!.title;
  const result = await addImages(spec, mediaDir(file, index), (message) =>
    log(`  ${index + 1}. ${message}`),
  );
  if (result.found) {
    await saveSpec(file, index, result.spec);
    log(`  ${index + 1}. ${title}: ${result.found} image(s) added`);
  }
  for (const failure of result.failures) {
    console.warn(
      `  ⚠ ${title}: ${failure}. Pick one in the studio, or run images again.`,
    );
  }
};

const images = async (planSlug: string) => {
  const file = await loadPlan(planSlug);
  const indexes = selectVideos(file);
  step(`Finding images for "${file.plan.title}"`);
  for (const index of indexes) {
    const spec = await loadSpec(file, index);
    if (!spec) {
      log(
        `  ${index + 1}. ${file.plan.videos[index]!.title}: no script yet, skipping`,
      );
      continue;
    }
    await findImages(file, index, spec);
  }
};

const voice = async (planSlug: string) => {
  const commandVoice = values.voice?.trim();
  if (values.voice !== undefined && !commandVoice) {
    throw new Error(
      "--voice needs a voice id. See them with: npm run pipeline -- voices",
    );
  }
  const file = await loadPlan(planSlug);
  const indexes = selectVideos(file);
  step(`Recording voice-overs for "${file.plan.title}"`);

  for (const index of indexes) {
    const spec = await loadSpec(file, index);
    const title = file.plan.videos[index]!.title;
    if (!spec) {
      log(`  ${index + 1}. ${title}: no script yet, skipping`);
      continue;
    }
    // --voice becomes the video's own voice, so the studio records with it too.
    const voiced = commandVoice
      ? {
          ...spec,
          voice:
            spec.voice?.voiceId === commandVoice
              ? spec.voice
              : { voiceId: commandVoice },
        }
      : spec;
    const result = await addVoiceOver(voiced, mediaDir(file, index), {
      projectVoice: file.brand?.voice,
      onProgress: (message) => log(`  ${index + 1}. ${message}`),
    });
    await saveSpec(file, index, result.spec);
    const voiceName = result.voice.name ?? result.voice.voiceId;
    log(
      `  ${index + 1}. ${title}: ${result.generated} recorded, ${result.reused} unchanged, ${formatSeconds(specSeconds(result.spec))} (voice: ${voiceName}, from ${result.voice.source})`,
    );
  }
  log(`\nNext: npm run pipeline -- render ${file.slug}`);
};

const render = async (planSlug: string) => {
  const file = await loadPlan(planSlug);
  const indexes = selectVideos(file);
  const formats = selectFormats();
  step(
    `Rendering ${indexes.length * formats.length} video(s) for "${file.plan.title}"`,
  );

  const rendered: string[] = [];
  for (const index of indexes) {
    const spec = await loadSpec(file, index);
    const title = file.plan.videos[index]!.title;
    if (!spec) {
      log(`  ${index + 1}. ${title}: no script yet, skipping`);
      continue;
    }
    for (const format of formats) {
      const output = outputPath(file, index, format);
      let lastLogged = "";
      await renderVideo(spec, format, output, ({ stage, progress }) => {
        // "preparing", then every 10%, so the log stays short.
        const label =
          stage === "bundling"
            ? "preparing"
            : `${Math.floor(progress * 10) * 10}%`;
        if (label !== lastLogged) {
          lastLogged = label;
          log(`  ${index + 1}. ${title} (${format}): ${label}`);
        }
      });
      rendered.push(output);
      const captions = await writeCaptionFiles(file, index, format);
      if (captions) rendered.push(captions.srt.file, captions.vtt.file);
    }
  }
  if (rendered.length) {
    log("\nDone:");
    rendered.forEach((output) => log(`  ${relative(output)}`));
  }
};

const preview = async (planSlug: string) => {
  const file = await loadPlan(planSlug);
  const index = selectVideos(file)[0]!;
  const spec = await loadSpec(file, index);
  if (!spec) {
    throw new Error(
      `Video ${index + 1} has no script yet. Run: npm run pipeline -- script ${file.slug} --video ${index + 1}`,
    );
  }
  step(
    `Opening "${file.plan.videos[index]!.title}" in Remotion Studio (explainer-vertical / explainer-landscape)`,
  );
  await openStudio(spec);
};

/** Prints a publish kit, ready to copy from the terminal. */
const printPublishKit = (
  kit: NonNullable<Awaited<ReturnType<typeof loadPublishKit>>>,
) => {
  if (!kit.posts) return;
  for (const platform of PLATFORMS) {
    const post = kit.posts[platform];
    const rules = PLATFORM_RULES[platform];
    log(`\n  ── ${rules.label} ──`);
    if (post.title !== null) log(`  Title: ${post.title}`);
    log(
      composePost(post)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
    );
  }
};

const publish = async (planSlug: string) => {
  const file = await loadPlan(planSlug);
  const indexes = selectVideos(file);
  const coverArg =
    values.cover === undefined
      ? undefined
      : parsePositiveInt(values.cover, "cover", 1) - 1;
  step(`Writing publish kits for "${file.plan.title}"`);

  for (const index of indexes) {
    const spec = await loadSpec(file, index);
    const title = file.plan.videos[index]!.title;
    if (!spec) {
      log(`  ${index + 1}. ${title}: no script yet, skipping`);
      continue;
    }
    if (coverArg !== undefined && coverArg >= spec.scenes.length) {
      throw new Error(
        `"${title}" has ${spec.scenes.length} scenes; there is no scene ${coverArg + 1}.`,
      );
    }
    const previous = await loadPublishKit(file, index);
    const base = previous ?? blankPublishKit(spec);
    const withCover =
      coverArg === undefined ? base : { ...base, coverScene: coverArg };

    let kit = withCover;
    if (values.force || !withCover.posts) {
      log(`  ${index + 1}. ${title}: writing posts…`);
      kit = await createPublishKit(file, index, spec, withCover);
    } else {
      log(
        `  ${index + 1}. ${title}: posts already written (use --force to rewrite)`,
      );
    }
    await savePublishKit(file, index, kit);
    printPublishKit(kit);
    log(`\n  Saved ${relative(publishPath(file, index))}. Edit it freely.`);

    const scene = clampCoverScene(kit.coverScene, spec.scenes.length);
    for (const format of FORMAT_NAMES) {
      const output = coverPath(file, index, format);
      log(`  ${index + 1}. Exporting ${format} cover (scene ${scene + 1})…`);
      await renderCover(spec, format, scene, output);
      log(`     ${relative(output)}`);
    }
  }
};

const selectPlatforms = (): Platform[] => {
  if (!values.platform || values.platform === "all") return [...PLATFORMS];
  if ((PLATFORMS as readonly string[]).includes(values.platform))
    return [values.platform as Platform];
  throw new Error(`--platform must be one of: ${PLATFORMS.join(", ")}, all.`);
};

const bundle = async (planSlug: string) => {
  const file = await loadPlan(planSlug);
  const indexes = selectVideos(file);
  const platforms = selectPlatforms();
  step(`Bundling "${file.plan.title}" for posting`);

  for (const index of indexes) {
    const title = file.plan.videos[index]!.title;
    if (!(await loadSpec(file, index))) {
      log(`  ${index + 1}. ${title}: no script yet, skipping`);
      continue;
    }
    for (const platform of platforms) {
      const { zip, contents } = await buildBundle(file, index, platform);
      const output = bundlePath(file, index, platform);
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, zip);
      const missing = contents.missing.map(
        (piece) => BUNDLE_PIECE_LABELS[piece],
      );
      log(
        `  ${index + 1}. ${PLATFORM_RULES[platform].label}: ${relative(output)}${missing.length ? `  (missing: ${missing.join(", ")}; see README.txt inside)` : ""}`,
      );
    }
  }
};

const make = async (idea: string) => {
  const file = await plan(idea);
  await script(file.slug);
  if (values["no-voice"]) {
    log("\nSkipping voice-over (--no-voice).");
  } else {
    await voice(file.slug);
  }
  await render(file.slug);
};

const list = async (planSlug: string | undefined) => {
  if (!planSlug) {
    const plans = await listPlans();
    if (!plans.length) {
      log(
        'No plans yet. Create one with: npm run pipeline -- plan "your idea"',
      );
      return;
    }
    for (const slug of plans) {
      const file = await loadPlan(slug);
      log(`${slug}  ${file.plan.title} (${file.plan.videos.length} videos)`);
    }
    return;
  }

  const file = await loadPlan(planSlug);
  log(`${file.plan.title}\n`);
  for (const [index, video] of file.plan.videos.entries()) {
    const spec = await loadSpec(file, index);
    const status = !spec
      ? "not scripted"
      : spec.scenes.every((scene) => scene.audio)
        ? `voiced, ${formatSeconds(specSeconds(spec))}`
        : `scripted, about ${formatSeconds(specSeconds(spec))}`;
    log(`  ${index + 1}. ${video.title}  [${status}]`);
    if (spec) log(`     ${relative(specPath(file, index))}`);
    const kit = await loadPublishKit(file, index);
    if (kit?.posts) {
      log(`     Publish kit: ${relative(publishPath(file, index))}`);
      for (const platform of PLATFORMS) {
        const post = kit.posts[platform];
        const name = PLATFORM_RULES[platform].label.padEnd(17);
        log(
          `       ${name}${post.title ?? post.text.split("\n")[0]}  ${post.hashtags.join(" ")}`,
        );
      }
    }
    for (const format of FORMAT_NAMES) {
      const cover = coverPath(file, index, format);
      if (await exists(cover))
        log(`     Cover (${format}): ${relative(cover)}`);
      const captions = captionPath(file, index, format, "srt");
      if (await exists(captions))
        log(`     Captions (${format}): ${relative(captions)} (and .vtt)`);
    }
    for (const platform of PLATFORMS) {
      const zip = bundlePath(file, index, platform);
      if (await exists(zip))
        log(
          `     Bundle (${PLATFORM_RULES[platform].label}): ${relative(zip)}`,
        );
    }
  }
};

const voices = async (search: string | undefined) => {
  const all = await listVoices();
  const matches = search ? filterVoices(all, search) : all;
  if (!matches.length) {
    log(search ? `No voices match "${search}".` : "No voices found.");
    return;
  }
  const width = Math.max(...matches.map((v) => v.name.length));
  for (const v of matches) {
    const labels = voiceLabels(v).join(", ");
    log(`${v.id}  ${v.name.padEnd(width)}  ${labels}`);
  }
  log(
    `\n${matches.length} voice(s). Use one with: npm run pipeline -- voice <plan> --voice <id>`,
  );
};

const main = async () => {
  const [command, argument] = positionals;
  if (values.help || !command) {
    log(HELP);
    return;
  }

  switch (command) {
    case "plan":
      await plan(requireArg(argument, 'plan "<idea>"'));
      break;
    case "script":
      await script(requireArg(argument, "script <plan>"));
      break;
    case "images":
      await images(requireArg(argument, "images <plan>"));
      break;
    case "voice":
      await voice(requireArg(argument, "voice <plan>"));
      break;
    case "render":
      await render(requireArg(argument, "render <plan>"));
      break;
    case "preview":
      await preview(requireArg(argument, "preview <plan> --video <n>"));
      break;
    case "publish":
      await publish(requireArg(argument, "publish <plan> [--video <n>]"));
      break;
    case "bundle":
      await bundle(
        requireArg(argument, "bundle <plan> [--video <n>] [--platform <name>]"),
      );
      break;
    case "make":
      await make(requireArg(argument, 'make "<idea>"'));
      break;
    case "list":
      await list(argument);
      break;
    case "voices":
      await voices(argument);
      break;
    default:
      throw new Error(
        `Unknown command "${command}". Run with --help to see commands.`,
      );
  }
};

main().catch((error: unknown) => {
  console.error(
    `\n✖ ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
