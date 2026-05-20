# Fonts

PickPilot uses four typefaces, all available on **Google Fonts**:

| Role | Family | Weights used |
|---|---|---|
| Display | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | 400, 500, 600, 700 |
| Editorial | [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) | 400 (Roman + Italic) |
| Body / UI | [Geist](https://fonts.google.com/specimen/Geist) | 300, 400, 500, 600, 700 |
| Mono (numerals) | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | 400, 500, 600, 700 |

## Loading

The fonts are loaded via `@import` at the top of `colors_and_type.css`. No additional setup required for HTML artifacts.

If you need to self-host (production builds), grab the .woff2 files for each family from:

- https://fonts.google.com/specimen/Space+Grotesk
- https://fonts.google.com/specimen/Instrument+Serif
- https://fonts.google.com/specimen/Geist
- https://fonts.google.com/specimen/JetBrains+Mono

Drop them into this folder as e.g. `space-grotesk-700.woff2` and replace the `@import` with `@font-face` declarations referencing the local files.

## ⚠️ Flagged for user review

These are CDN-loaded by default. If you have proprietary or licensed brand fonts you'd like to use instead, send them and I'll wire them in.
