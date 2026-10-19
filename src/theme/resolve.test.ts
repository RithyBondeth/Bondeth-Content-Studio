import assert from "node:assert/strict";
import { test } from "node:test";
import { contrastRatio } from "../lib/color";
import { THEME_PRESET_NAMES, THEME_PRESETS } from "./presets";
import { getContrastIssues, resolveTheme } from "./resolve";

test("no theme gives the original midnight look", () => {
  const theme = resolveTheme();
  assert.equal(theme.preset, "midnight");
  assert.deepEqual(
    { ...theme.colors, captionActiveText: undefined },
    {
      ...THEME_PRESETS.midnight.colors,
      captionActiveText: undefined,
      lineHighlight: "rgba(124, 92, 255, 0.16)",
      lineHighlightBorder: "#7C5CFF",
      windowDots: ["#FF5F57", "#FEBC2E", "#28C840"],
    },
  );
  // Captions keep their light text on the violet highlight.
  assert.equal(theme.colors.captionActiveText, "#E5E7EB");
  assert.equal(theme.font, "inter");
  assert.equal(theme.codeTheme, "github-dark-default");
  assert.equal(theme.isDark, true);
});

for (const name of THEME_PRESET_NAMES) {
  test(`the ${name} preset passes WCAG AA contrast`, () => {
    assert.deepEqual(getContrastIssues(resolveTheme({ preset: name })), []);
  });
}

test("light presets use light code colors", () => {
  const paper = resolveTheme({ preset: "paper" });
  assert.equal(paper.isDark, false);
  assert.equal(paper.codeTheme, "github-light-default");
});

test("picked colors and font are kept exactly", () => {
  const theme = resolveTheme({
    preset: "midnight",
    accent: "#10B981",
    background: "#101418",
    text: "#F8FAFC",
    font: "nunito",
  });
  assert.equal(theme.colors.accent, "#10B981");
  assert.equal(theme.colors.background, "#101418");
  assert.equal(theme.colors.text, "#F8FAFC");
  assert.equal(theme.font, "nunito");
  assert.equal(theme.colors.lineHighlight, "rgba(16, 185, 129, 0.16)");
});

test("colors worked out from picked ones stay readable", () => {
  // A pale accent on a light background: as text it needs darkening.
  const theme = resolveTheme({
    preset: "paper",
    accent: "#FDE047",
    background: "#FFFFFF",
  });
  assert.deepEqual(getContrastIssues(theme), []);
  assert.ok(contrastRatio(theme.colors.accentBright, "#FFFFFF") >= 4.5);
  // Dark text on the yellow button, not white.
  assert.equal(theme.colors.accentText, "#000000");
});

test("a light background on a dark preset flips the text and code colors", () => {
  const theme = resolveTheme({ preset: "midnight", background: "#FFFFFF" });
  assert.equal(theme.isDark, false);
  assert.equal(theme.codeTheme, "github-light-default");
  assert.deepEqual(getContrastIssues(theme), []);
});

test("a hard-to-read text color is reported", () => {
  const issues = getContrastIssues(
    resolveTheme({ preset: "midnight", text: "#333333" }),
  );
  assert.ok(issues.some((issue) => issue.label === "Text"));
});
