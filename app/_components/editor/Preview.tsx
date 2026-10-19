"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { ExplainerVideo } from "../../../src/compositions/ExplainerVideo";
import { FORMATS, type VideoFormat } from "../../../src/lib/formats";
import {
  plainCodeSteps,
  prepareCodeSteps,
  type PreparedCodeStep,
} from "../../../src/lib/prepare-code";
import { FPS, getVideoTiming } from "../../../src/lib/timing";
import type { Scene, VideoSpec } from "../../../src/spec/schema";
import type { CodeTheme } from "../../../src/theme/presets";
import { resolveTheme } from "../../../src/theme/resolve";
import { SCENE_SETTLE_FRAMES } from "./scene-meta";

type CodeScene = Extract<Scene, { type: "code" }>;

const codeKey = (scene: CodeScene, codeTheme: CodeTheme) =>
  JSON.stringify([scene.language, codeTheme, scene.steps]);

/**
 * Highlights code scenes in the background. Until a scene is highlighted,
 * it shows plain code so the preview never waits.
 */
const useCodeSteps = (spec: VideoSpec) => {
  const [cache, setCache] = useState<Map<string, PreparedCodeStep[]>>(
    () => new Map(),
  );
  const { codeTheme } = resolveTheme(spec.theme);
  const codeScenes = spec.scenes.filter(
    (scene): scene is CodeScene => scene.type === "code",
  );
  const missing = codeScenes.filter(
    (scene) => !cache.has(codeKey(scene, codeTheme)),
  );
  const missingKey = missing
    .map((scene) => codeKey(scene, codeTheme))
    .join("|");

  useEffect(() => {
    if (!missing.length) return;
    let cancelled = false;
    void Promise.all(
      missing.map(
        async (scene) =>
          [
            codeKey(scene, codeTheme),
            await prepareCodeSteps(scene.steps, scene.language, codeTheme),
          ] as const,
      ),
    ).then((entries) => {
      if (cancelled) return;
      setCache((current) => {
        const next = new Map(current);
        entries.forEach(([key, steps]) => next.set(key, steps));
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // missingKey captures which scenes need work; `missing` itself changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);

  return useMemo(() => {
    const result: Record<number, PreparedCodeStep[]> = {};
    spec.scenes.forEach((scene, index) => {
      if (scene.type === "code") {
        result[index] =
          cache.get(codeKey(scene, codeTheme)) ?? plainCodeSteps(scene.steps);
      }
    });
    return result;
  }, [spec, cache, codeTheme]);
};

export const Preview = ({
  spec,
  format,
  playerRef,
  onPlaybackChange,
}: {
  spec: VideoSpec;
  format: VideoFormat;
  playerRef: RefObject<PlayerRef | null>;
  /** Reports the current frame while playing, and null when paused. */
  onPlaybackChange?: (frame: number | null) => void;
}) => {
  const codeSteps = useCodeSteps(spec);
  const timing = useMemo(() => getVideoTiming(spec), [spec]);
  const inputProps = useMemo(() => ({ spec, codeSteps }), [spec, codeSteps]);
  const { width, height } = FORMATS[format];

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !onPlaybackChange) return;
    const onFrame = () => {
      if (player.isPlaying()) onPlaybackChange(player.getCurrentFrame());
    };
    const onPause = () => onPlaybackChange(null);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onPause);
    };
  }, [playerRef, onPlaybackChange, format]);

  return (
    <Player
      ref={playerRef}
      component={ExplainerVideo}
      inputProps={inputProps}
      durationInFrames={Math.max(1, timing.total)}
      fps={FPS}
      compositionWidth={width}
      compositionHeight={height}
      controls
      loop
      clickToPlay
      doubleClickToFullscreen
      allowFullscreen
      acknowledgeRemotionLicense
      // Open just past the first scene's fade-in, so the preview isn't blank.
      initialFrame={Math.min(SCENE_SETTLE_FRAMES, timing.total - 1)}
      style={{
        width: "100%",
        borderRadius: format === "vertical" ? 28 : 18,
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px var(--color-line-strong), 0 0 0 8px color-mix(in srgb, var(--color-line) 45%, transparent), 0 30px 80px -20px rgb(0 0 0 / 0.5), 0 0 120px -40px rgb(124 92 255 / 0.5)",
      }}
    />
  );
};
