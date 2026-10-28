"use client";

import { Mic } from "lucide-react";
import type { VoiceSetting as VoiceValue } from "../../../src/spec/schema";
import { describeScenes } from "../../../src/lib/voice";
import { SETUP, SetupLink, useCanSetUp } from "../AiChoice";
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
  const canSetUp = useCanSetUp();
  const fallback = projectVoice
    ? {
        title: `Project voice: ${projectVoice.name ?? projectVoice.voiceId}`,
        detail: "From the brand kit",
      }
    : {
        title: "Default voice",
        detail: "The default voice from Settings, or George",
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
            {canList
              ? "Who narrates this video, and how they sound"
              : "Who narrates this video"}
          </span>
        </span>
      </div>
      {canList ? (
        <VoicePicker
          value={voice}
          onChange={onChange}
          fallback={fallback}
          canList={canList}
        />
      ) : (
        <p className="text-[13px] leading-relaxed text-muted">
          You&apos;re the narrator. On each scene, use{" "}
          <span className="text-text">Record my voice</span> or{" "}
          <span className="text-text">Upload</span>, or narrate the whole video
          in one take below.
          {canSetUp ? (
            <>
              {" "}
              To have a voice read the script for you instead,{" "}
              <SetupLink setup={SETUP.voice} service="AI voice">
                add an ElevenLabs key in Settings
              </SetupLink>
              .
            </>
          ) : null}
        </p>
      )}
      {pending?.length ? (
        <Alert tone="info">
          {describeScenes(pending)} will be recorded when you click Record
          voice.
        </Alert>
      ) : null}
    </div>
  );
};
