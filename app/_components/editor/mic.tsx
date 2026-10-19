"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "../Toast";

/** Seconds counted down before recording starts, so you can take a breath. */
const COUNTDOWN_SECONDS = 3;

/** WebM/Opus where the browser has it (Chrome, Firefox), MP4/AAC on Safari. */
const pickMimeType = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );

/** Files in public/ are served from the site root. */
export const mediaUrl = (src: string) =>
  /^[a-z]+:/i.test(src) ? src : `/${src}`;

/** mm:ss, for the recording clock. */
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export type MicPhase =
  | { kind: "idle" }
  | { kind: "countdown"; left: number }
  | { kind: "recording"; seconds: number };

/**
 * Records from the browser's microphone: a countdown, a level meter, and a
 * MediaRecorder that hands the recording to `onRecorded` when stopped (or
 * after `maxSeconds`, in case Stop is forgotten). Nothing is handed over if
 * the component unmounts mid-recording.
 */
export const useMicRecorder = ({
  maxSeconds,
  onRecorded,
}: {
  maxSeconds: number;
  onRecorded: (blob: Blob) => void;
}) => {
  const notify = useToast();
  const [phase, setPhase] = useState<MicPhase>({ kind: "idle" });
  const [level, setLevel] = useState(0);

  // Everything that has to be stopped when recording ends or the form closes.
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);
  // Set when the form closes mid-recording, so nothing is uploaded.
  const cancelled = useRef(false);
  const latestOnRecorded = useRef(onRecorded);
  useEffect(() => {
    latestOnRecorded.current = onRecorded;
  });

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
      setPhase({ kind: "idle" });
      if (cancelled.current) return;
      latestOnRecorded.current(new Blob(chunks, { type: media.mimeType }));
    };
    media.start();
    setPhase({ kind: "recording", seconds: 0 });
    startedAt.current = Date.now();
    timers.current.push(
      setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
        if (seconds >= maxSeconds) media.stop();
        else setPhase({ kind: "recording", seconds });
      }, 250),
    );
  };

  /** Asks for the microphone, counts down, then records. */
  const start = async () => {
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

  /** Seconds since recording started (0 before it has). */
  const elapsed = () =>
    recorder.current?.state === "recording"
      ? (Date.now() - startedAt.current) / 1000
      : 0;

  return { phase, level, start, stop, elapsed };
};

/** The countdown (or a pulsing dot while recording) and the level meter. */
export const MicLevel = ({
  phase,
  level,
}: {
  phase: MicPhase;
  level: number;
}) => (
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
);
