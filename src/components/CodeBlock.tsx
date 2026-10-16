import { interpolate, useCurrentFrame } from "remotion";
import type { HighlightedLine } from "../lib/highlight";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";

export const CODE_LINE_HEIGHT = 1.6;
// Width of the line-number gutter, in characters.
export const CODE_GUTTER_CHARS = 4;

type CodeBlockProps = {
  lines: HighlightedLine[];
  /** Same length as `lines`; true for lines that are new in this step. */
  addedLines: boolean[];
  /** 1-based line numbers to emphasise. Other lines are dimmed. */
  highlightedLines: number[];
  fontSize: number;
};

const ADDED_LINE_STAGGER = 3;
const ADDED_LINE_DURATION = 10;
const HIGHLIGHT_START = 12;
const HIGHLIGHT_DURATION = 10;

/** Syntax-highlighted code. New lines animate in, then highlighted lines come into focus. */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  lines,
  addedLines,
  highlightedLines,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { unit } = useLayout();

  const highlighted = new Set(highlightedLines);
  const hasHighlight = highlighted.size > 0;
  const focus = interpolate(
    frame,
    [HIGHLIGHT_START, HIGHLIGHT_START + HIGHLIGHT_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  let addedIndex = 0;

  return (
    <div
      style={{
        fontFamily: theme.fonts.mono,
        fontSize,
        lineHeight: CODE_LINE_HEIGHT,
        whiteSpace: "pre",
        // Show "=>" and "!==" as typed, so viewers can copy them.
        fontVariantLigatures: "none",
      }}
    >
      {lines.map((tokens, index) => {
        const lineNumber = index + 1;
        const isHighlighted = highlighted.has(lineNumber);

        let enter = 1;
        if (addedLines[index]) {
          const delay = addedIndex * ADDED_LINE_STAGGER;
          addedIndex++;
          enter = interpolate(
            frame,
            [delay, delay + ADDED_LINE_DURATION],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
        }

        const dim = hasHighlight && !isHighlighted ? 1 - 0.55 * focus : 1;

        return (
          <div
            key={index}
            style={{
              display: "flex",
              opacity: enter * dim,
              transform: `translateY(${(1 - enter) * 12 * unit}px)`,
              backgroundColor: isHighlighted
                ? `color-mix(in srgb, ${theme.colors.lineHighlight} ${focus * 100}%, transparent)`
                : undefined,
              boxShadow: isHighlighted
                ? `inset ${6 * unit * focus}px 0 0 ${theme.colors.lineHighlightBorder}`
                : undefined,
            }}
          >
            <span
              style={{
                width: `${CODE_GUTTER_CHARS}ch`,
                flexShrink: 0,
                paddingRight: "1ch",
                textAlign: "right",
                color: theme.colors.textMuted,
                opacity: 0.5,
              }}
            >
              {lineNumber}
            </span>
            <span>
              {tokens.length === 0
                ? " "
                : tokens.map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      style={{
                        color: token.color,
                        fontStyle:
                          token.fontStyle && token.fontStyle & 1
                            ? "italic"
                            : undefined,
                        fontWeight:
                          token.fontStyle && token.fontStyle & 2
                            ? 600
                            : undefined,
                        textDecoration:
                          token.fontStyle && token.fontStyle & 4
                            ? "underline"
                            : undefined,
                      }}
                    >
                      {token.content}
                    </span>
                  ))}
            </span>
          </div>
        );
      })}
    </div>
  );
};
