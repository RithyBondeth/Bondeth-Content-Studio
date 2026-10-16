/**
 * Building blocks for the audio generators (pipeline/sfx.ts and
 * pipeline/music.ts). Everything here is deterministic.
 */

/** Small seeded PRNG (mulberry32), so the noise is the same on every run. */
export const makeNoise = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1;
  };
};

/** Band-pass filter (Chamberlin state-variable) with a cutoff that can change every sample. */
export const makeBandPass = (q: number, sampleRate: number) => {
  let low = 0;
  let band = 0;
  return (input: number, cutoff: number) => {
    const f = 2 * Math.sin((Math.PI * cutoff) / sampleRate);
    low += f * band;
    const high = input - low - q * band;
    band += f * high;
    return band;
  };
};

/** Mono 16-bit PCM WAV. */
export const toWav = (samples: Float32Array, sampleRate: number) => {
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
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

/** Second-order Butterworth high-pass (RBJ biquad) at a fixed cutoff. */
export const makeHighPass = (cutoff: number, sampleRate: number) => {
  const w = (2 * Math.PI * cutoff) / sampleRate;
  const alpha = Math.sin(w) / Math.SQRT2;
  const cos = Math.cos(w);
  const a0 = 1 + alpha;
  const b0 = (1 + cos) / 2 / a0;
  const b1 = -(1 + cos) / a0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (input: number) => {
    const output = b0 * input + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = input;
    y2 = y1;
    y1 = output;
    return output;
  };
};
