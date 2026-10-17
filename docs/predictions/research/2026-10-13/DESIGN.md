# Galaxy Sports Edge — OBSERVATORY redesign

**Identity line:** Editorial Web Designer + Brand systems lead  
**Date:** 2026-09-10  
**Status:** Founder-directed full rebrand. Supersedes NEBULA v7 visual language for public marketing surfaces. Production landing must land behind the usual ledger/PR path.

---

## 1. Objective

Replace the cosmic-neon / teal-violet identity with an **instrument** identity: a product that feels like a research desk, not a casino and not a sci-fi HUD. One strong idea — *measured signal, sealed record* — carried across home, board, record, pricing, methodology, and verify.

**Jobs of the homepage (in order):**  
1. What this is in one sentence  
2. Today's board state (cleared / held, with reasons visible)  
3. The public record (calibration honesty, not a victory lap)  
4. Price  
5. Verify a receipt (one tap)

**Audience:** US adults 14–80 who follow NFL/CFB/MLB/NBA and want a straight answer. Phone first. Secondary: skeptics who recompute hashes.

**Non-negotiable product lines:**  
- "We're not AI. We're math you can read."  
- "We detect. You decide."  
- Confidence is a ranking score, not a probability.  
- No win-rate/ROI claims without n + date.  
- Responsible-play footer and 1-800-GAMBLER on every page.

---

## 2. Product context

Galaxy Sports Edge scores daily markets with a deterministic factor model, prices against real books, freezes a cryptographic receipt, grades win or lose, and publishes. When calibration falls below the floor, the curve comes down automatically. The design must make that ethic visible: calm, precise, verifiable, never hype.

**Information architecture (five destinations + utility rail):**

| Destination | Routes (representative) |
|---|---|
| **Today** | `/board`, `/picks` |
| **Record** | `/calibration`, `/performance`, `/clv`, `/proof`, `/verify` |
| **Method** | `/methodology`, `/engine`, `/data`, `/integrity` |
| **Fantasy** | `/fantasy/*` |
| **Stats** | `/stats`, `/weather`, `/trends` |
| Utility | Pricing, Sign in, Account, Search |

Mobile: bottom tab bar for the five destinations; utility in a sheet.

---

## 3. Visual foundations

### Style anchor

**NASA JPL mission documentation + Bloomberg Terminal authority + Unseen Studio editorial confidence.**  
Not: DraftKings, not crypto 2018, not Unseen's homepage, not Exo 2 chrome.

Reference qualities to internalize (do not copy):

| Source | Quality |
|---|---|
| KIKK-24 | One idea, entire ecosystem, few colors |
| Blueyard | Two-color jobs, restraint + ambition, scroll zones |
| Convex Sea Survey | Dense data without dashboard feel |
| Unread | Voice: how they talk about work |
| JPL / Planet Labs / SpaceX | Real space: deep, quiet, confident |

### Palette — two jobs, not two sprinkles

```
GROUND
  --ground        #0A0D12   deep night blue-black (never pure #000)
  --panel         #11161F   raised surface
  --panel-2       #18202B   elevated / nested
  --hairline      #243041   1px rules
  --hairline-2    #35455C   strong rules / hover borders

INK (on dark)
  --bone          #EDE8E0   primary (from NEBULA continuity)
  --fog           #C5CDD8   secondary
  --mist          #8B96A8   tertiary / meta
  --dim           #5C6778   disabled / placeholders

JOB 1 — SIGNAL (action, edge, primary CTA)
  --signal        #E85D3C   cadmium ember
  --signal-deep   #C24428
  --signal-soft   rgba(232,93,60,0.12)
  Used for: primary buttons, edge numbers, active nav underline, focus ring accent
  Never for: long prose, large surface fills, win/loss (those are semantic)

JOB 2 — SEAL (record, verification, cryptographic commitment)
  --seal          #C9A46C   instrument brass / wax-seal gold
  --seal-deep     #A8844E
  --seal-soft     rgba(201,164,108,0.12)
  Used for: verified badges, receipt hashes, seal marks, "proof" chrome
  Never for: CTAs, loss states, random decoration

SEMANTIC (meaning only — always with glyph + label)
  --positive      #3FA87A   win / verified-ok / fresh
  --negative      #E25A6A   loss / error / stale critical
  --caution       #C9A46C   degraded (shares seal hue when waiting)
  --info          #7A8FB8   neutral info

PAPER (light data surfaces — first-class, not afterthought)
  --paper         #F3F0E9   warm instrument paper
  --paper-raised  #FAF8F4
  --paper-sunken  #E8E3D8
  --paper-line    #D4CFC3
  --ink           #12141A
  --ink-1         #3A414E
  --ink-2         #6B7280
  --signal-on-paper  #B33D22
  --seal-on-paper    #8A6B3A
```

**Why this beats NEBULA v7:** teal-black + violet cards + iris wayfinding still read as *cosmic brand costume*. Observatory ground + bone + ember + brass reads as *instrument*. Continuity: bone and ember survive so the brand doesn't feel foreign overnight.

### Typography — architecture, not decoration

| Role | Family | Use |
|---|---|---|
| **Display** | `"Space Grotesk", "Segoe UI", system-ui, sans-serif` | H1–H3, large numbers. Tight tracking. Weight 500–700. |
| **Body** | `"Source Serif 4", Georgia, "Times New Roman", serif` | Prose. 16–18px, 1.55–1.65. Measure 60–75ch. |
| **UI / labels** | `"IBM Plex Sans", system-ui, sans-serif` | Buttons, nav, form labels |
| **Mono / numerals** | `"IBM Plex Mono", "Cascadia Code", Consolas, monospace` | Odds, hashes, timestamps, tables (`tabular-nums`) |
| **Italic accent** | Source Serif 4 italic | One-word emphasis in hero only |

**Scale (desktop / mobile):**  
mega 88/42 · h1 56/34 · h2 36/26 · h3 22/18 · body 17/16 · small 14/13 · micro 11/10 (mono labels, letter-spacing 0.14em, uppercase)

### Layout system

- Max content width: **1200px** (home hero can go **1320px** for type architecture)  
- Side padding: 20px mobile / 40px desktop  
- Vertical rhythm: 8px base; section padding 64 / 96 / 128  
- **Hairline grids** over card forests: 1px borders meeting, no drop shadows on marketing  
- One deliberate **grid break per screen** (e.g. oversized numeral bleeding past column, seal lockup offset)  
- Density: board and record use real tables with visible row rules; marketing uses generous negative space

### Signature element — The Spine

A **vertical measurement spine**: a 1px rail with tick marks and mono labels (floor, measured, n, as-of). Appears on Home and Record. It encodes something true (calibration floor vs measured ECE), not decoration. Desktop: left of hero content. Mobile: collapses to a horizontal instrument strip under the hero.

### Logo / mark

- **Mark:** 32×32 geometric seal — square with 2px inner offset frame, two horizontal hash ticks at bottom-right, no planet, no chrome.  
- **Wordmark:** `GALAXY` (display) / `SPORTS EDGE` (mono micro) or single-line Space Grotesk medium.  
- **Line:** `math you can read`  
- Favicon: seal mark only, signal on ground.

### Imagery

- No stock photos, no AI sports art, no planets, no starfields.  
- Icons: single outline set (stroke 1.5), 24px grid.  
- Team identity: abbreviation + 8px color chip, never logo-dependent.  
- Charts: reliability diagram with diagonal, n per bin, axis units, timestamp. Never a chart without n.

### Motion — purposeful only

- Page load: optional 400ms fade-in of hero type (no cinematic cold-open, no montage interstitial as default).  
- Scroll: one reveal per section max (`opacity` + 12px translate).  
- Live: line updates crossfade 200ms; no bouncing.  
- All inside `@media (prefers-reduced-motion: reduce)` kill switch.  
- **Default OFF for any multi-second intro.** Founder note F-24 still owns media weight policy.

---

## 4. Accessibility

- WCAG 2.2 AA both themes: text 4.5:1, UI 3:1. Focus: 2px signal ring, 2px offset.  
- Targets ≥44×44 on mobile primary actions.  
- Skip link; landmarks; one h1; heading order; table headers + captions.  
- Color never sole meaning: win/loss/void = color + glyph + label. Stale = text badge.  
- Reduced motion for every animation.  
- Visible labels on forms; errors in text.  
- Icon-only controls get accessible names.

---

## 5. Voice & tone

**Never:** AI-powered/driven/assisted, machine learning (for the engine), unlock, transform, level up, ecosystem, Mission Control, pick card, VIP, lock, sure thing, risk-free, free money, insider, stacked adjectives, colon-headline pairs, rhetorical questions, "not X, but Y", closing slogans.

**Always:** what was measured, on how many, as of when. Short declaratives. Contractions OK. Reading level ~motivated 15-year-old.

**15 before → after (drawn from live site patterns):**

1. "Sports decision intelligence" → "Sports market signal"  
2. "The market is full of noise. Galaxy turns it into signal." → "The market is full of noise. We score what we can defend."  
3. "No-Bet is not absence. It is intelligence." → "No bet is a logged decision with reasons."  
4. "Trust is an architecture, not a tagline." → "Every pick ships with a receipt you can recompute."  
5. "We detect. You decide." → keep  
6. "Elite calibration" → "Calibration error 0.052 on 458 settled moneylines, measured 17:08 UTC"  
7. "Confidence 87%" → "Edge rank 87 / 100 (ranking score, not a probability)"  
8. "Unlock your edge" → "See today's board"  
9. "Four doors" → "Where to start"  
10. "The sealed engine" → "How the model works"  
11. "Cinematic broadcast" → "Daily brief"  
12. "Mission Control" → "Today"  
13. "Galaxy Twin" → "Live market map"  
14. "The Proof Room" → "Record & receipts"  
15. "Founding members grandfathered for life" → keep (accurate product term)

---

## 6. Implementation practices

- Tokens as CSS variables in one file (`tokens.css`); no hard-coded hex in components.  
- Semantic HTML first (tables, headings, buttons).  
- Both themes via `[data-theme="light"]` or route-level paper sections (data tables default paper).  
- Charts: SVG with `<title>` + text alternative.  
- Placeholder numbers in this prototype are labeled `PLACEHOLDER` in comments; production must bind truth surface.  
- Ship order for repo: tokens → shell (nav/footer) → home → board → record → pricing → methodology → verify → fantasy/stats inherit.

---

## 7. Anti-patterns (explicit refusals)

- U1 gradient hero (purple-blue-cyan)  
- U2 rounded-16 shadow card grid with emoji  
- U3 emoji as decoration  
- U4 isometric 3D people  
- U5 floating "47% YoY" stat trios without n  
- U6 every action a filled primary button  
- U7 empty hype copy  
- Cosmic-neon: Exo 2, starfields, chrome gradients, cyan/magenta sprays  
- Cinematic 8s interstitial as default front door  
- Blurred locked picks pretending a number is there  
- Charts without n

---

## 8. Decision-making

| Decision | Choice | Why | Alternatives rejected | Tradeoff |
|---|---|---|---|---|
| Theme name | **OBSERVATORY** | Real space, instrument, not "nebula" | NEBULA v8, Ledger, Terminal | Less "exciting" than neon |
| Primary accent | Cadmium ember `#E85D3C` | Continuity with NEBULA ember; warm against cool ground | Cyan (retired), plasma magenta | Less "spacey" |
| Second job color | Brass seal `#C9A46C` | Record/verify only; certificate feel | Mint (too close to win green) | Needs careful contrast on paper |
| Display face | Space Grotesk | Technical, readable 14–80, not Exo | Syne (too fashion), Chakra Petch (gamey) | Less "unique" than Syne |
| Body face | Source Serif 4 | Editorial trust for long methodology | Inter-only (product-default) | Slightly slower to scan in UI |
| Home motion | No cinematic default | F-24 media weight; honesty product | Keep montage | Loses "wow" first visit |
| Signature | Calibration Spine | Encodes real floor vs measured | Fluid orb (Blueyard copy) | More restrained |
| IA | 5 destinations | Brief §4; kills 236-page footer dump | Keep mega-footer as nav | Some deep links harder to find |

---

## 9. Workflow

1. Prototype pages in this folder for founder review.  
2. On approval: implement tokens in `apps/web/styles/design-tokens.css` (keep Tailwind name aliases for one release: `plasma`→signal, add `seal`).  
3. Replace home shell, then board/record paper tables.  
4. Run `lint:brand`, typecheck, contrast audit.  
5. Ledger row for each surface; no gate flips.

---

## Screen structure (prototype)

### Home
1. Instrument header (spine strip + live counts)  
2. Hero thesis + two CTAs (Board / Record)  
3. Board snapshot table (paper) — cleared + held with reasons  
4. Record band — calibration honesty block  
5. How it works — three steps, not a feature grid  
6. Verify strip — hash + recompute CTA  
7. Pricing teaser  
8. Responsible footer

### Board
Filter bar · pick rows with book line, edge rank, three states (edge / no edge / locked truthful)

### Record
State machine: published · measured-not-eligible · insufficient n. Calibration chart. Loss autopsies link.

### Pricing
Three tiers, founding ladder, what each tier sees. No fake strikethroughs.

### Methodology
Factor model in words + one worked example (factor bars).

### Verify
Paste hash → step-by-step recomputation UI.
