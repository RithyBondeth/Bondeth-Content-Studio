import fs from "node:fs";
import path from "node:path";

// Load .env if present. Variables already set in the shell win.
if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

export const ROOT = process.cwd();
/** Plans and video specs. */
export const CONTENT_DIR = path.join(ROOT, "content");
/** Generated media must live under public/ so Remotion can load it with staticFile(). */
export const PUBLIC_DIR = path.join(ROOT, "public");
export const MEDIA_SUBDIR = "content";
export const OUT_DIR = path.join(ROOT, "out");

export const config = {
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-opus-5-5",
  elevenLabs: {
    // George, one of ElevenLabs' default voices. Browse others at elevenlabs.io/app/voice-library.
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb",
    modelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
  },
};

export const requireEnv = (name: string, hint: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. ${hint}`);
  }
  return value;
};
