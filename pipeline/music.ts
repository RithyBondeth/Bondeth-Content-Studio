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
import { makeBandPass, makeHighPass, makeNoise, toWav } from "./synth";

/** Beds are soft background, so a lower rate keeps the files small without losing anything audible. */
const SAMPLE_RATE = 22050;
/**
 * Most viewers hear these on a phone speaker, which plays little below
 * about 300 Hz. So the beds keep their energy in the mids, everything below
 * BASS_CUT is filtered out, and loudness is matched on what a small speaker
 * plays: every bed has the same RMS above SPEAKER_CUT, so a given volume in
 * the spec sounds about as loud on a phone whichever bed is picked.
 * Peaks stay below MAX_PEAK. Playback volume comes from the spec, not the files.
 */
const BASS_CUT = 100;
const SPEAKER_CUT = 300;
const TARGET_SPEAKER_RMS = 0.1;
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
    const output = highPass(samples, BASS_CUT);
    const peak = output.reduce(
      (max, value) => Math.max(max, Math.abs(value)),
      0,
    );
    const speaker = highPass(output, SPEAKER_CUT);
    const speakerRms = Math.sqrt(
      speaker.reduce((sum, value) => sum + value * value, 0) / length,
    );
    const scale = Math.min(
      TARGET_SPEAKER_RMS / (speakerRms || 1),
      MAX_PEAK / (peak || 1),
    );
    return output.map((value) => value * scale);
  };
  return { add, finish };
};

/**
 * High-passes a loop. The filter runs over it twice and keeps the second
 * pass, so its state has settled and the loop point stays seamless.
 */
const highPass = (loop: Float32Array, cutoff: number) => {
  const filter = makeHighPass(cutoff, SAMPLE_RATE);
  loop.forEach((value) => filter(value));
  return loop.map((value) => filter(value));
};

/** Linear attack and release around a note that lasts `duration` seconds. */
const envelope = (
  t: number,
  duration: number,
  attack: number,
  release: number,
) => Math.max(0, Math.min(1, t / attack, (duration - t) / release));

// --- Voices ---

/** A warm, slowly swelling pad: a saw-like stack, doubled and detuned. */
const pad =
  (note: number, duration: number): Voice =>
  (t) => {
    const frequency = midi(note);
    let sum = 0;
    for (let n = 1; n <= 8; n++) {
      const amplitude = 1 / n ** 1.25;
      sum +=
        amplitude *
        (Math.sin(2 * Math.PI * frequency * 0.997 * n * t) +
          Math.sin(2 * Math.PI * frequency * 1.003 * n * t + n));
    }
    return sum * envelope(t, duration, 1.5, 1.4);
  };

/**
 * A round bass. Its upper harmonics let a phone speaker, which can't play
 * the fundamental, still carry the bass line.
 */
const bass =
  (note: number, duration: number): Voice =>
  (t) => {
    const frequency = midi(note);
    const tone =
      Math.sin(2 * Math.PI * frequency * t) +
      0.5 * Math.sin(2 * Math.PI * 2 * frequency * t) +
      0.25 * Math.sin(2 * Math.PI * 3 * frequency * t) +
      0.1 * Math.sin(2 * Math.PI * 4 * frequency * t);
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

/**
 * A gentle kick: a sine that drops from 180 Hz to 60 Hz, with a short knock
 * of filtered noise a phone can play. The knock is unpitched so it never
 * clashes with the chords.
 */
const kick = (seed: number): Voice => {
  const noise = makeNoise(seed);
  const filter = makeBandPass(0.8, SAMPLE_RATE);
  return (t) => {
    const phase =
      2 * Math.PI * (60 * t + 120 * 0.025 * (1 - Math.exp(-t / 0.025)));
    const knock = filter(noise(), 1500) * Math.exp(-t / 0.008);
    return Math.sin(phase) * Math.exp(-t / 0.14) + 0.6 * knock;
  };
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
      { root: 48, tones: [60, 64, 67, 71] },
      { root: 45, tones: [57, 60, 64, 67] },
      { root: 41, tones: [53, 57, 60, 64] },
      { root: 43, tones: [55, 59, 62, 64] },
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
        add(start, length + 1.4, pad(tone, length + 1.4), 0.16);
      }
      add(start, length + 0.15, bass(chord.root, length + 0.15), 0.3);
      for (const [at, note] of melody[bar / 2]!) {
        add(start + at * beat, 3, bell(note), 0.32);
      }
    });
  },

  // 120 BPM, 16 bars in D major: D, A, Bm, G, two bars each, played twice.
  upbeat: () => {
    const chords: Chord[] = [
      { root: 50, tones: [62, 66, 69, 74] },
      { root: 45, tones: [61, 64, 69, 73] },
      { root: 47, tones: [62, 66, 71, 74] },
      { root: 43, tones: [62, 67, 71, 74] },
    ];
    const arpeggio = [0, 1, 2, 1, 3, 2, 1, 2];
    return bed(120, 16, (add, bar, beat, start) => {
      const chord = chords[Math.floor(bar / 2) % chords.length]!;
      if (bar % 2 === 0) {
        const length = 8 * beat;
        for (const tone of chord.tones.slice(0, 3)) {
          add(start, length + 1.4, pad(tone, length + 1.4), 0.05);
        }
      }
      arpeggio.forEach((index, step) => {
        add(start + step * (beat / 2), 1, pluck(chord.tones[index]!), 0.3);
      });
      for (let b = 0; b < 4; b++) {
        add(start + b * beat, beat, bass(chord.root, beat * 0.9), 0.2);
        if (b % 2 === 0) {
          add(start + b * beat, 0.6, kick(1000 + bar * 4 + b), 0.35);
        }
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
      { root: 45, tones: [57, 60, 64] },
      { root: 41, tones: [57, 60, 65] },
      { root: 38, tones: [57, 62, 65] },
      { root: 40, tones: [56, 59, 64] },
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
        add(start, length + 1, pad(tone, length + 1), 0.05);
      }
      for (const [eighth, index, octave] of figure) {
        add(
          start + eighth * (beat / 2),
          1.5,
          mallet(chord.tones[index]! + octave),
          0.32,
        );
      }
      add(start, 2 * beat, bass(chord.root, 1.6 * beat), 0.3);
      add(start + 2.5 * beat, 1.5 * beat, bass(chord.root, 1.2 * beat), 0.25);
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
