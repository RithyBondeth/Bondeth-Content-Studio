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
