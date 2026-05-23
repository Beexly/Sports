# Galaxy Sports Edge — Positioning

> The single source of truth for what we say we are. Hero copy,
> pricing copy, methodology page intro, OG meta descriptions, any
> external pitch — all read from this document.
>
> Master plan reference: Part 0 (the position), Part 3 (voice rules),
> Part 6 decisions #1, #2, #11, #26.

## The one-line position

> **"We're not AI. We're math you can read."**

Locked (master plan decision #2). Use this verbatim wherever the
primary headline lands.

## Acceptable variants (testing only, never primary)

- *"Deterministic scoring. Open math. Most days, fewer than five
  picks."*
- *"Sportsbook research, not sportsbook hype."*

Never lead with a variant. The primary line builds recognition; the
variants are A/B test copy only.

## The three pillars (what supports the position)

1. **Deterministic math.** Every pick ships with the factor breakdown
   that produced it. No black box, no LLM in the prediction pipeline,
   no hidden weights at the methodology layer.
2. **Radical transparency.** Every settled pick keeps its full signal
   snapshot against the actual outcome. Calibration is shown openly at
   every confidence band. Picks we considered but didn't publish are
   surfaced with reasons.
3. **Explicit restraint.** The model can refuse. Most days, it does.
   Fewer than five picks on a typical slate. Some days, zero.

## The closing reminder

> **"We detect. You decide."**

Use as the closer on every CTA cluster, in footer wordmarks, and on
the sign-out screen. Already exported as `CLOSING_LINE` from
`apps/web/lib/brand.ts`.

## Brand-product-corporate hierarchy

| Level | Name | Where it appears |
|---|---|---|
| Corporate parent | Galaxy Sports Network LLC (Texas) | Footer copyright, Terms of Service, Privacy Policy, About page disclosure, B2B contracts |
| Consumer product | Galaxy Sports Edge | Everywhere users see the brand |
| Sub-surfaces | Galaxy IQ, Edge Index, Signal Feed, Eclipse Lock, Calibration Report, Gate Cam, Public Ledger, Pass List, The Stack, Model Journal, Market Pulse, Slate Weather, Model Court, Galaxy Memory, Loss Room, Evidence Timeline, Evidence Health, Galaxy Studio | Their respective product surfaces |

See `docs/corporate-structure.md` for the full corporate-product
relationship.

## Acceptable in body copy

- "math you can read"
- "deterministic scoring"
- "factor model" / "factor breakdown"
- "calibrated edge"
- "the math"
- "the signal" (when referring to a specific scored output)
- "the slate" (when referring to a day's games)
- "the board" (only as a noun, never personified)
- "the model" (the statistical engine; never anthropomorphized)
- "the engine" (synonym for "the model")

## Banned in body copy

Master plan Part 3 holds the canonical list. Repeated here for
positioning-specific enforcement:

- "AI-powered," "AI-driven," "powered by AI"
- "Multimodal intelligence," "AI agents," "machine learning models" as
  positioning language
- "The system thinks / sees / learns / hunts"
- First-person algorithm voice ("I see," "I think," "I stay quiet")
- Personification of board ("the board stays quiet," "the board
  earns")
- "Intelligence platform," "edge detection," "signal detection" as
  proper-noun branding
- "Mission Control"
- "ecosystem"
- "transform," "unlock your," "level up," "your edge starts here"
- "card" (as in "pick card" or "VIP card") — too tout-coded
- "guaranteed profit," "guaranteed winning," "lock of the day," "free
  money," "sure thing," "risk-free," "guaranteed pick" (already
  enforced by `BANNED_LANGUAGE` in `apps/web/lib/brand.ts`)

## Where "AI" can appear (rare, precise carveouts)

1. Blog auto-generation footer disclosure: *"Article drafted with AI
   assistance from real pick data."*
2. The "Why this pick?" conversational interface description — it
   literally is Claude on top of factor data, so the description is
   accurate.
3. Methodology page, ONE line acknowledging that statistical scoring
   is enhanced by content tooling.

**Nowhere else.** Not in the hero, not in pricing, not in
testimonials, not in section heads.

## Tier narrative (master plan decision #10 — locked)

- **Free — See it.** One pick per day, plus all free public surfaces
  (Gate Cam, Pass List, Public Ledger preview, Live Calibration chart,
  Edge Lab tools, public Edge Index, methodology page).
- **Pro ($19/mo) — Bet it.** Every pick, every day, confidence, quick
  reasoning, factor breakdown, custom alerts, Discord/Telegram pipes.
- **Elite ($49/mo) — Master it.** Full analysis, "What Was Learned"
  weekly digest, alerts with reasoning, early access, advanced tools
  (programmable DSL, custom alert scripts, backtesting, cross-sport
  correlation queries, live war room access).

Do not restructure tiers without owner approval.

## Voice calibration

The bettor we're writing for: skeptical of the AI category;
technically literate; comfortable with statistical thinking;
suspicious of hype.

### Lines that pass

- *"We post when the model finds edge. Most days that's fewer than
  five picks."*
- *"Every pick on this page has receipts. Tap one to see the math."*
- *"Lines move. Books adjust. We refresh every 30 minutes."*
- *"Thin slate? We post less. Sometimes we post nothing. That's the
  point."*

### Lines that fail

- *"Discover your edge with our AI-powered insights."*
- *"If the board is weak, I stay quiet."*
- *"Unlock the ecosystem of sharper betting."*
- *"Galaxy IQ's readiness gate clears the slate."* (Technically
  accurate, reads as jargon.)

## What we explicitly are NOT

- Not an AI sports prediction platform. The engine is
  statistical/deterministic, documented in `docs/prediction-engine.md`.
- Not a tout service. No all-caps hype, no "VIP card," no "must
  profit or week free" gimmicks.
- Not a templated SaaS landing page. The Dazaboost-style chassis
  (Hero → Problem → Solution → Tech Grid → Testimonials → Pricing) is
  dead.
- Not a multi-asset prediction marketplace. No crypto, no stocks, no
  hedge fund pitching.

## Cautionary references (study to know what NOT to become)

- **AIPredictions.com** — $199 → $19 limited-time pop-ups, "90k+
  customers winning smarter with AI," multi-asset (sports + crypto +
  stocks). Snake oil.
- **Dazaboost AI, Wise Prediction** — templated SaaS landing pages
  with empty "0 News Articles" counters.
- **r/AI_Agents n8n hobbyist projects** — cookie-cutter
  "RECOMMENDATION: Bet Lakers Moneyline / Confidence: High" output
  format. Our pick rendering must not look like this.
- **I Sell Winners and the Whop tout ecosystem** — all-caps hype,
  "SUNDAY VIP CARD $29.99," emoji ladders, guarantee gimmicks.

## OG / SEO meta defaults

The brand metadata constants in `apps/web/lib/brand.ts` (`BRAND_META`)
hold the OG and meta defaults. Keep this document and that constant in
sync.

- `title`: `Galaxy Sports Edge | Find the signal before the market
  moves.` (the headline tagline is the existing `BRAND_TAGLINE`; the
  Phase 1 hero replaces the on-page headline with "We're not AI" but
  OG can keep `BRAND_TAGLINE` until Phase 1 ships)
- `description`: Galaxy Sports Edge reads market movement, price,
  timing, and volatility to surface disciplined sports signals with
  the reasoning attached.

When Phase 1 ships, both `BRAND_META.description` and this section
update to lead with the deterministic-scoring framing.

## Open positioning questions

Track active decisions here. Move resolved ones to
`docs/ops/decision-log.md`.

- **Should the OG meta description switch to the new positioning ahead
  of the homepage reposition, or in lockstep with Phase 1?** —
  provisional answer: lockstep with Phase 1, so social previews match
  the on-page hero when the homepage flips.
