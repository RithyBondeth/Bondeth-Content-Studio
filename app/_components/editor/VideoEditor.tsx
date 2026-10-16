"use client";

import type { PlayerRef } from "@remotion/player";
import {
  type LucideIcon,
  ArrowLeft,
  AudioLines,
  Captions,
  Check,
  CircleAlert,
  Loader2,
  Mic,
  Monitor,
  Smartphone,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VideoFormat } from "../../../src/lib/formats";
import { FPS, getSceneSeconds, getVideoTiming } from "../../../src/lib/timing";
import {
  videoSpecSchema,
  type Scene,
  type SceneType,
  type VideoSpec,
  type VideoSpecInput,
} from "../../../src/spec/schema";
import type { KeyStatus as Keys } from "../../../studio/server/env";
import type { RenderFile } from "../../../studio/server/projects";
import { recordVoiceAction, saveSpecAction } from "../../actions";
import { useToast } from "../Toast";
import { Alert, Button, Skeleton, cx } from "../ui";
import { MusicSetting } from "./MusicSetting";
import { RenderPanel } from "./RenderPanel";
import { convertScene, SCENE_META, SCENE_SETTLE_FRAMES } from "./scene-meta";
import { SceneForm } from "./SceneForm";
import { SceneList } from "./SceneList";

type SaveState =
  | { kind: "saved" }
  | { kind: "saving" }
  | { kind: "pending" }
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string };

const SAVE_DELAY = 700;

// The player only runs in the browser; rendering it on the server causes
// hydration mismatches from tiny floating-point differences.
const Preview = dynamic(
  () => import("./Preview").then((module) => module.Preview),
  {
    ssr: false,
    loading: () => <Skeleton className="aspect-[9/16] w-full rounded-[28px]" />,
  },
);

const describeIssue = (spec: VideoSpecInput) => {
  const result = videoSpecSchema.safeParse(spec);
  if (result.success) return null;
  const issue = result.error.issues[0];
  if (!issue) return "Something in this video isn't valid.";
  const [first, sceneIndex] = issue.path;
  const where =
    first === "scenes" && typeof sceneIndex === "number"
      ? `Scene ${sceneIndex + 1}: `
      : "";
  return `${where}${issue.message}`;
};

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

const SaveIndicator = ({ state }: { state: SaveState }) => {
  const base =
    "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs whitespace-nowrap";
  if (state.kind === "saved")
    return (
      <span className={cx(base, "text-faint")}>
        <Check className="size-3.5" aria-hidden /> Saved
      </span>
    );
  if (state.kind === "saving" || state.kind === "pending")
    return (
      <span className={cx(base, "text-faint")}>
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…
      </span>
    );
  return (
    <span
      className={cx(base, "max-w-72 bg-warning/10 text-warning")}
      title={state.message}
    >
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {state.kind === "invalid"
          ? `Not saved: ${state.message}`
          : `Couldn't save: ${state.message}`}
      </span>
    </span>
  );
};

const FormatToggle = ({
  value,
  onChange,
}: {
  value: VideoFormat;
  onChange: (format: VideoFormat) => void;
}) => (
  <div
    className="flex rounded-xl border border-line bg-surface p-0.5"
    role="group"
    aria-label="Preview format"
  >
    {(["vertical", "landscape"] as const).map((format) => (
      <button
        key={format}
        type="button"
        aria-pressed={value === format}
        aria-label={
          format === "vertical"
            ? "Vertical preview (9:16)"
            : "Landscape preview (16:9)"
        }
        title={format === "vertical" ? "Vertical 9:16" : "Landscape 16:9"}
        onClick={() => onChange(format)}
        className={cx(
          "flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-xs transition-all",
          value === format
            ? "bg-raised text-text shadow-sm ring-1 ring-line-strong"
            : "text-faint hover:text-text",
        )}
      >
        {format === "vertical" ? (
          <Smartphone className="size-3.5" aria-hidden />
        ) : (
          <Monitor className="size-3.5" aria-hidden />
        )}
        <span className="hidden xl:inline">
          {format === "vertical" ? "9:16" : "16:9"}
        </span>
      </button>
    ))}
  </div>
);

/** A labelled on/off switch for a video-wide setting. */
const SettingSwitch = ({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line bg-surface/60 p-4">
    <span className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-raised text-accent-bright">
        <Icon className="size-4" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-faint">{description}</span>
      </span>
    </span>
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="peer sr-only"
    />
    <span
      aria-hidden
      className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent-bright after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
    />
  </label>
);

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export const VideoEditor = ({
  slug,
  projectTitle,
  index,
  videoCount,
  initialSpec,
  initialRenders,
  keys,
}: {
  slug: string;
  projectTitle: string;
  index: number;
  videoCount: number;
  initialSpec: VideoSpecInput;
  initialRenders: RenderFile[];
  keys: Keys;
}) => {
  const notify = useToast();
  const [spec, setSpec] = useState<VideoSpecInput>(initialSpec);
  const [selected, setSelected] = useState(0);
  const [format, setFormat] = useState<VideoFormat>("vertical");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "saved" });
  const [voicing, setVoicing] = useState(false);
  const [playingFrame, setPlayingFrame] = useState<number | null>(null);
  const playerRef = useRef<PlayerRef>(null);

  // --- Saving: debounce edits, and let actions wait for pending saves. ---
  const skipNextSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSpec = useRef(spec);
  const inFlight = useRef<Promise<boolean> | null>(null);
  latestSpec.current = spec;

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const issue = describeIssue(latestSpec.current);
    if (issue) {
      setSaveState({ kind: "invalid", message: issue });
      return false;
    }
    setSaveState({ kind: "saving" });
    const result = await saveSpecAction(slug, index, latestSpec.current);
    setSaveState(
      result.ok ? { kind: "saved" } : { kind: "error", message: result.error },
    );
    return result.ok;
  }, [slug, index]);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const issue = describeIssue(spec);
    if (issue) {
      setSaveState({ kind: "invalid", message: issue });
      return;
    }
    setSaveState({ kind: "pending" });
    saveTimer.current = setTimeout(() => {
      inFlight.current = saveNow();
    }, SAVE_DELAY);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [spec, saveNow]);

  /** Saves anything pending. Returns false if the video can't be saved yet. */
  const flush = useCallback(async () => {
    if (saveTimer.current) return saveNow();
    if (inFlight.current) await inFlight.current;
    const issue = describeIssue(latestSpec.current);
    if (issue) {
      notify({ tone: "error", title: "Fix this first", description: issue });
      return false;
    }
    return true;
  }, [saveNow, notify]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saveState.kind !== "saved") event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState.kind]);

  // --- Preview keeps showing the last valid version while you type. ---
  const parsed = useMemo(() => videoSpecSchema.safeParse(spec), [spec]);
  const lastValid = useRef<VideoSpec | null>(null);
  if (parsed.success) lastValid.current = parsed.data;
  const previewSpec = lastValid.current;
  const timing = useMemo(
    () => (previewSpec ? getVideoTiming(previewSpec) : null),
    [previewSpec],
  );

  const durations = spec.scenes.map((scene) => {
    const result = videoSpecSchema.shape.scenes.element.safeParse(scene);
    return result.success ? getSceneSeconds(result.data) : null;
  });
  const totalSeconds = timing ? timing.total / FPS : 0;
  const voicedCount = spec.scenes.filter((scene) => scene.audio).length;
  const allVoiced = voicedCount === spec.scenes.length;

  const playingScene =
    playingFrame === null || !timing
      ? null
      : timing.starts.findLastIndex((start) => start <= playingFrame);

  // --- Editing ---
  const updateScenes = (update: (scenes: Scene[]) => Scene[]) =>
    setSpec((current) => ({
      ...current,
      scenes: update(current.scenes as Scene[]),
    }));

  const updateScene = (sceneIndex: number, next: Scene) =>
    updateScenes((scenes) =>
      scenes.map((scene, i) => {
        if (i !== sceneIndex) return scene;
        // New narration makes the recorded voice-over out of date.
        if (scene.audio && next.narration !== scene.narration) {
          return { ...next, audio: undefined };
        }
        return next;
      }),
    );

  const seekToScene = useCallback(
    (sceneIndex: number) => {
      if (!timing || sceneIndex >= timing.starts.length) return;
      const start = timing.starts[sceneIndex] ?? 0;
      const length = timing.scenes[sceneIndex] ?? 0;
      // Land after the scene's fade-in so its content is visible.
      playerRef.current?.seekTo(
        start + Math.min(SCENE_SETTLE_FRAMES, Math.floor(length / 2)),
      );
    },
    [timing],
  );

  const select = useCallback(
    (sceneIndex: number) => {
      setSelected(sceneIndex);
      seekToScene(sceneIndex);
    },
    [seekToScene],
  );

  // Up and down arrows move between scenes when you're not typing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        isTyping(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = selected + (event.key === "ArrowDown" ? 1 : -1);
        if (next >= 0 && next < spec.scenes.length) select(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, spec.scenes.length, select]);

  const move = (sceneIndex: number, direction: -1 | 1) => {
    const target = sceneIndex + direction;
    updateScenes((scenes) => {
      const next = [...scenes];
      [next[sceneIndex], next[target]] = [next[target]!, next[sceneIndex]!];
      return next;
    });
    setSelected(target);
  };

  const duplicate = (sceneIndex: number) => {
    updateScenes((scenes) => [
      ...scenes.slice(0, sceneIndex + 1),
      structuredClone(scenes[sceneIndex]!),
      ...scenes.slice(sceneIndex + 1),
    ]);
    setSelected(sceneIndex + 1);
  };

  const remove = (sceneIndex: number) => {
    const removed = spec.scenes[sceneIndex] as Scene;
    updateScenes((scenes) => scenes.filter((_, i) => i !== sceneIndex));
    setSelected((current) =>
      Math.max(0, Math.min(current, spec.scenes.length - 2)),
    );
    notify({
      tone: "info",
      title: `Deleted ${SCENE_META[removed.type].label.toLowerCase()} scene`,
      action: {
        label: "Undo",
        onClick: () => {
          updateScenes((scenes) => [
            ...scenes.slice(0, sceneIndex),
            removed,
            ...scenes.slice(sceneIndex),
          ]);
          setSelected(sceneIndex);
        },
      },
    });
  };

  const add = (type: SceneType) => {
    const at = Math.min(selected + 1, spec.scenes.length);
    updateScenes((scenes) => [
      ...scenes.slice(0, at),
      SCENE_META[type].create(),
      ...scenes.slice(at),
    ]);
    setSelected(at);
  };

  const recordVoice = async () => {
    if (!(await flush())) return;
    setVoicing(true);
    const result = await recordVoiceAction(slug, index);
    setVoicing(false);
    if (!result.ok) {
      notify({
        tone: "error",
        title: "Couldn't record the voice-over",
        description: result.error,
      });
      return;
    }
    skipNextSave.current = true; // The server already saved this version.
    setSpec(result.data.spec);
    notify({
      tone: "success",
      title:
        result.data.generated === 0
          ? "Voice-over is already up to date"
          : `Recorded ${result.data.generated} scene${result.data.generated === 1 ? "" : "s"}`,
    });
  };

  const scene = spec.scenes[selected] as Scene | undefined;

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="z-20 flex min-h-16 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-bg/80 px-3 py-2 backdrop-blur-xl sm:px-4">
        <Link
          href={`/projects/${slug}`}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-line-strong hover:text-text"
          aria-label={`Back to ${projectTitle}`}
          title={`Back to ${projectTitle}`}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <div className="flex min-w-48 flex-1 flex-col">
          <span className="truncate text-[11px] text-faint">
            {projectTitle} · Video {index + 1} of {videoCount}
          </span>
          <input
            aria-label="Video title"
            value={spec.title}
            onChange={(event) =>
              setSpec((current) => ({ ...current, title: event.target.value }))
            }
            className="-ml-1 w-full max-w-md truncate rounded-md bg-transparent px-1 text-[15px] font-medium transition-colors hover:bg-raised focus:bg-raised focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <SaveIndicator state={saveState} />
          <FormatToggle value={format} onChange={setFormat} />
          <Button
            variant={allVoiced ? "secondary" : "primary"}
            loading={voicing}
            disabled={!keys.elevenLabs}
            title={
              keys.elevenLabs
                ? "Record the narration with ElevenLabs"
                : "Add ELEVENLABS_API_KEY to .env"
            }
            onClick={() => void recordVoice()}
            icon={
              allVoiced ? (
                <Check className="size-4 text-success" aria-hidden />
              ) : (
                <Mic className="size-4" aria-hidden />
              )
            }
          >
            {voicing
              ? "Recording…"
              : allVoiced
                ? "Voice ready"
                : voicedCount
                  ? `Record voice (${spec.scenes.length - voicedCount} left)`
                  : "Record voice"}
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[300px_minmax(380px,1fr)_auto]">
        <aside
          aria-label="Scenes"
          className="border-b border-line bg-surface/30 p-3 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-medium">Scenes</h2>
            <span className="font-mono text-[11px] text-faint">
              {spec.scenes.length} · {formatTime(totalSeconds)}
            </span>
          </div>
          <SceneList
            scenes={spec.scenes}
            durations={durations}
            selected={selected}
            playing={playingScene}
            onSelect={select}
            onMove={move}
            onDuplicate={duplicate}
            onDelete={remove}
            onAdd={add}
          />
        </aside>

        <section
          aria-label="Scene details"
          className="border-b border-line lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-b-0"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
            {scene ? (
              <SceneForm
                key={selected}
                scene={scene}
                index={selected}
                onChange={(next) => updateScene(selected, next)}
                onChangeType={(type) =>
                  updateScene(selected, convertScene(scene, type))
                }
              />
            ) : null}
            <SettingSwitch
              icon={Captions}
              label="Captions"
              description="Word-by-word captions for the whole video"
              checked={spec.captions ?? true}
              onChange={(captions) =>
                setSpec((current) => ({ ...current, captions }))
              }
            />
            <SettingSwitch
              icon={AudioLines}
              label="Sound effects"
              description="Whooshes on transitions and pops as items appear"
              checked={spec.sfx ?? true}
              onChange={(sfx) => setSpec((current) => ({ ...current, sfx }))}
            />
            <MusicSetting
              slug={slug}
              index={index}
              music={spec.music}
              onChange={(music) =>
                setSpec((current) => ({ ...current, music }))
              }
            />
          </div>
        </section>

        <aside
          aria-label="Preview and export"
          className={cx(
            "relative order-first flex flex-col gap-5 overflow-hidden border-b border-line p-5 lg:order-none lg:min-h-0 lg:overflow-y-auto lg:border-b-0",
            format === "vertical"
              ? "lg:w-[min(460px,34vw)]"
              : "lg:w-[min(640px,44vw)]",
          )}
        >
          <div
            className="bg-stage pointer-events-none absolute inset-0 opacity-60"
            aria-hidden
          />
          <div
            className="relative mx-auto w-full"
            style={{
              width:
                format === "vertical"
                  ? "min(340px, calc((100vh - 320px) * 9 / 16))"
                  : "100%",
            }}
          >
            {previewSpec ? (
              <Preview
                spec={previewSpec}
                format={format}
                playerRef={playerRef}
                onPlaybackChange={setPlayingFrame}
              />
            ) : (
              <Alert tone="warning">
                Fix the issue above to see the preview.
              </Alert>
            )}
          </div>
          <p className="relative text-center text-xs text-faint">
            {!parsed.success && previewSpec ? (
              <span className="text-warning">
                Showing the last valid version
              </span>
            ) : (
              <>
                Scene {selected + 1} ·{" "}
                {scene ? SCENE_META[scene.type].label : ""} ·{" "}
                {formatTime(totalSeconds)} total
              </>
            )}
          </p>
          <div className="relative">
            <RenderPanel
              slug={slug}
              index={index}
              initialRenders={initialRenders}
              beforeRender={flush}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};
