import { Composition, Folder } from "remotion";
import {
  calculateExplainerMetadata,
  ExplainerVideo,
} from "./compositions/ExplainerVideo";
import { examples } from "./examples";
import { FORMAT_NAMES, FORMATS, type VideoFormat } from "./lib/formats";
import { FPS } from "./lib/timing";

const ExplainerComposition: React.FC<{
  id: string;
  format: VideoFormat;
  spec: (typeof examples)[number]["spec"];
}> = ({ id, format, spec }) => (
  <Composition
    id={id}
    component={ExplainerVideo}
    width={FORMATS[format].width}
    height={FORMATS[format].height}
    fps={FPS}
    // Replaced by calculateExplainerMetadata.
    durationInFrames={1}
    defaultProps={{ spec }}
    calculateMetadata={calculateExplainerMetadata}
  />
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* The pipeline renders these, passing a spec with --props. */}
      {FORMAT_NAMES.map((format) => (
        <ExplainerComposition
          key={format}
          id={`explainer-${format}`}
          format={format}
          spec={examples[0]!.spec}
        />
      ))}
      <Folder name="examples">
        {examples.map((example) =>
          FORMAT_NAMES.map((format) => (
            <ExplainerComposition
              key={`${example.id}-${format}`}
              id={`${example.id}-${format}`}
              format={format}
              spec={example.spec}
            />
          )),
        )}
      </Folder>
    </>
  );
};
