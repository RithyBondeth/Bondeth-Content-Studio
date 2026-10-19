import type { VoiceSummary } from "../src/lib/voice";
import { requireEnv } from "./settings";

const API_URL = "https://api.elevenlabs.io/v2/voices";
/** ElevenLabs' largest page. */
const PAGE_SIZE = 100;
/** Enough for any account's own voices; stops a runaway loop. */
const MAX_PAGES = 10;
/** Voices rarely change, and the picker asks every time it opens. */
const CACHE_MS = 5 * 60 * 1000;

type VoicesPage = {
  voices: {
    voice_id: string;
    name?: string | null;
    category?: string | null;
    labels?: Record<string, string> | null;
    description?: string | null;
    preview_url?: string | null;
  }[];
  has_more: boolean;
  next_page_token?: string | null;
};

export const toVoiceSummary = (
  voice: VoicesPage["voices"][number],
): VoiceSummary => ({
  id: voice.voice_id,
  name: voice.name?.trim() || voice.voice_id,
  ...(voice.category ? { category: voice.category } : {}),
  labels: voice.labels ?? {},
  ...(voice.description?.trim()
    ? { description: voice.description.trim() }
    : {}),
  ...(voice.preview_url ? { previewUrl: voice.preview_url } : {}),
});

let cache: { key: string; at: number; voices: VoiceSummary[] } | null = null;

/**
 * The voices in the ElevenLabs account: its own plus the default ones,
 * sorted by name. Kept for a few minutes so opening the picker is quick.
 */
export const listVoices = async ({
  fresh = false,
}: { fresh?: boolean } = {}): Promise<VoiceSummary[]> => {
  const apiKey = requireEnv(
    "ELEVENLABS_API_KEY",
    "Add your ElevenLabs key in Settings to choose a voice.",
  );
  if (!fresh && cache?.key === apiKey && Date.now() - cache.at < CACHE_MS) {
    return cache.voices;
  }

  const voices: VoiceSummary[] = [];
  let token: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      page_size: String(PAGE_SIZE),
      include_total_count: "false",
    });
    if (token) params.set("next_page_token", token);
    const response = await fetch(`${API_URL}?${params}`, {
      headers: { "xi-api-key": apiKey },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        response.status === 401
          ? "ElevenLabs didn't accept ELEVENLABS_API_KEY. Check it in Settings, and that it's allowed to read voices."
          : `ElevenLabs returned ${response.status} ${response.statusText}: ${detail.slice(0, 300)}`,
      );
    }
    const data = (await response.json()) as VoicesPage;
    voices.push(...data.voices.map(toVoiceSummary));
    token = data.next_page_token;
    if (!data.has_more || !token) break;
  }

  // Page 0 can repeat default voices, so keep the first of each.
  const unique = [...new Map(voices.map((v) => [v.id, v])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  cache = { key: apiKey, at: Date.now(), voices: unique };
  return unique;
};
