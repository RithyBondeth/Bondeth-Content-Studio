/**
 * Building blocks: the logo's rounded squares, reused across the studio for
 * loading, progress, and decoration. The CSS for their animations is in
 * app/globals.css.
 */
import { cx } from "./ui";

/** Four blocks lighting up in turn, clockwise. Takes the text colour. */
export const BlockSpinner = ({ className }: { className?: string }) => (
  <span
    className={cx("grid size-4 grid-cols-2 gap-[2px] p-px", className)}
    role="presentation"
    aria-hidden
  >
    {/* Grid order is TL, TR, BL, BR; the delays go TL → TR → BR → BL. */}
    {[0, 1, 3, 2].map((step) => (
      <span
        key={step}
        className="block-chase rounded-[2px] bg-current"
        style={{ animationDelay: `${step * 0.2}s` }}
      />
    ))}
  </span>
);

/** A small square status dot. */
export const BlockDot = ({ className }: { className?: string }) => (
  <span
    className={cx("inline-block size-1.5 shrink-0 rounded-[2px]", className)}
    aria-hidden
  />
);

/**
 * Progress as a row of blocks. With a small `total` (a count of videos, say)
 * there's one block per item; otherwise `value` is 0–1 across 20 blocks.
 */
export const BlockMeter = ({
  value,
  total,
  className,
}: {
  value: number;
  total?: number;
  className?: string;
}) => {
  const perItem = total !== undefined && total > 0 && total <= 16;
  const segments = perItem ? total : 20;
  const fraction = total !== undefined ? (total ? value / total : 0) : value;
  const lit = Math.round(Math.min(1, Math.max(0, fraction)) * segments);
  return (
    <div
      className={cx(
        "flex h-1.5 gap-[3px]",
        // Full width unless the caller sets one.
        !/(^|\s)w-/.test(className ?? "") && "w-full",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(1, Math.max(0, fraction)) * 100)}
    >
      {Array.from({ length: segments }, (_, index) => (
        <span
          key={index}
          className={cx(
            "flex-1 rounded-[2px] transition-colors duration-300",
            index < lit ? "bg-accent-bright" : "bg-line",
          )}
          style={{ transitionDelay: `${index * 25}ms` }}
        />
      ))}
    </div>
  );
};

/** A deterministic pseudo-random number in 0–1 for a seed and an index. */
const noise = (seed: number, index: number) => {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280;
  return x - Math.floor(x);
};

const hash = (text: string) => {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 100_003;
  return value;
};

/**
 * A field of blocks with a few lit ones, in a pattern of its own for each
 * `seed`, so every project card looks different but stays the same.
 */
export const BlockMosaic = ({
  seed,
  columns = 28,
  rows = 6,
  className,
}: {
  seed: string;
  columns?: number;
  rows?: number;
  className?: string;
}) => {
  const n = hash(seed);
  return (
    <div
      className={cx("grid gap-1", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 0.75rem)` }}
      aria-hidden
    >
      {Array.from({ length: columns * rows }, (_, index) => {
        const r = noise(n, index);
        const opacity = r > 0.9 ? 0.85 : r > 0.75 ? 0.4 : 0.1;
        return (
          <span
            key={index}
            className="size-3 rounded-[3px] bg-accent-bright"
            style={{ opacity }}
          />
        );
      })}
    </div>
  );
};
