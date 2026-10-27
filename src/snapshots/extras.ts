import type { VideoSpecInput } from "../spec/schema";

/**
 * Scene types and layouts the examples don't use, so the visual snapshots
 * cover them too. Uses a light theme, and a local image so renders never
 * depend on the network.
 */
export const snapshotExtras: VideoSpecInput = {
  version: 1,
  title: "Snapshot Extras",
  language: "en",
  background: "shapes",
  theme: { preset: "paper" },
  scenes: [
    {
      type: "quote",
      quote: "The important thing is not to stop questioning.",
      author: "Albert Einstein",
      narration:
        "As Einstein put it, the important thing is not to stop questioning.",
    },
    {
      type: "image",
      src: "examples/hills.svg",
      alt: "Green hills under a blue sky",
      caption: "Every hill is covered in tiny solar panels",
      credit: "Sample illustration, CC0",
      narration:
        "Look at any green hill and you're looking at millions of tiny solar panels: leaves.",
    },
    {
      type: "diagram",
      heading: "The water cycle",
      layout: "cycle",
      nodes: [
        { label: "Evaporation", icon: "sun" },
        { label: "Clouds", icon: "cloud" },
        { label: "Rain", icon: "droplet" },
        { label: "Rivers", icon: "waves" },
      ],
      narration:
        "Water evaporates, gathers into clouds, falls as rain, and runs down rivers back to the sea, again and again.",
    },
    {
      type: "diagram",
      heading: "What a plant needs",
      layout: "hub",
      nodes: [
        { label: "Plant", icon: "sprout" },
        { label: "Light", icon: "sun" },
        { label: "Water", icon: "droplet" },
        { label: "Air", icon: "wind" },
      ],
      narration:
        "Every plant sits at the middle of three things it needs: light, water, and air.",
    },
    {
      type: "cta",
      heading: "That's a wrap",
      action: "Follow for more",
      narration: "That's a wrap. Follow for more.",
    },
  ],
};
