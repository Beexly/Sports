# FORKABLE REPOS — Galaxy Sports Edge (GSE)
**Mission:** Mine open-source for high-value features to adopt with minimal work.
**License filter:** Permissive (MIT / Apache-2.0 / BSD / ISC / Unlicense / CC0) = GO. GPL / AGPL / no-license = SKIP.
**Date:** 2026-06-19

---

## COPY-NOW SHORTLIST
*Top ~10 permissive, low-effort, high-value features. Re-implement TS-native tonight. No new npm dependency.*

---

### 1. Calibration Curve / Reliability Diagram — SVG, TS-native
**Source:** hollance/reliability-diagrams (MIT, 169 stars)
https://github.com/hollance/reliability-diagrams

**What to copy:** The *algorithm*, not the Python code. The repo shows the canonical 10-bucket calibration curve: bin predictions by probability range (0–10%, 10–20%, …), plot actual win-rate per bucket vs. the diagonal perfect-calibration line. The math is dead simple (bucket counts + actual outcomes). The matplotlib output is irrelevant — we re-draw it in ~80 lines of pure SVG JSX.

**GSE surface:** Accuracy-proof / Track Record page. This is the single most trust-building visual for a premium picks site. "Here is our calibration curve vs. the diagonal" is the anti-slop differentiator.

**Adopt-mode:** COPY-NOW — port the bucketing logic to a ~60-line TypeScript function + a ~80-line `<CalibrationCurve>` SVG React component. Unit-test with mock pick history data. Zero new dependency.

**Implementation sketch:**
```ts
// buckets: [{predicted: 0.65, actual: 0.58, n: 47}, ...]
// SVG: 300×300, x=predicted probability, y=actual rate, dashed diagonal, dots sized by n
function buildCalibrationBuckets(picks: Pick[]): CalibrationBucket[] { ... }
```

---

### 2. NumberFlow — Animated Number Transitions (Odds/Confidence)
**Source:** barvian/number-flow (MIT, 7.4k stars)
https://github.com/barvian/number-flow

**What to copy:** The *pattern*, then decide if the npm package is acceptable. The library is MIT, dependency-free, built on Web Animations API + Intl.NumberFormat. React package: `@number-flow/react`.

**GSE surface:** Live odds display, confidence score badges, pick result counters. Animating `67 → 71` on a confidence score when a line moves feels premium and hand-built. Same for win-rate stats.

**Adopt-mode:** PARK (tiny npm dep, ~7.4k stars, actively maintained Feb 2026). Worth owner approval — it is exactly the anti-AI-slop motion detail. If owner declines, the pattern (CSS counter + keyframe on value change) is easily replicated in ~40 lines of TS with a `useEffect` diff.

**Copy-now fallback:** Roll a `useCountUp(target, duration)` hook using `requestAnimationFrame` — ~35 lines TypeScript, zero dep. Handles `67 → 71`, `0.624 → 0.638` odds, percentage points. Unit-testable with fake timers.

---

### 3. Conic-Gradient Animated Border Cards — Tailwind CSS
**Source:** Cruip blog + HyperUI (public code snippets, copyable)
https://cruip.com/animated-gradient-borders-with-tailwind-css/
https://hyperui.dev/blog/animated-border-gradient-with-tailwindcss/

**What to copy:** Pure CSS + Tailwind config snippet. Uses CSS `@property` for `--angle`, `conic-gradient` for the spinning border, Tailwind `animation` config. ~15 lines CSS + 3 lines `tailwind.config.ts`. No JS. No dependency.

**GSE surface:** Premium pick cards, "Elite" tier badge cards, featured game cards. Makes cards read as hand-crafted fintech/sports-intelligence, not AI-template.

**Adopt-mode:** COPY-NOW — it's a CSS snippet. Caveat: animated gradient border currently Chromium-only (not Firefox). The fallback (static gradient border) is graceful. Add a static fallback class for `@supports not (@property: --angle)`.

**Implementation note:** The pattern creates a 4px rotating gradient ring by setting `padding: 1px` on the outer gradient `div` and a solid-background inner `div`. Wrap as a `<GradientCard>` component that accepts a `variant` prop (`free` | `pro` | `elite`) controlling the gradient color stops.

---

### 4. SVG Sparklines — Inline Win-Rate/Line-Movement Charts
**Source:** mitjafelicijan/sparklines (BSD-2-Clause, 41 stars)
https://github.com/mitjafelicijan/sparklines

**What to copy:** The math for computing SVG `polyline` points from a `number[]` array. Single JS file, zero dependency, BSD-2-Clause (permissive). The HTML/attribute-based API is irrelevant — we extract the coordinate normalisation math (~30 lines) and wrap in a `<Sparkline data={[...]} width={80} height={24} />` React component.

**Better alternative to copy from:** The DEV Community tutorial "How to Create a Sparkline Component in React" (public domain pattern). The formula is just `x = (i / (data.length - 1)) * width`, `y = height - ((v - min) / (max - min)) * height`. Trivially re-implemented.

**GSE surface:** Pick cards (7-day win-rate trend), odds-movement sparkline inside a line-movement widget, calibration history trend.

**Adopt-mode:** COPY-NOW — 40 lines of TypeScript + SVG. No new dependency. Unit-test: given `[0.5, 0.6, 0.55, 0.7]`, verify the point array is monotonically increasing in x with correct min/max normalisation.

---

### 5. SVG Confidence Gauge — Semi-Circle Arc
**Source:** naikus/svg-gauge (MIT, 331 stars, has TS definitions)
https://github.com/naikus/svg-gauge

**What to copy:** The SVG arc math for a semi-circular gauge: `stroke-dasharray` + `stroke-dashoffset` on a `<circle>` with `r` and a rotation offset. The repo already provides a `React w/ TypeScript` hook example. ~50 lines to re-implement natively.

**GSE surface:** Confidence score display on premium pick cards (0–100 arc gauge). Beats a plain number, is dependency-free, and reads premium. Also useful for calibration ECE (Expected Calibration Error) score display.

**Adopt-mode:** COPY-NOW — extract the arc formula into a `<ConfidenceGauge value={74} max={100} />` component. ~55 lines TS + SVG. Unit-test: value=0 → dashoffset=full; value=100 → dashoffset=0.

**Arc formula:**
```ts
const radius = 45
const circumference = Math.PI * radius  // half-circle
const dashOffset = circumference - (value / max) * circumference
// <circle strokeDasharray={circumference} strokeDashoffset={dashOffset} />
```

---

### 6. Scroll-Reveal / Stagger Animations — motion-primitives
**Source:** ibelick/motion-primitives (MIT, 5.6k stars)
https://github.com/ibelick/motion-primitives

**What to copy:** The component patterns for `AnimatePresence`-based scroll reveal and stagger children. The repo is copy-paste first — no separate install beyond `framer-motion` (already likely in stack). Key patterns:
- Fade + slide-up on viewport entry (`IntersectionObserver` + `framer-motion` variants)
- Stagger children for multi-stat grids (`staggerChildren: 0.08`)
- Blur-in text reveal for narrative insight sections

**GSE surface:** Track record stats grid (stagger in the numbers), pick feed (fade-up cards on scroll), accuracy proof section (dramatic reveal of the calibration curve), homepage hero stats.

**Adopt-mode:** VENDOR — copy individual component files from the repo into `apps/web/components/motion/`. Framer Motion is the only dep (standard in Next.js 14 stacks). Attribution: MIT credit in component file header.

**Key components to port:**
- `BlurFade` (entry blur → clear)
- `StaggerReveal` wrapper
- `NumberTicker` (count-up on scroll entry, alternative to #2 above)

---

### 7. OG Image / Social Card — Satori + Next.js /opengraph-image
**Source:** vercel/satori (MPL-2.0, 13.6k stars)
https://github.com/vercel/satori

**License note:** MPL-2.0 is a file-level copyleft, NOT project-level. Using Satori as a dependency (not forking its source) is fine for commercial products. It is already the engine behind `@vercel/og` which is built into Next.js 14.

**What to copy/use:** The `app/picks/[id]/opengraph-image.tsx` route pattern with Satori-powered JSX. Community showcase at `github.com/vercel/satori/discussions/173` has 50+ real implementations to mine for layout patterns.

**GSE surface:** Every pick gets a share card with: team matchup, confidence badge, tier label (FREE/PRO/ELITE), GSE branding. When a bettor wins, they share the card — viral loop.

**Adopt-mode:** COPY-NOW pattern, PARK for the `@vercel/og` npm dep (already in Next.js 14 built-ins, effectively free). Implementation: 1 route file + 1 JSX card template. Flexbox layout supported (Yoga engine). Limitation: no Firefox-incompatible CSS, no WOFF2 fonts.

---

### 8. JSON-LD / Schema.org SEO — schema-dts (Apache-2.0)
**Source:** google/schema-dts (Apache-2.0, ~1.2k stars)
https://github.com/google/schema-dts

**What to copy:** TypeScript types for `SportsEvent`, `SportsOrganization`, `Article`, `FAQPage`, `BreadcrumbList`. Companion: `react-schemaorg` for `<JsonLd>` RSC embedding.

**GSE surface:** Every pick page gets `SportsEvent` structured data (teams, date, sport). Track record page gets `Article` + `Dataset`. Eligible for Google rich results "Events near me."

**Adopt-mode:** PARK — two small npm packages, actively maintained by Google. COPY-NOW alternative: write a `buildSportsEventJsonLd(pick: Pick): string` helper (~25 lines TS) that generates the JSON inline without the dep, using a manually typed interface. This is the velocity path — no dep approval needed.

---

### 9. Transactional Email Templates — React Email
**Source:** resend/react-email (MIT, 19.3k stars)
https://github.com/resend/react-email

**What to copy:** Component primitives + template patterns. Key components: `Button`, `Container`, `Heading`, `Section`, `Text`, `Hr`, `Link`, `Preview`. Tailwind integration included.

**GSE surface:** 
- Pick alert email (Elite tier: "New pick available — 74 confidence, NBA spread")
- Welcome email (Free user signup)
- Pick settled notification (win/loss + running accuracy stat)
- Upgrade nudge email (Free → Pro conversion)

**Adopt-mode:** VENDOR — install `@react-email/components` (MIT), copy their template patterns for the 4 emails above. Their `Stripe`/`Linear` template clones are the best styling references. Attribution: credit in email template files.

---

### 10. Headless Data Table — TanStack Table
**Source:** TanStack/table (MIT, 28.1k stars)
https://github.com/TanStack/table

**What to copy:** The headless table engine for the picks history / track record table. Sorting, filtering, pagination, and grouping with zero default styling — we apply our Tailwind design system.

**GSE surface:** Track record table (all settled picks, sortable by sport/date/confidence/result), admin picks management view, public calibration data table.

**Adopt-mode:** PARK — install `@tanstack/react-table` (MIT, 28k stars, major dep but industry standard). Not re-implementable TS-native without significant effort. Recommend owner approval, but this is about as safe a PARK as exists.

---

## VENDOR TIER
*Larger but permissive — worth pulling as a dependency with attribution. Needs owner sign-off or standard dep review.*

| Repo | License | Stars | What to Vendor | GSE Surface |
|---|---|---|---|---|
| **resend/react-email** | MIT | 19.3k | 4 email template files | Elite pick alerts, win notifications |
| **ibelick/motion-primitives** | MIT | 5.6k | 5–6 animation components | Stats reveal, card stagger, blur-in text |
| **TanStack/table** | MIT | 28.1k | Headless table engine | Track record / picks history table |
| **barvian/number-flow** | MIT | 7.4k | Animated number transitions | Odds/confidence score live updates |
| **garmeeh/next-seo** | MIT | 8.5k | App Router SEO + JSON-LD helper | Meta tags, OG, Twitter card per pick page |
| **kbar / timc1/kbar** | MIT | 5.2k | Command palette (⌘K) | Quick-search picks, jump to sport/game |

---

## PARK TIER
*Requires npm dependency addition + owner approval. High value but not re-implementable.*

| Repo | License | Stars | Blocker | GSE Surface |
|---|---|---|---|---|
| **TanStack/table** | MIT | 28.1k | npm dep | Track record, admin table |
| **TanStack/virtual** | MIT | ~5k | npm dep (pairs with above) | Virtualize large pick history lists |
| **@vercel/og** | MIT | (built-in) | Effectively already in Next.js 14 | OG image per pick |
| **google/schema-dts** | Apache-2.0 | 1.2k | npm dep (tiny, optional) | Typed JSON-LD for SportsEvent |
| **react-schemaorg** | Apache-2.0 | ~300 | npm dep (pairs with above) | RSC JSON-LD embedding |
| **countup.js** (inorganik) | MIT | 8.2k | npm dep | Animated stat counters (fallback for #2) |

---

## SKIPPED — LICENSE OR QUALITY ISSUES

| Repo | Reason Skipped |
|---|---|
| **hollance/reliability-diagrams** | Python/matplotlib only — copy the *algorithm*, not the code |
| **LinoGoncalves/GoalCast** | Python-only stack (FastAPI + Streamlit), 2 stars, no UI to copy |
| **ultrabet-ui (anssip)** | No license found, in-progress/incomplete UI |
| **vue-data-ui (graphieros)** | Vue 3 only — porting cost too high |
| **react-trend (unsplash)** | Archived Jun 2019, unmaintained |
| **openthomas (realworkagent)** | CLI-only, no UI, 1 commit — mine algorithm only (Kelly, Elo prior, devig) |
| Any AGPL/GPL project | Instantly skipped per owner directive |

---

## ALGORITHM MINES (No License Friction — Re-implement TS-native)

These repos have permissive licenses on *logic* we can port to TypeScript without dependency:

### openthomas — Kelly Criterion + Market Devig
https://github.com/realworkagent/openthomas (MIT, 361 stars)
- **Devig formula:** remove the vig from American odds to get true probabilities (`pTrue = 1/decimalOdds / sum(1/decimalOdds for all outcomes)`)
- **Fractional Kelly:** `f* = (edge / odds) * fraction` where `fraction = 0.25` (quarter-Kelly for safety)
- Port to ~50 lines TS in `packages/prediction-engine/src/kelly.ts`
- Unit-test: given -110/-110 (50/50 market), verify devig gives 0.5/0.5; given a 55% model vs 50.5% implied, Kelly suggests ~4.5% bankroll.

### Hicruben/world-cup-2026-prediction-model — Elo + Monte Carlo Core
https://github.com/Hicruben/world-cup-2026-prediction-model (MIT, 55 stars)
- Exports pure `matchProb(teamA, teamB)` and `sampleMatch()` functions in `elo.mjs`
- Port the Elo update rule to TS for tracking team strength over time
- Use as input to confidence-score generation alongside The Odds API implied probabilities

### hollance/reliability-diagrams — Calibration Bucketing Math
https://github.com/hollance/reliability-diagrams (MIT, 169 stars)
- 10-bucket ECE (Expected Calibration Error) formula
- `ECE = Σ (|bucket_count| / total) * |avg_confidence - avg_accuracy|`
- Port to ~60 lines TS in `packages/prediction-engine/src/calibration.ts`

---

## PRIORITY EXECUTION ORDER (Tonight's Build Plan)

Ordered by: zero-new-dep first, then low-dep, then approved deps.

1. **`<CalibrationCurve />` component** — port hollance math → SVG React. (~2h)
2. **`<Sparkline />` component** — 40-line SVG polyline. (~30min)
3. **`<ConfidenceGauge />` component** — SVG arc. (~45min)
4. **`<GradientCard />` Tailwind component** — animated conic-gradient border. (~20min)
5. **`useCountUp()` hook** — RAF-based number animation. (~30min)
6. **Kelly devig util** — port openthomas math to TS. (~45min)
7. **OG image route** — `app/picks/[id]/opengraph-image.tsx` with Satori. (~1.5h)
8. **JSON-LD util** — `buildSportsEventJsonLd()` inline, no dep. (~20min)
9. **Motion primitives** — copy `BlurFade` + `StaggerReveal` component files. (~30min)
10. **React Email templates** — 4 email templates (alert, welcome, settled, nudge). (~2h, VENDOR)

**Total COPY-NOW effort estimate: ~6–7h for items 1–9**
**Total VENDOR effort estimate: ~2h for item 10 + dep approval**

---

## SOURCES CONSULTED

- https://github.com/hollance/reliability-diagrams
- https://github.com/barvian/number-flow
- https://github.com/ibelick/motion-primitives
- https://github.com/itsjwill/motion-primitives-website
- https://github.com/vercel/satori
- https://github.com/resend/react-email
- https://github.com/TanStack/table
- https://github.com/TanStack/virtual
- https://github.com/timc1/kbar
- https://github.com/inorganik/countUp.js
- https://github.com/naikus/svg-gauge
- https://github.com/mitjafelicijan/sparklines
- https://github.com/garmeeh/next-seo
- https://github.com/google/schema-dts
- https://github.com/Kiranism/next-shadcn-dashboard-starter
- https://github.com/TailAdmin/free-nextjs-admin-dashboard
- https://github.com/realworkagent/openthomas
- https://github.com/Hicruben/world-cup-2026-prediction-model
- https://github.com/LinoGoncalves/GoalCast
- https://cruip.com/animated-gradient-borders-with-tailwind-css/
- https://hyperui.dev/blog/animated-border-gradient-with-tailwindcss/
- https://github.com/topics/sports-analytics?l=typescript
- https://github.com/topics/sports-betting?l=typescript
