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
      transition: "slide",
      heading: "When sunlight hits the air",
      style: "numbered",
      items: [
        "It bumps into tiny gas molecules",
        "Short blue waves scatter the most",
        "That blue reaches you from every direction",
      ],
      cues: ["bumps into", "short blue waves", "blue light reaches"],
      narration:
        "When sunlight enters the atmosphere, it bumps into tiny gas molecules. Short blue waves get scattered far more than the others, so blue light reaches your eyes from every part of the sky.",
    },
    {
      type: "stat",
      transition: "zoom",
      emoji: "🔬",
      value: "6x",
      label: "more scattering for blue light than for red",
      source: "Rayleigh scattering",
      cue: "six times",
      narration:
        "In fact, blue light scatters about six times more than red light. Scientists call this Rayleigh scattering.",
    },
    {
      type: "chart",
      heading: "How much each color scatters",
      // Rayleigh scattering goes as 1/wavelength⁴: (700 nm / wavelength)⁴.
      points: [
        { label: "Red", value: 1, cue: "next to red" },
        { label: "Green", value: 3, cue: "green scatters" },
        { label: "Blue", value: 5.9, cue: "blue nearly" },
        { label: "Violet", value: 9.4, cue: "violet more" },
      ],
      unit: "x",
      source: "Rayleigh scattering, relative to red light (700 nm)",
      narration:
        "The shorter the wave, the more it scatters. Next to red, green scatters about three times as much, blue nearly six times, and violet more than nine.",
    },
    {
      type: "comparison",
      transition: "wipe",
      heading: "So why not purple?",
      left: {
        label: "Violet",
        points: ["Scatters even more", "Less of it in sunlight"],
      },
      right: {
        label: "Blue",
        points: ["Plenty in sunlight", "Our eyes love it"],
        cue: "and our eyes",
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
      type: "diagram",
      transition: "slide",
      heading: "The whole journey",
      layout: "flow",
      nodes: [
        { label: "Sunlight", icon: "sun", cue: "sunlight" },
        { label: "Air molecules", icon: "wind", cue: "hits the air" },
        { label: "Blue scatters", icon: "waves", cue: "blue scatters" },
        { label: "Your eyes", icon: "eye", cue: "your eyes" },
      ],
      narration:
        "So, sunlight hits the air, the blue scatters across the sky, and it reaches your eyes from every direction.",
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
