# UI kit · Web

A faithful recreation of the Galaxy Sports Edge web product surface, built to demonstrate the design system in product context.

## Files

| File | What it is |
|---|---|
| `index.html` | The composed product page — nav, hero, slate bar, pick grid, methodology, pricing, footer |
| `kit.css` | All component styles. Imports `colors_and_type.css` and composes nav, buttons, pick cards, tiers, slate bar, footer |

This is **not** production code — it's a cosmetic, accessible recreation of the real Next.js app's IA. Lift the patterns into your real components.

## Key components shown

- **Nav** · sticky, plasma-tinted live chip, reticle wordmark, active-route underline glow
- **Hero** · architectural display type, orbital SVG stage, atmospheric environment, stats foot
- **Slate bar** · today's slate counter strip (mono, tabular)
- **Pick card** · the signature surface — three variants (Elite plasma, Strong amber, Locked muted)
- **Methodology grid** · 3-step explanation with iconography
- **Responsible Intelligence callout** · ultraviolet rule, built into the surface (not afterthought)
- **Pricing** · three tiers (Free / Pro / Elite) with plasma+amber accent treatment
- **Footer** · branded, with disclaimer pattern

## Patterns to lift

- The pick card grid (`.picks-grid` → `.pick`) is the central product surface — every pick lives in this shape.
- The hero's `<h1>` + italic editorial `<em>` is the canonical brand headline treatment.
- The slate bar pattern works anywhere — performance pages, daily summaries, dashboards.
- The `.resp` callout is the standard treatment for responsible-play language. Don't bury it in fine print.
