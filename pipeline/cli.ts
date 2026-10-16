import path from "node:path";
import { parseArgs } from "node:util";
import { FORMAT_NAMES, type VideoFormat } from "../src/lib/formats";
import { videoSpecSchema } from "../src/spec/schema";
import { getVideoTiming, FPS } from "../src/lib/timing";
import { ROOT } from "./config";
import { createPlan } from "./plan";
import { openStudio, renderVideo } from "./render";
import { createVideoSpec } from "./script";
import {
  listPlans,
  loadPlan,
  loadSpec,
  mediaDir,
  outputPath,
  saveSpec,
  specPath,
  type PlanFile,
} from "./store";
import { addVoiceOver } from "./voice";

const HELP = `Content Studio pipeline: idea → content plan → script → voice-over → video

Usage: npm run pipeline -- <command> [options]

Commands:
  plan "<idea>"         Create a content plan with Claude
  script <plan>         Write scripts and scenes for the plan's videos
  voice <plan>          Generate ElevenLabs voice-overs and caption timings
  render <plan>         Render videos to MP4
  preview <plan>        Open one video in Remotion Studio (--video, default 1)
  make "<idea>"         Do all of the above in one go
  list [plan]           Show plans, or the videos in one plan and their status

Options:
  --videos <n>          Number of videos to plan (plan, make; default 5)
  --audience <text>     Who the videos are for (plan, make)
  --tone <text>         Voice and style (plan, make)
  --language <code>     Narration language, e.g. en, es, km (plan, make; default en)
  --seconds <n>         Target length per video (script, make; default 45)
  --video <n|all>       Which video(s) to work on (script, voice, render; default all)
  --format <name>       vertical, landscape, or both (render, make; default vertical)
  --no-voice            Skip the voice-over; captions are timed from the text (make)
  --force               Rewrite scripts that already exist (script)

Examples:
  npm run pipeline -- plan "Personal finance basics for university students" --videos 7
  npm run pipeline -- script personal-finance-basics --video 1
  npm run pipeline -- voice personal-finance-basics --video 1
  npm run pipeline -- render personal-finance-basics --video 1 --format both
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
  });
  log(`\nScripts are in content/${file.slug}/videos/. Edit them freely.`);
  log(`Preview: npm run pipeline -- preview ${file.slug} --video 1`);
  log(`Next:    npm run pipeline -- voice ${file.slug}`);
};

const voice = async (planSlug: string) => {
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
    const result = await addVoiceOver(spec, mediaDir(file, index), (message) =>
      log(`  ${index + 1}. ${message}`),
    );
    await saveSpec(file, index, result.spec);
    log(
      `  ${index + 1}. ${title}: ${result.generated} recorded, ${result.reused} unchanged, ${formatSeconds(specSeconds(result.spec))}`,
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
  }
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
    case "voice":
      await voice(requireArg(argument, "voice <plan>"));
      break;
    case "render":
      await render(requireArg(argument, "render <plan>"));
      break;
    case "preview":
      await preview(requireArg(argument, "preview <plan> --video <n>"));
      break;
    case "make":
      await make(requireArg(argument, 'make "<idea>"'));
      break;
    case "list":
      await list(argument);
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
