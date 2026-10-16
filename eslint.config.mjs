import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  {
    // The studio UI is a normal web app, not video frames, so CSS
    // transitions there are fine.
    files: ["app/**", "studio/**"],
    rules: { "@remotion/non-pure-animation": "off" },
  },
];
