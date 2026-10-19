import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contrastRatio,
  ensureContrast,
  isDarkColor,
  mix,
  parseHex,
  readableOn,
  withAlpha,
} from "./color";

test("hex colors parse and blend", () => {
  assert.deepEqual(parseHex("#7C5CFF"), { r: 124, g: 92, b: 255 });
  assert.equal(mix("#000000", "#FFFFFF", 0.5), "#808080");
  assert.equal(mix("#7C5CFF", "#7C5CFF", 0.3), "#7C5CFF");
  assert.throws(() => parseHex("violet"));
});

test("alpha colors use rgba", () => {
  assert.equal(withAlpha("#0B0F17", 0.82), "rgba(11, 15, 23, 0.82)");
});

test("contrast ratios match WCAG", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  assert.equal(contrastRatio("#FFFFFF", "#000000"), 21);
  assert.equal(contrastRatio("#777777", "#777777"), 1);
  // #767676 on white is the classic just-passes-AA grey.
  assert.ok(contrastRatio("#767676", "#FFFFFF") >= 4.5);
});

test("readable text and dark backgrounds are detected", () => {
  assert.equal(readableOn("#0B0F17"), "#FFFFFF");
  assert.equal(readableOn("#FACC15"), "#000000");
  assert.equal(isDarkColor("#0B0F17"), true);
  assert.equal(isDarkColor("#FAF8F3"), false);
});

test("ensureContrast keeps good colors and fixes poor ones", () => {
  assert.equal(ensureContrast("#FFFFFF", "#000000"), "#FFFFFF");
  const fixed = ensureContrast("#FDE047", "#FFFFFF");
  assert.notEqual(fixed, "#FDE047");
  assert.ok(contrastRatio(fixed, "#FFFFFF") >= 4.5);
});
