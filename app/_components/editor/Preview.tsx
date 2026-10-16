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
import { SCENE_SETTLE_FRAMES } from "./scene-meta";

type CodeScene = Extract<Scene, { type: "code" }>;

const codeKey = (scene: CodeScene) =>
  JSON.stringify([scene.language, scene.steps]);

/**
 * Highlights code scenes in the background. Until a scene is highlighted,
 * it shows plain code so the preview never waits.
 */
const useCodeSteps = (spec: VideoSpec) => {
  const [cache, setCache] = useState<Map<string, PreparedCodeStep[]>>(
    () => new Map(),
  );
  const codeScenes = spec.scenes.filter(
    (scene): scene is CodeScene => scene.type === "code",
  );
  const missing = codeScenes.filter((scene) => !cache.has(codeKey(scene)));
  const missingKey = missing.map(codeKey).join("|");

  useEffect(() => {
    if (!missing.length) return;
    let cancelled = false;
    void Promise.all(
      missing.map(
        async (scene) =>
          [
            codeKey(scene),
            await prepareCodeSteps(scene.steps, scene.language),
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
          cache.get(codeKey(scene)) ?? plainCodeSteps(scene.steps);
      }
    });
    return result;
  }, [spec, cache]);
};

export const Preview = ({
  spec,
  format,
  playerRef,
}: {
  spec: VideoSpec;
  format: VideoFormat;
  playerRef: RefObject<PlayerRef | null>;
}) => {
  const codeSteps = useCodeSteps(spec);
  const timing = useMemo(() => getVideoTiming(spec), [spec]);
  const inputProps = useMemo(() => ({ spec, codeSteps }), [spec, codeSteps]);
  const { width, height } = FORMATS[format];

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
        borderRadius: 16,
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px var(--color-line), 0 24px 60px rgba(0, 0, 0, 0.5)",
      }}
    />
  );
};
