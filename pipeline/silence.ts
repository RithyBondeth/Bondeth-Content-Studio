/** A stretch of a recording, in seconds. */
export type Span = { startInSeconds: number; endInSeconds: number };

/**
 * Reads the quiet stretches out of ffmpeg's silencedetect log. A silence
 * still going when the file ends has no silence_end, so it runs to the end.
 */
export const parseSilences = (log: string, durationInSeconds: number) => {
  const silences: Span[] = [];
  let start: number | null = null;
  for (const match of log.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    const seconds = Math.max(0, Number(match[2]));
    if (match[1] === "start") {
      start = seconds;
    } else if (start !== null) {
      silences.push({ startInSeconds: start, endInSeconds: seconds });
      start = null;
    }
  }
  if (start !== null) {
    silences.push({ startInSeconds: start, endInSeconds: durationInSeconds });
  }
  return silences;
};

/** Sounds shorter than this are clicks (like pressing Stop), not speech. */
const MIN_SOUND_SECONDS = 0.1;

/** The parts of a recording between the silences: where someone speaks. */
export const audibleParts = (silences: Span[], durationInSeconds: number) => {
  const parts: Span[] = [];
  let cursor = 0;
  const add = (end: number) => {
    if (end - cursor >= MIN_SOUND_SECONDS) {
      parts.push({ startInSeconds: cursor, endInSeconds: end });
    }
  };
  for (const silence of silences) {
    add(silence.startInSeconds);
    cursor = Math.max(cursor, silence.endInSeconds);
  }
  add(durationInSeconds);
  return parts;
};
