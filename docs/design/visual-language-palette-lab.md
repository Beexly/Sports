# Sports OS — Visual Language Palette Lab

**Status**: Doctrine only. Design reference for operator and Codex. No new dependencies.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `DESIGN.md` — authoritative machine-readable design tokens
- `apps/web/styles/design-tokens.css` — CSS custom properties (source of truth)
- `apps/web/lib/brand.ts` — brand constants
- `docs/design/design-md-spec.md` — how DESIGN.md is maintained

---

## Purpose

The Palette Lab is a reference document for how the Galaxy Sports Edge visual
language is applied in practice — not just what the values are (that is
`DESIGN.md`'s job), but how the palette is used, layered, and combined to
produce the specific visual character of the platform.

It answers the questions that DESIGN.md's token list cannot:
- Why is `--plasma` used sparingly?
- How do you layer glows without it looking cheap?
- What makes a surface feel like Mission Control vs. a sports betting app?
- When does data ink become visual noise?

This document is for designers, operators building Figma mockups, and
agents translating design into component code.

---

## The Character This Palette Produces

The Galaxy Sports Edge visual language should feel like:

> The Bloomberg Terminal made beautiful, operated by someone who understands
> both sports and markets — not a fan, not a bettor, but an analyst.

The visual cues that create this character:

- **Dark base, no glow by default** — darkness implies seriousness; glow is
  earned by data significance, not decoration
- **Minimal color, maximum meaning** — three accent colors, each with a role;
  using all three at once is almost always wrong
- **Type as data** — monospace for numbers, not for style; proportional for prose
- **Asymmetric layouts** — data panels don't need to be symmetric; intelligence
  is not decorative

---

## Color Role Map

The following describes what each color in the system communicates and when
it should appear:

### `--plasma: #FF2DD6` — The Primary Accent

**What it communicates**: Primary action, current selection, live signal,
the brand identity in its most concentrated form.

**When to use**:
- The primary CTA button (one per screen maximum)
- The active state of a navigation item
- The selected pick tier badge (when picked for the day)
- The "new" indicator on a signal that just arrived

**When NOT to use**:
- Multiple elements on the same screen (plasma competes with itself)
- Warning or error states (it will be confused with an alert)
- Data visualization lines (use `--orbital-cyan` for data)
- Background fills (plasma on a dark background is aggressive at scale)

**Quantity rule**: If plasma appears more than twice on a screen, it is overused.

---

### `--orbital-cyan: #00E5FF` — The Data Signal

**What it communicates**: Live data, market movement, odds context, the
"intelligence is flowing" state.

**When to use**:
- Odds and line data display
- The Signal Ticker (scrolling market intelligence)
- Market Gravity Meter readings
- Sparkline chart lines showing momentum
- "Last updated" timestamp indicators when data is fresh

**When NOT to use**:
- Primary CTA buttons (that is plasma's role)
- Win/loss settlement states (use green/red only in tier-gated private views)
- Text body copy (too bright for extended reading)

**Quantity rule**: Orbital cyan can appear more liberally than plasma — data
is the product — but never as a background fill on large surfaces.

---

### `--ultraviolet: #7A5CFF` — The Intelligence Layer

**What it communicates**: AI-derived analysis, model output, confidence scoring,
anything that represents the system's reasoning rather than raw data.

**When to use**:
- The confidence score badge
- Brain answer cards (AI-generated content)
- Model Journal entries
- Pre-mortem analysis panels
- Intelligence graph node labels

**When NOT to use**:
- Raw data displays (that is orbital-cyan's role)
- Action buttons (use plasma)
- Warning states

**Quantity rule**: Ultraviolet should appear less often than orbital-cyan and
roughly equally with plasma. It marks the interpreted layer above raw data.

---

### `--carbon: #0D1117` — Page Background

**What it communicates**: The void behind intelligence. The information
has not yet arrived.

**Use**: Exclusively as the page/canvas background. Never use carbon as a
card or panel background — that is `--eclipse`'s role.

**Rule**: Carbon is the base. Nothing decorative lives at the carbon level.
Content starts at the eclipse level.

---

### `--eclipse: #11161F` — Card Surface

**What it communicates**: A bounded intelligence surface. Data lives here.

**Use**: All card backgrounds, panel backgrounds, cockpit surface backgrounds.
The difference between carbon and eclipse is subtle (about 6 lightness units
in HSL) — this subtlety is intentional. The panels should feel like they
emerge from the background, not sit on top of it.

**Layering rule**: eclipse on carbon → element on eclipse → data on element.
Do not skip layers (a data element floating directly on carbon with no eclipse
surface beneath it reads as unanchored).

---

### `--ash: #8B95A3` — Secondary Text

**What it communicates**: Supporting information. Present but not competing.

**Use**: Timestamps, source attribution labels, secondary navigation labels,
empty state body copy, metadata.

**Rule**: Body text for primary content should be `--silver: #E2E8F0` or white.
Ash is for de-emphasized context. Using ash for primary text makes the
interface look inactive.

---

## Glow and Shadow Doctrine

Glows are the most misused element in dark-mode design. The Sports OS rule:

**A glow is earned by data significance, not applied for decoration.**

| When a glow is appropriate | When a glow is inappropriate |
|---|---|
| A confidence score ≥85 (high conviction) | Decorative card hover states |
| A live odds movement alert | A static card with no new information |
| A new T1 signal arriving in the ticker | A navigation item that has no unseen content |
| The primary CTA on a conversion screen | Body text |

**Glow implementation rule**: Use `box-shadow` with low spread and appropriate
color at 20–40% opacity. Never use `text-shadow` on data values — it obscures
precision. The `--glow-plasma` and `--glow-cyan` shadow tokens in `DESIGN.md`
are pre-calibrated; use them as-is before inventing new glow values.

---

## Surface Depth Layering

```
Layer 0: --carbon          (page canvas)
Layer 1: --eclipse         (primary card)
Layer 2: eclipse + 4% white (nested panel within a card)
Layer 3: eclipse + 8% white (active/selected state within a nested panel)
```

This three-step hierarchy is sufficient for all currently designed surfaces.
Do not add a fourth depth layer — it signals the UI is too nested and the
component should be split.

---

## Typography Pairing Rules

| Surface | Headline | Body | Data |
|---|---|---|---|
| Public pick card | `Syne` / `Big Shoulders Display` compressed | `Inter` 400 | `JetBrains Mono` |
| Cockpit panel | `Space Grotesk` | `Inter` 400 | `JetBrains Mono` |
| Galaxy Almanac essay | `Instrument Serif` | `Inter` 400 | `Space Grotesk` |
| Signal Ticker | — | — | `JetBrains Mono` 500 |
| Error / empty state | `Space Grotesk` | `Inter` 400 | — |

**Rule**: JetBrains Mono is for numerical and data output. Using it for prose
copy signals to the reader that the content is more technical than it is.
Using `Instrument Serif` outside the Almanac surface breaks the editorial tone.

---

## What Not to Build

The following visual patterns are explicitly off-brand and should be flagged
in any design review:

| Pattern | Why it's off-brand |
|---|---|
| Sportsbook-green backgrounds or accents | Implies gambling, not intelligence |
| Lock emoji or padlock in pick cards | Implies guaranteed outcome |
| Fire/flame emoji or hot-streak counters | Tout-adjacent visual language |
| Glassmorphism with colored blur | Cheap, decorative, undermines data clarity |
| Animated confidence score counting up | Implies the score is being calculated in real time; misleading |
| Dense crypto-dashboard layouts | Visual noise; intelligence should be sparse |
| Win/loss celebration imagery without settlement | Premature; factually ungrounded |
| Neon-on-black retro aesthetics | Nostalgia signal; wrong category |
| Generic stat-card grid | Looks like any SaaS product, not a differentiated intelligence platform |
| Red/green at full saturation in public views | Casino associations; use muted semantic variants |

---

## Design Review Checklist

Before any new component or screen enters the codebase, the operator or
agent should verify:

- [ ] Only `DESIGN.md` colors are used (no hardcoded hex values)
- [ ] Plasma appears ≤2 times on the screen
- [ ] Any glow is earned by data significance, not decoration
- [ ] Monospace is used only for numerical/data output
- [ ] Surface depth follows the three-layer rule
- [ ] No forbidden visual pattern (above) is present
- [ ] Any pick-related claim in the UI passes the claim governance rules
- [ ] Mobile breakpoint is considered (does the layout hold at 375px?)

---

## Source Evidence

This palette lab was compiled from:
- The existing `apps/web/styles/design-tokens.css` (source of truth for values)
- The `apps/web/lib/brand.ts` brand constants
- R&D Batch 0–6 visual direction analysis
- The design philosophy reference set in `DESIGN.md` (Bloomberg, F1, NASA,
  Apple, Perplexity, Linear, Vercel, Stripe)

---

## Validation Expectations

- No component in `apps/web/` uses hardcoded hex color values outside of `design-tokens.css`
- All new components pass a visual review against this checklist before merge
- The compliance scanner includes checks for forbidden visual vocabulary in
  any text content rendered by components

---

## Codex Audit Requirements

1. Grep `apps/web/app/` and `apps/web/components/` for hardcoded hex values
   not defined in `design-tokens.css` — report any found as a P2 design drift
2. Confirm no `color: #casino_green_hex` or sportsbook color appears in any style
3. Confirm `text-shadow` is not applied to any numerical data display
4. Confirm `JetBrains Mono` is used for data/numerical output only
5. Report any component using more than two plasma-colored elements as a
   P3 design review item
