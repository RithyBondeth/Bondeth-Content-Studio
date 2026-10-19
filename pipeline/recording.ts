import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RenderInternals } from "@remotion/renderer";
import { speechWindow, spreadWords } from "../src/lib/recording";
import type { SceneAudio } from "../src/spec/schema";
import { audibleParts, parseSilences } from "./silence";
import { exists, publicPath } from "./store";

/** About 20 minutes of browser audio; far longer than any scene. */
export const MAX_RECORDING_BYTES = 25 * 1024 * 1024;

/** Anything quieter than this counts as silence when finding the words. */
const NOISE_THRESHOLD_DB = -38;
/** Gaps shorter than this are pauses between words, not silence. */
const MIN_SILENCE_SECONDS = 0.35;

/**
 * Runs the ffmpeg that ships with Remotion, so recording your own voice
 * needs nothing else installed.
 */
const run = async (bin: "ffmpeg" | "ffprobe", args: string[]) => {
  const result = await RenderInternals.callFf({
    bin,
    args: ["-hide_banner", ...args],
    indent: false,
    logLevel: "error",
    binariesDirectory: null,
    cancelSignal: undefined,
  });
  return { stdout: result.stdout, stderr: result.stderr };
};

const ffmpeg = (args: string[]) =>
  run("ffmpeg", ["-loglevel", "error", "-y", ...args]);

/** The length of an audio file, measured with ffprobe. */
const measureSeconds = async (file: string) => {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    file,
  ]);
  const seconds = Number(stdout.trim());
  if (!(seconds > 0)) throw new Error("Couldn't read the recording's length.");
  return seconds;
};

/** Where someone is speaking in a file, found with ffmpeg's silencedetect. */
const findSpeech = async (file: string, durationInSeconds: number) => {
  const { stderr } = await run("ffmpeg", [
    "-nostats",
    "-i",
    file,
    "-af",
    `silencedetect=noise=${NOISE_THRESHOLD_DB}dB:d=${MIN_SILENCE_SECONDS}`,
    "-f",
    "null",
    "-",
  ]);
  return audibleParts(
    parseSilences(stderr, durationInSeconds),
    durationInSeconds,
  );
};

/** e.g. "scene-03-own-1a2b3c4d5e.mp3": "own" marks the creator's recording. */
export const recordingFileName = (sceneIndex: number, bytes: Buffer) =>
  `scene-${String(sceneIndex + 1).padStart(2, "0")}-own-${createHash("sha256")
    .update(bytes)
    .digest("hex")
    .slice(0, 10)}.mp3`;

/**
 * Turns a browser recording (usually WebM/Opus) into an MP3 voice-over for
 * one scene, saved in the video's media folder (relative to public/).
 *
 * Browsers record WebM, which Remotion's renderer can't reliably mix in, so
 * it's converted to MP3 like the ElevenLabs voice-overs. Along the way the
 * level is evened out, and the silence before the first word and after the
 * last is trimmed. Captions get word timings spread over the speech, since
 * there's no speech-to-text.
 */
export const saveRecording = async (
  mediaDir: string,
  sceneIndex: number,
  bytes: Buffer,
  narration: string,
): Promise<SceneAudio> => {
  if (bytes.length === 0) throw new Error("The recording is empty.");
  if (bytes.length > MAX_RECORDING_BYTES) {
    throw new Error("That recording is too long. Keep each scene short.");
  }

  const src = path.posix.join(mediaDir, recordingFileName(sceneIndex, bytes));
  const file = publicPath(src);
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "voice-recording-"));
  try {
    const input = path.join(work, "input");
    const levelled = path.join(work, "levelled.wav");
    await fs.writeFile(input, bytes);

    // Mono, with loudness close to the ElevenLabs voices. (Remotion's ffmpeg
    // is a slim build: loudnorm, atrim and asetpts are among the few filters.)
    await ffmpeg([
      "-i",
      input,
      "-vn",
      "-af",
      "loudnorm=I=-16:TP=-1.5:LRA=11",
      "-ac",
      "1",
      "-ar",
      "44100",
      levelled,
    ]);

    const length = await measureSeconds(levelled);
    const window = speechWindow(await findSpeech(levelled, length), length);
    if (!window) {
      throw new Error(
        "We couldn't hear anything. Check your microphone and try again.",
      );
    }

    if (!(await exists(file))) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const trimmed = path.join(work, "voice.mp3");
      await ffmpeg([
        "-i",
        levelled,
        "-af",
        `atrim=start=${window.start.toFixed(3)}:end=${window.end.toFixed(3)},asetpts=PTS-STARTPTS`,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "128k",
        trimmed,
      ]);
      await fs.copyFile(trimmed, file);
    }

    // Measured from the file itself, so the scene is exactly as long as it.
    return {
      src,
      durationInSeconds: await measureSeconds(file),
      words: spreadWords(narration, window.speechStart, window.speechEnd),
      selfRecorded: { narration },
    };
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
};
