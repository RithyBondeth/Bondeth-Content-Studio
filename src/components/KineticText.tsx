import { interpolate } from "remotion";
import { useEnter } from "../lib/animation";
import { theme } from "../theme/tokens";

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

const AnimatedWord: React.FC<{
  word: Word;
  delay: number;
  color: string;
}> = ({ word, delay, color }) => {
  const enter = useEnter(delay);
  return (
    <span
      style={{
        display: "inline-block",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [0.35, 0])}em)`,
        color: word.highlighted ? theme.colors.accentBright : color,
        marginRight: "0.25em",
      }}
    >
      {word.text}
    </span>
  );
};

/** Text that reveals word by word, with optional accent highlights. */
export const KineticText: React.FC<KineticTextProps> = ({
  text,
  highlight = [],
  fontSize,
  fontWeight = 800,
  color = theme.colors.text,
  align = "left",
  delay = 0,
  stagger = 3,
}) => {
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
      {words.map((word, index) => (
        <AnimatedWord
          key={index}
          word={word}
          delay={delay + index * stagger}
          color={color}
        />
      ))}
    </div>
  );
};
