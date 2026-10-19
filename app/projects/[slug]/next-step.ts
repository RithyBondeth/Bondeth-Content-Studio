/** The stages a video goes through, in order. Voice-over is optional: a video can be rendered without it. */
export type Stage = "script" | "voice" | "render" | "publish";

export const STAGES: Stage[] = ["script", "voice", "render", "publish"];

export type VideoProgress = {
  status: "draft" | "scripted" | "voiced";
  rendered: boolean;
  /** Whether Claude has written its posts. */
  hasPosts: boolean;
};

/** The stage a video is at: the first one it hasn't done. Null when it's ready to post. */
export const stageOf = (video: VideoProgress): Stage | null => {
  if (video.status === "draft") return "script";
  if (!video.rendered) return video.status === "voiced" ? "render" : "voice";
  if (!video.hasPosts) return "publish";
  return null;
};

/**
 * What to do next in a project: the earliest video in the series that isn't
 * ready, and the stage it's at. Null when every video is ready to post.
 */
export const nextStep = (
  videos: VideoProgress[],
): { index: number; stage: Stage } | null => {
  for (const [index, video] of videos.entries()) {
    const stage = stageOf(video);
    if (stage) return { index, stage };
  }
  return null;
};
