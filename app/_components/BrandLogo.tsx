/**
 * The Bondeth Studio logo: a 5×5 grid of content blocks, lit to form a play
 * button, plus the hand-drawn "bondeth studio" wordmark. The same artwork
 * lives in public/brand/ as standalone SVGs (see public/brand/README.md).
 *
 * The lit blocks pop in one after another when the page loads, and again
 * when the logo's link is hovered (the CSS is in app/globals.css).
 */

// Lit blocks as [column, row], in the order they light up.
const PLAY = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [1, 1],
  [1, 2],
  [1, 3],
  [2, 2],
] as const;

const BLOCKS = Array.from({ length: 25 }, (_, index) => {
  const column = index % 5;
  const row = Math.floor(index / 5);
  const order = PLAY.findIndex(([c, r]) => c === column && r === row);
  return { x: 8 + column * 10, y: 8 + row * 10, order };
});

// Outlined from the wordmark's monoline letters, so no font has to load.
const BONDETH =
  "M3 4V40M3 28a12 12 0 1 0 24 0a12 12 0 1 0-24 0M37 28a12 12 0 1 0 24 0a12 12 0 1 0-24 0M71 16V40M71 28a12 12 0 0 1 24 0V40M129 4V40M105 28a12 12 0 1 0 24 0a12 12 0 1 0-24 0M139 28H163a12 12 0 1 0-3.515 8.485M179 6V32a8 8 0 0 0 8 8H190M173 16H189M200 4V40M200 28a12 12 0 0 1 24 0V40";
const STUDIO =
  "M18.2 19.6A8.2 6 0 1 0 11 28A8.2 6 0 1 1 3.8 36.4M35 6V32a8 8 0 0 0 8 8H46M29 16H45M56 16V28a12 12 0 0 0 24 0M80 16V40M114 4V40M90 28a12 12 0 1 0 24 0a12 12 0 1 0-24 0M124 16V40M134 28a12 12 0 1 0 24 0a12 12 0 1 0-24 0";

const MarkShapes = () => (
  <>
    <rect width="64" height="64" rx="15" fill="#0A66C2" />
    {BLOCKS.map(({ x, y, order }) => (
      <rect
        key={`${x},${y}`}
        x={x}
        y={y}
        width="8"
        height="8"
        rx="2.5"
        fill="#fff"
        fillOpacity={order < 0 ? 0.2 : 1}
        className={order < 0 ? undefined : "brand-block"}
        style={order < 0 ? undefined : { animationDelay: `${order * 70}ms` }}
      />
    ))}
  </>
);

/** Mark and wordmark. The wordmark follows the text and accent colours. */
export const BrandLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 329 64"
    className={className}
    role="img"
    aria-label="Bondeth Studio"
  >
    <MarkShapes />
    <g
      fill="none"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d={BONDETH}
        transform="translate(78 18) scale(0.62)"
        className="stroke-text"
      />
      <g
        transform="translate(228.66 18) scale(0.62)"
        className="stroke-accent-bright"
      >
        <path d={STUDIO} />
        <circle
          cx="124"
          cy="6"
          r="4.2"
          stroke="none"
          className="fill-accent-bright"
        />
      </g>
    </g>
  </svg>
);
