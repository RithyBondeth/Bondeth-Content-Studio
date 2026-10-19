import type { VideoSpecInput } from "../spec/schema";

/**
 * Hand-written example for the richer visuals: the timeline and steps
 * scenes, an animated background, picked transitions and entrances, and
 * scenes that leave both to the automatic rotation.
 */
export const howPlantsMakeFood: VideoSpecInput = {
  version: 1,
  title: "How Plants Make Food",
  language: "en",
  background: "particles",
  theme: { preset: "midnight", accent: "#22C55E" },
  music: { src: "music/inspiring.wav", volume: 0.15 },
  scenes: [
    {
      type: "title",
      emoji: "🌱",
      heading: "How do plants make food?",
      subheading: "No kitchen, no mouth, no problem.",
      narration:
        "Plants never eat a meal, so where does their food come from? They make it themselves.",
    },
    {
      type: "statement",
      entrance: "typewriter",
      text: "Photosynthesis turns light into sugar.",
      highlight: ["light", "sugar"],
      narration:
        "The trick is called photosynthesis. It turns sunlight into sugar the plant can use.",
    },
    {
      type: "steps",
      heading: "What a leaf does",
      steps: [
        {
          title: "Soak up light",
          detail: "Chlorophyll catches it",
          icon: "sun",
          cue: "catches sunlight",
        },
        {
          title: "Drink water",
          detail: "Pulled up from the roots",
          icon: "droplet",
          cue: "pulls up water",
        },
        {
          title: "Breathe in CO₂",
          detail: "Through tiny pores",
          icon: "wind",
          cue: "breathes in",
        },
        {
          title: "Make sugar",
          detail: "And release oxygen",
          icon: "sprout",
          cue: "builds sugar",
        },
      ],
      narration:
        "First, the leaf catches sunlight. Then it pulls up water from the roots, and breathes in carbon dioxide from the air. With all three, it builds sugar, and lets out the oxygen we breathe.",
    },
    {
      type: "timeline",
      transition: "clock",
      heading: "How we found out",
      events: [
        {
          date: "1648",
          label: "Van Helmont",
          detail: "Trees don't eat soil",
          cue: "sixteen forty-eight",
        },
        {
          date: "1772",
          label: "Priestley",
          detail: "Plants refresh the air",
          cue: "seventeen seventy-two",
        },
        {
          date: "1779",
          label: "Ingenhousz",
          detail: "It needs sunlight",
          cue: "seven years later",
        },
      ],
      narration:
        "In sixteen forty-eight, a tree grown in a pot showed plants don't eat soil. In seventeen seventy-two, Priestley found plants refresh the air, and seven years later Ingenhousz showed they need sunlight to do it.",
    },
    {
      type: "list",
      entrance: "pop",
      heading: "Where the sugar goes",
      style: "checks",
      items: ["Energy to grow", "Wood and stems", "Fruit and seeds"],
      cues: ["energy", "wood", "fruit"],
      narration:
        "That sugar becomes energy to grow, the wood in a tree trunk, and the fruit and seeds we eat.",
    },
    {
      type: "cta",
      heading: "Thank a plant today",
      action: "Follow for more science",
      narration:
        "So next time you eat, thank a plant. Follow for more science.",
    },
  ],
};
