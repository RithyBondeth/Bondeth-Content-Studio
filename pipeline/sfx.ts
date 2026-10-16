/**
 * Synthesizes the sound effects in public/sfx/ from scratch, so they carry no
 * third-party licence. Run with `npm run sfx`. The output is deterministic:
 * noise comes from a seeded generator, so re-running writes identical files.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SAMPLE_RATE = 44100;
/** Peak level of each file; playback volume is set in src/lib/sfx.ts. */
const PEAK = 0.7;

/** Small seeded PRNG (mulberry32), so the noise is the same on every run. */
const makeNoise = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1;
  };
};

/** Band-pass filter (Chamberlin state-variable) with a cutoff that can change every sample. */
const makeBandPass = (q: number) => {
  let low = 0;
  let band = 0;
  return (input: number, cutoff: number) => {
    const f = 2 * Math.sin((Math.PI * cutoff) / SAMPLE_RATE);
    low += f * band;
    const high = input - low - q * band;
    band += f * high;
    return band;
  };
};

const render = (seconds: number, sample: (t: number, p: number) => number) => {
  const length = Math.round(seconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = sample(i / SAMPLE_RATE, i / length);
  }
  // Normalize, then fade the last 5ms so the file never ends on a click.
  const peak = samples.reduce(
    (max, value) => Math.max(max, Math.abs(value)),
    0,
  );
  const fade = Math.round(0.005 * SAMPLE_RATE);
  for (let i = 0; i < length; i++) {
    const tail = Math.min(1, (length - 1 - i) / fade);
    samples[i] = (samples[i]! / (peak || 1)) * PEAK * tail;
  }
  return samples;
};

/** Mono 16-bit PCM WAV. */
const toWav = (samples: Float32Array) => {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((value, i) => {
    data.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, value)) * 32767),
      i * 2,
    );
  });
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

/** Smooth rise then fall, peaking at `peakAt` (0–1). */
const swell = (p: number, peakAt: number) =>
  p < peakAt
    ? Math.sin(((p / peakAt) * Math.PI) / 2) ** 2
    : Math.cos((((p - peakAt) / (1 - peakAt)) * Math.PI) / 2) ** 2;

const sounds: Record<string, () => Float32Array> = {
  // Air rushing past: noise through a band-pass that sweeps up and back down.
  whoosh: () => {
    const noise = makeNoise(1);
    // Two filters in a row, so the whoosh is soft rather than hissy.
    const first = makeBandPass(0.9);
    const second = makeBandPass(0.9);
    return render(0.5, (_, p) => {
      const cutoff = 300 + 1600 * Math.sin(p * Math.PI) ** 1.5;
      return second(first(noise(), cutoff), cutoff) * swell(p, 0.45);
    });
  },
  // A bubble pop: a sine that drops quickly in pitch and dies away.
  pop: () => {
    let phase = 0;
    return render(0.14, (t) => {
      const frequency = 260 + 900 * Math.exp(-t / 0.018);
      phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.002);
      return Math.sin(phase) * attack * Math.exp(-t / 0.035);
    });
  },
  // A clock tick: a short high click with a little noise on the attack.
  tick: () => {
    const noise = makeNoise(2);
    const filter = makeBandPass(0.4);
    return render(0.06, (t) => {
      const tone = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t / 0.008);
      const click = filter(noise(), 5000) * Math.exp(-t / 0.002);
      return tone + 0.6 * click;
    });
  },
  // A soft riser: a gliding tone over swelling noise, cut off just after the peak.
  rise: () => {
    const noise = makeNoise(3);
    const first = makeBandPass(1.2);
    const second = makeBandPass(1.2);
    let phase = 0;
    return render(0.6, (_, p) => {
      const frequency = 220 * 2 ** (p * 1.5);
      phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
      const tone = 0.5 * Math.sin(phase) + 0.15 * Math.sin(2 * phase);
      const cutoff = 600 + 2400 * p;
      const air = second(first(noise(), cutoff), cutoff) * 0.8;
      return (tone + air) * swell(p, 0.85);
    });
  },
};

const outDir = path.join(import.meta.dirname, "..", "public", "sfx");
mkdirSync(outDir, { recursive: true });
for (const [name, make] of Object.entries(sounds)) {
  const file = path.join(outDir, `${name}.wav`);
  writeFileSync(file, toWav(make()));
  console.log(`Wrote ${path.relative(process.cwd(), file)}`);
}
