# Galaxy Visual OS — 2026

> Not a style guide. An **operating system** for how Galaxy Sports Edge looks, moves, and behaves. Every surface is an instrument; every pixel serves a decision. Single source of truth for tokens lives in code (`apps/web/lib/brand.ts` → `BRAND_COLORS`); this document is the law that governs how they're used.

## 1. Brand idea

**Sports chaos → signal clarity → human decision.**
Galaxy is a sports decision-intelligence system that detects market signal, explains uncertainty, exposes proof, and hands the user control. It is **not** a picks site, a sportsbook, a tout product, or a spreadsheet with glass cards.

Closer (keep verbatim): **"We detect. You decide."**
Tagline: "Find the signal before the market moves."

## 2. Visual language

Palette is owned by `BRAND_COLORS` (`apps/web/lib/brand.ts`). Use tokens, never raw hex in components.

| Role | Token | Value | Usage |
|---|---|---|---|
| Base / void | `obsidianBlack` | `#050608` | Primary background; darkness is negative space, not decoration. |
| Primary text / mono mark | `ionWhite` | `#F6F7FA` | Text, monochrome logo. |
| Signal / active / data | `orbitalCyan` | `#00E5FF` | Live data, active states, edge beams. **Bioluminescent, not neon-cheap** — always with glow/gradient/depth, never flat fill on black. |
| Emphasis / alert signal | `ionMagenta` | `#FF2DD6` | Surgical emphasis, the signal core. **Restrained** — a hit, not a wash. |
| Depth / intelligence | `softUltraviolet` | `#7A5CFF` | Secondary signal, depth, the "thinking" layer. |
| Panels / dividers | `steelGray` | `#211A33` | UI depth, borders, panel fills. |

**Derived semantic roles** (to formalize in the Phase 13 token sweep): `verify` (green/teal — confirmed/settled), `alert`/`warning` (amber/red — surgical only, never the mood), `muted`, `proof` (source ticks). Desaturate accents 10–15% in dense/dark contexts; reserve full saturation for hero/headline hits.

**Motifs:** thin gridlines · detection frames · heatmap gradients · signal trails · orbit arcs · market-gravity bands · calibration rings · proof ticks · live pulse indicators · broadcast lower-thirds. Smoke/glass only when it improves hierarchy.

**Forbidden look:** `casino`, sportsbook UI, slot-machine energy, raw neon-on-black, plastic/Ikea brightness, generic AI glow, clutter, generic sci-fi, crypto/NFT aesthetic.

## 3. Motion language

Every motion belongs to exactly one verb. No decorative drifting, no random float, no motion that makes data harder to read.

| Verb | Meaning | Example |
|---|---|---|
| **Detect** | Something appears on the radar | Beat item enters the wall; signal ping. |
| **Focus** | Draw the eye to the decision | Card lifts/sharpens on hover. |
| **Compare** | Two states side by side | Open vs close line scrub. |
| **Resolve** | Chaos → clarity | Logo lock; number count-up to settled value. |
| **Warn** | Volatility / risk | Unstable perimeter shimmer (amber). |
| **Confirm** | Proven / settled | Verify-green tick, calibration ring aligns. |
| **Route** | Move the user onward | Slide/arc to the next surface. |
| **Broadcast** | Constant live transmission | Ticker, lower-third, urgency stack. |

All motion respects `prefers-reduced-motion` (instant/none). No autoplay audio — ever.

## 4. Data-visual grammar

Numbers are not just numbers — they carry shape, pressure, status, reliability.

| Concept | Treatment |
|---|---|
| Edge | Directional beam / signal rail |
| Confidence | Calibrated ribbon / ring thickness |
| Volatility | Unstable perimeter / amber shimmer |
| Source quality | Proof ticks / layered trace |
| Line movement | Orbit shift / gravity bend |
| Public pressure | Heat haze / pressure bar |
| Injury uncertainty | Fog state |
| No-play | Quiet lockout frame — **never shame language** |
| Calibration | Ring alignment / reliability curve |
| CLV | Closing-line trail |
| Market mirage | Split overlay / false-signal flag |

## 5. Interaction grammar

Every interactive page ships **≥1 real control**: filter · compare · scrub · expand · simulate · inspect · personalize · save · route · explain · replay · collapse-complexity. A page of cards + paragraphs only is a failure (see `INTERACTION_INVENTORY.md`).

## 6. Voice

**Terminal authority + human agency.** From `apps/web/lib/brand.ts`: "Calibrated. Precise. Always acquiring. Intelligence isn't loud. It's on frequency."

**Use:** We detect. You decide. · Signal over noise. · Proof before confidence. · Better reads. Cleaner decisions. · The board moved. Here's why. · This is not a pick. It is a decision surface. · No edge detected. · Confidence is earned, not claimed.

**Never** (enforced by `BANNED_LANGUAGE` + the public-copy scanners): `guaranteed profit` · `lock of the day` · `risk-free` · `free money` · `sure thing` · `casino` · `cashout` · `degenerate` · `whale` · `easy win` · `smash` · `hammer` · religious/worship framing · sportsbook hype.

## 7. Density rule

Power users need density; new users need orientation. **Progressive disclosure:** plain-English explanation first, expert detail on demand. "Opportunity is not just touches. It is the chance to matter before the box score catches up."

## 8. The four doors (IA law)

Public navigation is **four doors** + one media door, never more:
**Board · Players · Intelligence · Fantasy & Daily** + **The Beat**. Right-side utilities (Live Board chip, Pricing CTA, account) are not doors. Proof consolidates into **The Proof Room** under Intelligence. See `nav.tsx` / `mobile-nav.tsx` (desktop + mobile must stay at parity).

## 9. Accessibility & performance are aesthetic

Reduced motion, WCAG contrast on every dark-on-dark surface, keyboard nav, visible focus, mobile-first density, load budgets, no layout shift from motion, compressed assets, branded token-based skeletons. A beautiful page that fails contrast or blocks interaction is not shippable.
