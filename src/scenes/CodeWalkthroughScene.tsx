import { AbsoluteFill, interpolate, Series, useCurrentFrame } from "remotion";
import { Background } from "../components/Background";
import {
  CODE_GUTTER_CHARS,
  CODE_LINE_HEIGHT,
  CodeBlock,
} from "../components/CodeBlock";
import { CodeWindow } from "../components/CodeWindow";
import { StepProgress } from "../components/StepProgress";
import type { Lesson } from "../lessons/types";
import type { PreparedStep } from "../lib/prepare-lesson";
import { useLayout } from "../lib/use-layout";
import { theme } from "../theme/tokens";

type CodeWalkthroughSceneProps = {
  lesson: Lesson;
  steps: PreparedStep[];
  stepDurations: number[];
};

// Approximate width of one monospace character, relative to the font size.
const MONO_CHAR_WIDTH = 0.6;

/**
 * Picks one font size for the whole walkthrough so the code doesn't jump
 * between steps, sized to fit the longest and widest step.
 */
const useCodeFontSize = (steps: PreparedStep[]) => {
  const { width, height, unit, isVertical, paddingX, paddingY } = useLayout();

  const maxLines = Math.max(...steps.map((step) => step.lines.length));
  const maxChars = Math.max(
    ...steps.flatMap((step) =>
      step.lines.map((line) =>
        line.reduce((sum, token) => sum + token.content.length, 0),
      ),
    ),
  );

  // Space taken by the header, caption, gaps, and editor chrome.
  const reservedHeight = (isVertical ? 560 : 460) * unit;
  const availableHeight = height - 2 * paddingY - reservedHeight;
  const availableWidth = width - 2 * paddingX;

  const byHeight = availableHeight / (maxLines * CODE_LINE_HEIGHT);
  const byWidth =
    availableWidth / ((maxChars + CODE_GUTTER_CHARS + 2) * MONO_CHAR_WIDTH);
  const maxSize = (isVertical ? 34 : 38) * unit;
  const minSize = 16 * unit;

  return Math.max(minSize, Math.min(maxSize, byHeight, byWidth));
};

type StepViewProps = {
  lesson: Lesson;
  step: PreparedStep;
  index: number;
  fontSize: number;
};

const StepView: React.FC<StepViewProps> = ({
  lesson,
  step,
  index,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { unit, isVertical, paddingX, paddingY } = useLayout();
  const source = lesson.steps[index]!;

  const captionEnter = interpolate(frame, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: `${paddingY}px ${paddingX}px`,
        justifyContent: "center",
        gap: 32 * unit,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          alignItems: isVertical ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 16 * unit,
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontWeight: 600,
            fontSize: 36 * unit,
            color: theme.colors.text,
          }}
        >
          {lesson.title}
        </div>
        <StepProgress current={index} total={lesson.steps.length} />
      </div>
      <CodeWindow fileName={source.fileName ?? lesson.fileName}>
        <CodeBlock
          lines={step.lines}
          addedLines={step.addedLines}
          highlightedLines={step.highlightedLines}
          fontSize={fontSize}
        />
      </CodeWindow>
      <div
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: (isVertical ? 44 : 40) * unit,
          lineHeight: 1.35,
          color: theme.colors.text,
          minHeight: `${2 * 1.35}em`,
          opacity: captionEnter,
          transform: `translateY(${(1 - captionEnter) * 16 * unit}px)`,
        }}
      >
        {source.caption}
      </div>
    </AbsoluteFill>
  );
};

export const CodeWalkthroughScene: React.FC<CodeWalkthroughSceneProps> = ({
  lesson,
  steps,
  stepDurations,
}) => {
  const fontSize = useCodeFontSize(steps);

  return (
    <AbsoluteFill>
      <Background />
      <Series>
        {steps.map((step, index) => (
          <Series.Sequence
            key={index}
            durationInFrames={stepDurations[index]!}
            name={`Step ${index + 1}`}
          >
            <StepView
              lesson={lesson}
              step={step}
              index={index}
              fontSize={fontSize}
            />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
