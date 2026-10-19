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

/** Seconds counted down before recording starts, so you can take a breath. */
const COUNTDOWN_SECONDS = 3;
/** Recording stops by itself after this long, in case Stop is forgotten. */
const MAX_SECONDS = 180;

/** WebM/Opus where the browser has it (Chrome, Firefox), MP4/AAC on Safari. */
const pickMimeType = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );

/** Files in public/ are served from the site root. */
const mediaUrl = (src: string) => (/^[a-z]+:/i.test(src) ? src : `/${src}`);

type Phase =
  | { kind: "idle" }
  | { kind: "countdown"; left: number }
  | { kind: "recording"; seconds: number }
  | { kind: "saving" };

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
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [level, setLevel] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Everything that has to be stopped when recording ends or the form closes.
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const frame = useRef<number | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  // Set when the form closes mid-recording, so nothing is uploaded.
  const cancelled = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const release = () => {
    timers.current.forEach(clearInterval);
    timers.current = [];
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void audioContext.current?.close();
    audioContext.current = null;
    setLevel(0);
  };

  useEffect(() => {
    // Reset here too: React runs effects twice in development.
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
      player.current?.pause();
    };
  }, []);

  /** Keeps the level meter moving with how loud the microphone is. */
  const watchLevel = (source: MediaStream) => {
    const context = new AudioContext();
    audioContext.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(source).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      // Root mean square, scaled so normal speech fills most of the meter.
      setLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
      frame.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const upload = async (blob: Blob) => {
    setPhase({ kind: "saving" });
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
      setPhase({ kind: "idle" });
    }
  };

  const startRecording = (source: MediaStream) => {
    const mimeType = pickMimeType();
    const media = new MediaRecorder(
      source,
      mimeType ? { mimeType } : undefined,
    );
    recorder.current = media;
    const chunks: Blob[] = [];
    media.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    media.onstop = () => {
      release();
      if (cancelled.current) return;
      void upload(new Blob(chunks, { type: media.mimeType }));
    };
    media.start();
    setPhase({ kind: "recording", seconds: 0 });
    const startedAt = Date.now();
    timers.current.push(
      setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        if (seconds >= MAX_SECONDS) media.stop();
        else setPhase({ kind: "recording", seconds });
      }, 250),
    );
  };

  const record = async () => {
    if (!narration.trim()) {
      notify({ tone: "error", title: "Write the narration first" });
      return;
    }
    player.current?.pause();
    let source: MediaStream;
    try {
      source = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      notify({
        tone: "error",
        title: "Couldn't use the microphone",
        description:
          error instanceof Error && error.name === "NotAllowedError"
            ? "Allow microphone access for this site in your browser, then try again."
            : error instanceof Error
              ? error.message
              : String(error),
      });
      return;
    }
    stream.current = source;
    // The meter starts during the countdown, so you can check the mic works.
    watchLevel(source);

    let left = COUNTDOWN_SECONDS;
    setPhase({ kind: "countdown", left });
    const countdown = setInterval(() => {
      left -= 1;
      if (left > 0) {
        setPhase({ kind: "countdown", left });
        return;
      }
      clearInterval(countdown);
      timers.current = timers.current.filter((timer) => timer !== countdown);
      startRecording(source);
    }, 1000);
    timers.current.push(countdown);
  };

  const stop = () => {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
    } else {
      // Stopped during the countdown: nothing was recorded.
      release();
      setPhase({ kind: "idle" });
    }
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
            onClick={stop}
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
              ? `● ${Math.floor(phase.seconds / 60)}:${String(phase.seconds % 60).padStart(2, "0")}`
              : audio
                ? `${audio.durationInSeconds.toFixed(1)}s`
                : "Free, no ElevenLabs key needed"}
        </span>
      </div>

      {phase.kind === "countdown" || phase.kind === "recording" ? (
        <div className="flex items-center gap-3">
          {phase.kind === "countdown" ? (
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent-bright"
              aria-live="assertive"
            >
              {phase.left}
            </span>
          ) : (
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-danger" />
          )}
          <div
            role="meter"
            aria-label="Microphone level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
            className="h-2 flex-1 overflow-hidden rounded-full bg-raised"
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-75"
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {phase.kind === "countdown" || phase.kind === "recording" ? (
        <p className="text-sm leading-relaxed text-muted">{narration}</p>
      ) : null}
    </div>
  );
};
