import type { WordTiming } from "../src/spec/schema";

/** Character-level timings, as returned by ElevenLabs. */
export type CharacterAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

/** Groups character timings into word timings, splitting on whitespace. */
export const alignmentToWords = (
  alignment: CharacterAlignment,
): WordTiming[] => {
  const words: WordTiming[] = [];
  let text = "";
  let start = 0;
  let end = 0;

  const flush = () => {
    if (text) {
      words.push({ text, start, end });
      text = "";
    }
  };

  alignment.characters.forEach((character, index) => {
    if (/\s/.test(character)) {
      flush();
      return;
    }
    if (!text) {
      start = alignment.character_start_times_seconds[index] ?? end;
    }
    text += character;
    end = alignment.character_end_times_seconds[index] ?? start;
  });
  flush();

  return words;
};
