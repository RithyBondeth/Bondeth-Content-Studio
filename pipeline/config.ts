import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";

// Load .env if present. Variables already set in the shell win.
if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

export const ROOT = process.cwd();
/** Generated media must live under public/ so Remotion can load it with staticFile(). */
export const PUBLIC_DIR = path.join(ROOT, "public");

/**
 * With accounts, each person's projects, media, and renders live in their own
 * workspace folder, named by their user id. The workspace follows a request
 * through every await, so the pipeline and store don't need to pass it around.
 * Without one (running locally, the CLI) everything uses the top-level folders.
 */
const workspace = new AsyncLocalStorage<string>();

const WORKSPACE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Runs `task` in a workspace, or with none (the top-level folders) for `undefined`. */
export const runInWorkspace = <T>(id: string | undefined, task: () => T): T => {
  if (id === undefined) return workspace.exit(task);
  if (!WORKSPACE_ID.test(id)) throw new Error("Invalid workspace.");
  return workspace.run(id, task);
};

/** The workspace of the current request, if any. */
export const currentWorkspace = (): string | undefined => workspace.getStore();

const inWorkspaceDir = (dir: string) => {
  const id = currentWorkspace();
  return id ? path.join(dir, id) : dir;
};

/** Plans and video specs. */
export const contentDir = () => inWorkspaceDir(path.join(ROOT, "content"));
/** Media folder relative to public/, which is what staticFile() takes. */
export const mediaSubdir = () => {
  const id = currentWorkspace();
  return id ? path.posix.join("content", id) : "content";
};
/** Rendered videos, covers, captions, and bundles, for every workspace. */
export const OUT_ROOT = path.join(ROOT, "out");
/** The current workspace's renders. */
export const outDir = () => inWorkspaceDir(OUT_ROOT);

export const config = {
  elevenLabs: {
    // George, one of ElevenLabs' default voices. Browse others at elevenlabs.io/app/voice-library.
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb",
    modelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
  },
  /** OpenAI image model for AI illustrations. Only used when OPENAI_API_KEY is set. */
  imageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
};
