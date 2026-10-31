# Higgsfield asset log

**Starting workspace balance observed:** 7.4 credits.  
**Completed Soul jobs:** five.  
**Final shipping set:** four reviewed derivatives from two Soul source generations, plus four deterministic designed fallbacks.  
**Motion:** deterministic six-second FFmpeg edit from the approved assets and browser-typeset story card; no Higgsfield video job was submitted.

Every generation prompt specified an analog medium, exact palette `#08090C #EDE8E0 #FF4D2E #C4BFB6`, a real 1970s sports-magazine / 1990s newspaper tradition, and explicit bans on purple/indigo, gradients, glossy 3D, floating objects, glass, glowing orbs, synthetic cinematic lighting, commercial stock polish, text, logos, and watermarks. Full verbatim prompts are preserved in `scripts/generate_assets.ps1` and `scripts/generate_rescues.ps1`.

## Outcome register

| Requested asset | Job / model | Outcome and anti-slop decision |
|---|---|---|
| hero-sideline | `3a766422-3dac-442a-b10f-dcd4293d1df0` / Soul 2.0 | Original rejected: floating spheres, border pseudo-text, purple cast. A lower-field crop is approved after those regions are removed and the image is converted to a neutral contact print. |
| field-chalk | `dbfe6fd4-4179-4eba-ba85-8589bcb7488d` / Soul 2.0 | Original rejected: floating spheres and large pseudo-numerals. The shipped field-chalk image instead uses a second crop of the approved sideline source above. |
| stats-desk | Soul 2.0 | `grace_daily_limit_reached`; no image returned. Deterministic desk fallback used. |
| empty-grandstand | Soul 2.0 | `grace_daily_limit_reached`; no image returned. Deterministic grandstand fallback used. |
| chain-marker-portrait | Soul 2.0 | `grace_daily_limit_reached`; no image returned. Deterministic field fallback used. |
| football-seams-portrait | `7470705c-1bb3-4015-9821-ba3d741aa222` / Soul 2.0 | Original rejected: floating spheres and a pseudo-logo. A laces-only crop is approved and recomposed with dark negative space and one ember rule. |
| contact-sheet-square | `a32d227d-0afc-47e1-b825-911f86292b39` / Soul 2.0 | Original rejected: pseudo-text, floating spheres, blue cast. The shipped square instead uses a crop of the approved sideline source. |
| paper-grain-square | `50bbd3e4-2cfb-4564-900a-bd65d7fc05eb` / Soul 2.0 | Original rejected: large pseudo-logo and gibberish type. Deterministic risograph stock used. |
| hero-sideline-z rescue | `z_image` | `grace_daily_limit_reached`; no image returned. |
| hero-sideline-cinema rescue | `soul_cinematic` | `grace_daily_limit_reached`; no image returned. |

## Approved transformations

- `hero-sideline.webp`: source crop `(36,390) → (1960,1088)`, grayscale autocontrast, ground/bone contact-print tone.
- `field-chalk.webp`: alternate source crop `(540,510) → (1740,1088)`, same neutral treatment.
- `contact-sheet-square.webp`: square source crop, same neutral treatment.
- `football-seams-portrait.webp`: laces-only crop `(40,1510) → (1080,1880)`, neutral treatment, dark portrait recomposition and one ember rule.

All four derivatives were re-opened and visually inspected after processing. They contain no text, logos, floating objects, purple/indigo content, glossy 3D, or synthetic lighting. The original rejected PNGs remain quarantined and are not referenced by the website or any export.

## Why the final assets pass

The final imagery is materially specific—chalk, turf, leather, laces, and print stock—rather than a stylized sports fantasy. Cropping is treated as editorial judgment, not a way to hide defects: only regions that are clean after cropping ship. All meaningful words and numbers are rendered separately in the browser with Big Shoulders and IBM Plex Sans, preserving accuracy and tabular alignment.
