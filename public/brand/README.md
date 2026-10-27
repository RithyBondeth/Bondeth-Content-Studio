# Bondeth Studio logo

The mark is a 5×5 grid of content blocks. The lit ones form a play button: small pieces of an idea, put together into a video.

| File                       | Use                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `logo.svg`                 | Mark and wordmark, for light backgrounds                                                    |
| `logo-on-dark.svg`         | Mark and wordmark, for dark backgrounds                                                     |
| `mark.svg`                 | The mark on its own                                                                         |
| `mark-animated.svg`        | The mark with the blocks lighting up one by one (CSS animation, still under reduced motion) |
| `../../app/icon.svg`       | Favicon. Same mark, with the blocks snapped to whole pixels at 16px and 32px                |
| `../../app/apple-icon.png` | 180×180 home-screen icon (square; iOS rounds the corners)                                   |

In the studio, the header draws the logo inline from `app/_components/BrandLogo.tsx`, so the wordmark follows the light or dark appearance. The block animation's CSS is in `app/globals.css`.

The wordmark is hand-drawn monoline lettering, stored as SVG strokes, so it doesn't need a font to load.

## Colours

The studio UI uses the same LinkedIn-style blues (see the tokens in `app/globals.css`).

| Colour    | Hex       | Where                                                                     |
| --------- | --------- | ------------------------------------------------------------------------- |
| Blue      | `#0A66C2` | The mark's tile; "studio" on light backgrounds; the UI accent             |
| Sky       | `#70B5F9` | "studio" on dark backgrounds                                              |
| Deep blue | `#004182` | Hover and pressed states on light backgrounds                             |
| Ink       | `#191919` | "bondeth" on light backgrounds                                            |
| White     | `#FFFFFF` | The lit blocks (unlit ones at 20% opacity); "bondeth" on dark backgrounds |
