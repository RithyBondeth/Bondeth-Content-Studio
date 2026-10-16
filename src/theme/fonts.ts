import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

// Load only the weights and subsets we use, to keep renders fast.
const inter = loadInter("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

const jetBrainsMono = loadJetBrainsMono("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});

export const fonts = {
  sans: inter.fontFamily,
  mono: jetBrainsMono.fontFamily,
} as const;
