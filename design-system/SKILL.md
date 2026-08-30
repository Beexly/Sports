---
name: pickpilot-design
description: Use this skill to generate well-branded interfaces and assets for Galaxy Sports Edge, a cinematic sports intelligence platform. Contains essential design guidelines, the plasma/ion-blue/ultraviolet palette (no gold), type system, Syne / Big Shoulders / Geist / Instrument Serif fonts, reticle logo assets, and a web UI kit for prototyping. Use for production code, mocks, prototypes, slides, or any artifact carrying the Galaxy Sports Edge brand.
user-invocable: true
---

# Galaxy Sports Edge Design Skill

Galaxy Sports Edge is a **cinematic operating system for probabilistic thinking** — a sports-intelligence platform built around perspective, not picks. The visual identity is layered carbon environment + plasma-magenta primary + ion-blue secondary + ultraviolet depth, with brutalist/editorial type (Syne + Big Shoulders + Instrument Serif Italic) and a reticle wordmark. It is explicitly **not** a casino, sportsbook, or generic dark-mode betting product. **No gold or amber** — those introduce casino/transactional psychology we reject.

## How to use this skill

1. Read `README.md` for the full brand bible (voice, content fundamentals, visual foundations, iconography, what to avoid).
2. Read `colors_and_type.css` for canonical tokens (colors, type, spacing, radii, motion, glows). All artifacts MUST import this file.
3. Browse `preview/sys-*.html` for visual specimens of every token in use (palette, type, components).
4. Browse `preview/01-manifesto.html`, `02-identity.html`, etc. for cinematic pitch-board reference.
5. Copy components or patterns from `ui_kits/web/` (nav, pick cards, pricing tiers, hero, slate bar, etc.) into new artifacts.

## When creating visual artifacts (slides, mocks, throwaway prototypes)

- Copy `colors_and_type.css` into your HTML directory (or use a relative import) and load it first.
- Copy any logos you reference from `assets/`.
- Lean on the type system: `--f-arch` for architectural headlines, `--f-display` for product titles, `--f-numerals` for any data, `--f-editorial` italic for rare emotional contrast.
- Keep the **trio rule**: max 3 accents per composition (plasma, ion-blue, ultraviolet). Lime and cyan are *rare* accents — only for "live tick" and "telemetry tick" data points. **Gold/amber is forbidden.**
- Backgrounds: layered carbon environment via volumetric radial gradients + `linear-gradient` between `--void`, `--obsidian`, `--carbon`, `--eclipse`. Never flat black.
- Voice: calm, factual, slightly cinematic. Numbers are heroes. Hype is the enemy. See README "Content fundamentals" for full rules.

## When working on production code

- The source product is a Next.js 14 / Tailwind monorepo (see `README.md` → Sources).
- Lift `colors_and_type.css` tokens into Tailwind theme config or import as a CSS module.
- The reticle mark in `assets/logo-mark.svg` uses `currentColor` — tint with any palette color.
- Lucide is the icon set. 1.5px stroke, current-color, 20–24px box.

## If invoked with no other guidance

Ask the user what they want to build (slide, prototype, marketing surface, in-product screen, etc.), how many variations they want, and whether they want it leaning more **terminal-precise** (data dense) or **cinematic-editorial** (hero-led). Then act as an expert designer who outputs HTML or production code matching the existing system.

## Hard rules (never violate)

- ❌ No gold, amber, or yellow as primary or secondary — casino energy.
- ❌ No flat black backgrounds. Always layered carbon environment.
- ❌ No emoji in product UI. Unicode data glyphs only (↑ ↓ − · →).
- ❌ No "lock of the day," "guaranteed," "hammer," "smash," 🔥 — ever.
- ❌ No bluish-purple SaaS gradients, neon casino energy, esports/gamer aesthetic.
- ❌ Lime is **not** the primary brand color — plasma magenta is. Lime is a rare live-tick accent only.
- ✅ Every accent must communicate intelligence state (confidence, risk, movement, depth) — never decoration.
- ✅ Big architectural type. Tabular numerals on all data. Borders + glow over drop shadows.
