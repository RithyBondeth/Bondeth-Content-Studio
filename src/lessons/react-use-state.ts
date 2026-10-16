import type { Lesson } from "./types";

export const reactUseState: Lesson = {
  slug: "react-use-state",
  title: "useState in 60 Seconds",
  subtitle: "Build a counter and learn how React state works.",
  language: "tsx",
  fileName: "Counter.tsx",
  steps: [
    {
      caption: "Start with a plain component that renders a button.",
      code: `
export function Counter() {
  return <button>Clicked 0 times</button>;
}
`,
    },
    {
      caption: "useState gives you a value and a setter. Here it starts at 0.",
      highlight: "1,4",
      code: `
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return <button>Clicked {count} times</button>;
}
`,
    },
    {
      caption: "Calling setCount re-renders the component with the new value.",
      highlight: "7",
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
    {
      caption:
        "When the next value depends on the previous one, pass an updater function.",
      highlight: "7",
      code: `
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((c) => c + 1)}>
      Clicked {count} times
    </button>
  );
}
`,
    },
  ],
  outro: {
    message: "Now you know useState!",
    nextUp: "useEffect explained",
  },
};
