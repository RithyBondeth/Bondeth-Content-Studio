# Fonts

The theme fonts and the code font, bundled so renders never fetch them from
the network. Each file is the Latin subset of one weight, taken from
[Fontsource](https://fontsource.org) 5.3.0 (`files/<font>-latin-<weight>-normal.woff2`).
[`src/theme/fonts.ts`](../../src/theme/fonts.ts) loads them.

| Font                  | Weights       | Copyright                                 |
| --------------------- | ------------- | ----------------------------------------- |
| Inter                 | 400, 600, 800 | 2016 The Inter Project Authors            |
| Poppins               | 400, 600, 800 | 2020 The Poppins Project Authors          |
| Nunito                | 400, 600, 800 | 2014 The Nunito Project Authors           |
| Montserrat            | 400, 600, 800 | 2011 The Montserrat Project Authors       |
| Playfair Display      | 400, 600, 800 | 2017 The Playfair Display Project Authors |
| Atkinson Hyperlegible | 400, 700      | 2020 Braille Institute of America, Inc.   |
| JetBrains Mono        | 400, 600      | 2020 The JetBrains Mono Project Authors   |

All are licensed under the [SIL Open Font License 1.1](OFL.txt).

To add a weight, copy its file from the font's `@fontsource/<font>` package
into this folder as `<font>-<weight>.woff2` and add the weight in
`src/theme/fonts.ts`.
