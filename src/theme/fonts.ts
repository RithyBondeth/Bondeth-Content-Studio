import { loadFont as loadAtkinson } from "@remotion/google-fonts/AtkinsonHyperlegible";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import type { ThemeFont } from "./presets";

// Load only the weights and subsets we use, to keep renders fast. Each font
// loads the first time a video uses it; loading it again is free.
const loaders: Record<ThemeFont, () => string> = {
  inter: () =>
    loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] })
      .fontFamily,
  poppins: () =>
    loadPoppins("normal", {
      weights: ["400", "600", "800"],
      subsets: ["latin"],
    }).fontFamily,
  nunito: () =>
    loadNunito("normal", { weights: ["400", "600", "800"], subsets: ["latin"] })
      .fontFamily,
  montserrat: () =>
    loadMontserrat("normal", {
      weights: ["400", "600", "800"],
      subsets: ["latin"],
    }).fontFamily,
  "playfair-display": () =>
    loadPlayfair("normal", {
      weights: ["400", "600", "800"],
      subsets: ["latin"],
    }).fontFamily,
  // Only comes in regular and bold; heavier text uses the bold.
  "atkinson-hyperlegible": () =>
    loadAtkinson("normal", { weights: ["400", "700"], subsets: ["latin"] })
      .fontFamily,
};

let mono: string | null = null;

/** Loads a theme's font (and the code font) and returns their CSS font families. */
export const loadThemeFonts = (font: ThemeFont) => {
  mono ??= loadJetBrainsMono("normal", {
    weights: ["400", "600"],
    subsets: ["latin"],
  }).fontFamily;
  return { sans: (loaders[font] ?? loaders.inter)(), mono };
};
