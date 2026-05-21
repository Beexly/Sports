# Galaxy Sports Edge — Design System

> **Find the signal before the market moves.**
> A cinematic sports intelligence platform — picks, confidence, risk, market movement, and methodology delivered with the clarity of a financial terminal and the energy of a stadium under floodlights.

---

## What this is

This folder is the **Galaxy Sports Edge design system**: brand foundations, type, color, iconography, UI kit components, and reference layouts that any agent or designer can pull from to build on-brand artifacts (mocks, prototypes, slides, production code) for the Galaxy Sports Edge product.

Galaxy Sports Edge is a production-grade sports picks platform with:

- **Real odds ingestion** from dozens of sportsbooks (every 30 min)
- **Algorithmic pick scoring** with calibrated 0–100 confidence + edge scoring
- **Transparent methodology** — every pick exposes its factor breakdown
- **Subscription tiers** (Free / Pro $19 / Elite $49)
- **AI-assisted content & insight panels** (data-backed, never source of truth)
- **Published track record** — wins, losses, pushes, all public

The product surface is a Next.js 14 web app today (`apps/web` in the source repo). Mobile-native and broadcast graphics are future surfaces this system anticipates.

---

## Brand position

Galaxy Sports Edge is **not** a sportsbook, tout service, casino app, or generic dark-neon betting product. It is a **sports intelligence terminal** for serious bettors who want to understand *why*, not just *what*.

The voice is calm, factual, slightly cinematic. Numbers are heroes. Hype is the enemy. We never guarantee outcomes — we show our work and let the data speak.

---

## Sources

This design system was developed from the following source materials. Reviewers and future agents are encouraged to explore them for deeper context.

| Source | URL |
|---|---|
| **Beexly/Sports** — Next.js codebase (functional product source-of-truth: features, IA, copy, terminology) | https://github.com/Beexly/Sports |

> **Note on naming:** The source codebase ships under the working title *SportsPicks Pro*. The product brand owner has standardized on **Galaxy Sports Edge** — this design system uses *Galaxy Sports Edge* throughout. The codebase's IA, feature set, and copy patterns are unchanged; only the brand layer (name, logo, palette, typography) is reimagined.

---

## File index

```
README.md                ← you are here
SKILL.md                 ← agent skill manifest (Claude Code compatible)
colors_and_type.css      ← canonical tokens (colors, type, spacing, motion, glows)
fonts/README.md          ← font sourcing (Google Fonts via CDN)
assets/                  ← logos, marks
  logo-mark.svg          ← the reticle mark
  logo-lockup.svg        ← horizontal wordmark + mark
ui_kits/
  web/                   ← web product UI kit
    README.md
    index.html           ← composed product surface (nav, hero, picks, pricing, footer)
    kit.css              ← all component styles
preview/                 ← Design System tab cards
  sys-00–12-*.html       ← small focused system cards (logo, palette, type, components)
  01–07-*.html           ← cinematic pitch boards (manifesto, identity, mobile, etc.)
```

---

## Content fundamentals

### Voice

**Calm, factual, slightly cinematic.** We talk to bettors who are tired of being shouted at. We respect their intelligence and their bankroll.

- **First person plural** for the product ("We ingest…", "Our model scores…"). Never "I."
- **Second person** for the user ("You see…", "Your edge…"). Direct, never coy.
- **Active voice, present tense.** "The line moves" beats "the line has been moving."
- **Show, don't promise.** "+12.4% over 90 days" beats "We win."

### Tone modes

| Surface | Mode | Example |
|---|---|---|
| Hero / marketing | **Cinematic editorial** | *"Data-driven sports picks, powered by real odds."* |
| Pick cards / UI | **Terminal-precise** | *"EDGE 72 · CONF 81% · 5pt sharp move"* |
| Reasoning copy | **Analyst notes** | *"Sharp money on the under since open. Three-book consensus."* |
| Paywall / upgrade | **Direct, no manipulation** | *"Unlock confidence scores and full reasoning. $19/mo."* |
| Errors / empty | **Brief, honest** | *"No picks for this date. Picks generate when games are scheduled."* |
| Disclaimer | **Plain, serious** | *"We do not guarantee outcomes. Please gamble responsibly."* |

### Casing

- **Headlines:** Sentence case for body content. **Title Case** for nav, plan names, badges.
- **Eyebrows / micro-labels:** ALL CAPS with wide tracking, in mono (e.g. `EDGE SCORE`, `CONFIDENCE`, `UPDATED 14:32 ET`).
- **Buttons:** Sentence case ("Get free picks", "Upgrade to Pro").
- **Numbers:** Always tabular. Confidence as `81%`, edge as `72`, odds as `+150` / `−140` (use a real minus, not a hyphen).

### Word list

- ✅ **Pick**, **edge**, **confidence**, **slate**, **line**, **lean**, **strong play**, **elite play**, **factor breakdown**, **track record**, **sharp move**, **consensus**
- ✅ **Free**, **Pro**, **Elite** (the three tiers — always Title Case)
- ❌ Avoid: "lock," "guaranteed," "winner," "smash," "hammer," 🔥 emoji, "easy money"
- ❌ Avoid: "AI" as a marketing word — say "algorithm," "model," or "data pipeline." (AI is used internally for content generation only — never as source of truth, and never hype-marketed.)

### Emoji

Effectively zero. The only acceptable glyphs are unicode symbols that act as data: arrows for line movement (↑ ↓), the minus sign (−), bullets (·). No 🔥 ⚡️ 💰 🏆 — these belong to tout culture, which we are explicitly not.

### Example copy

| Bad | Good |
|---|---|
| "🔥 LOCK OF THE DAY 🔥" | "Strong Play · 81% confidence" |
| "Don't miss out on huge winners!" | "Today's slate · 14 games · 6 strong plays" |
| "Trust me bro" | "Reasoning published with every pick" |
| "AI-powered picks" | "Algorithmic scoring on live odds" |

---

## Visual foundations

### Palette — Carbon, Ion, the Signal Quartet

The palette is built around three layers:

- **Carbon environment** — layered cinematic depth (void, obsidian, carbon, eclipse, titanium, slate, mineral). Never flat black.
- **Ion neutrals** — cool mineral whites and silvers. Never warm beige.
- **Signal quartet** — four bold accents, each with a job. Lime and cyan are *rare* tick accents only.

```
ENVIRONMENT
  void        #04060A   deep environment ground
  obsidian    #070A11   default canvas
  carbon      #0B0F18   page bg — midnight carbon blue
  eclipse     #11161F   raised surface
  titanium    #181E28   elevated surface
  slate       #20283A   hover
  mineral     #2E3849   default border
  mineral-hi  #3C4961   hover border / strong divider

ION NEUTRALS
  ion-white   #EDF2F7   hero text — cool, never #FFF
  ion         #D5DDE9   primary text
  ion-1       #98A3B5   mineral silver — secondary
  ion-2       #5E6878   tertiary / meta
  ion-3       #3D4555   muted / disabled

SIGNAL TRIO (3 accents · 85–90% dark atmosphere · color emerges from darkness)
  plasma         #FF2D8A   PRIMARY — brand, CTAs, edge highlight
  (ion-blue replaces cobalt — softer, more telemetry-cold)
  ion-blue       #4FA8FF   SECONDARY — computational, calibrated confidence
  ultraviolet    #9B7BFA   DEPTH — model layer, hidden patterns

RARE ACCENTS (data ticks only — never major surfaces)
  lime           #D4FF3D   live tick, fresh-data ping
  cyan           #6FD9FF   small telemetry

RESULT STATES
  verify (mint)  #5FD9A3   positive confirm, never main brand
  alert          #FF6470   loss / critical risk
```

**Why plasma magenta?** Every betting product on the market is dark-blue, neon-green, or gold/casino. Plasma magenta has zero category gravity in sports intelligence — it instantly reads as *not a sportsbook*. **No gold, ever** — gold introduces casino energy, transactional psychology, and luxury-betting cues we explicitly reject. Paired with cold ion blue and ultraviolet depth, magenta owns a visual lane no competitor occupies: cultural, editorial, emotionally intelligent.

### Typography

| Role | Family | Use |
|---|---|---|
| **Display** | Syne (700/800) | Editorial hero headlines, page titles, signature surfaces |
| **Display alt** | Space Grotesk (600/700) | Secondary display, dense UI titles |
| **Editorial** | Instrument Serif (400) | Emotional moments, pull quotes, the word *perspective* |
| **Body** | Geist (400/500/600) | All running UI text, paragraphs, labels |
| **Mono** | JetBrains Mono (400/500/700) | All numerals in dataviz, eyebrows, line values, tickers, timestamps |

All four are on Google Fonts and load via the CDN import in `colors_and_type.css`. If self-hosting is required, see `fonts/README.md`.

**Type rules**

- All numerical data uses **JetBrains Mono with tabular numbers** — never the body font for confidence/odds/lines.
- Display sizes use **tight letter-spacing** (-0.02em) and **tight line-height** (1.0–1.1).
- Eyebrows are **mono, uppercase, 11–12px, +0.08em tracking**.
- Editorial serif is reserved — one per page max, used as a deliberate textural break.
- Body text is **15–16px, line-height 1.55, color bone-1**. Never set body in pure white on ink.

### Spacing

A **4px base grid**. Use the steps; never invent intermediate values.

```
4  8  12  16  20  24  32  40  48  64  80  120
```

Density rule: Galaxy Sports Edge UI is **comfortable, not cramped**. Card padding starts at 20px. Hero sections breathe at 64–120px vertical.

### Backgrounds

The system avoids gradient-fest aesthetics. Backgrounds are:

1. **Flat ink** (`--obsidian` or `--eclipse`) by default.
2. **Atmospheric glow** sparingly — a single soft radial of `signal` at ~6% opacity behind hero moments, blurred to 200px+. Never multi-color rainbow blurs.
3. **Hairline grid overlay** on certain command-center surfaces (1px lines at 32–48px, ~3% opacity) — gives a tactical/terminal feel without screaming "crypto dashboard."
4. **No** stock photo backgrounds, no hand-drawn illustration, no full-bleed sports photography in the core UI. Marketing surfaces may use **monochromatic, high-contrast b&w sports photography** with a slight cool tint — but never as required brand chrome.

### Animation

**Restrained and deliberate.** Galaxy Sports Edge is a terminal, not a toy.

- **Easing:** `cubic-bezier(0.2, 0, 0, 1)` — fast-out, settled-in. Custom `--ease-out-quart` token.
- **Durations:** 150ms for state changes (hover, focus), 300ms for layout shifts, 500ms only for page transitions.
- **Loading:** a single signal-plasma pulse dot, never spinner-on-spinner.
- **Number changes:** When confidence/line values update live, they fade out → fade in over 200ms in `ion-2` then return to `ion-white`. Never count up. The data ticks; we don't animate the tick.
- **No bounce.** No spring easing. No emoji confetti. No skeuomorphism.

### Hover & press states

- **Hover on text links:** color shifts from `ion-1` → `ion-white` (no underline).
- **Hover on signal-filled buttons:** background `signal` → `signal-glow` (slight over-bright).
- **Hover on ink-surface buttons:** border `mineral` → `mineral-hi`, background `eclipse` → `titanium`.
- **Press:** scale 0.98 + 80ms duration on primary CTAs. Other elements simply darken one step.
- **Focus:** always a 2px signal-plasma ring at 2px offset. Never default browser blue.

### Borders & shadows

- **Borders** are **always 1px** and always one of the `mineral` / `mineral-hi` tokens — never pure white-at-alpha.
- **Shadows** are minimal. Cards do not float by default. The one exception: hero CTA on the homepage uses a subtle signal-tinted shadow `0 0 40px -10px rgba(255, 45, 138, 0.25)` to feel "powered on."
- **Inner shadows** are not used.
- **Glow** (signal-tinted shadow) is reserved for *active/live* states — a "data is fresh" indicator might glow signal at 30% for the first 200ms after update.

### Corner radii

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | inputs, small tags |
| `--radius-sm` | 8px | buttons, badges, chips |
| `--radius-md` | 12px | cards, panels |
| `--radius-lg` | 16px | hero cards, modal sheets |
| `--radius-pill` | 999px | pill badges, status chips |

Galaxy Sports Edge never uses 20px+ pillowy radii. Cards feel **structural**, not soft.

### Cards

The signature Galaxy Sports Edge card:

- Background `--eclipse`
- 1px border `--mineral`
- `--radius-md` (12px)
- 20px padding default
- Hover (when interactive): border → `--mineral-hi`, no scale change
- Featured/active variant: 1px border in `--amber` for premium picks, or `--signal` for live/active picks
- **No drop shadow by default.** Cards sit on the ink, they don't float.

### Transparency & blur

Used **sparingly and tactically**:

- **Sticky nav** uses `backdrop-blur-md` over `rgba(7, 10, 17, 0.85)` — gives a glassy command-bar feel without being a "Vision Pro" trope.
- **Modal overlays** use solid ink-1 at 80% with a 16px backdrop blur.
- **Locked premium content** uses a 4px backdrop blur + signal-plasma lock icon to tease without obscuring layout.

### Imagery tone

When imagery appears (mostly in marketing and editorial surfaces):

- **Black & white**, high contrast, cinematic — think Magnum Photos, not stock sports clipart.
- Slight **cool tint** (#0B0E13 multiplied at 10%) to match ink palette.
- **No grain noise** added artificially. The image is the image.
- Sports photography focuses on **intensity and intelligence** (a coach's eyes, a court empty pre-game) — never celebration shots or money imagery.

### Fixed elements & layout

- **Max content width:** 1200px (`--width-content`).
- **Wide max:** 1440px (`--width-wide`) for dashboards.
- **Sticky nav** at top, 64px tall on desktop, 56px mobile.
- **Mobile-first.** All pick flows must work in a 375px-wide column.
- Sidebars are rare; the IA is mostly top-nav + content.

---

## Iconography

See `assets/` for source. The system uses three icon registers:

### 1. **Lucide** (CDN) — primary line-icon set
The source codebase already depends on `lucide-react`. We adopt **Lucide** at 1.5px stroke weight, 20–24px box, current-color stroke. Never filled, never two-tone.

Common icons: `target`, `trending-up`, `trending-down`, `lock`, `bar-chart-3`, `flame` (only as a data icon — "hot streak," never as decoration), `clock`, `bell`, `shield`, `arrow-right`, `chevron-right`, `check`, `x`, `info`, `alert-triangle`, `zap` (used **only** for "line moved" not for marketing hype).

```html
<!-- CDN -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="target" class="size-5 text-[--ion]"></i>
```

### 2. **Custom mark — the Reticle**
Galaxy Sports Edge's identity mark is a **reticle/crosshair** — a pilot's scope, fitting both the product name and the "command center" positioning. It is the only custom-drawn icon in the system. See `assets/logo-mark.svg`.

The reticle appears:
- As the logo
- As a loading state (a single ping outward)
- As an "in-focus" indicator on featured picks (a 1px reticle overlays the matchup at 20% opacity)

### 3. **Data glyphs**
A small set of unicode/typographic marks used as data, never decoration:
- `↑` `↓` for line movement direction
- `−` (real minus U+2212) for negative odds (never a hyphen `-`)
- `·` (middle dot U+00B7) as separator in meta strings
- `→` for navigation and "see all" patterns

### What we don't use

- ❌ Emoji of any kind in product UI
- ❌ Heroicons or Material Icons (we standardized on Lucide)
- ❌ Sport league logos rendered as decoration (we use the league abbreviation text in a pill: `NFL`, `NBA`, etc.)
- ❌ Three-quarter-perspective 3D icons or skeumorphic glyphs
- ❌ "Sports ball" emoji 🏀 — sport is named in mono text

---

## Substitutions flagged for the user

These need your review:

- **Fonts** are loaded via **Google Fonts CDN**. If you want self-hosted .woff2 files, drop them in `fonts/` and update `colors_and_type.css` to reference them. See `fonts/README.md`.
- **Logo mark** is original — drawn for this system. Replace `assets/logo-mark.svg` if you have a final brand mark.
- **Lucide icons** are pulled from CDN (the source codebase uses `lucide-react`, so this is consistent).

---

## How to use this system

When you're building anything for Galaxy Sports Edge:

1. Import `colors_and_type.css` first. It defines every token.
2. Browse `preview/` for visual reference of each token in use.
3. Copy components from `ui_kits/web/` into your file — they're written to be portable.
4. Read this README's **Content fundamentals** before writing any copy.
5. When in doubt: **less hype, more data, more breathing room.**

---

## Further exploration

The source codebase contains the full product surface (admin dashboard, pricing flows, blog, performance pages, etc.) that this design system can be applied to. Explore it for additional IA and copy context:

- **Beexly/Sports** — https://github.com/Beexly/Sports

Key files referenced:
- `apps/web/app/page.tsx` — homepage IA
- `apps/web/app/picks/page.tsx` — picks listing + filters + slate bar
- `apps/web/app/pricing/page.tsx` — three-tier pricing structure
- `apps/web/components/picks/pick-card.tsx` — pick card composition (confidence, edge, factor breakdown)
- `apps/web/components/ui/nav.tsx` — top nav
- `apps/web/components/ui/footer.tsx` — footer + legal pattern
- `apps/web/CLAUDE.md` — product overview, tier structure, non-negotiables
