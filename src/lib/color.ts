/**
 * Small color helpers for themes. Colors are 6-digit hex strings such as
 * "#7C5CFF", which is what the spec stores and what the color picker gives.
 */

export type Rgb = { r: number; g: number; b: number };

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const isHexColor = (value: string) => HEX_COLOR.test(value);

export const parseHex = (hex: string): Rgb => {
  if (!isHexColor(hex)) {
    throw new Error(`"${hex}" isn't a 6-digit hex color like #7C5CFF.`);
  }
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
};

const toByte = (value: number) =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

export const toHex = ({ r, g, b }: Rgb) =>
  `#${toByte(r)}${toByte(g)}${toByte(b)}`;

/** Blends two colors: 0 gives `from`, 1 gives `to`. */
export const mix = (from: string, to: string, amount: number) => {
  const a = parseHex(from);
  const b = parseHex(to);
  return toHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
};

/** The color as rgba() with some transparency, e.g. for glows and shades. */
export const withAlpha = (hex: string, alpha: number) => {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** How bright a color looks, from 0 (black) to 1 (white), as WCAG defines it. */
export const luminance = (hex: string) => {
  const { r, g, b } = parseHex(hex);
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** WCAG contrast ratio between two colors, from 1 (none) to 21 (black on white). */
export const contrastRatio = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};

/** WCAG AA: 4.5 for normal text. Large, bold text only needs 3. */
export const AA_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;

export const isDarkColor = (hex: string) => luminance(hex) < 0.18;

/** Black or white, whichever reads better on `background`. */
export const readableOn = (background: string) =>
  contrastRatio("#FFFFFF", background) >= contrastRatio("#000000", background)
    ? "#FFFFFF"
    : "#000000";

/**
 * `color` if it already has enough contrast on `background`; otherwise the
 * closest blend towards black or white that does. Keeps the color's hue as
 * far as it can, so a brand color stays recognisable.
 */
export const ensureContrast = (
  color: string,
  background: string,
  minimum = AA_TEXT,
) => {
  if (contrastRatio(color, background) >= minimum) return color;
  const target = readableOn(background);
  for (let step = 1; step <= 20; step++) {
    const candidate = mix(color, target, step / 20);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return target;
};
