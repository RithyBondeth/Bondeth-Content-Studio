import { Composition, Folder } from "remotion";
import {
  calculateLessonMetadata,
  LessonVideo,
} from "./compositions/LessonVideo";
import { lessons } from "./lessons";
import { FPS } from "./lib/timing";

const formats = [
  { name: "landscape", width: 1920, height: 1080 },
  { name: "vertical", width: 1080, height: 1920 },
] as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {lessons.map((lesson) => (
        <Folder key={lesson.slug} name={lesson.slug}>
          {formats.map((format) => (
            <Composition
              key={format.name}
              id={`${lesson.slug}-${format.name}`}
              component={LessonVideo}
              width={format.width}
              height={format.height}
              fps={FPS}
              // Replaced by calculateLessonMetadata.
              durationInFrames={1}
              defaultProps={{ lesson }}
              calculateMetadata={calculateLessonMetadata}
            />
          ))}
        </Folder>
      ))}
    </>
  );
};
