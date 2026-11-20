---
name: pickpilot-design
description: Brand & UI visual guidelines for Galaxy Sports Edge (layered carbon surfaces, plasma/ion-blue/ultraviolet accents, typography, no gold or hype).
---

# Galaxy Sports Edge Design Skill

Galaxy Sports Edge (`apps/web/`, Next.js 14 + Tailwind CSS) is a probabilistic sports intelligence platform. Its visual language pairs layered carbon surfaces (`void`, `obsidian`, `carbon`, `eclipse` in `apps/web/tailwind.config.ts` / `apps/web/app/globals.css`) with plasma-magenta primary, ion-blue secondary, ultraviolet depth, and tabular-numeral typography (`Syne`, `Big Shoulders`, `Geist`, `Instrument Serif`).

## Palette & Typography Rules
- Inspect live CSS/Tailwind tokens directly in `apps/web/app/globals.css`, `apps/web/tailwind.config.ts`, and existing `apps/web/components/` primitives before styling new UI.
- Enforce the 3-accent trio rule (plasma, ion-blue, ultraviolet); reserve lime/cyan strictly for live telemetry ticks.
- **No gold, amber, or yellow casino palettes**, no flat `#000000` backgrounds without surface layering, and no neon bluish-purple generic gradients.
- Use Lucide icons (`1.5px` stroke, `currentColor`) and tabular numerals (`tabular-nums`) on all probabilities, records, and pricing.

## Public Copy & Brand Safety Rules
- Never emit emojis in product UI (use clean Unicode glyphs `·`, `->` only where appropriate).
- Never emit em-dashes (`\u2014`) or en-dashes (`\u2013`) in public-facing `.tsx` UI copy (guarded by `em-dash-public-copy.test.ts` and `scripts/guardrails/em-dash-scan.mjs`).
- Never use tout/hype phrasing ("lock of the day", "guaranteed", "hammer", "smash") or raw percentage confidence (`XX/100` integer only).

## Verification & Done
```powershell
npm run lint:brand
npx vitest run --minWorkers=1 --maxWorkers=2 --root apps/web __tests__/brand-safety-v2.test.ts __tests__/em-dash-public-copy.test.ts
```
Done when `npm run lint:brand` and public brand-safety Vitest checks exit `0`.
