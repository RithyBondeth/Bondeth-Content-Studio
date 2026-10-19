import { ImageIcon } from "lucide-react";
import { Img, interpolate, useCurrentFrame } from "remotion";
import { Emoji } from "../components/Emoji";
import { SceneFrame } from "../components/SceneFrame";
import { progressBetween, riseIn } from "../lib/animation";
import { resolveMedia } from "../lib/media";
import { useLayout } from "../lib/use-layout";
import type { ImageMotion } from "../spec/schema";
import { withAlpha } from "../lib/color";
import { useTheme } from "../theme/context";
import type { SceneProps } from "./types";

/** How far the slow camera move zooms in, and pans as a share of the width. */
const ZOOM = 0.12;
const PAN = 0.04;

/** A slow push in, pull out, or pan across the whole scene, so a still image keeps moving. */
const cameraMove = (motion: ImageMotion, progress: number) => {
  switch (motion) {
    case "zoom-in":
      return `scale(${1 + ZOOM * progress})`;
    case "zoom-out":
      return `scale(${1 + ZOOM * (1 - progress)})`;
    case "pan-left":
      return `scale(${1 + ZOOM}) translateX(${interpolate(progress, [0, 1], [PAN, -PAN]) * 100}%)`;
    case "pan-right":
      return `scale(${1 + ZOOM}) translateX(${interpolate(progress, [0, 1], [-PAN, PAN]) * 100}%)`;
    case "none":
      return undefined;
  }
};

/** The image with its camera move, or a placeholder until one is chosen. */
const Picture: React.FC<{
  scene: SceneProps<"image">["scene"];
  durationInFrames: number;
}> = ({ scene, durationInFrames }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { unit } = useLayout();
  const progress = progressBetween(frame, 0, durationInFrames);

  if (!scene.src) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24 * unit,
          padding: 60 * unit,
          backgroundColor: theme.colors.surface,
          color: theme.colors.textMuted,
          fontFamily: theme.fonts.sans,
          fontSize: 36 * unit,
          textAlign: "center",
        }}
      >
        <ImageIcon size={120 * unit} strokeWidth={1.5} />
        <div>{scene.alt}</div>
      </div>
    );
  }

  return (
    <Img
      src={resolveMedia(scene.src)}
      alt={scene.alt}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: cameraMove(scene.motion ?? "zoom-in", progress),
      }}
    />
  );
};

const Credit: React.FC<{ credit: string; style?: React.CSSProperties }> = ({
  credit,
  style,
}) => {
  const theme = useTheme();
  const { unit } = useLayout();
  return (
    <div
      style={{
        fontFamily: theme.fonts.mono,
        fontSize: 22 * unit,
        lineHeight: 1.3,
        color: theme.colors.textMuted,
        ...style,
      }}
    >
      {credit}
    </div>
  );
};

/** The image fills the frame, darkened at the edges so text stays readable over it. */
const FullImage: React.FC<SceneProps<"image">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { unit, isVertical, paddingX } = useLayout();
  // The background color, so text over the image reads in light and dark themes.
  const shade = withAlpha(theme.colors.background, 0.82);

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
      align="start"
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Picture scene={scene} durationInFrames={durationInFrames} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, ${shade}, transparent 32%, transparent 55%, ${shade})`,
          }}
        />
      </div>
      {scene.caption || scene.emoji ? (
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 24 * unit,
            ...riseIn(progressBetween(frame, 6, 20), 24 * unit),
          }}
        >
          {scene.emoji ? <Emoji emoji={scene.emoji} size={96} /> : null}
          {scene.caption ? (
            <div
              style={{
                fontFamily: theme.fonts.sans,
                fontWeight: 800,
                fontSize: (isVertical ? 76 : 64) * unit,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: theme.colors.text,
                textShadow: `0 ${4 * unit}px ${24 * unit}px ${theme.isDark ? "rgba(0, 0, 0, 0.6)" : withAlpha(theme.colors.background, 0.8)}`,
              }}
            >
              {scene.caption}
            </div>
          ) : null}
        </div>
      ) : null}
      {scene.credit ? (
        <Credit
          credit={scene.credit}
          style={{
            position: "absolute",
            right: paddingX / 2,
            bottom: 24 * unit,
            maxWidth: 700 * unit,
            textAlign: "right",
            color: withAlpha(theme.colors.text, 0.7),
          }}
        />
      ) : null}
    </SceneFrame>
  );
};

/** The image on a rounded card, with its caption above it. */
const FramedImage: React.FC<SceneProps<"image">> = ({
  scene,
  durationInFrames,
  reserveCaptions,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { unit, isVertical, width, paddingX } = useLayout();
  const cardWidth = width - paddingX * 2;
  const cardHeight = isVertical ? cardWidth : 600 * unit;

  return (
    <SceneFrame
      durationInFrames={durationInFrames}
      reserveCaptions={reserveCaptions}
    >
      {scene.caption || scene.emoji ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28 * unit,
            ...riseIn(progressBetween(frame, 0, 12), 20 * unit),
          }}
        >
          {scene.emoji ? <Emoji emoji={scene.emoji} size={96} /> : null}
          {scene.caption ? (
            <div
              style={{
                fontFamily: theme.fonts.sans,
                fontWeight: 800,
                fontSize: (isVertical ? 72 : 60) * unit,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: theme.colors.text,
              }}
            >
              {scene.caption}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16 * unit,
          ...riseIn(progressBetween(frame, 4, 18), 30 * unit),
        }}
      >
        <div
          style={{
            position: "relative",
            width: cardWidth,
            height: cardHeight,
            overflow: "hidden",
            borderRadius: theme.radius.lg * unit,
            border: `${3 * unit}px solid ${theme.colors.surfaceBorder}`,
            boxShadow: `0 ${24 * unit}px ${80 * unit}px rgba(0, 0, 0, 0.45)`,
          }}
        >
          <Picture scene={scene} durationInFrames={durationInFrames} />
        </div>
        {scene.credit ? <Credit credit={scene.credit} /> : null}
      </div>
    </SceneFrame>
  );
};

export const ImageScene: React.FC<SceneProps<"image">> = (props) =>
  props.scene.layout === "framed" ? (
    <FramedImage {...props} />
  ) : (
    <FullImage {...props} />
  );
