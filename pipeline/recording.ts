import { createHash } from "node:crypto";
import { ensureLocal, saved } from "./storage";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { RenderInternals } from "@remotion/renderer";
import { speechWindow, spreadWords } from "../src/lib/recording";
import { planTake, takePieces } from "../src/lib/take";
import type { SceneAudio } from "../src/spec/schema";
import { audibleParts, parseSilences } from "./silence";
import { publicPath } from "./store";

/** About 20 minutes of browser audio; far longer than any scene. */
export const MAX_RECORDING_BYTES = 25 * 1024 * 1024;
/** One take for a whole video: room for a long WAV from a podcast mic. */
export const MAX_TAKE_BYTES = 100 * 1024 * 1024;

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

/**
 * Mono, with loudness close to the ElevenLabs voices. (Remotion's ffmpeg
 * is a slim build: loudnorm, atrim and asetpts are among the few filters.)
 */
const level = (input: string, output: string) =>
  ffmpeg([
    "-i",
    input,
    "-vn",
    "-af",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ac",
    "1",
    "-ar",
    "44100",
    output,
  ]);

/** Cuts `start` to `end` seconds out of a file into an MP3. */
const cutMp3 = (input: string, start: number, end: number, output: string) =>
  ffmpeg([
    "-i",
    input,
    "-af",
    `atrim=start=${start.toFixed(3)}:end=${end.toFixed(3)},asetpts=PTS-STARTPTS`,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    output,
  ]);

/** e.g. "scene-03-own-1a2b3c4d5e.mp3": "own" marks the creator's recording. */
export const recordingFileName = (sceneIndex: number, bytes: Buffer | string) =>
  `scene-${String(sceneIndex + 1).padStart(2, "0")}-own-${createHash("sha256")
    .update(bytes)
    .digest("hex")
    .slice(0, 10)}.mp3`;

/**
 * Turns a browser recording (usually WebM/Opus) or an uploaded audio file
 * (MP3, WAV, M4A, ...) into an MP3 voice-over for
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
    throw new Error(
      "That recording is over 25 MB. Keep each scene short, or upload an MP3.",
    );
  }

  const src = path.posix.join(mediaDir, recordingFileName(sceneIndex, bytes));
  const file = publicPath(src);
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "voice-recording-"));
  try {
    const input = path.join(work, "input");
    const levelled = path.join(work, "levelled.wav");
    await fs.writeFile(input, bytes);
    await level(input, levelled);

    const length = await measureSeconds(levelled);
    const window = speechWindow(await findSpeech(levelled, length), length);
    if (!window) {
      throw new Error(
        "We couldn't hear anything. Check your microphone and try again.",
      );
    }

    if (!(await ensureLocal(file))) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const trimmed = path.join(work, "voice.mp3");
      await cutMp3(levelled, window.start, window.end, trimmed);
      await fs.copyFile(trimmed, file);
      await saved(file);
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

/** e.g. "take-1a2b3c4d5e.mp3": one voice-over take for a whole video. */
const takeFileName = (bytes: Buffer) =>
  `take-${createHash("sha256").update(bytes).digest("hex").slice(0, 10)}.mp3`;
const TAKE_FILE = /^take-[0-9a-f]{10}\.mp3$/;

/**
 * Stores one take covering the whole video (recorded in the browser or
 * uploaded), levelled like a per-scene recording, and plans where to split
 * it into scenes. Nothing is cut yet: the creator can move the cuts first,
 * then splitTake makes each scene's voice-over. `hints` are the times the
 * creator clicked Next scene while recording.
 */
export const saveTake = async (
  mediaDir: string,
  bytes: Buffer,
  narrations: string[],
  hints?: number[],
) => {
  if (bytes.length === 0) throw new Error("The recording is empty.");
  if (bytes.length > MAX_TAKE_BYTES) {
    throw new Error(
      `That recording is over ${MAX_TAKE_BYTES / 1024 / 1024} MB. Upload an MP3 or M4A instead of a WAV, or record the video in parts.`,
    );
  }
  if (narrations.some((narration) => !narration.trim())) {
    throw new Error("Write the narration for every scene first.");
  }

  const take = takeFileName(bytes);
  const src = path.posix.join(mediaDir, take);
  const file = publicPath(src);
  if (!(await ensureLocal(file))) {
    const work = await fs.mkdtemp(path.join(os.tmpdir(), "voice-take-"));
    try {
      const input = path.join(work, "input");
      const levelled = path.join(work, "levelled.wav");
      await fs.writeFile(input, bytes);
      await level(input, levelled);
      // A good-quality MP3, since each scene's piece is encoded again.
      const mp3 = path.join(work, "take.mp3");
      await ffmpeg(["-i", levelled, "-c:a", "libmp3lame", "-b:a", "192k", mp3]);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.copyFile(mp3, file);
      await saved(file);
    } finally {
      await fs.rm(work, { recursive: true, force: true });
    }
  }

  const durationInSeconds = await measureSeconds(file);
  const audible = await findSpeech(file, durationInSeconds);
  const { pauses, cuts } = planTake({ audible, narrations, hints });
  return { take, src, durationInSeconds, pauses, cuts };
};

/**
 * Cuts a take saved by saveTake into one voice-over per scene at `cuts`
 * (seconds from the start of the take, one between each pair of scenes),
 * trimming each piece like a per-scene recording. Returns each scene's
 * audio, marked as the creator's own.
 */
export const splitTake = async (
  mediaDir: string,
  take: string,
  cuts: number[],
  narrations: string[],
): Promise<SceneAudio[]> => {
  if (!TAKE_FILE.test(take)) throw new Error("That take doesn't exist.");
  const file = publicPath(path.posix.join(mediaDir, take));
  if (!(await ensureLocal(file))) {
    throw new Error("That take is gone. Record or upload it again.");
  }
  if (cuts.length !== narrations.length - 1) {
    throw new Error("The scenes changed. Split the take again.");
  }
  if (cuts.some((cut, index) => !(cut > (cuts[index - 1] ?? 0)))) {
    throw new Error("The cuts are out of order.");
  }

  const durationInSeconds = await measureSeconds(file);
  const audible = await findSpeech(file, durationInSeconds);
  const pieces = takePieces(audible, cuts, durationInSeconds);

  return Promise.all(
    pieces.map(async (piece, scene) => {
      const narration = narrations[scene]!;
      const src = path.posix.join(
        mediaDir,
        recordingFileName(
          scene,
          `${take}:${piece.start.toFixed(3)}:${piece.end.toFixed(3)}`,
        ),
      );
      const output = publicPath(src);
      if (!(await ensureLocal(output))) {
        const temporary = `${output}.${process.pid}.tmp.mp3`;
        await cutMp3(file, piece.start, piece.end, temporary);
        await fs.rename(temporary, output);
        await saved(output);
      }
      return {
        src,
        durationInSeconds: await measureSeconds(output),
        words: spreadWords(narration, piece.speechStart, piece.speechEnd),
        selfRecorded: { narration },
      };
    }),
  );
};
