import type { VoiceSetting, VoiceSettings } from "../spec/schema";

/**
 * Voice helpers shared by the pipeline and the studio. Nothing here talks to
 * ElevenLabs, so the browser can use it too.
 */

export type VoiceSettingName = keyof VoiceSettings;

/** Slider limits and ElevenLabs' defaults for each voice setting. */
export const VOICE_SETTING_RANGES: Record<
  VoiceSettingName,
  {
    label: string;
    hint: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
  }
> = {
  stability: {
    label: "Stability",
    hint: "Lower sounds more expressive; higher sounds steadier",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.5,
  },
  similarity: {
    label: "Similarity",
    hint: "How closely it sticks to the original speaker",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.75,
  },
  style: {
    label: "Style",
    hint: "Exaggerates the speaker's style; 0 is the most natural",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0,
  },
  speed: {
    label: "Speed",
    hint: "1 is normal speed",
    min: 0.7,
    max: 1.2,
    step: 0.05,
    defaultValue: 1,
  },
};

export const VOICE_SETTING_NAMES = Object.keys(
  VOICE_SETTING_RANGES,
) as VoiceSettingName[];

/** Drops settings that aren't set. Returns undefined when none are. */
export const cleanVoiceSettings = (
  settings: VoiceSettings | undefined,
): VoiceSettings | undefined => {
  const clean: VoiceSettings = {};
  for (const name of VOICE_SETTING_NAMES) {
    const value = settings?.[name];
    if (typeof value === "number" && Number.isFinite(value)) {
      clean[name] = value;
    }
  }
  return Object.keys(clean).length ? clean : undefined;
};

export type VoiceSource = "command" | "video" | "project" | "default";

/** The voice a video is recorded with, and where that choice came from. */
export type ResolvedVoice = {
  voiceId: string;
  settings?: VoiceSettings;
  name?: string;
  source: VoiceSource;
};

/**
 * Picks the voice for a video. The first one set wins: a --voice on the
 * command line, the video's own voice, the project's brand kit voice, then
 * `fallbackId` (ELEVENLABS_VOICE_ID from .env, or the built-in default).
 * A choice is used whole: a video's voice doesn't borrow the project's
 * settings.
 */
export const resolveVoice = ({
  command,
  video,
  project,
  fallbackId,
}: {
  command?: VoiceSetting;
  video?: VoiceSetting;
  project?: VoiceSetting;
  fallbackId: string;
}): ResolvedVoice => {
  const [source, choice] = (
    [
      ["command", command],
      ["video", video],
      ["project", project],
    ] as const
  ).find(([, setting]) => setting?.voiceId.trim()) ?? ["default", undefined];

  if (!choice) return { voiceId: fallbackId, source };
  const settings = cleanVoiceSettings(choice.settings);
  return {
    voiceId: choice.voiceId.trim(),
    ...(settings ? { settings } : {}),
    ...(choice.name ? { name: choice.name } : {}),
    source,
  };
};

/** One voice from the ElevenLabs account, as the studio shows it. */
export type VoiceSummary = {
  id: string;
  name: string;
  /** "premade", "cloned", "generated", or "professional". */
  category?: string;
  /** e.g. { accent: "british", gender: "male", age: "middle_aged" }. */
  labels: Record<string, string>;
  description?: string;
  /** A short sample of the voice. */
  previewUrl?: string;
};

const LABEL_ORDER = ["accent", "gender", "age", "descriptive", "use_case"];

/** A voice's labels in a steady order, readable: "middle aged", not "middle_aged". */
export const voiceLabels = (voice: Pick<VoiceSummary, "labels">): string[] =>
  Object.entries(voice.labels)
    .filter(([, value]) => value?.trim())
    .sort(([a], [b]) => {
      const rank = (key: string) =>
        LABEL_ORDER.includes(key)
          ? LABEL_ORDER.indexOf(key)
          : LABEL_ORDER.length;
      return rank(a) - rank(b) || a.localeCompare(b);
    })
    .map(([, value]) => value.replace(/_/g, " ").trim());

/**
 * Voices whose name, labels, category, or description contain every word
 * of the query, in their original order.
 */
export const filterVoices = <T extends VoiceSummary>(
  voices: T[],
  query: string,
): T[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return voices;
  return voices.filter((voice) => {
    const text = [
      voice.name,
      voice.category,
      voice.description,
      ...voiceLabels(voice),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return words.every((word) => text.includes(word));
  });
};

/** "Scene 2", "Scenes 1 and 3", "Scenes 1, 2 and 5", from 0-based indexes. */
export const describeScenes = (scenes: number[]) => {
  const numbers = scenes.map((scene) => String(scene + 1));
  if (numbers.length <= 1) return `Scene ${numbers[0] ?? ""}`.trim();
  return `Scenes ${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
};
