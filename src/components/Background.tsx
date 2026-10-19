import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  getFloatingShapes,
  getParticles,
  particleAt,
  type FloatingShape,
} from "../lib/background-motion";
import { DEFAULT_BACKGROUND, type BackgroundStyle } from "../lib/backgrounds";
import { withAlpha } from "../lib/color";
import { useTheme, type Theme } from "../theme/context";

type LayerProps = { frame: number; theme: Theme; seed: string };

/** Slowly drifting accent glows in two corners. */
const Glows: React.FC<{ frame: number; theme: Theme; strength?: number }> = ({
  frame,
  theme,
  strength = 1,
}) => {
  const drift = Math.sin(frame / 90) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${15 + drift}% ${10 + drift}%, ${withAlpha(theme.colors.accent, 0.2 * strength)}, transparent 45%), radial-gradient(circle at ${88 - drift}% ${92 - drift}%, ${withAlpha(theme.colors.accent, 0.13 * strength)}, transparent 40%)`,
      }}
    />
  );
};

/** The original look: glows over a faint dot grid. */
const GlowLayer: React.FC<LayerProps> = ({ frame, theme }) => (
  <>
    <Glows frame={frame} theme={theme} />
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${theme.colors.surfaceBorder} 1.5px, transparent 1.5px)`,
        backgroundSize: "36px 36px",
        opacity: 0.6,
      }}
    />
  </>
);

/** Three large, soft blobs of color wandering on slow, out-of-step loops. */
const GradientLayer: React.FC<LayerProps> = ({ frame, theme }) => {
  const { accent, accentBright, surface } = theme.colors;
  const blob = (
    color: string,
    alpha: number,
    period: number,
    phase: number,
    cx: number,
    cy: number,
  ) => {
    const t = (frame / period) * Math.PI * 2 + phase;
    const x = cx + Math.sin(t) * 18;
    const y = cy + Math.cos(t * 0.8) * 14;
    return `radial-gradient(ellipse 70% 55% at ${x}% ${y}%, ${withAlpha(color, alpha)}, transparent 70%)`;
  };
  return (
    <AbsoluteFill
      style={{
        background: [
          blob(accent, 0.4, 420, 0, 25, 25),
          blob(accentBright, 0.18, 540, 2, 78, 60),
          blob(surface, 0.7, 600, 4, 40, 88),
        ].join(", "),
      }}
    />
  );
};

const ShapeOutline: React.FC<{
  shape: FloatingShape;
  size: number;
  color: string;
}> = ({ shape, size, color }) => {
  const stroke = Math.max(2, size * 0.06);
  const half = size / 2;
  const inner = half - stroke;
  switch (shape.kind) {
    case "circle":
      return <circle r={inner} fill={color} />;
    case "ring":
      return (
        <circle r={inner} fill="none" stroke={color} strokeWidth={stroke} />
      );
    case "square":
      return (
        <rect
          x={-inner}
          y={-inner}
          width={inner * 2}
          height={inner * 2}
          rx={size * 0.12}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
      );
    case "triangle":
      return (
        <polygon
          points={`0,${-inner} ${inner * 0.87},${inner * 0.5} ${-inner * 0.87},${inner * 0.5}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
      );
    case "plus":
      return (
        <path
          d={`M 0 ${-inner} V ${inner} M ${-inner} 0 H ${inner}`}
          stroke={color}
          strokeWidth={stroke * 1.4}
          strokeLinecap="round"
        />
      );
  }
};

/** Outlined shapes floating and turning slowly. */
const ShapesLayer: React.FC<LayerProps> = ({ frame, theme, seed }) => {
  const { width, height, fps } = useVideoConfig();
  const shapes = useMemo(() => getFloatingShapes(seed), [seed]);
  const short = Math.min(width, height);
  return (
    <>
      <Glows frame={frame} theme={theme} strength={0.6} />
      <svg width={width} height={height} style={{ position: "absolute" }}>
        {shapes.map((shape, index) => {
          const t = (frame / shape.period) * Math.PI * 2 + shape.phase;
          const x = shape.x * width + Math.sin(t) * shape.drift * short;
          const y = shape.y * height + Math.cos(t * 0.7) * shape.drift * short;
          const rotate = (shape.spin * frame) / fps;
          return (
            <g
              key={index}
              transform={`translate(${x} ${y}) rotate(${rotate})`}
              opacity={shape.opacity}
            >
              <ShapeOutline
                shape={shape}
                size={shape.size * short}
                color={
                  index % 3 === 0
                    ? theme.colors.accentBright
                    : theme.colors.accent
                }
              />
            </g>
          );
        })}
      </svg>
    </>
  );
};

/** Small specks of light that rise and twinkle. */
const ParticlesLayer: React.FC<LayerProps> = ({ frame, theme, seed }) => {
  const { width, height, fps } = useVideoConfig();
  const particles = useMemo(() => getParticles(seed), [seed]);
  const short = Math.min(width, height);
  return (
    <>
      <Glows frame={frame} theme={theme} strength={0.7} />
      <svg width={width} height={height} style={{ position: "absolute" }}>
        {particles.map((particle, index) => {
          const { x, y, opacity } = particleAt(particle, frame, fps);
          return (
            <circle
              key={index}
              cx={x * width}
              cy={y * height}
              r={particle.size * short}
              fill={theme.colors.accentBright}
              opacity={opacity}
            />
          );
        })}
      </svg>
    </>
  );
};

/** Graph-paper lines drifting diagonally, fading out toward the edges. */
const GridLayer: React.FC<LayerProps> = ({ frame, theme }) => {
  const { width, height } = useVideoConfig();
  const cell = Math.round(Math.min(width, height) / 12);
  const offset = (frame * 0.4) % cell;
  const line = theme.colors.surfaceBorder;
  return (
    <>
      <Glows frame={frame} theme={theme} strength={0.8} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${line} 1.5px, transparent 1.5px), linear-gradient(90deg, ${line} 1.5px, transparent 1.5px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `${offset}px ${offset}px`,
          opacity: 0.9,
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 100%)",
        }}
      />
    </>
  );
};

/** Fine film grain that changes every couple of frames, over soft glows. */
const NoiseLayer: React.FC<LayerProps> = ({ frame, theme, seed }) => {
  const { width, height } = useVideoConfig();
  // A different grain every 2 frames, picked by the frame, so renders repeat exactly.
  const grain = Math.floor(frame / 2) % 97;
  const filterId = `grain-${seed.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <>
      <Glows frame={frame} theme={theme} strength={1.1} />
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", opacity: 0.1 }}
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={0.9}
            numOctaves={2}
            seed={grain}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={width} height={height} filter={`url(#${filterId})`} />
      </svg>
    </>
  );
};

const LAYERS: Record<BackgroundStyle, React.FC<LayerProps> | null> = {
  glow: GlowLayer,
  gradient: GradientLayer,
  shapes: ShapesLayer,
  particles: ParticlesLayer,
  grid: GridLayer,
  noise: NoiseLayer,
  plain: null,
};

/**
 * The theme's backdrop, with a moving pattern on top. Everything moves with
 * the frame number alone, so a render matches the preview exactly.
 */
export const Background: React.FC<{
  style?: BackgroundStyle;
  /** Picks where shapes and particles go, so each video gets its own arrangement. */
  seed?: string;
  /** Frame in the video where the current sequence starts, so the drift stays continuous across scenes. */
  frameOffset?: number;
}> = ({ style = DEFAULT_BACKGROUND, seed = "background", frameOffset = 0 }) => {
  const theme = useTheme();
  const frame = useCurrentFrame() + frameOffset;
  const Layer = LAYERS[style];

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.background }}>
      {Layer ? <Layer frame={frame} theme={theme} seed={seed} /> : null}
    </AbsoluteFill>
  );
};
