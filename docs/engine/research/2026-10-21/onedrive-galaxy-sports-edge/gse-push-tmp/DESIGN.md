---
# Galaxy Sports Edge — Machine-Readable Design Tokens
# Authoritative source: apps/web/styles/design-tokens.css
# This YAML front matter mirrors the CSS tokens for agent consumption.
# Do NOT modify here without syncing design-tokens.css.

brand:
  name: "Galaxy Sports Edge"
  short: "GSE"
  tagline: "Find the signal before the market moves."
  monogram: "GSE"
  domain: "galaxysportsedge.com"

# ── COLORS ──────────────────────────────────────────────────

colors:
  # Environment — cosmic dark scale
  void:        "#050608"   # OBSIDIAN BLACK — deepest layer, page mask
  obsidian:    "#050608"   # alias for void
  carbon:      "#0D1117"   # page background
  eclipse:     "#11161F"   # raised surface / primary card bg
  titanium:    "#1A1D23"   # elevated — STEEL GRAY
  slate:       "#20283A"   # hover state
  mineral:     "#2E3849"   # default border
  mineral_hi:  "#3C4961"   # border hover / strong divider

  # Ion — cool whites and mineral silvers
  ion_white:   "#F6F7FA"   # headings, CTAs, high-emphasis text
  ion:         "#D5DDE9"   # primary body text
  ion_1:       "#98A3B5"   # secondary / mineral silver
  ion_2:       "#5E6878"   # tertiary / meta
  ion_3:       "#3D4555"   # muted / placeholder

  # Primary signal — ion magenta (plasma)
  plasma:        "#FF2DD6"  # PRIMARY ACCENT — CTAs, active states, signature
  plasma_glow:   "#FF66E0"  # hover / lighter plasma
  plasma_deep:   "#C81EAA"  # deep — pressed states, shadows
  plasma_ink:    "#1A0014"  # text-on-plasma

  # Signature accent — orbital cyan
  orbital_cyan:      "#00E5FF"  # signal accent — data live pings, key numbers
  orbital_cyan_glow: "#5BEEFF"
  orbital_cyan_deep: "#00A8BF"

  # Depth — soft ultraviolet (model / intelligence layer)
  ultraviolet:      "#7A5CFF"  # model outputs, confidence depth
  ultraviolet_glow: "#9F87FF"
  ultraviolet_deep: "#5942CC"

  # Rare accents (use sparingly — never as surface)
  lime:          "#D4FF3D"  # live tick / fresh-data ping ONLY
  lime_glow:     "#E8FF6B"
  lime_ink:      "#1A2400"

  # Semantic
  verify:        "#5FD9A3"  # positive confirm / settlement WIN — mint
  verify_deep:   "#2D9870"
  alert:         "#FF6470"  # critical warning / LOSS — vermilion
  alert_deep:    "#B53C45"

  # Confidence ladder
  conf_elite:    "#FF2DD6"  # plasma — highest conviction
  conf_strong:   "#00E5FF"  # orbital cyan — strong
  conf_solid:    "#7A5CFF"  # ultraviolet — solid
  conf_lean:     "#98A3B5"  # silver — low conviction

  # Risk ladder
  risk_low:      "#5FD9A3"  # mint verify
  risk_moderate: "#7A5CFF"  # ultraviolet
  risk_high:     "#FF6470"  # alert vermilion

  # DEPRECATED — do not author new uses
  amber:         "#00E5FF"  # → orbital_cyan
  gold:          "#00E5FF"  # → orbital_cyan
  cobalt:        "#00E5FF"  # → orbital_cyan
  casino_green:  "FORBIDDEN"
  cheap_neon:    "FORBIDDEN"
  crypto_green:  "FORBIDDEN"

# ── TYPOGRAPHY ──────────────────────────────────────────────

typography:
  families:
    arch:          "Big Shoulders Display, Druk, Anton, Impact, sans-serif"
    display:       "Syne, Neue Machina, Space Grotesk, system-ui, sans-serif"
    display_tech:  "Space Grotesk, Neue Montreal, system-ui, sans-serif"
    body:          "Geist, Inter, system-ui, -apple-system, sans-serif"
    mono:          "Geist Mono, JetBrains Mono, ui-monospace, monospace"
    numerals:      "JetBrains Mono, Geist Mono, ui-monospace, monospace"
    editorial:     "Instrument Serif, Iowan Old Style, Georgia, serif"

  roles:
    # Arch — oversized compressed sport-native headlines (hero only)
    arch_3xl: "900 220px/0.85 arch"
    arch_2xl: "900 160px/0.85 arch"
    arch_xl:  "900 120px/0.88 arch"
    arch_lg:  "800 80px/0.92 arch"
    arch_md:  "800 56px/0.95 arch"
    arch_sm:  "800 36px/1.0 arch"

    # Display — section headers
    display_2xl: "700 96px/0.95 display"
    display_xl:  "700 64px/1.0 display"
    display_lg:  "600 48px/1.05 display"
    display_md:  "600 32px/1.1 display"
    display_sm:  "600 24px/1.2 display"

    # Body
    body_lg: "400 17px/1.55 body"
    body:    "400 15px/1.55 body"
    body_sm: "400 13px/1.5 body"
    body_xs: "400 12px/1.4 body"

    # Eyebrow — mono uppercase labels
    eyebrow:    "500 11px/1.3 mono | uppercase | letter-spacing 0.16em"
    eyebrow_lg: "500 13px/1.3 mono | uppercase | letter-spacing 0.16em"

    # Numerals — tabular, JetBrains
    num_3xl: "700 96px/0.95 numerals"
    num_2xl: "700 64px/1.0 numerals"
    num_xl:  "700 48px/1.05 numerals"
    num_lg:  "600 32px/1.1 numerals"
    num_md:  "600 20px/1.2 numerals"
    num_sm:  "500 14px/1.3 numerals"
    num_xs:  "500 11px/1.3 numerals"

    # Editorial — pull quotes, narrative moments
    edit_lg: "italic 400 56px/1.05 editorial"
    edit_md: "italic 400 32px/1.2 editorial"
    edit_sm: "italic 400 20px/1.4 editorial"

# ── SPACING ─────────────────────────────────────────────────

spacing:
  # 4px base grid — all spacing is a multiple of 4
  xs:   "4px"
  sm:   "8px"
  md:   "16px"
  lg:   "24px"
  xl:   "32px"
  2xl:  "48px"
  3xl:  "64px"
  4xl:  "96px"
  5xl:  "128px"

  # Layout
  content_max: "1200px"
  wide_max:    "1440px"
  prose_max:   "720px"
  container_x: "32px"

# ── RADIUS ──────────────────────────────────────────────────

radius:
  xs:   "3px"    # micro — chips, tags, tiny badges
  sm:   "6px"    # small — buttons, inputs
  md:   "10px"   # standard — cards, dropdowns
  lg:   "14px"   # large — modals, panels
  pill: "999px"  # full round — live chips, avatars

# ── MOTION ──────────────────────────────────────────────────

motion:
  ease_out:    "cubic-bezier(0.2, 0, 0, 1)"   # standard — exits, fades
  ease_in_out: "cubic-bezier(0.5, 0, 0.2, 1)" # entrances
  dur_fast:    "150ms"   # micro — hover, state flip
  dur_base:    "280ms"   # standard — transitions
  dur_slow:    "520ms"   # deliberate — panel opens
  dur_cinematic: "880ms" # hero — page entrances only

# ── GLOWS + SHADOWS ─────────────────────────────────────────

glows:
  plasma:   "0 0 48px -8px rgba(255,45,214,0.58)"
  ion_blue: "0 0 42px -8px rgba(59,130,255,0.52)"
  uv:       "0 0 46px -6px rgba(192,132,252,0.58)"
  lime:     "0 0 32px -8px rgba(212,255,61,0.40)"
  soft:     "0 0 80px -20px rgba(255,45,138,0.18)"

shadows:
  modal: "0 24px 64px -16px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5)"
  float: "0 8px 32px -8px rgba(0,0,0,0.7)"

# ── SURFACES ────────────────────────────────────────────────

surfaces:
  page:    "carbon (#0D1117) — base canvas"
  raised:  "eclipse (#11161F) — primary card background"
  elevated: "titanium (#1A1D23) — secondary raised"
  hover:   "slate (#20283A) — interactive hover"
  overlay: "rgba(5,6,8,0.85) — modal backdrop"

# ── FORBIDDEN VISUAL PATTERNS ───────────────────────────────

forbidden:
  - "casino green or sportsbook green as a brand color"
  - "cheap neon — unearned saturation, glowing borders as style"
  - "crypto dashboard noise — multiple blinking counters with no hierarchy"
  - "fake AI sparkle — animated sparkles on intelligence outputs"
  - "shallow glassmorphism — frosted glass with no atmospheric rationale"
  - "overanimated sci-fi — rotating orbs, unearned particle systems"
  - "generic SaaS cards — white backgrounds, blue borders, no personality"
  - "unsupported confidence visuals — green checkmarks without evidence chain"
  - "win-rate bars as hero content — confidence displayed before calibration earned"
  - "tout-style banners — lock icons, hot fire emojis on picks"
  - "gradient text overuse — reserve for hero monogram only"
  - "plasma glow on every element — plasma is signal, not decoration"

---

# Galaxy Sports Edge — Design Language

**Version**: Prompt 4 — Final Wave  
**Status**: Doctrine. Design system changes require operator review.  
**Source**: `apps/web/styles/design-tokens.css` · `apps/web/lib/brand.ts`  
**Authority**: This document and the CSS token file are co-authoritative.
If they conflict, the CSS file wins. Update both when making changes.

---

## Design Philosophy

Sports OS is built on the belief that intelligence should feel like a
precision instrument, not a casino.

The reference set is not sports media. The reference set is:

> **Bloomberg Terminal discipline** — dense, functional, no wasted space  
> **F1 telemetry** — live data that feels alive without screaming  
> **NASA Mission Control** — authority through calm, not through noise  
> **Apple restraint** — 95% neutral so 5% signal earns every pixel  
> **Perplexity answer clarity** — structure that makes complexity readable  
> **Glean graph intelligence** — entity relationships made navigable  
> **Linear / Vercel / Stripe / Raycast polish** — no rough edges, no filler  
> **Sports-native clarity** — numbers first, reasoning second, narrative third

The product is dark, data-forward, and confident. It never shouts.
The plasma magenta accent earns every appearance. The orbital cyan signals
live data, not decoration. The ultraviolet layer signals model depth.

---

## Color System

### Environment Scale

The page lives on five levels of darkness, creating depth without color noise.

| Token | Hex | Use |
|---|---|---|
| `--void` | `#050608` | Deepest layer — page masks, modal backgrounds |
| `--carbon` | `#0D1117` | Page background — the default canvas |
| `--eclipse` | `#11161F` | Primary raised surface — card backgrounds |
| `--titanium` | `#1A1D23` | Secondary elevated — nested cards, panels |
| `--slate` | `#20283A` | Hover state — interactive backgrounds |
| `--mineral` | `#2E3849` | Default border |
| `--mineral-hi` | `#3C4961` | Border hover / strong divider |

**Rule**: Never use `--void` as a card background — it collapses depth.
Never use `--titanium` as the page background — it reads as a raised surface.

### Signal Hierarchy

Three accent colors. Each has a semantic meaning and a territory. They do
not share territory.

**Plasma Magenta** (`--plasma: #FF2DD6`)  
The primary signal. Used for: primary CTAs, active navigation state,
live indicators, key picks call-to-action, brand mark accent.  
**Territory**: Interactive action, brand signal, "this matters now."  
**Forbidden**: Do not use plasma on every card. Do not use as a background.
Plasma is punctuation, not prose.

**Orbital Cyan** (`--orbital-cyan: #00E5FF`)  
The data signal. Used for: live data pings, freshness indicators, key
numeric values in telemetry views, strong confidence scores.  
**Territory**: Data liveness, numerical authority.  
**Forbidden**: Do not use as a generic highlight. Do not use on headings.

**Ultraviolet** (`--ultraviolet: #7A5CFF`)  
The intelligence depth signal. Used for: model output labels, confidence
depth indicators, Brain answer headers, intelligence layer components.  
**Territory**: Model layer — "this came from the reasoning engine."  
**Forbidden**: Do not use for navigation or general UI. Ultraviolet is the
model's color, not the product's color.

### Text Scale

| Token | Hex | Use |
|---|---|---|
| `--ion-white` | `#F6F7FA` | Headings, CTAs, maximum emphasis |
| `--ion` | `#D5DDE9` | Primary body text |
| `--ion-1` | `#98A3B5` | Secondary text, labels, meta |
| `--ion-2` | `#5E6878` | Tertiary — timestamps, footnotes |
| `--ion-3` | `#3D4555` | Muted — placeholders, disabled |

**Rule**: Never use `--ion-white` for body copy — it creates a flat, glaring
field. `--ion` is the correct body text color on dark surfaces.

### Semantic Colors

| Color | Token | Hex | Use | Forbidden use |
|---|---|---|---|---|
| Verify / WIN | `--verify` | `#5FD9A3` | Settlement WIN, positive confirm | Not for general "good" UI |
| Alert / LOSS | `--alert` | `#FF6470` | Settlement LOSS, critical warning | Not for general "bad" UI |
| Lime | `--lime` | `#D4FF3D` | Live data freshness ping ONLY | Any decorative use |

**Casino green** (`#00FF00`, `#22C55E` as brand) — **permanently forbidden**.
The association with sportsbook "winner" UI makes it incompatible with the
intelligence-first positioning. Use `--verify` for positive states instead.

---

## Typography

Sports OS uses three font families with distinct roles:

### Families

**Arch** (`Big Shoulders Display`, `Druk` fallback)  
Oversized, compressed, sport-native. Used ONLY in hero headlines and the
brand monogram. Never used in body copy, cards, or cockpit surfaces.
This is the sports DNA — it is precious because it is rare.

**Display** (`Syne`, `Space Grotesk` fallback)  
Geometric, modern. Used for section headers, page titles, and premium
feature callouts. Maintains the intelligence tone without the raw sport energy.

**Body** (`Geist`, `Inter` fallback)  
The workhorse. Clear, readable, no personality clash with the dark surface.
All body copy, labels, descriptions, navigation.

**Mono / Numerals** (`Geist Mono`, `JetBrains Mono`)  
All numeric data: confidence scores, odds, timestamps, line values, telemetry.
Tabular numerals always (`font-variant-numeric: tabular-nums`). This is non-
negotiable — tabular numerals prevent column width jumping in live data views.

**Editorial** (`Instrument Serif`)  
Pull quotes and narrative moments only. The Loss Room autopsies, the Almanac
essays. Never mixed with data views.

### Hierarchy Rules

- **One arch headline per page** — maximum. Usually the hero H1.
- **Eyebrow labels** are mono uppercase, letter-spacing 0.16em — the "intel
  file" look. Every data card leads with an eyebrow.
- **Numeric data** never uses the body or display font — always `--f-numerals`.
- **Editorial type** never appears in cockpit views — it is a public narrative
  surface type only.

---

## Surfaces and Cards

### Surface Hierarchy

```
void → carbon → eclipse → titanium → slate
(deep)                               (interactive)
```

**Page** (`--carbon`): The base. Nothing exists below this in normal flows.

**Card** (`--eclipse` + 1px `--mineral` border): The primary container.
All picks, signals, evidence items, and data units live in this surface.
`backdrop-filter: blur(14px)` is acceptable on cards that overlap the page
atmosphere — use sparingly, never on nested cards.

**Elevated card** (`--titanium` gradient): Used for modals, command palettes,
and the top-priority cockpit panel. Has `--shadow-float`.

**Glass** (`rgba(255,255,255,0.03)` + blur): Reserved for overlay panels
that need to feel "above" the card layer — the Intelligence Graph tooltip,
the Evidence Drawer. Must not be overused or it becomes cheap glassmorphism.

### Card Anatomy

Every data card must follow this order:
1. **Eyebrow** — mono uppercase, `--ion-2`, state or category
2. **Primary value** — large numeral or headline, `--ion-white`
3. **Supporting context** — body text, `--ion`
4. **Source + freshness** — mono small, `--ion-2`, always present on data cards
5. **Action** — ghost or secondary button, right-aligned

A card without a source/freshness timestamp is incomplete in any data surface.

---

## Data Visualization

**Rule set for all charts, meters, and telemetry views**:

1. **Numerals first** — the number is always visible before the chart renders.
   Never hide the value behind a visual-only representation.

2. **One accent color per chart** — pick one of plasma, orbital cyan, or
   ultraviolet. Do not mix accent colors in a single visualization unless
   they map to a semantic distinction (WIN/LOSS).

3. **Grid lines** — `--mineral` at 20% opacity. Subtle. Not the focus.

4. **Axis labels** — `--t-num-xs`, `--ion-2`. Small. The data speaks.

5. **Confidence meter** — the confidence score is always shown as a number
   AND optionally a bar. The bar uses the confidence ladder:
   80–100 → `--conf-elite` (plasma), 65–79 → `--conf-strong` (cyan),
   50–64 → `--conf-solid` (UV), <50 → `--conf-lean` (silver).

6. **No pie charts** — they are imprecise and add no intelligence value.
   Use numbers or bar charts.

7. **Live data indicators** — use `--lime` for the live ping dot ONLY.
   Do not use lime for any other purpose.

8. **Win/loss bars** — wins use `--verify`, losses use `--alert`. Never green/red
   as generic "good/bad" — only as settlement outcome representation.

9. **No animated backgrounds on data surfaces** — animations in a telemetry
   view compete with data updates. Static surfaces only. Motion reserved for
   user-triggered state changes.

---

## Motion

Motion in Sports OS is deliberate, not decorative. The reference is F1
telemetry — data that updates in place without choreography.

### Motion Roles

| Duration | Use |
|---|---|
| `--dur-fast` (150ms) | Micro — hover color, icon flip, toggle |
| `--dur-base` (280ms) | Standard — panel slide, card reveal, dropdown |
| `--dur-slow` (520ms) | Deliberate — drawer open, modal entrance |
| `--dur-cinematic` (880ms) | Hero only — page entrance, brand moment |

### Motion Rules

- **Never animate data values** mid-display — a confidence score changing
  from 72 to 74 should update instantly, not animate. Animated numbers
  imply the value is in flux, which is misleading for settled scores.
- **Reduced motion is honored globally** — `@media (prefers-reduced-motion)`
  sets all durations to 0.001ms. This is already in the global CSS. Never
  override it in components.
- **Page transitions** — fade only (`opacity`). Never translate the entire page.
- **Card entrance** — fade + subtle upward translate (4px max). Never
  `scale()` cards — it makes the layout feel unstable.
- **Plasma glow pulse** — used only on live indicators (`--plasma` dot pulse).
  2.4s cycle, `ease-out` curve. Never applied to content elements.

### Forbidden Motion

- Rotating orbs or spheres as decorative elements
- Particle systems without data representation
- Looping background animations on data pages
- Bouncing or elastic easing on any UI element
- Hover transforms on card bodies (`scale(1.02)` on a data card is wrong)

---

## Accessibility

All Sports OS surfaces target WCAG AA as a minimum. The dark theme creates
natural contrast risks — these rules enforce compliance.

### Contrast Rules

| Pair | Minimum ratio |
|---|---|
| Body text (`--ion`) on card (`--eclipse`) | ≥ 4.5:1 |
| Secondary text (`--ion-1`) on card | ≥ 3:1 |
| Plasma CTA text on plasma bg | Use `--plasma-ink` — verified |
| Orbital cyan on dark surface | AA at 14px+ — verified at `#00E5FF` on `#0D1117` |

**Rule**: `--ion-2` on `--carbon` is AA at 3:1 for large text only. Do not
use `--ion-2` for body copy on carbon. Use `--ion-1` minimum.

**Rule**: `--ion-3` is muted/placeholder only — it does not meet AA on any
background. Never use for readable content.

### Focus Rules

- `:focus-visible` uses a 2px `--plasma` outline with 2px offset and 2px
  border-radius. This is set globally. Never suppress `:focus-visible`.
- Interactive elements with custom styling must manually apply the focus rule
  if they override the default outline.

### Interactive Target Size

- Minimum touch target: 44×44px
- Buttons shorter than 32px height are forbidden on mobile surfaces
- Icon-only buttons require `aria-label`

### Screen Reader Requirements

- Every live data region updating asynchronously requires `aria-live="polite"`
  (not `aria-live="assertive"` — data updates are not emergencies)
- Every icon must have `aria-hidden="true"` if decorative, or `aria-label`
  if interactive
- Data tables require `<caption>` and `scope` attributes on headers

---

## Cockpit vs Public Surface Differences

The cockpit is Mission Control. The public surface is the intelligence report.
They share the design system but differ in density and content exposure.

| Dimension | Public surface | Cockpit |
|---|---|---|
| Information density | Curated — one signal per card | Dense — multiple signals per row |
| Color accent frequency | Sparse — plasma on CTAs only | Moderate — telemetry uses cyan + UV |
| Eyebrow labels | Minimal | Present on every section |
| Source citation | Tier label only | Full sourceId + tier + retrievedAt |
| Contradiction flags | Hidden | Visible — CONTRADICTED banner |
| Staleness warning | "Data as of [time]" | STALE badge in card header |
| Evidence chain | Summary (PRO+) | Full chain in expandable drawer |
| Tier 5 signals | Never shown | Watchlist panel with UNVERIFIED badge |
| Typography scale | Display sizes used | Smaller — body and mono dominant |
| Motion | Present — card entrances | Minimal — data updates in place |
| Navigation | Standard public nav | Cockpit sidebar |
| Error states | User-friendly copy | Full error + recovery action |

**Rule**: No cockpit component may be extracted and placed on a public route
without an explicit owner approval. The component boundary is a trust boundary.

---

## Signature Components

These are the uniquely Sports OS components that define the product's visual identity.

### Pick Card

The primary output unit. Structure:
```
[EYEBROW: sport + tier badge]          [LIVE indicator if recent]
[Primary call — large arch/display]
[Confidence meter + score]
[Evidence tier label]
[Source freshness timestamp]
[Weakness disclosure — "What would change this"]
[CTA button]
```
Confidence meter uses the confidence ladder colors. Weakness disclosure is
always present on PRO+ cards — never hidden for "cleanliness."

### Evidence Drawer

A slide-in panel showing the full evidence chain for a pick. Cockpit and PRO+.
Each evidence item shows: sourceId, tier badge (1–6), claim summary, retrievedAt,
validUntil, contradictionStatus. Contradictions are highlighted in `--alert`.

### Signal Ticker

A horizontal-scrolling live signal bar at the top of cockpit views.
JetBrains Mono, small. Orbital cyan for active signals, `--ion-2` for stale.
The only animated element in the cockpit — left-to-right continuous scroll.

### Market Gravity Meter

A visualization of market pressure score (0–100) with direction arrow.
The meter background is `--eclipse`. The fill uses the confidence ladder.
Accompanied by movement speed (mono, `--ion-1`) and book disagreement count.

### Source Tier Badge

An inline tag showing the tier of evidence: T1, T2, T3, T4, T5, T6.
Color: T1=ion-white, T2=orbital-cyan, T3=ultraviolet, T4=ion-1, T5=alert, T6=ion-3.
Always present on any surface displaying evidence. Never hidden.

### Confidence Score

Always shown as a number. Optionally accompanied by a horizontal bar.
The number uses `--t-num-lg` or larger. On public surfaces (PRO+), always
paired with the label "Confidence" in `--t-eyebrow`. Never shown without
the label — a bare number has no context.

### Settlement Badge

Post-game. Two states: WIN (verify mint) and LOSS (alert vermilion).
PUSH shown in `--ion-2`. VOID shown in `--ion-3`.
Monogram: "W", "L", "P", "V". Never "✓" or "✗" alone — screen readers need labels.
