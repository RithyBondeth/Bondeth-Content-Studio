import {
  ChartColumn,
  Code2,
  Columns2,
  Hash,
  Heading1,
  Image,
  List,
  Megaphone,
  Quote,
  Type,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Scene, SceneType } from "../../../src/spec/schema";

/** Frames after a scene starts when its content has faded in. */
export const SCENE_SETTLE_FRAMES = 20;

type SceneMeta = {
  label: string;
  /** Identifies the template in the scene list. */
  color: string;
  description: string;
  icon: LucideIcon;
  create: () => Scene;
};

export const SCENE_META: Record<SceneType, SceneMeta> = {
  title: {
    color: "#a78bfa",
    label: "Title",
    description: "The opening hook",
    icon: Heading1,
    create: () => ({
      type: "title",
      heading: "Your hook goes here",
      narration: "Say your hook out loud here.",
    }),
  },
  statement: {
    color: "#60a5fa",
    label: "Statement",
    description: "One big idea, word by word",
    icon: Type,
    create: () => ({
      type: "statement",
      text: "One big idea in a sentence.",
      highlight: [],
      narration: "Explain the idea.",
    }),
  },
  list: {
    color: "#34d399",
    label: "List",
    description: "Points that appear one by one",
    icon: List,
    create: () => ({
      type: "list",
      heading: "Three things to know",
      items: ["First point", "Second point", "Third point"],
      style: "numbered",
      narration: "Here are three things to know.",
    }),
  },
  stat: {
    color: "#fbbf24",
    label: "Stat",
    description: "A number that counts up",
    icon: Hash,
    create: () => ({
      type: "stat",
      value: "73%",
      label: "of people something surprising",
      narration: "Share the number and why it matters.",
    }),
  },
  chart: {
    color: "#a3e635",
    label: "Chart",
    description: "Bars that grow to their values",
    icon: ChartColumn,
    create: () => ({
      type: "chart",
      heading: "How they compare",
      style: "bar",
      points: [
        { label: "First", value: 40 },
        { label: "Second", value: 65 },
        { label: "Third", value: 90 },
      ],
      unit: "%",
      narration: "Walk through the numbers and where they come from.",
    }),
  },
  quote: {
    color: "#e879f9",
    label: "Quote",
    description: "A quote and its author",
    icon: Quote,
    create: () => ({
      type: "quote",
      quote: "A quote worth sharing.",
      author: "Someone",
      narration: "Introduce the quote.",
    }),
  },
  comparison: {
    color: "#fb7185",
    label: "Comparison",
    description: "Two sides, like myth vs. fact",
    icon: Columns2,
    create: () => ({
      type: "comparison",
      heading: "Myth vs. fact",
      left: { label: "Myth", points: ["What people think"] },
      right: { label: "Fact", points: ["What's actually true"] },
      narration: "Compare the two sides.",
    }),
  },
  code: {
    color: "#22d3ee",
    label: "Code",
    description: "Code that builds up step by step",
    icon: Code2,
    create: () => ({
      type: "code",
      language: "python",
      fileName: "main.py",
      steps: [{ code: 'print("Hello")' }],
      narration: "Walk through the code.",
    }),
  },
  image: {
    color: "#f472b6",
    label: "Image",
    description: "A photo or illustration with a slow camera move",
    icon: Image,
    create: () => ({
      type: "image",
      alt: "A clear blue sky over green hills",
      layout: "full",
      narration: "Describe what the picture shows.",
    }),
  },
  diagram: {
    color: "#2dd4bf",
    label: "Diagram",
    description: "Steps or parts joined by arrows",
    icon: Workflow,
    create: () => ({
      type: "diagram",
      heading: "How it works",
      layout: "flow",
      nodes: [
        { label: "First step", icon: "lightbulb" },
        { label: "Second step", icon: "settings" },
        { label: "Result", icon: "trophy" },
      ],
      narration: "Walk through each step in order.",
    }),
  },
  cta: {
    color: "#fb923c",
    label: "Call to action",
    description: "The closing ask",
    icon: Megaphone,
    create: () => ({
      type: "cta",
      heading: "Want more like this?",
      action: "Follow for more",
      narration: "Follow for more.",
    }),
  },
};

export const SCENE_TYPE_ORDER: SceneType[] = [
  "title",
  "statement",
  "list",
  "stat",
  "chart",
  "comparison",
  "diagram",
  "image",
  "quote",
  "code",
  "cta",
];

/** The scene's main on-screen text, for lists and type conversions. */
export const sceneSummary = (scene: Scene): string => {
  switch (scene.type) {
    case "title":
    case "list":
    case "chart":
    case "cta":
      return scene.heading;
    case "statement":
      return scene.text;
    case "stat":
      return `${scene.value} ${scene.label}`;
    case "quote":
      return scene.quote;
    case "comparison":
      return scene.heading ?? `${scene.left.label} vs. ${scene.right.label}`;
    case "code":
      return scene.fileName ?? `${scene.language} code`;
    case "image":
      return scene.caption ?? scene.alt;
    case "diagram":
      return scene.heading ?? scene.nodes.map((node) => node.label).join(" → ");
  }
};

/** Switches a scene to another template, keeping its narration, emoji, transition, and main text. */
export const convertScene = (scene: Scene, type: SceneType): Scene => {
  if (scene.type === type) return scene;
  const next = SCENE_META[type].create();
  const text = sceneSummary(scene);
  const base = {
    narration: scene.narration,
    emoji: scene.emoji,
    transition: scene.transition,
  };
  switch (next.type) {
    case "title":
    case "list":
    case "chart":
    case "cta":
      return { ...next, ...base, heading: text };
    case "statement":
      return { ...next, ...base, text };
    case "quote":
      return { ...next, ...base, quote: text };
    case "comparison":
    case "diagram":
      return { ...next, ...base, heading: text };
    case "image":
      return { ...next, ...base, caption: text };
    default:
      return { ...next, ...base };
  }
};

/** Plain names for scene fields, for saying what a template switch removes. */
const FIELD_NAMES: Record<string, string> = {
  subheading: "subheading",
  highlight: "highlighted words",
  items: "list items",
  cues: "cues",
  style: "style",
  value: "number",
  label: "label",
  source: "source",
  cue: "cue",
  points: "data points",
  unit: "unit",
  author: "author",
  left: "left side",
  right: "right side",
  language: "language",
  fileName: "file name",
  steps: "code steps",
  src: "image",
  alt: "image description",
  search: "image search",
  prompt: "image prompt",
  credit: "image credit",
  layout: "layout",
  motion: "camera move",
  nodes: "diagram nodes",
  action: "button text",
};

/** Fields that are always kept, or that every template has. */
const KEPT = new Set([
  "type",
  "narration",
  "emoji",
  "transition",
  "durationInSeconds",
  "audio",
]);

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

/**
 * What switching a scene to another template would throw away: fields with
 * content that the new template doesn't keep. Empty when nothing is lost,
 * such as switching a title to a statement, which keeps its text.
 */
export const droppedFields = (scene: Scene, type: SceneType): string[] => {
  if (scene.type === type) return [];
  const next = convertScene(scene, type) as Record<string, unknown>;
  const kept = new Set(
    Object.values(next)
      .filter((value) => typeof value === "string")
      .map((value) => value as string),
  );
  const names = Object.entries(scene)
    .filter(([key, value]) => {
      if (KEPT.has(key) || isEmpty(value)) return false;
      if (JSON.stringify(next[key]) === JSON.stringify(value)) return false;
      // Text carried into another field, like a heading becoming a statement.
      return !(typeof value === "string" && kept.has(value));
    })
    .map(([key]) => FIELD_NAMES[key] ?? key);
  return [...new Set(names)];
};
