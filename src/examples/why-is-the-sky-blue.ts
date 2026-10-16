import type { VideoSpecInput } from "../spec/schema";

/** Hand-written example that uses most scene types. */
export const whyIsTheSkyBlue: VideoSpecInput = {
  version: 1,
  title: "Why Is the Sky Blue?",
  language: "en",
  scenes: [
    {
      type: "title",
      emoji: "🌤️",
      heading: "Why is the sky blue?",
      subheading: "The answer is hiding inside sunlight.",
      narration:
        "Why is the sky blue, and not purple or white? The answer is hiding inside sunlight itself.",
    },
    {
      type: "statement",
      emoji: "🌈",
      text: "Sunlight is every color mixed together.",
      highlight: ["every color"],
      narration:
        "Sunlight looks white, but it's actually every color of the rainbow mixed together.",
    },
    {
      type: "list",
      heading: "When sunlight hits the air",
      style: "numbered",
      items: [
        "It bumps into tiny gas molecules",
        "Short blue waves scatter the most",
        "That blue reaches you from every direction",
      ],
      narration:
        "When sunlight enters the atmosphere, it bumps into tiny gas molecules. Short blue waves get scattered far more than the others, so blue light reaches your eyes from every part of the sky.",
    },
    {
      type: "stat",
      emoji: "🔬",
      value: "6x",
      label: "more scattering for blue light than for red",
      source: "Rayleigh scattering",
      narration:
        "In fact, blue light scatters about six times more than red light. Scientists call this Rayleigh scattering.",
    },
    {
      type: "comparison",
      heading: "So why not purple?",
      left: {
        label: "Violet",
        points: ["Scatters even more", "Less of it in sunlight"],
      },
      right: {
        label: "Blue",
        points: ["Plenty in sunlight", "Our eyes love it"],
      },
      narration:
        "Violet scatters even more, so why isn't the sky purple? Sunlight contains less violet, and our eyes are much more sensitive to blue.",
    },
    {
      type: "statement",
      emoji: "🌅",
      text: "At sunset, the blue scatters away and the reds remain.",
      highlight: ["reds remain"],
      narration:
        "And at sunset, light travels through much more air, so the blue scatters away before it reaches you, leaving the reds and oranges.",
    },
    {
      type: "cta",
      emoji: "👋",
      heading: "Curious about everyday science?",
      action: "Follow for more",
      narration: "Follow for more everyday science explained in a minute.",
    },
  ],
};
