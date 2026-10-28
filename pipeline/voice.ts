import { createHash } from "node:crypto";
import { existsAnywhere, saved } from "./storage";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  SceneAudio,
  VideoSpecInput,
  VoiceSetting,
  VoiceSettings,
} from "../src/spec/schema";
import { isSelfRecorded } from "../src/lib/recording";
import { resolveVoice, type ResolvedVoice } from "../src/lib/voice";
import { alignmentToWords, type CharacterAlignment } from "./alignment";
import { config } from "./config";
import { getEnv, requireEnv } from "./settings";
import { publicPath } from "./store";

const API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

type TimestampsResponse = {
  audio_base64: string;
  alignment: CharacterAlignment | null;
};

/** Silence the voice keeps after the last word, roughly. */
const TRAILING_SECONDS = 0.15;

/** Our setting names → the ones ElevenLabs expects. Unset ones are left out. */
export const toElevenLabsSettings = (settings: VoiceSettings | undefined) => {
  if (!settings) return undefined;
  const mapped = {
    stability: settings.stability,
    similarity_boost: settings.similarity,
    style: settings.style,
    speed: settings.speed,
  };
  const set = Object.fromEntries(
    Object.entries(mapped).filter(([, value]) => value !== undefined),
  );
  return Object.keys(set).length ? set : undefined;
};

const synthesize = async (
  text: string,
  context: { previousText?: string; nextText?: string },
  voice: ResolvedVoice,
): Promise<TimestampsResponse> => {
  const apiKey = requireEnv(
    "ELEVENLABS_API_KEY",
    "Add your ElevenLabs key in Settings, or render without voice-over.",
  );

  const response = await fetch(
    `${API_URL}/${encodeURIComponent(voice.voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: config.elevenLabs.modelId,
        // Left out when nothing is set, so the voice's own defaults apply.
        voice_settings: toElevenLabsSettings(voice.settings),
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

/**
 * Same text, voice, settings, and model → same file name, so unchanged
 * scenes are skipped. Settings are only added to the hash when some are
 * set, so voice-overs recorded before settings existed keep their names.
 */
export const audioFileName = (
  index: number,
  text: string,
  voice: Pick<ResolvedVoice, "voiceId" | "settings">,
  modelId: string = config.elevenLabs.modelId,
) => {
  const parts = [voice.voiceId, modelId, text];
  const settings = toElevenLabsSettings(voice.settings);
  if (settings) {
    // Sorted keys, so the order settings were written in doesn't matter.
    parts.push(JSON.stringify(settings, Object.keys(settings).sort()));
  }
  const hash = createHash("sha256")
    .update(parts.join("\n"))
    .digest("hex")
    .slice(0, 10);
  return `scene-${String(index + 1).padStart(2, "0")}-${hash}.mp3`;
};

export type VoiceOptions = {
  /** The project's brand kit voice. */
  projectVoice?: VoiceSetting;
  /** A voice that beats every other choice, e.g. --voice on the command line. */
  command?: VoiceSetting;
  onProgress?: (message: string) => void;
};

/** The voice a video is recorded with: command, video, project, then Settings or .env. */
export const voiceForVideo = (
  spec: VideoSpecInput,
  options: Pick<VoiceOptions, "projectVoice" | "command"> = {},
): ResolvedVoice =>
  resolveVoice({
    command: options.command,
    video: spec.voice,
    project: options.projectVoice,
    fallbackId: getEnv("ELEVENLABS_VOICE_ID") ?? config.elevenLabs.voiceId,
  });

const sceneAudioSrc = (
  spec: VideoSpecInput,
  index: number,
  mediaDir: string,
  voice: ResolvedVoice,
) =>
  path.posix.join(
    mediaDir,
    audioFileName(index, spec.scenes[index]!.narration, voice),
  );

/**
 * The scenes (0-based) that recording would generate: ones with no
 * voice-over yet, or one made from different narration, voice, or settings.
 * Scenes the creator recorded themselves are never included, even when their
 * narration has changed since: re-recording those is up to the creator.
 */
export const scenesToRecord = async (
  spec: VideoSpecInput,
  mediaDir: string,
  voice: ResolvedVoice,
): Promise<number[]> => {
  const pending: number[] = [];
  for (const [index, scene] of spec.scenes.entries()) {
    if (isSelfRecorded(scene.audio)) continue;
    const src = sceneAudioSrc(spec, index, mediaDir, voice);
    if (scene.audio?.src !== src || !(await existsAnywhere(publicPath(src)))) {
      pending.push(index);
    }
  }
  return pending;
};

export type VoiceResult = {
  spec: VideoSpecInput;
  generated: number;
  reused: number;
  voice: ResolvedVoice;
};

/**
 * Generates a voice-over for every scene and stores word timings for captions.
 * `mediaDir` is relative to public/.
 */
export const addVoiceOver = async (
  spec: VideoSpecInput,
  mediaDir: string,
  options: VoiceOptions = {},
): Promise<VoiceResult> => {
  const { onProgress } = options;
  const voice = voiceForVideo(spec, options);
  let generated = 0;
  let reused = 0;
  const scenes = [];

  for (const [index, scene] of spec.scenes.entries()) {
    const src = sceneAudioSrc(spec, index, mediaDir, voice);
    const file = publicPath(src);

    // The creator's own recording is kept as it is.
    if (
      isSelfRecorded(scene.audio) ||
      (scene.audio?.src === src && (await existsAnywhere(file)))
    ) {
      scenes.push(scene);
      reused++;
      continue;
    }

    onProgress?.(
      `Scene ${index + 1}/${spec.scenes.length}: generating voice-over`,
    );
    const result = await synthesize(
      scene.narration,
      {
        previousText: spec.scenes[index - 1]?.narration,
        nextText: spec.scenes[index + 1]?.narration,
      },
      voice,
    );
    if (!result.alignment) {
      throw new Error(`ElevenLabs returned no timings for scene ${index + 1}.`);
    }

    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, Buffer.from(result.audio_base64, "base64"));
    await saved(file);

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

  return { spec: { ...spec, scenes }, generated, reused, voice };
};
