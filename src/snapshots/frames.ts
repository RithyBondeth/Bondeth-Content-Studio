import { howPlantsMakeFood } from "../examples/how-plants-make-food";
import { reactUseState } from "../examples/react-use-state";
import { whyIsTheSkyBlue } from "../examples/why-is-the-sky-blue";
import type { VideoFormat } from "../lib/formats";
import type { VideoTiming } from "../lib/timing";
import type { VideoSpecInput } from "../spec/schema";
import { snapshotExtras } from "./extras";

/**
 * The frames `npm run snapshots` renders and compares with the reference
 * images in snapshots/. Together they cover every scene type, every diagram
 * layout, both formats, and two transitions caught halfway.
 */

export const SNAPSHOT_VIDEOS = {
  "sky-blue": whyIsTheSkyBlue,
  "use-state": reactUseState,
  plants: howPlantsMakeFood,
  extras: snapshotExtras,
} satisfies Record<string, VideoSpecInput>;

export type SnapshotVideo = keyof typeof SNAPSHOT_VIDEOS;

export type SnapshotFrame = {
  /** File name of the reference image, without ".png". */
  name: string;
  video: SnapshotVideo;
  format: VideoFormat;
  /** Index of the scene in the video. */
  scene: number;
  /**
   * "settled": near the end of the scene, once everything has come in.
   * "mid-transition": halfway through the transition into the scene.
   */
  at: "settled" | "mid-transition";
};

export const SNAPSHOT_FRAMES: SnapshotFrame[] = [
  {
    name: "title-vertical",
    video: "sky-blue",
    format: "vertical",
    scene: 0,
    at: "settled",
  },
  {
    name: "statement-landscape",
    video: "sky-blue",
    format: "landscape",
    scene: 1,
    at: "settled",
  },
  {
    name: "list-vertical",
    video: "sky-blue",
    format: "vertical",
    scene: 2,
    at: "settled",
  },
  {
    name: "stat-vertical",
    video: "sky-blue",
    format: "vertical",
    scene: 3,
    at: "settled",
  },
  {
    name: "chart-landscape",
    video: "sky-blue",
    format: "landscape",
    scene: 4,
    at: "settled",
  },
  {
    name: "wipe-transition-landscape",
    video: "sky-blue",
    format: "landscape",
    scene: 5,
    at: "mid-transition",
  },
  {
    name: "comparison-landscape",
    video: "sky-blue",
    format: "landscape",
    scene: 5,
    at: "settled",
  },
  {
    name: "diagram-flow-vertical",
    video: "sky-blue",
    format: "vertical",
    scene: 7,
    at: "settled",
  },
  {
    name: "code-landscape",
    video: "use-state",
    format: "landscape",
    scene: 1,
    at: "settled",
  },
  {
    name: "cta-vertical",
    video: "use-state",
    format: "vertical",
    scene: 3,
    at: "settled",
  },
  {
    name: "steps-vertical",
    video: "plants",
    format: "vertical",
    scene: 2,
    at: "settled",
  },
  {
    name: "clock-transition-vertical",
    video: "plants",
    format: "vertical",
    scene: 3,
    at: "mid-transition",
  },
  {
    name: "timeline-landscape",
    video: "plants",
    format: "landscape",
    scene: 3,
    at: "settled",
  },
  {
    name: "quote-vertical",
    video: "extras",
    format: "vertical",
    scene: 0,
    at: "settled",
  },
  {
    name: "image-landscape",
    video: "extras",
    format: "landscape",
    scene: 1,
    at: "settled",
  },
  {
    name: "diagram-cycle-landscape",
    video: "extras",
    format: "landscape",
    scene: 2,
    at: "settled",
  },
  {
    name: "diagram-hub-vertical",
    video: "extras",
    format: "vertical",
    scene: 3,
    at: "settled",
  },
];

/** How far before a scene's end a settled frame is taken: after its reveals, before the last scene fades out. */
const SETTLED_FRAMES_BEFORE_END = 12;

/** The video frame to render for a snapshot. */
export const getSnapshotFrameNumber = (
  timing: VideoTiming,
  { scene, at, name }: Pick<SnapshotFrame, "scene" | "at" | "name">,
): number => {
  const start = timing.starts[scene];
  if (start === undefined) {
    throw new Error(`${name}: the video has no scene ${scene}.`);
  }
  if (at === "mid-transition") {
    const frames = timing.transitions[scene]!;
    if (frames === 0) {
      throw new Error(`${name}: scene ${scene} has no transition into it.`);
    }
    return start + Math.floor(frames / 2);
  }
  return start + timing.scenes[scene]! - SETTLED_FRAMES_BEFORE_END;
};
