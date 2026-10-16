"use client";

import type { PlayerRef } from "@remotion/player";
import {
  ArrowLeft,
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
import { Alert, Button, Input, cx } from "../ui";
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
    loading: () => (
      <div className="aspect-[9/16] w-full animate-pulse rounded-2xl bg-surface" />
    ),
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

const SaveIndicator = ({ state }: { state: SaveState }) => {
  if (state.kind === "saved")
    return (
      <span className="flex items-center gap-1.5 text-xs text-faint">
        <Check className="size-3.5" aria-hidden /> Saved
      </span>
    );
  if (state.kind === "saving" || state.kind === "pending")
    return (
      <span className="flex items-center gap-1.5 text-xs text-faint">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…
      </span>
    );
  return (
    <span
      className="flex max-w-xs items-center gap-1.5 truncate text-xs text-warning"
      title={state.message}
    >
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      {state.kind === "invalid"
        ? `Not saved. ${state.message}`
        : `Couldn't save: ${state.message}`}
    </span>
  );
};

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
  const [spec, setSpec] = useState<VideoSpecInput>(initialSpec);
  const [selected, setSelected] = useState(0);
  const [format, setFormat] = useState<VideoFormat>("vertical");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "saved" });
  const [voicing, setVoicing] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "danger" | "info";
    text: string;
  } | null>(null);
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
      setNotice({ tone: "danger", text: `Fix this first. ${issue}` });
      return false;
    }
    return true;
  }, [saveNow]);

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

  const durations = spec.scenes.map((scene) => {
    const result = videoSpecSchema.shape.scenes.element.safeParse(scene);
    return result.success ? getSceneSeconds(result.data) : null;
  });
  const totalSeconds = previewSpec
    ? getVideoTiming(previewSpec).total / FPS
    : 0;
  const voicedCount = spec.scenes.filter((scene) => scene.audio).length;

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

  const seekToScene = (sceneIndex: number) => {
    if (!previewSpec || sceneIndex >= previewSpec.scenes.length) return;
    const timing = getVideoTiming(previewSpec);
    const start = timing.starts[sceneIndex] ?? 0;
    const length = timing.scenes[sceneIndex] ?? 0;
    // Land after the scene's fade-in so its content is visible.
    playerRef.current?.seekTo(
      start + Math.min(SCENE_SETTLE_FRAMES, Math.floor(length / 2)),
    );
  };

  const select = (sceneIndex: number) => {
    setSelected(sceneIndex);
    seekToScene(sceneIndex);
  };

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
    updateScenes((scenes) => scenes.filter((_, i) => i !== sceneIndex));
    setSelected((current) =>
      Math.max(0, Math.min(current, spec.scenes.length - 2)),
    );
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
    setNotice(null);
    if (!(await flush())) return;
    setVoicing(true);
    const result = await recordVoiceAction(slug, index);
    setVoicing(false);
    if (!result.ok) {
      setNotice({ tone: "danger", text: result.error });
      return;
    }
    skipNextSave.current = true; // The server already saved this version.
    setSpec(result.data.spec);
    setNotice({
      tone: "info",
      text:
        result.data.generated === 0
          ? "The voice-over is already up to date."
          : `Recorded ${result.data.generated} scene${result.data.generated === 1 ? "" : "s"}.`,
    });
  };

  const scene = spec.scenes[selected] as Scene | undefined;

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2">
        <Link
          href={`/projects/${slug}`}
          className="flex min-w-0 items-center gap-1.5 text-sm text-muted hover:text-text"
          title={projectTitle}
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          <span className="hidden max-w-48 truncate md:inline">
            {projectTitle}
          </span>
        </Link>
        <span className="text-faint">/</span>
        <span className="text-xs text-faint">
          Video {index + 1} of {videoCount}
        </span>
        <Input
          aria-label="Video title"
          value={spec.title}
          onChange={(event) =>
            setSpec((current) => ({ ...current, title: event.target.value }))
          }
          className="h-8 min-w-40 flex-1 border-transparent bg-transparent font-medium hover:border-line lg:max-w-sm"
        />
        <div className="ml-auto flex items-center gap-3">
          <SaveIndicator state={saveState} />
          <div
            className="flex rounded-lg border border-line p-0.5"
            role="group"
            aria-label="Preview format"
          >
            {(["vertical", "landscape"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={format === value}
                title={
                  value === "vertical" ? "Vertical 9:16" : "Landscape 16:9"
                }
                onClick={() => setFormat(value)}
                className={cx(
                  "rounded-md p-1.5 transition-colors",
                  format === value
                    ? "bg-raised text-text"
                    : "text-faint hover:text-text",
                )}
              >
                {value === "vertical" ? (
                  <Smartphone className="size-4" aria-hidden />
                ) : (
                  <Monitor className="size-4" aria-hidden />
                )}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="primary"
            loading={voicing}
            disabled={!keys.elevenLabs}
            title={
              keys.elevenLabs
                ? "Record the narration with ElevenLabs"
                : "Add ELEVENLABS_API_KEY to .env"
            }
            onClick={() => void recordVoice()}
            icon={<Mic className="size-3.5" aria-hidden />}
          >
            {voicing
              ? "Recording…"
              : voicedCount === spec.scenes.length
                ? "Voice recorded"
                : "Record voice"}
          </Button>
        </div>
      </header>

      {notice ? (
        <div className="px-4 pt-3">
          <Alert tone={notice.tone}>
            <span className="flex items-start justify-between gap-3">
              {notice.text}
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-xs underline"
              >
                Dismiss
              </button>
            </span>
          </Alert>
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[280px_minmax(340px,1fr)_auto]">
        <aside className="border-b border-line p-3 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-faint">
            <span>
              {spec.scenes.length} scenes · {Math.round(totalSeconds)}s
            </span>
            <span>
              Voice {voicedCount}/{spec.scenes.length}
            </span>
          </div>
          <SceneList
            scenes={spec.scenes}
            durations={durations}
            selected={selected}
            onSelect={select}
            onMove={move}
            onDuplicate={duplicate}
            onDelete={remove}
            onAdd={add}
          />
        </aside>

        <section className="border-b border-line p-5 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
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
          <div className="mt-8 flex items-center justify-between rounded-xl border border-line p-3">
            <span className="flex items-center gap-2 text-sm">
              <Captions className="size-4 text-accent-bright" aria-hidden />
              Show captions
            </span>
            <input
              type="checkbox"
              aria-label="Show captions"
              checked={spec.captions ?? true}
              onChange={(event) =>
                setSpec((current) => ({
                  ...current,
                  captions: event.target.checked,
                }))
              }
              className="size-4 accent-accent"
            />
          </div>
        </section>

        <aside className="order-first flex flex-col gap-5 border-b border-line p-5 lg:order-none lg:min-h-0 lg:overflow-y-auto lg:border-b-0">
          <div
            className="mx-auto w-full"
            style={{
              width:
                format === "vertical"
                  ? "min(380px, calc((100vh - 250px) * 9 / 16))"
                  : "min(600px, calc((100vh - 250px) * 16 / 9))",
            }}
          >
            {previewSpec ? (
              <Preview
                spec={previewSpec}
                format={format}
                playerRef={playerRef}
              />
            ) : (
              <Alert tone="warning">
                Fix the issue above to see the preview.
              </Alert>
            )}
          </div>
          {!parsed.success && previewSpec ? (
            <p className="text-center text-xs text-warning">
              Showing the last valid version.
            </p>
          ) : null}
          <div className="mx-auto w-full max-w-sm">
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
