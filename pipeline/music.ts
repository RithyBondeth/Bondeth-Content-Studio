/**
 * Synthesizes the background music beds in public/music/ from scratch, so
 * they carry no third-party licence. Run with `npm run music`. The output is
 * deterministic: re-running writes identical files.
 *
 * Each bed is a whole number of bars, and notes that ring past the end wrap
 * around to the start, so the file loops without a seam.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MusicMood } from "../src/lib/music";
import { makeBandPass, makeNoise, toWav } from "./synth";

/** Beds are soft and low, so a lower rate keeps the files small without losing anything audible. */
const SAMPLE_RATE = 22050;
/**
 * Every bed is scaled to the same RMS level, so a given volume in the spec
 * sounds about as loud whichever bed is picked. Peaks stay below MAX_PEAK.
 * Playback volume comes from the spec, not the files.
 */
const TARGET_RMS = 0.16;
const MAX_PEAK = 0.9;

type Voice = (t: number) => number;

const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);

/** A loop `seconds` long. Notes are mixed in with wrap-around. */
const makeLoop = (seconds: number) => {
  const length = Math.round(seconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  const add = (start: number, duration: number, voice: Voice, gain = 1) => {
    const offset = Math.round(start * SAMPLE_RATE);
    const count = Math.round(duration * SAMPLE_RATE);
    for (let i = 0; i < count; i++) {
      samples[(offset + i) % length]! += gain * voice(i / SAMPLE_RATE);
    }
  };
  const finish = () => {
    if (samples.some((value) => !Number.isFinite(value))) {
      throw new Error("A voice produced a non-finite sample.");
    }
    const peak = samples.reduce(
      (max, value) => Math.max(max, Math.abs(value)),
      0,
    );
    const rms = Math.sqrt(
      samples.reduce((sum, value) => sum + value * value, 0) / length,
    );
    const scale = Math.min(TARGET_RMS / (rms || 1), MAX_PEAK / (peak || 1));
    return samples.map((value) => value * scale);
  };
  return { add, finish };
};

/** Linear attack and release around a note that lasts `duration` seconds. */
const envelope = (
  t: number,
  duration: number,
  attack: number,
  release: number,
) => Math.max(0, Math.min(1, t / attack, (duration - t) / release));

// --- Voices ---

/** A warm, slowly swelling pad: a soft saw-like stack, doubled and detuned. */
const pad =
  (note: number, duration: number): Voice =>
  (t) => {
    const frequency = midi(note);
    let sum = 0;
    for (let n = 1; n <= 6; n++) {
      const amplitude = 1 / n ** 1.6;
      sum +=
        amplitude *
        (Math.sin(2 * Math.PI * frequency * 0.997 * n * t) +
          Math.sin(2 * Math.PI * frequency * 1.003 * n * t + n));
    }
    return sum * envelope(t, duration, 1.5, 1.4);
  };

/** A round sine bass with a little second harmonic. */
const bass =
  (note: number, duration: number): Voice =>
  (t) => {
    const frequency = midi(note);
    const tone =
      Math.sin(2 * Math.PI * frequency * t) +
      0.2 * Math.sin(4 * Math.PI * frequency * t);
    return tone * envelope(t, duration, 0.01, 0.15) * Math.exp(-t / 1.2);
  };

/** A plucked string: bright harmonics that die away faster than the fundamental. */
const pluck =
  (note: number): Voice =>
  (t) => {
    const frequency = midi(note);
    let sum = 0;
    for (let n = 1; n <= 5; n++) {
      sum +=
        (1 / n) *
        Math.sin(2 * Math.PI * frequency * n * t) *
        Math.exp(-t * (3 + 4 * n));
    }
    return sum * Math.min(1, t / 0.003);
  };

/** A wooden mallet: a fundamental plus the marimba's high overtone, which fades first. */
const mallet =
  (note: number): Voice =>
  (t) => {
    const frequency = midi(note);
    const body = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t / 0.5);
    const overtone =
      0.3 * Math.sin(2 * Math.PI * frequency * 3.9 * t) * Math.exp(-t / 0.07);
    return (body + overtone) * Math.min(1, t / 0.002);
  };

/** A soft glassy bell for sparse melody notes. */
const bell =
  (note: number): Voice =>
  (t) => {
    const frequency = midi(note);
    const tone =
      Math.sin(2 * Math.PI * frequency * t) +
      0.25 * Math.sin(2 * Math.PI * frequency * 2.76 * t) * Math.exp(-t / 0.4);
    return tone * Math.min(1, t / 0.01) * Math.exp(-t / 1.4);
  };

/** A gentle kick: a sine that drops from 120 Hz to 50 Hz. */
const kick = (): Voice => (t) => {
  const phase = 2 * Math.PI * (50 * t + 70 * 0.03 * (1 - Math.exp(-t / 0.03)));
  return Math.sin(phase) * Math.exp(-t / 0.16);
};

/** A shaker: a short burst of high band-passed noise. */
const shaker = (seed: number): Voice => {
  const noise = makeNoise(seed);
  // The filter goes unstable near the Nyquist frequency, so stay well below it.
  const filter = makeBandPass(0.6, SAMPLE_RATE);
  return (t) => filter(noise(), 3500) * Math.exp(-t / 0.025);
};

// --- Beds ---

type Chord = { root: number; tones: number[] };

/** Builds a bed from its tempo, bar count, and what plays in each bar. */
const bed = (
  bpm: number,
  bars: number,
  playBar: (
    add: ReturnType<typeof makeLoop>["add"],
    bar: number,
    beat: number,
    start: number,
  ) => void,
) => {
  const beat = 60 / bpm;
  const loop = makeLoop(bars * 4 * beat);
  for (let bar = 0; bar < bars; bar++) {
    playBar(loop.add, bar, beat, bar * 4 * beat);
  }
  return loop.finish();
};

const beds: Record<MusicMood, () => Float32Array> = {
  // 64 BPM, 8 bars in C major: Cmaj7, Am7, Fmaj7, G6, two bars each.
  calm: () => {
    const chords: Chord[] = [
      { root: 36, tones: [48, 52, 55, 59] },
      { root: 33, tones: [45, 48, 52, 55] },
      { root: 29, tones: [41, 45, 48, 52] },
      { root: 31, tones: [43, 47, 50, 52] },
    ];
    // Sparse bell notes, as [beat within the two bars, note].
    const melody: [number, number][][] = [
      [
        [0, 76],
        [3, 79],
        [5.5, 74],
      ],
      [
        [0, 72],
        [3, 76],
        [6, 69],
      ],
      [
        [0, 72],
        [3.5, 77],
        [5, 76],
      ],
      [
        [0, 74],
        [3, 71],
        [6, 79],
      ],
    ];
    return bed(64, 8, (add, bar, beat, start) => {
      if (bar % 2 === 1) return;
      const chord = chords[bar / 2]!;
      const length = 8 * beat;
      for (const tone of chord.tones) {
        add(start, length + 1.4, pad(tone, length + 1.4), 0.22);
      }
      add(start, length + 0.15, bass(chord.root, length + 0.15), 0.5);
      for (const [at, note] of melody[bar / 2]!) {
        add(start + at * beat, 3, bell(note), 0.18);
      }
    });
  },

  // 120 BPM, 16 bars in D major: D, A, Bm, G, two bars each, played twice.
  upbeat: () => {
    const chords: Chord[] = [
      { root: 38, tones: [62, 66, 69, 74] },
      { root: 33, tones: [61, 64, 69, 73] },
      { root: 35, tones: [62, 66, 71, 74] },
      { root: 31, tones: [62, 67, 71, 74] },
    ];
    const arpeggio = [0, 1, 2, 1, 3, 2, 1, 2];
    return bed(120, 16, (add, bar, beat, start) => {
      const chord = chords[Math.floor(bar / 2) % chords.length]!;
      if (bar % 2 === 0) {
        const length = 8 * beat;
        for (const tone of chord.tones.slice(0, 3)) {
          add(start, length + 1.4, pad(tone - 12, length + 1.4), 0.06);
        }
      }
      arpeggio.forEach((index, step) => {
        add(start + step * (beat / 2), 1, pluck(chord.tones[index]!), 0.3);
      });
      for (let b = 0; b < 4; b++) {
        add(start + b * beat, beat, bass(chord.root, beat * 0.9), 0.45);
        if (b % 2 === 0) add(start + b * beat, 0.6, kick(), 0.5);
        add(
          start + (b + 0.5) * beat,
          0.15,
          shaker(bar * 4 + b + 1),
          b % 2 === 1 ? 0.12 : 0.08,
        );
      }
    });
  },

  // 90 BPM, 12 bars in A minor: Am, F, Dm, E, one bar each, played three times.
  curious: () => {
    const chords: Chord[] = [
      { root: 33, tones: [57, 60, 64] },
      { root: 29, tones: [57, 60, 65] },
      { root: 26, tones: [57, 62, 65] },
      { root: 28, tones: [56, 59, 64] },
    ];
    // A syncopated mallet figure, as [eighth note in the bar, chord tone, octave up].
    const figure: [number, number, number][] = [
      [0, 0, 12],
      [3, 2, 12],
      [4, 1, 12],
      [6, 2, 12],
      [7, 0, 24],
    ];
    return bed(90, 12, (add, bar, beat, start) => {
      const chord = chords[bar % chords.length]!;
      const length = 4 * beat;
      for (const tone of chord.tones) {
        add(start, length + 1, pad(tone - 12, length + 1), 0.07);
      }
      for (const [eighth, index, octave] of figure) {
        add(
          start + eighth * (beat / 2),
          1.5,
          mallet(chord.tones[index]! + octave - 12),
          0.32,
        );
      }
      add(start, 2 * beat, bass(chord.root, 1.6 * beat), 0.5);
      add(start + 2.5 * beat, 1.5 * beat, bass(chord.root, 1.2 * beat), 0.4);
    });
  },
};

const outDir = path.join(import.meta.dirname, "..", "public", "music");
mkdirSync(outDir, { recursive: true });
for (const [name, make] of Object.entries(beds)) {
  const file = path.join(outDir, `${name}.wav`);
  const samples = make();
  writeFileSync(file, toWav(samples, SAMPLE_RATE));
  console.log(
    `Wrote ${path.relative(process.cwd(), file)} (${(samples.length / SAMPLE_RATE).toFixed(2)} s)`,
  );
}
