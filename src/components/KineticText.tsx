import { interpolate, useCurrentFrame } from "remotion";
import { useEnter } from "../lib/animation";
import type { Entrance } from "../spec/schema";
import { useTheme } from "../theme/context";
import { useEntrance } from "./SceneFrame";

type KineticTextProps = {
  text: string;
  /** Phrases to draw in the accent color. Matched case-insensitively. */
  highlight?: string[];
  fontSize: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center";
  delay?: number;
  /** Frames between each word's entrance. */
  stagger?: number;
};

type Word = { text: string; highlighted: boolean };

const splitWords = (text: string, phrases: string[]): Word[] => {
  const marked = new Array<boolean>(text.length).fill(false);
  const lower = text.toLowerCase();
  for (const phrase of phrases) {
    const needle = phrase.toLowerCase().trim();
    if (!needle) continue;
    let index = lower.indexOf(needle);
    while (index !== -1) {
      marked.fill(true, index, index + needle.length);
      index = lower.indexOf(needle, index + needle.length);
    }
  }

  const words: Word[] = [];
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    words.push({
      text: match[0],
      highlighted: marked.slice(start, end).some(Boolean),
    });
  }
  return words;
};

/** How each word moves in, from `enter` 0 (hidden) to 1 (in place). */
const wordStyle = (
  entrance: Exclude<Entrance, "typewriter">,
  enter: number,
): React.CSSProperties => {
  switch (entrance) {
    case "rise":
      return {
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [0.35, 0])}em)`,
      };
    case "slide":
      return {
        opacity: enter,
        transform: `translateX(${interpolate(enter, [0, 1], [-0.6, 0])}em)`,
      };
    case "pop":
      return {
        opacity: Math.min(1, enter * 2),
        transform: `scale(${interpolate(enter, [0, 1], [0.4, 1])})`,
      };
    case "blur":
      return {
        opacity: enter,
        filter: enter < 0.99 ? `blur(${(1 - enter) * 0.25}em)` : undefined,
      };
  }
};

const AnimatedWord: React.FC<{
  word: Word;
  delay: number;
  color: string;
  entrance: Exclude<Entrance, "typewriter">;
}> = ({ word, delay, color, entrance }) => {
  const theme = useTheme();
  // Pop overshoots a little; the rest settle softly.
  const enter = useEnter(delay, entrance === "pop" ? 11 : 200);
  return (
    <span
      style={{
        display: "inline-block",
        ...wordStyle(entrance, enter),
        color: word.highlighted ? theme.colors.accentBright : color,
        marginRight: "0.25em",
      }}
    >
      {word.text}
    </span>
  );
};

/** Characters typed per frame: about as fast as the words reveal otherwise. */
const typingSpeed = (stagger: number) => 2.5 / Math.max(1, stagger);

/**
 * Text typed out letter by letter, with a blinking caret. Every letter is
 * laid out from the start, so lines never reflow as it types.
 */
const TypedWords: React.FC<{
  words: Word[];
  delay: number;
  stagger: number;
  color: string;
}> = ({ words, delay, stagger, color }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const typed = Math.max(0, (frame - delay) * typingSpeed(stagger));
  const total = words.reduce((sum, word) => sum + word.text.length, 0);
  const done = typed >= total;
  // Blinks twice a second once typing stops, and stays solid while typing.
  const caretOn = !done || Math.floor(frame / 15) % 2 === 0;
  const caret = (
    <span style={{ position: "relative" }}>
      <span
        style={{
          position: "absolute",
          left: "0.02em",
          top: "0.08em",
          width: "0.07em",
          height: "0.95em",
          backgroundColor: theme.colors.accent,
          opacity: caretOn ? 1 : 0,
        }}
      />
    </span>
  );

  let seen = 0;
  return (
    <>
      {words.map((word, wordIndex) => {
        const first = seen;
        seen += word.text.length;
        return (
          <span
            key={wordIndex}
            style={{
              display: "inline-block",
              marginRight: "0.25em",
              color: word.highlighted ? theme.colors.accentBright : color,
            }}
          >
            {[...word.text].map((char, charIndex) => {
              const index = first + charIndex;
              return (
                <span key={charIndex}>
                  <span style={{ opacity: index < typed ? 1 : 0 }}>{char}</span>
                  {/* The caret sits after the last typed letter. */}
                  {Math.min(Math.floor(typed), total) - 1 === index
                    ? caret
                    : null}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
};

/**
 * Text that reveals word by word (or letter by letter, with the typewriter
 * entrance), with optional accent highlights.
 */
export const KineticText: React.FC<KineticTextProps> = ({
  text,
  highlight = [],
  fontSize,
  fontWeight = 800,
  color,
  align = "left",
  delay = 0,
  stagger = 3,
}) => {
  const theme = useTheme();
  const entrance = useEntrance();
  const words = splitWords(text, highlight);

  return (
    <div
      style={{
        fontFamily: theme.fonts.sans,
        fontWeight,
        fontSize,
        lineHeight: 1.12,
        letterSpacing: "-0.02em",
        textAlign: align,
        marginRight: "-0.25em",
      }}
    >
      {entrance === "typewriter" ? (
        <TypedWords
          words={words}
          delay={delay}
          stagger={stagger}
          color={color ?? theme.colors.text}
        />
      ) : (
        words.map((word, index) => (
          <AnimatedWord
            key={index}
            word={word}
            delay={delay + index * stagger}
            color={color ?? theme.colors.text}
            entrance={entrance}
          />
        ))
      )}
    </div>
  );
};
