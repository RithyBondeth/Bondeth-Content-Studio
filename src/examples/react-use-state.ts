import type { VideoSpecInput } from "../spec/schema";

/** Hand-written example of a coding explainer. */
export const reactUseState: VideoSpecInput = {
  version: 1,
  title: "useState in 60 Seconds",
  language: "en",
  scenes: [
    {
      type: "title",
      emoji: "⚛️",
      heading: "useState in 60 seconds",
      subheading: "Build a counter and learn how React state works.",
      narration:
        "Let's learn React's useState hook in sixty seconds by building a counter.",
    },
    {
      type: "code",
      language: "tsx",
      fileName: "Counter.tsx",
      narration:
        "Start with a plain component that renders a button. Then call useState, which gives you the current value and a setter. Finally, call the setter on click, and React re-renders with the new count.",
      steps: [
        {
          code: `
export function Counter() {
  return <button>Clicked 0 times</button>;
}
`,
        },
        {
          highlight: "1,4",
          cue: "call useState",
          code: `
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return <button>Clicked {count} times</button>;
}
`,
        },
        {
          highlight: "7",
          cue: "call the setter",
          code: `
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
`,
        },
      ],
    },
    {
      type: "statement",
      emoji: "💡",
      text: "When the next value depends on the last one, pass a function.",
      highlight: ["pass a function"],
      narration:
        "Pro tip: when the next value depends on the previous one, pass an updater function to the setter.",
    },
    {
      type: "cta",
      heading: "Next up: useEffect",
      action: "Follow for part 2",
      narration: "Next up, useEffect. Follow so you don't miss it.",
    },
  ],
};
