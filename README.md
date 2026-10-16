<div align="center">

# Bondeth Content Studio

**A code-first video studio for developer and tech creators.**

Turn code snippets into polished, on-brand coding videos for YouTube, Shorts, TikTok, Reels, and LinkedIn.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Remotion](https://img.shields.io/badge/Remotion-0B84F3?style=for-the-badge&logo=remotion&logoColor=white)

</div>

---

## Why

Developers who want to teach online hit the same wall: general video editors are bad at code. Animating a code walkthrough by hand in a timeline editor takes hours, and redoing it when the code changes takes hours again.

Bondeth Content Studio treats a video like source code. You describe a lesson as a list of code steps with captions, and the studio renders a branded video with syntax highlighting, animated line reveals, and focus highlights, in both landscape and vertical formats. Because lessons are code, they live in git, are easy to review, and can be updated in minutes.

## Who it's for

- Developers starting a YouTube, TikTok, or LinkedIn channel
- DevRel teams producing tutorials and product walkthroughs
- Course creators and instructors who teach programming

## Features

**Available now (Stage 1)**

- **Lessons as data.** Write a lesson as a list of steps, each with code, a caption, and optional highlighted lines.
- **Animated code walkthroughs.** Lines that are new in a step animate in; highlighted lines come into focus while the rest dim.
- **Syntax highlighting** with [Shiki](https://shiki.style/) for TypeScript, TSX, JavaScript, Python, Go, Rust, Bash, SQL, and more.
- **Landscape and vertical** (16:9 and 9:16) from the same lesson, with code automatically sized to fit.
- **Branded intro, lower third, and outro** driven by one brand file.
- **Design tokens** for colors, fonts, and radii, so every video stays consistent.
- **MP4 rendering** with Remotion.

## Roadmap

| Stage                          | Goal                                 | Highlights                                                                                                      |
| ------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **1. Code toolkit** (current)  | Make great coding videos from code   | Templates, code walkthroughs, both formats, CLI rendering                                                       |
| **2. Content-first authoring** | Write lessons without touching React | Lessons in Markdown/MDX, captions/subtitles, thumbnails, more scene types (terminal, diagrams, browser preview) |
| **3. Web studio**              | Creators who don't code can use it   | Browser editor with live preview, brand kits, cloud rendering, accounts                                         |
| **4. AI assist**               | Go from idea to video faster         | Script and step generation from a topic, voice-over, auto-cutting long videos into Shorts                       |

## Getting started

**Requirements:** Node.js 20 or newer.

```bash
git clone https://github.com/RithyBondeth/Bondeth-Content-Studio.git
cd Bondeth-Content-Studio
npm install
npm run dev
```

`npm run dev` opens Remotion Studio, where you can preview every lesson in both formats.

## Rendering a video

Each lesson gets two compositions: `<slug>-landscape` (1920×1080) and `<slug>-vertical` (1080×1920).

```bash
npm run render -- react-use-state-landscape
npm run render -- react-use-state-vertical
```

Videos are written to `out/<composition-id>.mp4`. To export a single frame, for example as a thumbnail:

```bash
npm run still -- react-use-state-landscape out/thumbnail.png --frame=60
```

## Creating a lesson

1. Add a file in `src/lessons/`, for example `src/lessons/python-list-comprehensions.ts`:

   ```ts
   import type { Lesson } from "./types";

   export const pythonListComprehensions: Lesson = {
     slug: "python-list-comprehensions",
     title: "List Comprehensions",
     subtitle: "Write loops in one line.",
     language: "python",
     fileName: "squares.py",
     steps: [
       {
         caption: "A classic loop that builds a list.",
         code: `
   squares = []
   for n in range(10):
       squares.append(n * n)
   `,
       },
       {
         caption: "The same thing as a list comprehension.",
         highlight: "1",
         code: `
   squares = [n * n for n in range(10)]
   `,
       },
     ],
     outro: { nextUp: "Dictionary comprehensions" },
   };
   ```

2. Register it in `src/lessons/index.ts`:

   ```ts
   export const lessons: Lesson[] = [reactUseState, pythonListComprehensions];
   ```

3. Run `npm run dev` to preview it, then render it.

### Step options

| Field               | Required | Description                                                                         |
| ------------------- | -------- | ----------------------------------------------------------------------------------- |
| `code`              | Yes      | The full code for this step. Lines that are new since the previous step animate in. |
| `caption`           | Yes      | On-screen text explaining the step.                                                 |
| `highlight`         | No       | Lines to focus, 1-based, e.g. `"3"` or `"2,4-6"`. Other lines dim.                  |
| `fileName`          | No       | File name in the editor title bar. Defaults to the lesson's `fileName`.             |
| `durationInSeconds` | No       | How long the step stays on screen. Defaults to 5.                                   |

## Customizing your brand

| File                  | What it controls                                                                   |
| --------------------- | ---------------------------------------------------------------------------------- |
| `src/brand.ts`        | Channel name, role, handle, and website shown in the intro, lower third, and outro |
| `src/theme/tokens.ts` | Colors, radii, and the syntax-highlighting theme                                   |
| `src/theme/fonts.ts`  | Fonts (loaded from Google Fonts)                                                   |
| `src/lib/timing.ts`   | Intro, outro, step, and transition lengths                                         |

## Project structure

```
src/
├── index.ts                  # Remotion entry point
├── Root.tsx                  # Registers a landscape + vertical composition per lesson
├── brand.ts                  # Your channel identity
├── lessons/                  # Lesson content (one file per lesson)
├── compositions/
│   └── LessonVideo.tsx       # Intro → walkthrough → outro, plus metadata calculation
├── scenes/                   # IntroScene, CodeWalkthroughScene, OutroScene
├── components/               # CodeBlock, CodeWindow, LowerThird, Pill, StepProgress, Background
├── lib/                      # Highlighting, line diffing, timing, layout helpers
└── theme/                    # Design tokens and fonts
```

## Scripts

| Command                        | Description                           |
| ------------------------------ | ------------------------------------- |
| `npm run dev`                  | Open Remotion Studio for live preview |
| `npm run render -- <id>`       | Render a composition to MP4           |
| `npm run still -- <id> <file>` | Render a single frame to an image     |
| `npm run check`                | Type-check and lint                   |
| `npm run format`               | Format the code with Prettier         |

## Tech stack

| Area                | Technology                            |
| ------------------- | ------------------------------------- |
| Video framework     | [Remotion](https://www.remotion.dev/) |
| UI                  | React                                 |
| Language            | TypeScript                            |
| Syntax highlighting | [Shiki](https://shiki.style/)         |

## Author

**Rithy Bondeth**, Full Stack Developer & AI Engineer

[![Portfolio](https://img.shields.io/badge/Portfolio-0A0A0A?style=for-the-badge&logo=vercel&logoColor=white)](https://bondeth.dev)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RithyBondeth)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rithy-bondeth-484073282/)

## License

The code in this repository is distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

This project depends on [Remotion](https://www.remotion.dev/), which has its own license: it is free for individuals and small companies, while larger companies need a company license. Check [Remotion's license terms](https://www.remotion.dev/license) before using this project commercially.
