"use client";

import {
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isSelfRecorded } from "../../../src/lib/recording";
import type { SceneAudio } from "../../../src/spec/schema";
import { useToast } from "../Toast";
import { Button } from "../ui";
import { clock, mediaUrl, MicLevel, useMicRecorder } from "./mic";

/** Recording stops by itself after this long, in case Stop is forgotten. */
const MAX_SECONDS = 180;

/**
 * Record / Stop / Play / Re-record for one scene's voice-over, using the
 * browser's microphone, or Upload for audio recorded elsewhere (a phone
 * memo, a podcast mic). Either way it's converted to MP3 and stored as the
 * scene's audio, marked as your own so Record voice (ElevenLabs) leaves it
 * alone.
 */
export const VoiceRecorder = ({
  slug,
  videoIndex,
  sceneIndex,
  narration,
  audio,
  onChange,
}: {
  slug: string;
  videoIndex: number;
  sceneIndex: number;
  narration: string;
  audio: SceneAudio | undefined;
  onChange: (audio: SceneAudio | undefined) => void;
}) => {
  const notify = useToast();
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mic = useMicRecorder({
    maxSeconds: MAX_SECONDS,
    onRecorded: (blob) => void upload(blob),
  });
  const phase = saving ? ({ kind: "saving" } as const) : mic.phase;

  useEffect(() => () => player.current?.pause(), []);

  const upload = async (blob: Blob) => {
    setSaving(true);
    const form = new FormData();
    form.set("slug", slug);
    form.set("index", String(videoIndex));
    form.set("scene", String(sceneIndex));
    form.set("narration", narration);
    form.set(
      "file",
      blob,
      blob instanceof File ? blob.name : `scene-${sceneIndex + 1}`,
    );
    try {
      const response = await fetch("/api/recording", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as SceneAudio & {
        error?: string;
      };
      if (!response.ok || !result.src) {
        throw new Error(result.error ?? `Upload failed (${response.status}).`);
      }
      onChange(result);
      notify({
        tone: "success",
        title: "Voice-over saved",
        description: `${result.durationInSeconds.toFixed(1)}s of your voice for scene ${sceneIndex + 1}.`,
      });
    } catch (error) {
      notify({
        tone: "error",
        title: "Couldn't save the recording",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const record = async () => {
    if (!narration.trim()) {
      notify({ tone: "error", title: "Write the narration first" });
      return;
    }
    player.current?.pause();
    await mic.start();
  };

  const togglePlay = () => {
    if (!audio) return;
    if (playing) {
      player.current?.pause();
      return;
    }
    const element = new Audio(mediaUrl(audio.src));
    player.current?.pause();
    player.current = element;
    element.onended = () => setPlaying(false);
    element.onpause = () => setPlaying(false);
    setPlaying(true);
    void element.play().catch(() => setPlaying(false));
  };

  const own = isSelfRecorded(audio);
  const busy = phase.kind !== "idle";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-bg/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {phase.kind === "countdown" || phase.kind === "recording" ? (
          <Button
            variant="primary"
            size="sm"
            icon={<Square className="size-3.5 fill-current" aria-hidden />}
            onClick={mic.stop}
          >
            {phase.kind === "countdown" ? "Cancel" : "Stop"}
          </Button>
        ) : (
          <Button
            variant={own ? "secondary" : "outline"}
            size="sm"
            loading={phase.kind === "saving"}
            icon={
              own ? (
                <RotateCcw className="size-3.5" aria-hidden />
              ) : (
                <Mic className="size-3.5" aria-hidden />
              )
            }
            onClick={() => void record()}
          >
            {phase.kind === "saving"
              ? "Saving…"
              : own
                ? "Re-record"
                : "Record my voice"}
          </Button>
        )}
        {busy ? null : (
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<Upload className="size-3.5" aria-hidden />}
              title="Upload a voice-over you recorded elsewhere: MP3, WAV, M4A, and more"
              onClick={() => {
                if (!narration.trim()) {
                  notify({ tone: "error", title: "Write the narration first" });
                  return;
                }
                fileInput.current?.click();
              }}
            >
              Upload
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  player.current?.pause();
                  void upload(file);
                }
              }}
            />
          </>
        )}
        {audio ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            icon={
              playing ? (
                <Pause className="size-3.5" aria-hidden />
              ) : (
                <Play className="size-3.5" aria-hidden />
              )
            }
            onClick={togglePlay}
          >
            {playing ? "Pause" : "Play"}
          </Button>
        ) : null}
        {own ? (
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            icon={<Trash2 className="size-3.5" aria-hidden />}
            onClick={() => {
              player.current?.pause();
              onChange(undefined);
            }}
          >
            Remove
          </Button>
        ) : null}
        <span className="ml-auto font-mono text-[11px] text-faint">
          {phase.kind === "countdown"
            ? `Starting in ${phase.left}…`
            : phase.kind === "recording"
              ? `● ${clock(phase.seconds)}`
              : audio
                ? `${audio.durationInSeconds.toFixed(1)}s`
                : "Your own voice, free"}
        </span>
      </div>

      {phase.kind === "countdown" || phase.kind === "recording" ? (
        <MicLevel phase={phase} level={mic.level} />
      ) : null}

      {phase.kind === "countdown" || phase.kind === "recording" ? (
        <p className="text-sm leading-relaxed text-muted">{narration}</p>
      ) : null}
    </div>
  );
};
