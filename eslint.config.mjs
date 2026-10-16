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
];
