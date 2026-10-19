// Pure helpers for the chart scene: how big each bar is, where each point of
// a line sits, and how values are written.

/**
 * Each value as a fraction of the largest one, so the largest bar fills the
 * chart. Bars start from zero; when every value is zero, every bar is empty.
 */
export const getChartFractions = (values: number[]): number[] => {
  const max = Math.max(0, ...values);
  return values.map((value) => (max > 0 ? Math.max(0, value) / max : 0));
};

/**
 * Where each point of a line chart sits in a `width` × `height` box. Points
 * are spread evenly, each in the middle of its own column like the labels
 * under it, and the largest value touches the top.
 */
export const getLinePoints = (
  values: number[],
  width: number,
  height: number,
): { x: number; y: number }[] => {
  const column = width / Math.max(1, values.length);
  return getChartFractions(values).map((fraction, index) => ({
    x: column * (index + 0.5),
    y: height * (1 - fraction),
  }));
};

/** Decimal places a value is written with, e.g. 2 for 5.86 and 0 for 12. At most 3. */
export const countDecimals = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  for (let decimals = 0; decimals < 3; decimals++) {
    if (Number(value.toFixed(decimals)) === value) {
      return decimals;
    }
  }
  return 3;
};

/** A single currency symbol such as "$" or "€", which goes before the number. */
const isCurrency = (unit: string) => /^\p{Sc}$/u.test(unit);

/**
 * Writes `value` with `decimals` places, digit grouping, and the chart's
 * unit: "$1,200", "73%", "5.9x", or "120 km". Currency symbols go before the
 * number; a unit that's a word gets a space; other units, such as "%", "x",
 * or "°C", sit right after the number.
 */
export const formatChartValue = (
  value: number,
  decimals: number,
  unit?: string,
): string => {
  const number = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const trimmed = unit?.trim();
  if (!trimmed) {
    return number;
  }
  if (isCurrency(trimmed)) {
    return `${trimmed}${number}`;
  }
  const isWord = trimmed.length > 1 && /^\p{L}/u.test(trimmed);
  return isWord ? `${number} ${trimmed}` : `${number}${trimmed}`;
};

/** Rough width of one character of the bold sans font, as a share of its size. */
const CHAR_WIDTH = 0.6;

/**
 * The largest font size, up to `maxSize`, at which every word of `texts`
 * fits in `width`. Labels wrap between words, so the longest word decides;
 * pass whole strings as one word when they must not wrap, like values.
 */
export const fitFontSize = (
  texts: string[],
  maxSize: number,
  width: number,
  { wrap = true }: { wrap?: boolean } = {},
): number => {
  const longest = Math.max(
    1,
    ...texts.flatMap((text) =>
      (wrap ? text.split(/\s+/) : [text]).map((word) => word.length),
    ),
  );
  return Math.min(maxSize, width / (longest * CHAR_WIDTH));
};
