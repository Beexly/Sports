# Galaxy Sports Edge — Brand Guidelines

**Owner:** Garrett Baxley, founder.
**Domain:** galaxysportsedge.com
**Tagline:** Find the signal before the market moves.
**Closer:** We detect. You decide.
**Brand monogram:** GSE

This document is the single source of truth for the brand. The technical
constants live in `apps/web/lib/brand.ts` and `apps/web/styles/design-tokens.css`;
this file is the human-readable spec everyone (you, me, contributors,
copywriters, journalists) consults to keep the brand coherent.

---

## 1. Brand essence

**What it is:** A sports intelligence platform. Live odds in, calibrated
signals out, with the full reasoning attached to every published pick.

**What it isn't:** A tout service. A capper. A "lock of the day" Discord.
A black-box "AI picks" product.

**The core promise (use verbatim where useful):**
> If I can't show my work, I don't publish.

---

## 2. Voice

> Calibrated. Precise. Always acquiring.
> Intelligence isn't loud. It's on frequency.

**Person:** First-person singular. "I built this." "I publish this." Not "we." Not "our team."

**Tone:** Direct, technical, quietly confident. Reads more like Linear or Stripe
than ESPN or a sportsbook ad.

**What it sounds like:**
- "I publish a calibrated signal — not a tout."
- "Every signal exposes its factor breakdown — consensus, market depth, line movement."
- "If I have to wait, I wait. That's the whole point."
- "Variance is described, not hidden."

**What it does NOT sound like:**
- "GUARANTEED WINS! Subscribe NOW!"
- "Our AI has cracked the code."
- "Trusted by serious bettors worldwide."
- "Today's premium lock — you can't miss this."

**Sentence cadence:** Mix one short sentence with one longer one. Vary
register. No five-sentence paragraphs of the same length and weight.

**Punctuation:** Em-dashes (—) used as breath, not bullet substitutes.
Sparing exclamation marks (basically never). Period-led, not question-led.

---

## 3. The five operating principles (use across all surfaces)

These are the brand pillars. Every section, every email, every post
should ladder to ONE of these five. If a draft doesn't ladder, rewrite or kill it.

| # | Pillar | One-line definition | Use it as the "why" when... |
|---|---|---|---|
| 01 | Intelligence | Data with purpose. | Talking about ingestion / source coverage |
| 02 | Precision | Measured. Not guessed. | Talking about scoring / calibration |
| 03 | Advantage | See it first. Use it better. | Talking about edge / timing |
| 04 | Discipline | Process over emotion. | Talking about gates / readiness / refusing to ship |
| 05 | Results | Consistent long-term edge. | Talking about Calibration Report / track record (gated) |

---

## 4. Banned language

**Never use in customer-facing copy** (enforced by the trust-claim scanner
in `apps/web/lib/trust-claims.ts`). Use the approved replacement.

| Banned | Why | Use instead |
|---|---|---|
| guaranteed (anything) | Implies certainty in an uncertain market | "the data suggests" / "the model favors" |
| lock / lock of the day | Tout-service slang | "high-confidence signal" |
| sure thing | Certainty claim | "calibrated signal" |
| risk-free | Sports betting is not risk-free | omit; describe risk honestly |
| easy money | Implies low risk / high yield | omit |
| can't lose | Certainty claim | omit |
| verified track record | Implies third-party verification (none exists yet) | "published track record" (only after PERFORMANCE_STATS_ENABLED=true) |
| thousands of bettors | Unsupported user-count claim | omit until backed by real metrics |
| trusted by serious bettors | Unsupported social proof | omit |
| guaranteed profit / winning | Certainty claim | omit |
| free money | Misleading | omit |

**"Money-back guarantee"** (noun form) is fine — it's a billing term. The
scanner uses word boundaries and won't match it.

---

## 5. Vocabulary — preferred terms

These are the brand's internal nouns. Use them consistently.

| Use | Don't use |
|---|---|
| Signal Feed | Picks page / Today's picks |
| Galaxy IQ | Methodology / The algorithm / The AI |
| Edge Map | Observatory / Live data view |
| The Vault | Pick archive / History |
| Calibration Report | Performance / Win-rate page / Track record |
| Edge Index | Confidence score (use Edge Index in marketing, "confidence rating" in customer copy is also acceptable) |
| Eclipse Gate | Highest-confidence pick / Best pick |
| confidence-rated signal | high-confidence pick / lock |
| signal | pick / play / wager |
| settled signal | settled bet / settled wager |
| readiness gate | gate / filter / threshold |

---

## 6. Color system

Source of truth: `apps/web/lib/brand.ts` (BRAND_COLORS) and
`apps/web/styles/design-tokens.css`. These values are mirrored in
`apps/web/tailwind.config.ts`.

| Token | Hex | Use |
|---|---|---|
| Obsidian Black | #050608 | Primary background |
| Ion White | #F6F7FA | Primary text / monochrome mark |
| Orbital Cyan | #00E5FF | Signal, data, active states |
| Ion Magenta | #FF2DD6 | Alert signal / live state — used sparingly |
| Soft Ultraviolet | #7A5CFF | Depth, intelligence, secondary signal |
| Steel Gray | #1A1D23 | Panels, dividers, UI depth |

**Restraint rule (from web-design audit):** Magenta is the brand's strongest
signal and reads as cheap when used decoratively. Reserve for:
- Live state indicators (the pulsing dot)
- Eclipse Gate callouts
- One vignette anchor per hero composition
Use cyan as the default data accent. Use ultraviolet as the depth wash.
The .app background and most surfaces should be 95% obsidian/carbon with
one tight accent zone, not a saturated magenta wash.

---

## 7. Typography

| Family | Weight / use | Loaded via |
|---|---|---|
| Exo 2 | 300–900 — display, body, UI | Google Fonts @import in design-tokens.css |
| Inter | 300–800 — alternative body | Google Fonts @import |
| JetBrains Mono | 400–700 — code, telemetry, eyebrows | Google Fonts @import |

The kit also references Big Shoulders Display, Syne, Instrument Serif —
these are **defined in CSS variables but not imported**. Don't author new
uses against `--f-arch` or `--f-editorial` until they're either imported
or the variable is updated to point at an imported family.

**Type scale (Tailwind tokens, see `tailwind.config.ts`):**
- `arch-3xl` 220px — flagship signature display (currently dormant in `.hero-bg-word`)
- `arch-2xl` 160px — hero h1 candidates
- `arch-xl` 120px — heavy section heads
- `arch-lg` 80px — lighter section heads
- `display-2xl/xl/lg` — responsive clamp-based display
- `eyebrow` 11px — mono uppercase label

---

## 8. Logo & mark

**Wordmark:**
- "GALAXY" in 56px Exo 2 800, +0.12em tracking, ion-white
- "SPORTS EDGE" in 28px Exo 2 500, +0.30em tracking, orbital cyan
- Stacked, left-aligned

**Brand mark:** the orbital glyph (see `apps/web/app/opengraph-image.tsx`)
- White stroke (#F6F7FA), 3px width
- Orbital arc + diagonal vector + small magenta sphere on the arc
- Used at 48–84px

**Monogram (compact lockups):** `GSE`

---

## 9. Surfaces (information architecture)

These are the canonical surface labels. Route paths stay generic for SEO.

| Label | Route | One-line |
|---|---|---|
| Signal Feed | /picks | Published signals with reasoning attached |
| Edge Map | /observatory | Live market intelligence |
| Galaxy IQ | /methodology | The intelligence engine |
| The Vault | /vault | Every published pick, reasoning attached |
| Calibration Report | /performance | Settled-pick record (gated until honest) |
| Eclipse Gate | /eclipse-gate | Verified conviction state |
| Edge Index | /edge-index | Composite confidence score |
| Market Gravity | /market-gravity | Public pressure & line movement |
| Orbit View | /orbit | Full-slate command center |
| Cockpit | /cockpit | Operator controls (internal only) |
| Responsible play | /responsible-play | Set limits before emotion enters |

---

## 10. Social channels & handles

| Channel | Handle | URL |
|---|---|---|
| X (Twitter) | @GalaxySportsAI | https://x.com/GalaxySportsAI |
| Instagram | galaxysportsedge | https://instagram.com/galaxysportsedge |
| Threads | @galaxysportsedge | https://threads.net/@galaxysportsedge |
| Facebook | galaxysportsedge | https://facebook.com/galaxysportsedge |

Source of truth: `apps/web/lib/brand.ts` (SOCIAL).

---

## 11. Contact

| Inbox | Use for |
|---|---|
| hq@galaxysportsedge.com | All public contact, support, press, partnerships, legal |

One front door. The founder reads every reply.

---

## 12. Brand-safety enforcement at build time

These tests should always pass:
- `apps/web/__tests__/homepage-content.test.ts` — no fake fallbacks, no testimonials
- `apps/web/__tests__/public-copy-scanner.test.ts` — no "guaranteed wins", "we always win", "100% accurate"
- `apps/web/__tests__/metadata-banned-phrases.test.ts` — layout.tsx + blog template metadata
- `apps/web/__tests__/trust-claims.test.ts` — claim registry integrity
- `apps/web/__tests__/no-fake-percentages.test.ts` — no hardcoded % accuracy claims
- `apps/web/__tests__/content-templates-scan.test.ts` — content engine emits IDs, not literals

If you ship copy that trips a test, fix the copy — don't loosen the test.
