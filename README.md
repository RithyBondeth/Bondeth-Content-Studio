<div align="center">

# Bondeth Content Studio

**Turn one idea into a content plan, then into finished explainer videos.**

An AI content studio for educators and explainers: Claude plans the series and writes the scripts, ElevenLabs records the voice-over, and Remotion renders animated, captioned videos for TikTok, YouTube Shorts, Reels, and YouTube.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Remotion](https://img.shields.io/badge/Remotion-0B84F3?style=for-the-badge&logo=remotion&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=claude&logoColor=white)

</div>

---

## Why

Most people who want to teach online get stuck in the same places: deciding what to post, writing the script, and editing the video. Bondeth Content Studio handles all three, while leaving you in control of every step.

1. **Plan:** describe your idea, and Claude turns it into a content series with an audience, themes, a posting schedule, and a list of videos with hooks.
2. **Script:** Claude writes each video as a sequence of scenes (title, list, statistic, comparison, code, and more), with narration and on-screen text.
3. **Voice:** ElevenLabs records the narration and returns word timings for the captions.
4. **Render:** Remotion turns everything into an animated MP4 with word-by-word captions, in vertical (9:16) and landscape (16:9).

Every step writes plain JSON files you can review and edit before moving on.

## Who it's for

Educators, teachers, coaches, and anyone who explains things: science, history, finance, languages, programming, and how-tos. The videos are animated explainers with no presenter on camera, so you never need to film yourself.

## Getting started

**Requirements:** Node.js 20 or newer, an [Anthropic API key](https://platform.claude.com/settings/keys), and an [ElevenLabs API key](https://elevenlabs.io/app/settings/api-keys) for voice-over.

```bash
git clone https://github.com/RithyBondeth/Bondeth-Content-Studio.git
cd Bondeth-Content-Studio
npm install
cp .env.example .env
```

Add your keys to `.env`, then make your first videos:

```bash
npm run pipeline -- make "Everyday science for curious teenagers" --videos 3
```

The finished videos are written to `out/<plan>/`.

## Step by step

Running each step on its own lets you review and edit between steps.

```bash
# 1. Plan a series. Prints the plan and saves content/<plan>/plan.json.
npm run pipeline -- plan "Personal finance basics for university students" --videos 7

# 2. Write scripts. Saves content/<plan>/videos/<nn>-<title>/spec.json for each video.
npm run pipeline -- script personal-finance-basics

# 3. Preview a video in Remotion Studio, with captions timed from the text.
npm run pipeline -- preview personal-finance-basics --video 1

# 4. Record the voice-over. Unchanged scenes are skipped on re-runs.
npm run pipeline -- voice personal-finance-basics

# 5. Render to MP4.
npm run pipeline -- render personal-finance-basics --format both

# See plans, and the status of each video in a plan.
npm run pipeline -- list
npm run pipeline -- list personal-finance-basics
```

| Option              | Used by                                | Description                                                 |
| ------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `--videos <n>`      | `plan`, `make`                         | Number of videos to plan (default 5)                        |
| `--audience <text>` | `plan`, `make`                         | Who the videos are for                                      |
| `--tone <text>`     | `plan`, `make`                         | Voice and style, e.g. "warm and playful"                    |
| `--language <code>` | `plan`, `make`                         | Narration language, e.g. `en`, `es`, `km` (default `en`)    |
| `--seconds <n>`     | `script`, `make`                       | Target length of each video (default 45)                    |
| `--video <n\|all>`  | `script`, `voice`, `render`, `preview` | Which video to work on (default all; preview defaults to 1) |
| `--format <name>`   | `render`, `make`                       | `vertical`, `landscape`, or `both` (default `vertical`)     |
| `--no-voice`        | `make`                                 | Skip the voice-over; captions are timed from the text       |
| `--force`           | `script`                               | Rewrite scripts that already exist                          |

## Scene types

A video is a list of scenes. Each scene has `narration` (what the voice says), an optional `emoji`, and fields for its template.

| Type         | Shows                                               | Fields                                                         |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------- |
| `title`      | The opening hook                                    | `heading`, `subheading?`                                       |
| `statement`  | One big idea, revealed word by word                 | `text`, `highlight?` (words to color)                          |
| `list`       | A heading and items that appear one by one          | `heading`, `items`, `style?` (`bullets`, `numbered`, `checks`) |
| `stat`       | A number that counts up                             | `value` (e.g. `"73%"`), `label`, `source?`                     |
| `quote`      | A quote with its author                             | `quote`, `author?`                                             |
| `comparison` | Two sides, such as myth vs. fact                    | `heading?`, `left`, `right` (each `label` + `points`)          |
| `code`       | Syntax-highlighted code that builds up step by step | `language`, `fileName?`, `steps` (`code`, `highlight?`)        |
| `cta`        | The closing call to action                          | `heading`, `action`                                            |

Every scene also accepts `durationInSeconds` to override its length. Otherwise the length comes from the voice-over, or from the narration's word count before there is one.

A whole video spec looks like this:

```json
{
  "version": 1,
  "title": "Why Is the Sky Blue?",
  "language": "en",
  "captions": true,
  "scenes": [
    {
      "type": "title",
      "emoji": "🌤️",
      "heading": "Why is the sky blue?",
      "narration": "Why is the sky blue, and not purple or white?"
    },
    {
      "type": "stat",
      "value": "6x",
      "label": "more scattering for blue light than for red",
      "narration": "Blue light scatters about six times more than red light."
    }
  ]
}
```

To add background music, put an audio file under `public/` and add `"music": { "src": "music/track.mp3", "volume": 0.15 }`.

## Examples and templates

`npm run dev` opens Remotion Studio with two hand-written examples in `src/examples/`: a science explainer that uses most scene types, and a coding explainer. Use them to preview template changes.

## Customizing your brand

| File                  | What it controls                                                            |
| --------------------- | --------------------------------------------------------------------------- |
| `src/brand.ts`        | Your name, handle, and website, used in calls to action and given to Claude |
| `src/theme/tokens.ts` | Colors, radii, and the code highlighting theme                              |
| `src/theme/fonts.ts`  | Fonts (loaded from Google Fonts)                                            |
| `.env`                | Claude model, ElevenLabs voice, and ElevenLabs model                        |

## Project structure

```
pipeline/                 # The idea → video CLI (runs in Node)
├── cli.ts                # Commands: plan, script, preview, voice, render, make, list
├── prompts.ts            # Instructions given to Claude
├── schemas.ts            # The plan and script formats Claude must return
├── plan.ts / script.ts   # Claude steps
├── voice.ts              # ElevenLabs voice-over and word timings
├── render.ts             # Calls the Remotion CLI
└── store.ts              # Where plans, specs, and media are saved
src/                      # The Remotion video app
├── spec/schema.ts        # The video spec format (zod)
├── compositions/         # ExplainerVideo: scenes, audio, captions, timing
├── scenes/               # One component per scene type
├── components/           # Captions, code blocks, kinetic text, backgrounds
├── examples/             # Hand-written example videos
├── lib/                  # Timing, captions, highlighting, layout helpers
└── theme/                # Design tokens and fonts
content/                  # Generated plans and specs (git-ignored)
public/content/           # Generated voice-overs (git-ignored)
out/                      # Rendered videos (git-ignored)
```

## Scripts

| Command                         | Description                            |
| ------------------------------- | -------------------------------------- |
| `npm run pipeline -- <command>` | Run the idea → video pipeline          |
| `npm run dev`                   | Open Remotion Studio with the examples |
| `npm run render -- <id>`        | Render a composition directly          |
| `npm test`                      | Run the unit tests                     |
| `npm run check`                 | Type-check and lint                    |
| `npm run format`                | Format the code with Prettier          |

## Roadmap

| Stage                     | Goal                                         | Highlights                                                                     |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| **1. Pipeline** (current) | Idea to finished video from the command line | Content plans, scripts, 8 scene types, voice-over, captions, both formats      |
| **2. Richer visuals**     | Videos that look less templated              | Stock and AI images, icons, charts, more transitions, background music library |
| **3. Web studio**         | Anyone can use it, no terminal needed        | Browser editor with live preview, brand kits, cloud rendering, accounts        |
| **4. Publishing**         | From plan to posted                          | Captions and hashtags per platform, scheduling, performance tracking           |

## Costs

Each video calls the Claude API once to write the script, plus once per plan, and ElevenLabs once per scene. Check current [Claude](https://platform.claude.com/docs/en/about-claude/pricing) and [ElevenLabs](https://elevenlabs.io/pricing) pricing. Rendering runs on your machine and is free.

## Author

**Rithy Bondeth**, Full Stack Developer & AI Engineer

[![Portfolio](https://img.shields.io/badge/Portfolio-0A0A0A?style=for-the-badge&logo=vercel&logoColor=white)](https://bondeth.dev)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RithyBondeth)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rithy-bondeth-484073282/)

## License

The code in this repository is distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

This project depends on [Remotion](https://www.remotion.dev/), which has its own license: it is free for individuals and small companies, while larger companies need a company license, and offering video rendering to others as a service also requires one. Check [Remotion's license terms](https://www.remotion.dev/license) before using this project commercially.
