import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { SceneAudio, VideoSpecInput } from "../src/spec/schema";
import { alignmentToWords, type CharacterAlignment } from "./alignment";
import { config, requireEnv } from "./config";
import { exists, publicPath } from "./store";

const API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

type TimestampsResponse = {
  audio_base64: string;
  alignment: CharacterAlignment | null;
};

/** Silence the voice keeps after the last word, roughly. */
const TRAILING_SECONDS = 0.15;

const synthesize = async (
  text: string,
  context: { previousText?: string; nextText?: string },
): Promise<TimestampsResponse> => {
  const apiKey = requireEnv(
    "ELEVENLABS_API_KEY",
    "Add it to .env (see .env.example), or render without voice-over.",
  );

  const response = await fetch(
    `${API_URL}/${config.elevenLabs.voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: config.elevenLabs.modelId,
        // Neighbouring scenes help the voice keep a natural flow between files.
        previous_text: context.previousText,
        next_text: context.nextText,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `ElevenLabs returned ${response.status} ${response.statusText}: ${detail.slice(0, 300)}`,
    );
  }
  return (await response.json()) as TimestampsResponse;
};

/** Same text, voice, and model → same file name, so unchanged scenes are skipped. */
const audioFileName = (index: number, text: string) => {
  const hash = createHash("sha256")
    .update(
      [config.elevenLabs.voiceId, config.elevenLabs.modelId, text].join("\n"),
    )
    .digest("hex")
    .slice(0, 10);
  return `scene-${String(index + 1).padStart(2, "0")}-${hash}.mp3`;
};

export type VoiceResult = {
  spec: VideoSpecInput;
  generated: number;
  reused: number;
};

/**
 * Generates a voice-over for every scene and stores word timings for captions.
 * `mediaDir` is relative to public/.
 */
export const addVoiceOver = async (
  spec: VideoSpecInput,
  mediaDir: string,
  onProgress?: (message: string) => void,
): Promise<VoiceResult> => {
  let generated = 0;
  let reused = 0;
  const scenes = [];

  for (const [index, scene] of spec.scenes.entries()) {
    const src = path.posix.join(
      mediaDir,
      audioFileName(index, scene.narration),
    );
    const file = publicPath(src);

    if (scene.audio?.src === src && (await exists(file))) {
      scenes.push(scene);
      reused++;
      continue;
    }

    onProgress?.(
      `Scene ${index + 1}/${spec.scenes.length}: generating voice-over`,
    );
    const result = await synthesize(scene.narration, {
      previousText: spec.scenes[index - 1]?.narration,
      nextText: spec.scenes[index + 1]?.narration,
    });
    if (!result.alignment) {
      throw new Error(`ElevenLabs returned no timings for scene ${index + 1}.`);
    }

    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, Buffer.from(result.audio_base64, "base64"));

    const words = alignmentToWords(result.alignment);
    const lastEnd = result.alignment.character_end_times_seconds.at(-1) ?? 0;
    const audio: SceneAudio = {
      src,
      durationInSeconds: lastEnd + TRAILING_SECONDS,
      words,
    };
    scenes.push({ ...scene, audio });
    generated++;
  }

  return { spec: { ...spec, scenes }, generated, reused };
};
