"use client";

import {
  ChevronLeft,
  ChevronRight,
  Check,
  Mic,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cutTime, nudgeCut, type Span } from "../../../src/lib/take";
import type { SceneAudio } from "../../../src/spec/schema";
import { splitTakeAction } from "../../actions";
import { useToast } from "../Toast";
import { Alert, Button, cx } from "../ui";
import { clock, mediaUrl, MicLevel, useMicRecorder } from "./mic";

/** A whole video can run long; stop after 20 minutes in case Stop is forgotten. */
const MAX_SECONDS = 20 * 60;

/** What /api/recording/video says about an uploaded take. */
type Take = {
  take: string;
  src: string;
  durationInSeconds: number;
  pauses: Span[];
  /** Indexes into `pauses`: one cut between each pair of scenes. */
  cuts: number[];
};

/** 0:12.3, precise enough to tell nearby cuts apart. */
const stamp = (seconds: number) =>
  `${clock(seconds)}.${Math.floor((seconds % 1) * 10)}`;

/**
 * Record (or upload) one voice-over take for the whole video, and the
 * studio splits it into scenes at the pauses. While recording, the whole
 * script is shown with the current scene highlighted; Next scene moves on
 * and tells the splitter where that scene ended. Before saving, each
 * scene's piece can be played and each cut moved to the previous or next
 * pause.
 */
export const VoiceTake = ({
  slug,
  videoIndex,
  narrations,
  hasAudio,
  onSave,
}: {
  slug: string;
  videoIndex: number;
  narrations: string[];
  /** True when some scene already has a voice-over, which this replaces. */
  hasAudio: boolean;
  onSave: (audio: SceneAudio[]) => void;
}) => {
  const notify = useToast();
  const [busy, setBusy] = useState<"analyzing" | "saving" | null>(null);
  const [current, setCurrent] = useState(0);
  const hints = useRef<number[]>([]);
  const [take, setTake] = useState<Take | null>(null);
  const [cuts, setCuts] = useState<number[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const script = useRef<HTMLOListElement>(null);

  const mic = useMicRecorder({
    maxSeconds: MAX_SECONDS,
    onRecorded: (blob) => void analyze(blob, hints.current),
  });
  const recording = mic.phase.kind !== "idle";

  useEffect(() => () => player.current?.pause(), []);

  // Keep the scene being read in view while recording.
  useEffect(() => {
    script.current
      ?.querySelector(`[data-scene="${current}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current]);

  const ready = () => {
    if (narrations.length === 0) {
      notify({ tone: "error", title: "Add a scene first" });
      return false;
    }
    const empty = narrations.findIndex((narration) => !narration.trim());
    if (empty >= 0) {
      notify({
        tone: "error",
        title: "Write the narration first",
        description: `Scene ${empty + 1} has no narration to read.`,
      });
      return false;
    }
    return true;
  };

  const analyze = async (blob: Blob, timings: number[]) => {
    setBusy("analyzing");
    const form = new FormData();
    form.set("slug", slug);
    form.set("index", String(videoIndex));
    form.set("narrations", JSON.stringify(narrations));
    if (timings.length) form.set("hints", JSON.stringify(timings));
    form.set("file", blob, blob instanceof File ? blob.name : "take");
    try {
      const response = await fetch("/api/recording/video", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as Take & { error?: string };
      if (!response.ok || !result.src) {
        throw new Error(result.error ?? `Upload failed (${response.status}).`);
      }
      setTake(result);
      setCuts(result.cuts);
    } catch (error) {
      notify({
        tone: "error",
        title: "Couldn't split the take",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(null);
    }
  };

  const record = async () => {
    if (!ready()) return;
    discard();
    hints.current = [];
    setCurrent(0);
    await mic.start();
  };

  const next = () => {
    if (mic.phase.kind !== "recording" || current >= narrations.length - 1) {
      return;
    }
    hints.current = [...hints.current, mic.elapsed()];
    setCurrent(current + 1);
  };

  const discard = () => {
    player.current?.pause();
    player.current = null;
    setTake(null);
    setCuts([]);
  };

  /** Where each scene's piece starts and ends in the take, in seconds. */
  const bounds = take
    ? [
        0,
        ...cuts.map((cut) => cutTime(take.pauses[cut]!)),
        take.durationInSeconds,
      ]
    : [];

  const togglePiece = (scene: number) => {
    if (!take) return;
    player.current?.pause();
    if (playing === scene) return;
    const element = player.current ?? new Audio(mediaUrl(take.src));
    player.current = element;
    const end = bounds[scene + 1]!;
    element.currentTime = bounds[scene]!;
    element.ontimeupdate = () => {
      if (element.currentTime >= end) element.pause();
    };
    element.onended = () => setPlaying(null);
    element.onpause = () => setPlaying(null);
    setPlaying(scene);
    void element.play().catch(() => setPlaying(null));
  };

  const save = async () => {
    if (!take || !ready()) return;
    player.current?.pause();
    setBusy("saving");
    const result = await splitTakeAction(
      slug,
      videoIndex,
      take.take,
      bounds.slice(1, -1),
      narrations,
    );
    setBusy(null);
    if (!result.ok) {
      notify({
        tone: "error",
        title: "Couldn't save the voice-over",
        description: result.error,
      });
      return;
    }
    onSave(result.data);
    discard();
    notify({
      tone: "success",
      title: "Voice-over saved",
      description: `Your take is split across ${result.data.length} scene${result.data.length === 1 ? "" : "s"}.`,
    });
  };

  return (
    <div
      id="voice-take"
      className="flex scroll-mt-4 flex-col gap-4 rounded-2xl border border-line bg-surface/60 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-raised text-accent-bright">
          <Mic className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">
            Narrate the whole video
          </span>
          <span className="block text-xs text-faint">
            One take, split into scenes at your pauses
          </span>
        </span>
      </div>

      {recording ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Square className="size-3.5 fill-current" aria-hidden />}
              onClick={mic.stop}
            >
              {mic.phase.kind === "countdown" ? "Cancel" : "Stop"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                mic.phase.kind !== "recording" ||
                current >= narrations.length - 1
              }
              icon={<SkipForward className="size-3.5" aria-hidden />}
              onClick={next}
            >
              Next scene
            </Button>
            <span className="ml-auto font-mono text-[11px] text-faint">
              {mic.phase.kind === "countdown"
                ? `Starting in ${mic.phase.left}…`
                : mic.phase.kind === "recording"
                  ? `● ${clock(mic.phase.seconds)} · Scene ${current + 1} of ${narrations.length}`
                  : null}
            </span>
          </div>
          <MicLevel phase={mic.phase} level={mic.level} />
          <ol
            ref={script}
            aria-label="Script"
            className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1"
          >
            {narrations.map((narration, scene) => (
              <li
                key={scene}
                data-scene={scene}
                aria-current={scene === current ? "step" : undefined}
                className={cx(
                  "rounded-xl border px-3 py-2 text-sm leading-relaxed transition-colors",
                  scene === current
                    ? "border-accent/50 bg-accent/10 text-text"
                    : "border-transparent text-faint",
                )}
              >
                <span className="mb-0.5 block font-mono text-[11px] text-faint">
                  Scene {scene + 1}
                </span>
                {narration}
              </li>
            ))}
          </ol>
          <p className="text-xs text-faint">
            Pause for a second between scenes, and click Next scene as you move
            on. It helps the studio find where each scene ends.
          </p>
        </>
      ) : take ? (
        <>
          <p className="text-[13px] leading-relaxed text-muted">
            Here&apos;s where each scene starts and ends. Play a scene to check
            it, and move a cut to the previous or next pause if a scene starts
            or ends in the wrong place.
          </p>
          <ol
            className="flex flex-col gap-1.5"
            aria-label="Scenes in your take"
          >
            {narrations.map((narration, scene) => (
              <li key={scene} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/40 p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={
                      playing === scene
                        ? `Pause scene ${scene + 1}`
                        : `Play scene ${scene + 1}`
                    }
                    icon={
                      playing === scene ? (
                        <Pause className="size-3.5" aria-hidden />
                      ) : (
                        <Play className="size-3.5" aria-hidden />
                      )
                    }
                    onClick={() => togglePiece(scene)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[11px] text-faint">
                      Scene {scene + 1} · {stamp(bounds[scene]!)}–
                      {stamp(bounds[scene + 1]!)}
                    </span>
                    <span className="block truncate text-sm">{narration}</span>
                  </span>
                </div>
                {scene < cuts.length ? (
                  <div className="flex items-center justify-center gap-1 text-[11px] text-faint">
                    <Button
                      variant="ghost"
                      size="xs"
                      aria-label={`Cut between scenes ${scene + 1} and ${scene + 2} earlier`}
                      title="Move this cut to the previous pause"
                      disabled={
                        busy !== null ||
                        !nudgeCut(cuts, scene, -1, take.pauses.length)
                      }
                      icon={<ChevronLeft className="size-3.5" aria-hidden />}
                      onClick={() =>
                        setCuts(
                          (now) =>
                            nudgeCut(now, scene, -1, take.pauses.length) ?? now,
                        )
                      }
                    />
                    <span className="font-mono">
                      cut at {stamp(bounds[scene + 1]!)}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      aria-label={`Cut between scenes ${scene + 1} and ${scene + 2} later`}
                      title="Move this cut to the next pause"
                      disabled={
                        busy !== null ||
                        !nudgeCut(cuts, scene, 1, take.pauses.length)
                      }
                      icon={<ChevronRight className="size-3.5" aria-hidden />}
                      onClick={() =>
                        setCuts(
                          (now) =>
                            nudgeCut(now, scene, 1, take.pauses.length) ?? now,
                        )
                      }
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          {hasAudio ? (
            <Alert tone="info">
              Saving replaces the voice-over on every scene.
            </Alert>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={busy === "saving"}
              icon={<Check className="size-3.5" aria-hidden />}
              onClick={() => void save()}
            >
              {busy === "saving"
                ? "Saving…"
                : `Use for ${narrations.length} scene${narrations.length === 1 ? "" : "s"}`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy !== null || cuts.join() === take.cuts.join()}
              icon={<RotateCcw className="size-3.5" aria-hidden />}
              onClick={() => setCuts(take.cuts)}
            >
              Reset cuts
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              icon={<X className="size-3.5" aria-hidden />}
              onClick={discard}
            >
              Discard
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-muted">
            Read the whole script in one go instead of scene by scene. Pause for
            a second between scenes; the studio splits your take at those pauses
            and lines up the captions.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={busy === "analyzing"}
              icon={<Mic className="size-3.5" aria-hidden />}
              onClick={() => void record()}
            >
              {busy === "analyzing" ? "Splitting…" : "Record whole video"}
            </Button>
            {busy ? null : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Upload className="size-3.5" aria-hidden />}
                  title="Upload one voice-over for the whole video: MP3, WAV, M4A, and more, up to 100 MB"
                  onClick={() => {
                    if (ready()) fileInput.current?.click();
                  }}
                >
                  Upload whole video
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void analyze(file, []);
                  }}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
