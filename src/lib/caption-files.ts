import type { VideoSpec } from "../spec/schema";
import {
  CAPTION_LINGER_SECONDS,
  captionWordsPerPage,
  getSceneWords,
  toCaptionPages,
} from "./captions";
import type { VideoFormat } from "./formats";
import { FPS, type VideoTiming } from "./timing";

/**
 * Caption files (SRT and WebVTT) for uploading next to a video, so platforms
 * can show captions viewers can switch on, and search can read them.
 *
 * The cues match the captions drawn on screen: the same pages of words, shown
 * for the same time. Scenes without a voice-over yet use the same estimated
 * word timings the on-screen captions use, so every scene gets captions.
 */

export type CaptionCue = {
  /** Seconds from the start of the whole video. */
  start: number;
  end: number;
  text: string;
};

export const getCaptionCues = (
  spec: VideoSpec,
  timing: VideoTiming,
  format: VideoFormat,
): CaptionCue[] => {
  const cues: CaptionCue[] = [];
  spec.scenes.forEach((scene, index) => {
    const offset = (timing.starts[index] ?? 0) / FPS;
    // Captions only show while their scene's voice-over sequence is on.
    const sceneEnd = (timing.scenes[index] ?? 0) / FPS;
    const pages = toCaptionPages(
      getSceneWords(scene),
      captionWordsPerPage(format === "vertical"),
    );
    pages.forEach((page, pageIndex) => {
      const next = pages[pageIndex + 1];
      const start = Math.max(0, page.start);
      const end = Math.min(
        sceneEnd,
        next ? next.start : page.end + CAPTION_LINGER_SECONDS,
      );
      const text = page.words
        .map((word) => word.text)
        .join(" ")
        .trim();
      if (end > start && text) {
        cues.push({ start: offset + start, end: offset + end, text });
      }
    });
  });
  return cues;
};

/** "01:02:03,456" for SRT, "01:02:03.456" for WebVTT. */
export const formatCueTime = (seconds: number, separator: "," | ".") => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const pad = (value: number, length = 2) =>
    String(value).padStart(length, "0");
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor(ms / 60_000) % 60;
  const secs = Math.floor(ms / 1000) % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}${separator}${pad(ms % 1000, 3)}`;
};

/** WebVTT treats "-->" inside a cue as the end of its timing line, so we soften it. */
const cleanVttText = (text: string) =>
  text.replace(/-->/g, "->").replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const toSrt = (cues: CaptionCue[]) =>
  cues
    .map(
      (cue, index) =>
        `${index + 1}\n${formatCueTime(cue.start, ",")} --> ${formatCueTime(cue.end, ",")}\n${cue.text}\n`,
    )
    .join("\n");

export const toWebVtt = (cues: CaptionCue[]) =>
  [
    "WEBVTT\n",
    ...cues.map(
      (cue) =>
        `${formatCueTime(cue.start, ".")} --> ${formatCueTime(cue.end, ".")}\n${cleanVttText(cue.text)}\n`,
    ),
  ].join("\n");
