import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countDecimals,
  fitFontSize,
  formatChartValue,
  getChartFractions,
  getLinePoints,
} from "./chart";

test("bars are scaled so the largest value fills the chart", () => {
  assert.deepEqual(getChartFractions([1, 3, 6]), [1 / 6, 0.5, 1]);
  assert.deepEqual(getChartFractions([0, 4]), [0, 1]);
});

test("all-zero charts have empty bars instead of dividing by zero", () => {
  assert.deepEqual(getChartFractions([0, 0, 0]), [0, 0, 0]);
});

test("line points sit in the middle of their columns, the largest at the top", () => {
  assert.deepEqual(getLinePoints([5, 10, 0, 2.5], 400, 100), [
    { x: 50, y: 50 },
    { x: 150, y: 0 },
    { x: 250, y: 100 },
    { x: 350, y: 75 },
  ]);
});

test("decimals follow how the value is written, up to 3", () => {
  assert.equal(countDecimals(12), 0);
  assert.equal(countDecimals(5.9), 1);
  assert.equal(countDecimals(5.86), 2);
  assert.equal(countDecimals(1 / 3), 3);
});

test("values are grouped and written with their unit", () => {
  assert.equal(formatChartValue(1200, 0), "1,200");
  assert.equal(formatChartValue(73, 0, "%"), "73%");
  assert.equal(formatChartValue(5.9, 1, "x"), "5.9x");
  assert.equal(formatChartValue(21.5, 1, "°C"), "21.5°C");
  assert.equal(formatChartValue(120, 0, "km"), "120 km");
  assert.equal(formatChartValue(3, 0, " years "), "3 years");
  assert.equal(formatChartValue(1200, 0, "$"), "$1,200");
  assert.equal(formatChartValue(9.5, 2, "€"), "€9.50");
  assert.equal(formatChartValue(4, 0, " "), "4");
});

test("count-ups keep the final value's decimals on the way", () => {
  assert.equal(formatChartValue(2.96, 1, "x"), "3.0x");
  assert.equal(formatChartValue(0, 1, "x"), "0.0x");
});

test("labels shrink until their longest word fits the column", () => {
  // "Wednesday" is 9 characters: 9 × 0.6 × 40 = 216px, too wide for 150px.
  const close = (actual: number, expected: number) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
  close(fitFontSize(["Mon", "Wednesday afternoon"], 40, 150), 150 / 5.4);
  // Short labels keep the full size.
  assert.equal(fitFontSize(["Red", "Blue"], 40, 300), 40);
  // Values don't wrap, so the whole string counts.
  assert.equal(fitFontSize(["$5,250.5"], 50, 240, { wrap: false }), 50);
  close(fitFontSize(["$5,250.5"], 50, 192, { wrap: false }), 40);
});
