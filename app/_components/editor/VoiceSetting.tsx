"use client";

import { Mic } from "lucide-react";
import type { VoiceSetting as VoiceValue } from "../../../src/spec/schema";
import { describeScenes } from "../../../src/lib/voice";
import { Alert } from "../ui";
import { VoicePicker } from "../VoicePicker";

/**
 * Picks the narrator for this video, or follows the project's voice. Shows
 * which scenes the next recording would redo.
 */
export const VoiceSetting = ({
  voice,
  projectVoice,
  canList,
  pending,
  onChange,
}: {
  voice: VoiceValue | undefined;
  projectVoice?: VoiceValue;
  canList: boolean;
  /** Scenes (0-based) Record voice would generate, once known. */
  pending: number[] | null;
  onChange: (voice: VoiceValue | undefined) => void;
}) => {
  const fallback = projectVoice
    ? {
        title: `Project voice: ${projectVoice.name ?? projectVoice.voiceId}`,
        detail: "From the brand kit",
      }
    : {
        title: "Default voice",
        detail: "ELEVENLABS_VOICE_ID from .env, or George",
      };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/60 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-raised text-accent-bright">
          <Mic className="size-4" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-medium">Voice</span>
          <span className="block text-xs text-faint">
            Who narrates this video, and how they sound
          </span>
        </span>
      </div>
      <VoicePicker
        value={voice}
        onChange={onChange}
        fallback={fallback}
        canList={canList}
      />
      {pending?.length ? (
        <Alert tone="info">
          {describeScenes(pending)} will be recorded when you click Record
          voice.
        </Alert>
      ) : null}
    </div>
  );
};
