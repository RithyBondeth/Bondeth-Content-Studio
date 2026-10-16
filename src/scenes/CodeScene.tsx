import { Series, useVideoConfig } from "remotion";
import {
  CODE_GUTTER_CHARS,
  CODE_LINE_HEIGHT,
  CodeBlock,
} from "../components/CodeBlock";
import { CodeWindow } from "../components/CodeWindow";
import { SceneFrame } from "../components/SceneFrame";
import type { PreparedCodeStep } from "../lib/prepare-code";
import { getCodeStepStarts } from "../lib/reveals";
import { useLayout } from "../lib/use-layout";
import type { SceneProps } from "./types";

// Approximate width of one monospace character, relative to the font size.
const MONO_CHAR_WIDTH = 0.6;
// Editor title bar plus padding, at 1080p.
const WINDOW_CHROME = 150;

/** One font size for every step, so the code doesn't jump between steps. */
const useCodeFontSize = (
  steps: PreparedCodeStep[],
  reserveCaptions: boolean,
) => {
  const { width, height, unit, isVertical, paddingX, paddingTop, captionZone } =
    useLayout();

  const maxLines = Math.max(...steps.map((step) => step.lines.length));
  const maxChars = Math.max(
    ...steps.flatMap((step) =>
      step.lines.map((line) =>
        line.reduce((sum, token) => sum + token.content.length, 0),
      ),
    ),
  );

  const bottom = reserveCaptions ? captionZone : paddingTop;
  const availableHeight = height - paddingTop - bottom - WINDOW_CHROME * unit;
  const availableWidth = width - 2 * paddingX;

  const byHeight = availableHeight / (maxLines * CODE_LINE_HEIGHT);
  const byWidth =
    availableWidth / ((maxChars + CODE_GUTTER_CHARS + 2) * MONO_CHAR_WIDTH);
  const maxSize = (isVertical ? 36 : 40) * unit;
  const minSize = 16 * unit;

  return Math.max(minSize, Math.min(maxSize, byHeight, byWidth));
};

const CodeSteps: React.FC<
  SceneProps<"code"> & { codeSteps: PreparedCodeStep[] }
> = ({ scene, durationInFrames, reserveCaptions, codeSteps }) => {
  const { fps } = useVideoConfig();
  const fontSize = useCodeFontSize(codeSteps, reserveCaptions);

  // Each step starts at its cue in the narration.
  const starts = getCodeStepStarts(scene, durationInFrames, fps);

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      <Series>
        {codeSteps.map((step, index) => (
          <Series.Sequence
            key={index}
            durationInFrames={
              (starts[index + 1] ?? durationInFrames) - starts[index]!
            }
            layout="none"
            name={`Step ${index + 1}`}
          >
            <CodeWindow fileName={scene.fileName}>
              <CodeBlock
                lines={step.lines}
                addedLines={step.addedLines}
                highlightedLines={step.highlightedLines}
                fontSize={fontSize}
              />
            </CodeWindow>
          </Series.Sequence>
        ))}
      </Series>
    </SceneFrame>
  );
};

export const CodeScene: React.FC<SceneProps<"code">> = (props) => {
  if (!props.codeSteps) {
    throw new Error(
      "Code scenes need highlighted steps from calculateMetadata.",
    );
  }
  return <CodeSteps {...props} codeSteps={props.codeSteps} />;
};
