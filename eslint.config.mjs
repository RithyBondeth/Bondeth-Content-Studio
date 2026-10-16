import { config } from "@remotion/eslint-config-flat";

// Remotion's rules keep video frames deterministic. The studio UI in app/
// and studio/ is a normal web app, so they don't apply there.
const remotionRulesOff = Object.fromEntries(
  config
    .flatMap((entry) => Object.keys(entry.rules ?? {}))
    .filter((rule) => rule.startsWith("@remotion/"))
    .map((rule) => [rule, "off"]),
);

export default [
  ...config,
  {
    files: ["app/**", "studio/**"],
    rules: remotionRulesOff,
  },
  {
    // This rule reads any `transition` key as a CSS transition. In video specs
    // it's the scene transition, which is plain data.
    files: [
      "pipeline/**",
      "src/spec/**",
      "src/examples/**",
      "src/**/*.test.ts",
    ],
    rules: { "@remotion/non-pure-animation": "off" },
  },
];
