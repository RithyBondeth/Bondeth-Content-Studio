import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { THEME_FONTS, type ThemeFont } from "./presets";

// The font files live in public/fonts/ (Latin subset, from Fontsource), so
// renders never fetch from the network and always use the same glyphs.
// Only the weights we use are bundled; heavier text uses the heaviest one.
const WEIGHTS: Record<ThemeFont, string[]> = {
  inter: ["400", "600", "800"],
  poppins: ["400", "600", "800"],
  nunito: ["400", "600", "800"],
  montserrat: ["400", "600", "800"],
  "playfair-display": ["400", "600", "800"],
  // Only comes in regular and bold.
  "atkinson-hyperlegible": ["400", "700"],
};

const MONO = { file: "jetbrains-mono", family: "JetBrains Mono" };
const MONO_WEIGHTS = ["400", "600"];

const loaded = new Set<string>();

/**
 * Registers a font's weights the first time a video uses it. Remotion waits
 * for them (loadFont delays the render) before taking a frame.
 */
const load = (file: string, family: string, weights: string[]) => {
  if (loaded.has(file)) return family;
  loaded.add(file);
  for (const weight of weights) {
    loadFont({
      family,
      url: staticFile(`fonts/${file}-${weight}.woff2`),
      weight,
      style: "normal",
    }).catch((error: unknown) => {
      console.error(`Could not load ${family} ${weight}:`, error);
    });
  }
  return family;
};

/** Loads a theme's font (and the code font) and returns their CSS font families. */
export const loadThemeFonts = (font: ThemeFont) => {
  const name = font in WEIGHTS ? font : "inter";
  return {
    sans: load(name, THEME_FONTS[name].label, WEIGHTS[name]),
    mono: load(MONO.file, MONO.family, MONO_WEIGHTS),
  };
};
