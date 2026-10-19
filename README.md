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
2. **Script:** Claude writes each video as a sequence of scenes (title, list, statistic, chart, diagram, image, comparison, code, and more), with narration and on-screen text. Image scenes get a stock photo or an AI illustration automatically.
3. **Voice:** ElevenLabs records the narration and returns word timings for the captions.
4. **Render:** Remotion turns everything into an animated MP4 with word-by-word captions, in vertical (9:16) and landscape (16:9).

Every step writes plain JSON files you can review and edit before moving on.

## Who it's for

Educators, teachers, coaches, and anyone who explains things: science, history, finance, languages, programming, and how-tos. The videos are animated explainers with no presenter on camera, so you never need to film yourself.

## Getting started

**Requirements:** Node.js 20 or newer, an [Anthropic API key](https://platform.claude.com/settings/keys) (or a key for [another AI provider](#ai-providers)), and an [ElevenLabs API key](https://elevenlabs.io/app/settings/api-keys) for voice-over (or [record your own voice](#recording-your-own-voice) for free). Optional: an [OpenAI API key](https://platform.openai.com/api-keys) for AI illustrations.

```bash
git clone https://github.com/RithyBondeth/Bondeth-Content-Studio.git
cd Bondeth-Content-Studio
npm install
cp .env.example .env
```

Add your keys to `.env`, then open the studio:

```bash
npm run studio
```

Go to [http://localhost:3100](http://localhost:3100). No keys yet? Click **Try the example project** to explore the editor, preview, and export without them.

## The web studio

The studio walks you through the whole process in your browser:

1. **New project:** describe what you want to teach, choose how many videos and the language, and Claude writes a content plan.
2. **Project:** review the plan, edit titles and hooks, set up the project's brand kit, then write scripts for one video or all of them. You can also add a video and write it yourself.
3. **Editor:** a list of scenes, a form for the selected scene, and a live preview that updates as you type. Add, reorder, duplicate, and delete scenes, switch a scene's template, and edit narration, on-screen text, emoji, and timing, and pick the video's theme. Changes save automatically.
4. **Voice:** pick a narrator for the project in its brand kit, or for one video in the editor's Voice setting, then record the narration with ElevenLabs. Only scenes whose narration, voice, or voice settings changed are re-recorded.
5. **Export:** render vertical or landscape MP4s on your computer, with progress, then play or download them.
6. **Publish:** Claude writes a title, post text, call to action, and hashtags for TikTok, YouTube Shorts, Instagram Reels, and YouTube in one go. Edit them with live character counters, copy them, and export a cover image from any scene, then download one zip per platform with the video, cover, post text, and caption files. See [Publishing](#publishing).

The studio runs locally and stores everything in this folder, the same files the command line uses.

## AI providers

Claude writes plans, scripts, and posts by default: set `ANTHROPIC_API_KEY` and you're done. To use another model, set `LLM_PROVIDER` and `LLM_MODEL` in `.env`, plus the provider's key:

| `LLM_PROVIDER` | Key                      | Notes                                       |
| -------------- | ------------------------ | ------------------------------------------- |
| `anthropic`    | `ANTHROPIC_API_KEY`      | Default. `LLM_MODEL` is optional            |
| `openai`       | `OPENAI_API_KEY`         |                                             |
| `gemini`       | `GEMINI_API_KEY`         | Through Google's OpenAI-compatible endpoint |
| `openrouter`   | `OPENROUTER_API_KEY`     | Hundreds of models behind one key           |
| `groq`         | `GROQ_API_KEY`           |                                             |
| `deepseek`     | `DEEPSEEK_API_KEY`       |                                             |
| `mistral`      | `MISTRAL_API_KEY`        |                                             |
| `xai`          | `XAI_API_KEY`            |                                             |
| `together`     | `TOGETHER_API_KEY`       |                                             |
| `ollama`       | none                     | Local models at `localhost:11434`           |
| `lmstudio`     | none                     | Local models at `localhost:1234`            |
| `custom`       | `LLM_API_KEY` (optional) | Any OpenAI-compatible API at `LLM_BASE_URL` |

`LLM_API_KEY` works for every provider, and `LLM_BASE_URL` overrides a preset's endpoint (for a proxy or a self-hosted gateway). Every reply is checked against the expected format, so a model that can't follow it fails with a clear error instead of producing a broken video. Videos are planned with long, structured JSON, so larger models give much better results. If a provider rejects JSON Schema output, set `LLM_JSON_MODE=object`.

## Command line

Everything the studio does is also available from the terminal. To go from an idea to finished videos in one command:

```bash
npm run pipeline -- make "Everyday science for curious teenagers" --videos 3
```

The finished videos are written to `out/<plan>/`. Running each step on its own lets you review and edit between steps.

```bash
# 1. Plan a series. Prints the plan and saves content/<plan>/plan.json.
npm run pipeline -- plan "Personal finance basics for university students" --videos 7

# 2. Write scripts. Saves content/<plan>/videos/<nn>-<title>/spec.json for each video.
npm run pipeline -- script personal-finance-basics

# Find images for image scenes that don't have one yet (script does this too).
npm run pipeline -- images personal-finance-basics

# 3. Preview a video in Remotion Studio, with captions timed from the text.
npm run pipeline -- preview personal-finance-basics --video 1

# 4. Record the voice-over. Unchanged scenes are skipped on re-runs.
npm run pipeline -- voice personal-finance-basics

# List the voices in your ElevenLabs account (optionally filtered), then record with one.
npm run pipeline -- voices british
npm run pipeline -- voice personal-finance-basics --voice JBFqnCBsd6RMkjVDRZzb

# 5. Render to MP4.
npm run pipeline -- render personal-finance-basics --format both

# 6. Write post text and hashtags for each platform, and export cover images.
npm run pipeline -- publish personal-finance-basics --video 1

# 7. Zip each platform's video, cover, post text, and captions, ready to post.
npm run pipeline -- bundle personal-finance-basics --video 1

# See plans, and the status of each video in a plan.
npm run pipeline -- list
npm run pipeline -- list personal-finance-basics
```

| Option              | Used by                                                               | Description                                                 |
| ------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `--videos <n>`      | `plan`, `make`                                                        | Number of videos to plan (default 5)                        |
| `--audience <text>` | `plan`, `make`                                                        | Who the videos are for                                      |
| `--tone <text>`     | `plan`, `make`                                                        | Voice and style, e.g. "warm and playful"                    |
| `--language <code>` | `plan`, `make`                                                        | Narration language, e.g. `en`, `es`, `km` (default `en`)    |
| `--seconds <n>`     | `script`, `make`                                                      | Target length of each video (default 45)                    |
| `--video <n\|all>`  | `script`, `images`, `voice`, `render`, `preview`, `publish`, `bundle` | Which video to work on (default all; preview defaults to 1) |
| `--format <name>`   | `render`, `make`                                                      | `vertical`, `landscape`, or `both` (default `vertical`)     |
| `--no-voice`        | `make`                                                                | Skip the voice-over; captions are timed from the text       |
| `--voice <id>`      | `voice`, `make`                                                       | ElevenLabs voice to record with, saved as the video's voice |
| `--platform <name>` | `bundle`                                                              | `tiktok`, `shorts`, `reels`, or `youtube` (default all)     |
| `--cover <n>`       | `publish`                                                             | Scene to use as the cover image (default: the title scene)  |
| `--force`           | `script`, `publish`                                                   | Rewrite scripts or publish kits that already exist          |

## Scene types

A video is a list of scenes. Each scene has `narration` (what the voice says), an optional `emoji`, and fields for its template.

| Type         | Shows                                               | Fields                                                               |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------------- |
| `title`      | The opening hook                                    | `heading`, `subheading?`                                             |
| `statement`  | One big idea, revealed word by word                 | `text`, `highlight?` (words to color)                                |
| `list`       | A heading and items that appear one by one          | `heading`, `items`, `style?` (`bullets`, `numbered`, `checks`)       |
| `stat`       | A number that counts up                             | `value` (e.g. `"73%"`), `label`, `source?`                           |
| `chart`      | Bars or a line that grow in as each value is said   | `heading`, `points` (`label`, `value`), `unit?`, `style?`, `source?` |
| `quote`      | A quote with its author                             | `quote`, `author?`                                                   |
| `comparison` | Two sides, such as myth vs. fact                    | `heading?`, `left`, `right` (each `label` + `points`)                |
| `code`       | Syntax-highlighted code that builds up step by step | `language`, `fileName?`, `steps` (`code`, `highlight?`)              |
| `image`      | A photo or illustration with a slow camera move     | `alt`, `src?`, `caption?`, `credit?`, `layout?`, `motion?`           |
| `diagram`    | Icons joined by arrows as a flow, cycle, or hub     | `heading?`, `layout?`, `nodes` (`label`, `icon?`, `cue?`)            |
| `cta`        | The closing call to action                          | `heading`, `action`                                                  |

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

An image scene's picture comes from one of three places, and the editor lets you switch between them:

- **Stock photos** from [Openverse](https://openverse.org), openly licensed for commercial use and changes, with no key needed. Set `PEXELS_API_KEY` to search [Pexels](https://www.pexels.com/api/) instead. The creator and license are credited on the image.
- **AI illustrations** from OpenAI's image model, when `OPENAI_API_KEY` is set. Claude marks scenes that a photo can't show, such as the inside of a cell, as illustrations.
- **Your own upload**: JPEG, PNG, or WebP.

Images are saved next to the voice-overs in `public/content/`. Until a scene has one, it shows a placeholder with its description. Diagram icons come from a set of about 130 [Lucide](https://lucide.dev) icons listed in [`src/lib/icon-names.ts`](src/lib/icon-names.ts).

Background music is set in the editor's Music setting: pick one of the bundled beds (calm, upbeat, curious) or upload your own track, and set its volume. The script step also picks a bed to suit each video. In a spec it looks like `"music": { "src": "music/calm.wav", "volume": 0.15 }`; `src` is any path under `public/`. The beds in [`public/music/`](public/music/README.md) are CC0 and synthesized by `npm run music`. The music fades in and out and dips under the narration.

## Examples and templates

`npm run dev` opens Remotion Studio with two hand-written examples in `src/examples/`: a science explainer that uses most scene types, and a coding explainer. Use them to preview template changes.

## Customizing your brand

Each project has a **brand kit**, set up from the project page: your name, handle, and website, and a theme. Claude writes scripts with your name and handle in mind, the closing call to action shows your handle and website, and every new video starts with the kit's theme. Changing the name, handle, or website updates every video in the project; existing videos keep their own theme.

A **theme** is one of five presets, each checked to meet [WCAG AA](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) contrast for text on its background:

| Preset       | Look                                       | Font                  |
| ------------ | ------------------------------------------ | --------------------- |
| `midnight`   | Dark navy with a violet glow (the default) | Inter                 |
| `paper`      | Bright and clean, like a printed page      | Poppins               |
| `ember`      | Warm browns with a glowing orange          | Playfair Display      |
| `chalkboard` | Classroom green with chalk yellow          | Nunito                |
| `contrast`   | Black, white, and yellow, for easy reading | Atkinson Hyperlegible |

In the editor's Theme setting, pick a preset, or open "Customize colors and font" to change the accent, background, and text colors and the font. Colors worked out from yours, such as secondary text and cards, adjust to stay readable, and the editor warns you if a color you picked is hard to read. In a spec it looks like this; leave `theme` out for the default look:

```json
"theme": { "preset": "chalkboard", "accent": "#22C55E", "font": "poppins" },
"brand": { "name": "Ms. Rivera", "handle": "@msrivera", "website": "rivera.edu" }
```

Fonts are `inter`, `poppins`, `nunito`, `montserrat`, `playfair-display`, and `atkinson-hyperlegible`, loaded from Google Fonts as a video needs them.

| File                   | What it controls                                                |
| ---------------------- | --------------------------------------------------------------- |
| `src/brand.ts`         | The name, handle, and website for projects without a brand kit  |
| `src/theme/presets.ts` | The theme presets, their colors and fonts, and the font choices |
| `src/theme/resolve.ts` | How a theme's overrides are applied, and the contrast checks    |
| `src/theme/fonts.ts`   | Loading fonts from Google Fonts                                 |
| `.env`                 | AI provider and model, ElevenLabs voice, and ElevenLabs model   |

## Voices

Each project can have its own narrator. In the project's brand kit, search your ElevenLabs voices by name, accent, gender, or age, play a sample of each, and pick one. Sliders tune how it sounds:

| Setting      | Range      | What it does                                               |
| ------------ | ---------- | ---------------------------------------------------------- |
| `stability`  | 0 to 1     | Lower sounds more expressive; higher sounds steadier (0.5) |
| `similarity` | 0 to 1     | How closely it sticks to the original speaker (0.75)       |
| `style`      | 0 to 1     | Exaggerates the speaker's style; 0 is the most natural (0) |
| `speed`      | 0.7 to 1.2 | 1 is normal speed (1)                                      |

Settings you don't touch use ElevenLabs' defaults, shown in brackets. A video can pick a different voice in the editor's Voice setting, which also shows which scenes the next recording will redo. The voice used is the first one set of:

1. `--voice <id>` on the command line (it's then saved as the video's voice)
2. The video's own voice
3. The project's brand kit voice
4. `ELEVENLABS_VOICE_ID` in `.env`
5. George, one of ElevenLabs' default voices

A video's voice is used whole: it doesn't borrow the project's settings. In a spec or plan file it looks like this; `name` is only for display:

```json
"voice": { "voiceId": "JBFqnCBsd6RMkjVDRZzb", "name": "George", "settings": { "speed": 0.95, "stability": 0.6 } }
```

The voice and its settings are part of each scene's recording, so changing them re-records those scenes the next time you click Record voice or run `voice`; projects without a voice keep their existing recordings. Without an ElevenLabs key the voice list can't load, but you can still paste a voice ID from the [voice library](https://elevenlabs.io/app/voice-library).

### Recording your own voice

No ElevenLabs key? Read the narration yourself. It's free, and it's your own voice.

1. Open a video in the editor and pick a scene.
2. Under **Voice-over**, click **Record my voice** and allow the microphone when the browser asks.
3. A 3-second countdown gives you time to get ready, with a level meter so you can check the microphone picks you up. The narration is shown while you record.
4. Click **Stop** when you're done. The recording is saved with the video, and **Play** lets you hear it back. **Re-record** replaces it; **Remove** deletes it from the scene.

Tips: record somewhere quiet, keep the microphone at the same distance, and leave a moment of silence before you start and after you finish. The studio trims that silence, evens out the volume, and saves an MP3 in the video's media folder (browsers record WebM, which is converted with the ffmpeg that comes with Remotion, so there's nothing else to install).

Captions still work: without speech-to-text, the narration's words are spread over the part of the recording where you're speaking, with longer words getting more time and a short pause at each full stop or comma. They line up best when you read the narration as written, at an even pace.

Your recordings are never replaced by **Record voice**: it only records the scenes that don't have your voice, so you can mix your voice and ElevenLabs in one video. If you change a scene's narration after recording it, the scene is marked **Re-record needed** (in the scene list too) so the voice-over and captions match again. Remove the recording to let ElevenLabs voice that scene instead.

## Publishing

A video's publish kit is everything you need to post it: for each platform, a title (where the platform has one), the post text, a call to action, and hashtags, plus a cover image. Claude writes all four platforms in one call, in the plan's tone and language, from the video's narration and the plan's audience, pillar, hook, and call to action. It's saved as `publish.json` next to the video's `spec.json`, so you can edit it in the studio or by hand, and regenerate it whenever you like.

| Platform        | Render    | Title | Post text (with hashtags) | Hashtags |
| --------------- | --------- | ----- | ------------------------- | -------- |
| TikTok          | Vertical  | None  | 2,200 characters          | 3-5      |
| YouTube Shorts  | Vertical  | 100   | 5,000 characters          | 3-5      |
| Instagram Reels | Vertical  | None  | 2,200 characters          | 3-5      |
| YouTube         | Landscape | 100   | 5,000 characters          | 3-8      |

The limits come from each platform's own documentation, checked in October 2026. TikTok's app allows 4,000 characters, but its posting API and most schedulers take 2,200, so we stay under that. Instagram allows at most 5 hashtags per post since December 2025, and YouTube doesn't allow `<` or `>` in titles or descriptions. Characters are counted the way the platforms count them, so an emoji counts as 2. The limits live in `src/lib/publish.ts` if they change.

Generated posts are trimmed to fit, and hashtags are tidied up: a `#`, no spaces or punctuation, multi-word tags in CamelCase (`#SkyColour`), and no repeats. In the studio, a tab with a warning dot needs attention, for example a post that's too long after editing.

The cover is one frame of a scene, without captions, exported as a PNG for each format (vertical for TikTok, Shorts, and Reels; landscape for YouTube) to `out/<plan>/<video>-<format>-cover.png`. It defaults to the title scene; pick another in the Publish panel or with `--cover <n>`.

```json
{
  "version": 1,
  "coverScene": 0,
  "generatedAt": "2026-10-19T10:00:00.000Z",
  "posts": {
    "tiktok": {
      "title": null,
      "text": "Why is the sky blue and not violet?",
      "callToAction": "Follow for part 2.",
      "hashtags": ["#Science", "#Physics", "#LearnOnTikTok"]
    },
    "shorts": {
      "title": "Why is the sky blue?",
      "text": "...",
      "callToAction": "...",
      "hashtags": ["..."]
    },
    "reels": {
      "title": null,
      "text": "...",
      "callToAction": "...",
      "hashtags": ["..."]
    },
    "youtube": {
      "title": "...",
      "text": "...",
      "callToAction": "...",
      "hashtags": ["..."]
    }
  }
}
```

### Caption files

Captions are drawn on the video, but platforms also take caption files that viewers can switch on and search can read. Rendering a video, or downloading a bundle, writes them next to the render: `out/<plan>/<video>-<format>.srt` (SubRip, which YouTube takes) and `.vtt` (WebVTT, the web standard). They use the same pages of words, shown for the same time, as the captions on screen: 3 words at a time on vertical videos and 6 on landscape ones, with times counted from the start of the whole video. Scenes without a voice-over yet get the same estimated timings the on-screen captions use, so every scene is captioned. Re-render after changing the script so the files and the video still match.

### Download for posting

A bundle is one zip per platform with everything you need to post there:

| File                            | What it is                                                                |
| ------------------------------- | ------------------------------------------------------------------------- |
| `<video>-<format>.mp4`          | The render: vertical for TikTok, Shorts, and Reels; landscape for YouTube |
| `<video>-<format>-cover.png`    | The cover image                                                           |
| `post.txt`                      | The title (YouTube and Shorts) and the full post, ready to paste          |
| `<video>-<format>.srt` / `.vtt` | Caption files                                                             |
| `README.txt`                    | What's inside, and how to make anything that's missing                    |

Anything not made yet (say, the landscape render) is left out and listed in `README.txt` with the command or studio panel that makes it. Download a bundle from the Publish panel (each platform's tab has its own button, and warns you first about what's missing), or build them all with `npm run pipeline -- bundle <plan>`, which saves them to `out/<plan>/<video>-<platform>.zip`. Bundles need no API keys.

## Project structure

```
app/                      # The web studio (Next.js)
├── page.tsx              # Home: new project and project list
├── projects/             # Project overview and video editor pages
├── actions.ts            # Server actions the UI calls
└── _components/          # UI components, including the editor
studio/server/            # Studio server code: projects, render jobs, key status
pipeline/                 # The idea → video pipeline (runs in Node)
├── cli.ts                # Commands: plan, script, preview, voice, voices, render, publish, bundle, make, list
├── prompts.ts            # Instructions given to Claude
├── schemas.ts            # The plan and script formats Claude must return
├── plan.ts / script.ts   # Claude steps
├── publish.ts            # Publish kits: post text and hashtags per platform
├── bundle.ts             # Caption files and zips for posting, one per platform
├── zip.ts                # A small zip writer, so bundles need no dependency
├── voice.ts              # ElevenLabs voice-over and word timings
├── recording.ts          # Your own recordings: converted to MP3, trimmed, timed
├── voices.ts             # Lists the ElevenLabs account's voices
├── render.ts             # Renders with Remotion, reporting progress
├── render-worker.ts      # Runs one render in its own process, for the studio
└── store.ts              # Where plans, specs, and media are saved
src/                      # The Remotion video app
├── spec/schema.ts        # The video spec format (zod)
├── compositions/         # ExplainerVideo: scenes, audio, captions, timing
├── scenes/               # One component per scene type
├── components/           # Captions, code blocks, kinetic text, backgrounds
├── examples/             # Hand-written example videos
├── lib/                  # Timing, captions, highlighting, layout helpers
└── theme/                # Theme presets, fonts, and the useTheme() hook
content/                  # Generated plans and specs (git-ignored)
public/content/           # Generated voice-overs (git-ignored)
out/                      # Renders, covers, caption files, and bundles (git-ignored)
```

## Scripts

| Command                         | Description                            |
| ------------------------------- | -------------------------------------- |
| `npm run studio`                | Open the web studio on port 3100       |
| `npm run pipeline -- <command>` | Run the idea → video pipeline          |
| `npm run dev`                   | Open Remotion Studio with the examples |
| `npm run render -- <id>`        | Render a composition directly          |
| `npm test`                      | Run the unit tests                     |
| `npm run check`                 | Type-check and lint                    |
| `npm run format`                | Format the code with Prettier          |

## Roadmap

| Stage                                      | Goal                                               | Highlights                                                                                                                                           |
| ------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Pipeline and local studio** (current) | Idea to finished video, in the browser or terminal | Content plans, scripts, 11 scene types with stock and AI images and diagrams, themes and brand kits, voice-over, captions, live editor, local export |
| **2. Richer visuals**                      | Videos that look less templated                    | Stock and AI images, icons, charts, more transitions, background music library                                                                       |
| **3. Hosted studio**                       | Anyone can use it without installing anything      | Accounts, cloud rendering, sharing                                                                                                                   |
| **4. Publishing**                          | From plan to posted                                | Captions and hashtags per platform (done), caption files and download-for-posting bundles (done), scheduling, performance tracking                   |

## Costs

Each video calls the Claude API once to write the script and once for its publish kit, plus once per plan, and ElevenLabs once per scene (none for scenes you record yourself). Check current [Claude](https://platform.claude.com/docs/en/about-claude/pricing) and [ElevenLabs](https://elevenlabs.io/pricing) pricing. Rendering runs on your machine and is free.

## Author

**Rithy Bondeth**, Full Stack Developer & AI Engineer

[![Portfolio](https://img.shields.io/badge/Portfolio-0A0A0A?style=for-the-badge&logo=vercel&logoColor=white)](https://bondeth.dev)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RithyBondeth)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rithy-bondeth-484073282/)

## License

The code in this repository is distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

This project depends on [Remotion](https://www.remotion.dev/), which has its own license: it is free for individuals and small companies, while larger companies need a company license, and offering video rendering to others as a service also requires one. Check [Remotion's license terms](https://www.remotion.dev/license) before using this project commercially.
