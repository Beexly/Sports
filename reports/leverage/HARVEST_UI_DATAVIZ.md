# HARVEST: Premium UI & Data-Viz Features for Galaxy Sports Edge (GSE)
**Research date:** 2026-06-19  
**Scope:** Open-source repos with MIT / Apache-2.0 / BSD / ISC / CC0 / Unlicense ONLY  
**GPL/AGPL/no-license repos:** excluded and not documented  
**Usage model:** Copy the technique, not the package. COPY-NOW = zero new dependency, pure TS re-implement. VENDOR = bring the permissive package as-is. PARK = needs an npm dep but the dep is permissive — schedule separately.

---

## TOP 10 COPY-NOW TABLE

Ranked by value × (1/effort) for GSE's data-dense, dark-first sports context.

| Rank | Feature | Source Repo | License | Stars | GSE Surface | Effort (1=trivial, 5=hard) | Adopt Mode |
|------|---------|------------|---------|-------|-------------|---------------------------|------------|
| 1 | **Animated number transitions** (digit-flip via Web Animations API) | `barvian/number-flow` | MIT | 7.4k | Odds display, confidence scores, live totals | 2 | COPY-NOW |
| 2 | **Inline SVG sparklines** (path generation, hover spot) | `fnando/sparkline` | MIT | 545 | Pick card trend lines, odds movement inline | 2 | COPY-NOW |
| 3 | **Shimmer/skeleton via CSS only** (`@keyframes` gradient sweep) | Technique from `darula-hpp/shimmer-from-structure` | MIT | — | All data-loading states (picks, odds, stats) | 1 | COPY-NOW |
| 4 | **CSS scroll-reveal** (native `@scroll-timeline` / `animation-timeline`) | MDN + `flackr/scroll-timeline` polyfill | MIT | — | Homepage hero, pick reveal, scrollytelling | 2 | COPY-NOW |
| 5 | **Animated SVG gauge** (stroke-dasharray + CSS transition) | `naikus/svg-gauge` + `tomickigrzegorz/circular-progress-bar` | MIT | 331 / 55 | Confidence meter, win-probability ring | 2 | COPY-NOW |
| 6 | **Calendar heatmap** (SVG grid, classForValue callback) | `kevinsqi/react-calendar-heatmap` | MIT | 1.3k | Pick history calendar, ATS streak tracker | 2 | COPY-NOW |
| 7 | **FLIP list reorder** (transform translate, Web Animations API) | technique from `joshwcomeau/react-flip-move` | MIT | 4.1k | Live leaderboard reorder, odds table sort | 3 | COPY-NOW |
| 8 | **Tailwind motion utility classes** (no JS runtime, CSS-only) | `romboHQ/tailwindcss-motion` | MIT | 3.3k | Pick cards, stat tiles, CTA micro-animations | 1 | COPY-NOW |
| 9 | **Copy-to-clipboard + success state** (Clipboard API + event delegation) | `zenorocha/clipboard.js` | MIT | 34.1k | Pick share, code/link copy widgets | 1 | COPY-NOW |
| 10 | **Dark-theme no-flash** (inline script injects `data-theme` before paint) | `pacocoursey/next-themes` | MIT | 6.3k | Site-wide dark mode toggle with zero FOUC | 1 | COPY-NOW |

---

## FULL RANKED FEATURE CATALOG (25–40 entries)

### TIER A — COPY-NOW, zero new dependencies

---

#### A1. Animated Number Flow
**Repo:** `barvian/number-flow` — https://github.com/barvian/number-flow  
**License:** MIT | **Stars:** 7.4k  
**Technique:** Uses Web Animations API + Intl.NumberFormat. Splits digit characters into individually animated spans. Each digit cross-fades vertically (slot-machine style) when the number changes. The technique is pure DOM + CSS Transitions — re-implementable in ~100 lines of TS.  
**GSE Surface:** Real-time odds tiles (e.g. -110 → -115 flash), confidence score reveals, subscription counter, calibration accuracy %.  
**Effort:** 2/5 — Build a `<AnimatedNumber>` component wrapping a `useEffect` that diffs digit arrays, adds transition classes, and removes them after `transitionend`.  
**Adopt Mode:** COPY-NOW  
**Key file/technique:** Split `String(value)` → char array; wrap each in `<span style="display:inline-block; transition: transform 200ms ease">`; animate `translateY(-100%/0/+100%)` for up/down direction.

---

#### A2. SVG Sparkline — Path Generator
**Repo:** `fnando/sparkline` — https://github.com/fnando/sparkline  
**License:** MIT | **Stars:** 545  
**Technique:** Zero-dependency. Computes `polyline` points from a normalized data array: `x = index * (width / (n-1))`, `y = height - (value / max) * height`. Uses SVG `<polyline>` for the line and a closed `<path>` for the fill area. Hover spot via mouse-events on an invisible overlay `<rect>`.  
**GSE Surface:** Pick card line trend, odds movement panel, 7-day win-rate sparkline in team stat tables, confidence distribution trail.  
**Effort:** 2/5 — ~60 lines: a `buildSVGPath(data, width, height)` utility + a `<Sparkline>` component.  
**Adopt Mode:** COPY-NOW  
**Key technique:** `points.map((v,i) => [x(i), y(v)]).join(' ')` for `<polyline>`; for area, append `L W,H L 0,H Z` to close the path.

---

#### A3. CSS-Only Skeleton/Shimmer
**Repo inspiration:** `darula-hpp/shimmer-from-structure` (MIT), Tailwind ecosystem patterns  
**License:** MIT | **Stars:** varies  
**Technique:** Pure CSS: `@keyframes shimmer { from { background-position: -200% 0 } to { background-position: 200% 0 } }`. Apply to any element with `background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)` + `background-size: 200%`. No JS required. Structure-aware version uses `getBoundingClientRect()` to overlay shimmer blocks matching the real layout.  
**GSE Surface:** Picks feed loading, odds table loading, stat cards, user profile skeleton on first load.  
**Effort:** 1/5 — One Tailwind `animate-shimmer` custom utility or a `<Skeleton>` component wrapping a `<div>` with the CSS class.  
**Adopt Mode:** COPY-NOW  
**Key snippet:** Tailwind config: `animation: { shimmer: 'shimmer 1.5s infinite' }`, `keyframes: { shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } } }`.

---

#### A4. CSS Scroll-Reveal / Scroll-Driven Animations
**Source:** Native CSS `animation-timeline: scroll()` / `view()` — W3C spec; polyfill at `flackr/scroll-timeline` (MIT, ~500 stars)  
**License:** MIT (polyfill) / Native (no dep at all in Chrome 115+, Firefox 110+, Safari 18+)  
**Technique:** Bind a `@keyframes` to `animation-timeline: view()` — the browser plays the animation as the element scrolls into/through the viewport. No IntersectionObserver, no JS scroll listener. Polyfill covers gaps. For a simpler fallback, use a 4-line `useInView` hook with `IntersectionObserver`.  
**GSE Surface:** Homepage "How it works" scrollytelling, pick card reveal on scroll, stat callout fade-in, testimonial stagger.  
**Effort:** 2/5 — CSS-only for modern browsers. JS fallback `useIntersectionObserver()` hook is ~20 lines.  
**Adopt Mode:** COPY-NOW  
**Key snippet:** `@keyframes fadeUp { from { opacity: 0; translate: 0 2rem } to { opacity: 1; translate: 0 0 } } .reveal { animation: fadeUp linear both; animation-timeline: view(); animation-range: entry 0% entry 30%; }`

---

#### A5. Animated SVG Gauge / Confidence Ring
**Repos:**  
- `naikus/svg-gauge` — https://github.com/naikus/svg-gauge (MIT, 331 stars, zero-dep)  
- `tomickigrzegorz/circular-progress-bar` — https://github.com/tomickigrzegorz/circular-progress-bar (MIT, 55 stars, zero-dep, ~3KB)  
**Technique:** `stroke-dasharray` + `stroke-dashoffset` on an SVG `<circle>`. `dashoffset = circumference * (1 - value/100)`. Animate via CSS transition `transition: stroke-dashoffset 600ms ease-out`. The gauge variant uses arc clipping with `dialStartAngle`/`dialEndAngle`.  
**GSE Surface:** Confidence percentage ring on premium pick cards, win-probability gauge on game pages, "model accuracy" ring on calibration dashboard.  
**Effort:** 2/5 — ~80 lines of TS. A `<ConfidenceRing value={78} size={64} />` React component is the full implementation.  
**Adopt Mode:** COPY-NOW  
**Key formula:** `circumference = 2 * π * r`; `offset = circumference * (1 - pct/100)`.

---

#### A6. Calendar Activity Heatmap
**Repo:** `kevinsqi/react-calendar-heatmap` — https://github.com/kevinsqi/react-calendar-heatmap  
**License:** MIT | **Stars:** 1.3k  
**Technique:** SVG grid of `<rect>` cells. Each cell is colored via `classForValue(val)` → CSS fill. Accepts `[{ date, count }]`. Weeks run left-to-right, days top-to-bottom (GitHub contribution graph layout). Color scales via CSS custom properties.  
**GSE Surface:** Picker's ATS history calendar, daily pick volume tracker, subscriber growth heat calendar, "streak" visualization on public leaderboard.  
**Effort:** 2/5 — Can adopt the package (MIT) or re-implement in ~120 lines. Re-implement with CSS variables for GSE dark-theme color ramps (e.g. `--heat-0: #0f172a` through `--heat-4: #16a34a`).  
**Adopt Mode:** COPY-NOW (re-implement) or VENDOR (use package directly)

---

#### A7. FLIP List Animation
**Repo:** `joshwcomeau/react-flip-move` — https://github.com/joshwcomeau/react-flip-move  
(MIT, 4.1k stars — archived, but technique is copy-worthy)  
Also: `AntonVoronezh/simple-flip-motion` (MIT) using Web Animations API — modern approach.  
**Technique:** FLIP = First, Last, Invert, Play. Before DOM update: record `getBoundingClientRect()` for each keyed element (First). After update: record again (Last). Compute delta (Invert = negative delta applied as a transform). Use `requestAnimationFrame` to remove the inversion while playing a `transform: translate(0,0)` transition (Play). Hardware-accelerated, no layout thrash.  
**GSE Surface:** Odds rankings that re-sort live, leaderboard shuffles, pick list reordering by confidence/tier, line movement table re-rank.  
**Effort:** 3/5 — ~150 lines for a `<FlipGroup>` hook. Use `useLayoutEffect` for synchronous measurement before browser paint.  
**Adopt Mode:** COPY-NOW

---

#### A8. Tailwind Motion Utilities
**Repo:** `romboHQ/tailwindcss-motion` — https://github.com/romboHQ/tailwindcss-motion  
**License:** MIT | **Stars:** 3.3k  
**Technique:** Pure Tailwind CSS plugin (TypeScript, 98.4% TS). Generates utility classes like `motion-translate-y-in-100 motion-opacity-in-0 motion-duration-300` that compose into entrance animations via generated `@keyframes`. Zero JS runtime. Drop into `tailwind.config.ts`, use classes directly in JSX.  
**GSE Surface:** Pick card entrance animation, stat tile pop-in, success state micro-animation after bet slip submission, notification badge bounce.  
**Effort:** 1/5 — Add plugin to `tailwind.config.ts`, apply classes.  
**Adopt Mode:** VENDOR (the Tailwind plugin is the dependency; install once)

---

#### A9. Copy-to-Clipboard + Feedback State
**Repo:** `zenorocha/clipboard.js` — https://github.com/zenorocha/clipboard.js  
Also native: `navigator.clipboard.writeText()` — zero library needed in modern browsers.  
**License:** MIT | **Stars:** 34.1k  
**Technique (native re-implementation):** `navigator.clipboard.writeText(text).then(() => setLabel('Copied!')).catch(() => /* fallback */)`. Add `setTimeout` to reset label after 2s. Fallback: `document.execCommand('copy')` via hidden `<textarea>`. Event delegation approach from clipboard.js (single listener on parent) reduces listener overhead.  
**GSE Surface:** "Copy pick link" button, share pick card, copy bet slip to clipboard, copy referral code.  
**Effort:** 1/5 — A `useCopyToClipboard()` hook is ~15 lines.  
**Adopt Mode:** COPY-NOW  
**Key hook:**
```ts
function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  return { copied, copy };
}
```

---

#### A10. Dark-Theme No-Flash (next-themes pattern)
**Repo:** `pacocoursey/next-themes` — https://github.com/pacocoursey/next-themes  
**License:** MIT | **Stars:** 6.3k  
**Technique:** Injects a tiny blocking `<script>` into `<head>` that reads `localStorage.theme`, sets `document.documentElement.dataset.theme = theme` (or adds a CSS class) synchronously before first paint. This eliminates the flash-of-wrong-theme (FOWT). The rest is a React context providing `useTheme()`.  
**GSE Surface:** Site-wide dark/light toggle. GSE is dark-first — this pattern ensures no white flash on cold load.  
**Effort:** 1/5 — Can use next-themes directly (MIT) or extract the blocking script pattern (5 lines) into `app/layout.tsx`.  
**Adopt Mode:** VENDOR (next-themes) or COPY-NOW (inline script only)

---

### TIER B — COPY-NOW, moderate complexity

---

#### B1. Stacked Toast Notifications
**Repo:** `emilkowalski/sonner` — https://github.com/emilkowalski/sonner  
**License:** MIT | **Stars:** 12.5k  
**Technique:** Renders toasts into a `<Toaster>` portal. Uses CSS `transform: translateY` + `scale` to create the stacked card effect — toasts behind the active one are scaled down (e.g. `scale(0.95)`) and translated up, creating visual depth. Swipe-to-dismiss via pointer events tracking `deltaX`. CSS variables control color, radius, z-index. The animation is pure CSS transitions (no JS animation library).  
**GSE Surface:** "Pick published", "Alert sent", "Subscription activated", "New line movement on your game" — all benefit from a visually premium stacked toast system.  
**Effort:** 3/5 to re-implement the full stack effect; VENDOR if using package directly. The technique (CSS scale/translate stacking) is COPY-NOW in ~80 lines.  
**Adopt Mode:** VENDOR (Sonner package is MIT, minimal) or COPY-NOW for the stacking technique

---

#### B2. Command Palette (⌘K)
**Repos:**  
- `pacocoursey/cmdk` — https://github.com/pacocoursey/cmdk (MIT, 12.7k stars) — powers Linear, Raycast  
- `timc1/kbar` — https://github.com/timc1/kbar (MIT, 5.2k stars) — virtualized, provider pattern  
**Technique (cmdk):** Composable API — renders items, fuzzy-filters and sorts automatically. Uses React context + reducer. Built-in keyboard nav (↑↓ Enter Esc). No virtualization needed up to ~3k items. For GSE, register global shortcut with `useEffect(() => { ... document.addEventListener('keydown', ...) }, [])`.  
**GSE Surface:** Global search (picks by sport/team/date), quick navigation (jump to game, open odds panel), admin shortcuts (publish pick, trigger refresh). Essential power-user feature for a data-dense cockpit.  
**Effort:** 3/5 — Use cmdk (VENDOR), wrap with a `<CommandPalette>` that seeds actions from `getEntitlements` + game list.  
**Adopt Mode:** VENDOR (cmdk is MIT, ~10KB)

---

#### B3. Premium Sortable Data Table (TanStack Table + Virtual)
**Repos:**  
- `TanStack/table` — MIT, 26k+ stars — headless table engine  
- `sadmann7/tablecn` — MIT, 6.2k stars — copy-paste shadcn/ui patterns  
- `openstatusHQ/data-table-filters` — MIT, 2k stars — faceted filters, AI filter inference  
**Technique:** TanStack Table is fully headless. Use `useReactTable` with `getSortedRowModel()`, `getFilteredRowModel()`, `getPaginationRowModel()`. Pair with `@tanstack/react-virtual` for rows > 500. Schema-driven column defs via `col.*` factory (from data-table-filters) reduce boilerplate 60%.  
**GSE Surface:** Picks table (sort by confidence, sport, game, tier, date), odds comparison table (sort by sportsbook, line), subscriber management, historical results archive.  
**Effort:** 4/5 — Rich table with faceted filters + virtualization is substantial. tablecn provides 80% of the boilerplate via copy-paste.  
**Adopt Mode:** VENDOR (TanStack Table + Virtual are both MIT) + COPY-NOW for column defs / filter patterns from tablecn

---

#### B4. Canvas-Based High-Performance Data Grid (Glide Data Grid)
**Repo:** `glideapps/glide-data-grid` — https://github.com/glideapps/glide-data-grid  
**License:** MIT | **Stars:** 5.2k  
**Technique:** Canvas rendering instead of DOM virtualization. Draws each cell via `CanvasRenderingContext2D`. Handles 10M+ cells at 60FPS. Column/row sizes are virtual — no DOM elements per row. Theming via a `Theme` object with CSS-mapped hex values (dark theme trivial to implement).  
**GSE Surface:** Large historical odds archive (thousands of rows), multi-sport picks grid, power-user data export table. Use where TanStack/DOM table hits performance limits.  
**Effort:** 4/5 — API surface is large; dark theme config is simple; copy the `GridColumn[]` definition pattern.  
**Adopt Mode:** VENDOR (MIT, with lodash/marked peer deps)

---

#### B5. Vaul Bottom-Sheet / Drawer
**Repo:** `emilkowalski/vaul` — https://github.com/emilkowalski/vaul  
**License:** MIT | **Stars:** 8.4k  
*(Note: repo marked as currently unmaintained by author but widely forked/adopted)*  
**Technique:** Snap-point system via pointer-event tracking. Draggable height uses CSS `transform: translateY`. Snap points are numeric positions (e.g. `[0.33, 1]`) — release velocity + proximity determines which snap fires. Uses Radix Dialog primitive for backdrop/portal.  
**GSE Surface:** Mobile pick detail overlay, quick odds comparison sheet on mobile, bet slip bottom drawer, filter panel on mobile picks feed.  
**Effort:** 3/5 — Use package (MIT) + style with GSE Tailwind tokens. Or study snap-point logic for a custom implementation.  
**Adopt Mode:** VENDOR (MIT, uses Radix Dialog as peer dep)

---

#### B6. Floating Tooltip / Popover (Floating UI)
**Repo:** `floating-ui/floating-ui` — https://github.com/floating-ui/floating-ui  
**License:** MIT | **Stars:** 32.6k  
**Technique:** Computes position with `computePosition(reference, floating, { middleware: [flip(), shift(), offset(8)] })`. The `flip` middleware inverts placement when clipped. `shift` nudges within viewport. Core is framework-agnostic (`@floating-ui/core`). React bindings in `@floating-ui/react`. Native Popover API (Chrome 115+) can replace much of this — zero dep for modern targets.  
**GSE Surface:** Pick factor trail popover, odds definition tooltip, "What is CLV?" explainer tooltip, sportsbook logo tooltip (full name on hover), line movement delta tooltip.  
**Effort:** 2/5 — For modern browsers, use native `popover` attribute + CSS `anchor-positioning`. For broader support, use `@floating-ui/react` (MIT).  
**Adopt Mode:** VENDOR (`@floating-ui/react`, MIT) or COPY-NOW (native Popover API for Baseline browsers)

---

#### B7. AutoAnimate — Drop-in List/Add/Remove Animations
**Repo:** `formkit/auto-animate` — https://github.com/formkit/auto-animate  
**License:** MIT | **Stars:** 13.9k  
**Technique:** Uses FLIP internally (MutationObserver watches DOM mutations, computes delta between old/new positions, plays CSS transition on `transform`). A single `useAutoAnimate()` hook or `data-auto-animate` attribute is the full API. Works with React, Vue, Svelte, or vanilla JS.  
**GSE Surface:** Picks feed list (adding/removing picks animates naturally), filtered odds table, notification inbox, leaderboard shuffles.  
**Effort:** 1/5 — Literally `const [parent] = useAutoAnimate(); <ul ref={parent}>`.  
**Adopt Mode:** VENDOR (MIT, very small package ~2.7KB gzipped)

---

#### B8. Confetti / Win Celebration
**Repo:** `alampros/react-confetti` — https://github.com/alampros/react-confetti  
**License:** MIT | **Stars:** 1.7k  
**Technique:** Canvas-based. Each confetti particle is a `Particle` object with position, velocity, rotation, color. `requestAnimationFrame` loop updates physics (gravity, drag) and calls `drawShape()` via `CanvasRenderingContext2D`. `run` prop starts/stops the loop. Recycle particles to avoid GC pressure.  
**GSE Surface:** "Pick won!" celebration on result grading, subscription upgrade confirmation, first correct pick streak milestone.  
**Effort:** 2/5 to re-implement a compact version; use package for full feature set (MIT).  
**Adopt Mode:** VENDOR (MIT) or COPY-NOW for a trimmed canvas particle loop (~60 lines)

---

#### B9. Faceted Filter + AI-Inferred Filter (data-table-filters)
**Repo:** `openstatusHQ/data-table-filters` — https://github.com/openstatusHQ/data-table-filters  
**License:** MIT | **Stars:** 2k  
**Technique:** Schema-driven `col.*` factory generates column definitions and filter configs from one source. Supports filter types: text, select, multi-select, date range, number range, slider. URL state via `nuqs` (shareable filtered views). AI filter inference from natural language queries using a `/api/filter` route that calls an LLM to return a structured filter object.  
**GSE Surface:** Picks discovery filter bar (sport, tier, confidence range, date range, ATS record), subscriber admin table, odds archive search. The AI-inferred filter is particularly powerful: user types "NFL games this week with confidence > 70" and the picks table updates.  
**Effort:** 4/5 — Substantial schema + state wiring, but tablecn / data-table-filters provide 80% as copy-paste blocks.  
**Adopt Mode:** COPY-NOW (patterns) + VENDOR (TanStack Table, nuqs — both MIT)

---

#### B10. Recharts Composable SVG Charts
**Repo:** `recharts/recharts` — https://github.com/recharts/recharts  
**License:** MIT | **Stars:** 27.3k  
**Technique:** D3-backed, React-native SVG composition. Primitives: `<LineChart>`, `<AreaChart>`, `<BarChart>`, `<ComposedChart>`, `<ScatterChart>`. Custom tooltips via `content={<CustomTooltip />}`. Sparkline variant: `<LineChart width={100} height={32}` with no axes, no grid, just a single `<Line>`. Responsive via `<ResponsiveContainer>`.  
**GSE Surface:** Confidence calibration curve (scatter + reference diagonal), pick volume by sport (stacked bar), odds opening vs. closing (dual-line), ROI over time (area), win-rate by sport (radar). Default shadcn/ui chart is built on recharts.  
**Effort:** 2/5 — Already possibly in project dependencies via shadcn charts. Custom tooltip with styled `<div>` matches GSE dark theme.  
**Adopt Mode:** VENDOR (MIT) — likely already present

---

### TIER C — HIGH VALUE, NEEDS NPM DEP (PARK for now)

---

#### C1. Nivo Heatmap (Canvas variant)
**Repo:** `plouc/nivo` — https://github.com/plouc/nivo  
**License:** MIT | **Stars:** 14k  
**Technique:** Three rendering modes: SVG, Canvas, HTTP API. Canvas variant (`@nivo/heatmap/canvas`) handles large matrices without DOM overhead. Color scales via `@nivo/colors`. Animated transitions via react-spring. Scoped packages allow tree-shaking (`@nivo/heatmap` only, ~30KB).  
**GSE Surface:** Team vs. opponent ATS heatmap, day-of-week × sport performance matrix, sportsbook consensus heatmap (sharp vs. public money by game).  
**Effort:** 3/5 — VENDOR.  
**Adopt Mode:** PARK → VENDOR when heatmap feature is prioritized

---

#### C2. visx (Airbnb) — Low-Level D3 Primitives
**Repo:** `airbnb/visx` — https://github.com/airbnb/visx  
**License:** MIT | **Stars:** 20.9k  
**Technique:** Monorepo of composable D3 + React primitives: `@visx/shape` (bars, lines, areas, arcs), `@visx/scale` (band, linear, log, time), `@visx/axis`, `@visx/grid`, `@visx/tooltip`, `@visx/brush`. Import only what you need. Enables fully custom charts impossible with recharts/nivo.  
**GSE Surface:** Reliability diagram (calibration scatter with diagonal reference line), custom odds-movement violin plot, rolling-win-rate area chart with brush/zoom, custom annotated line chart.  
**Effort:** 5/5 — Maximum control, maximum complexity.  
**Adopt Mode:** PARK → VENDOR for advanced analytics views (calibration dashboard, factor analysis)

---

#### C3. Number Flow (React component — dep-lite)
**Repo:** `barvian/number-flow` — https://github.com/barvian/number-flow  
**License:** MIT | **Stars:** 7.4k  
**Technique:** Web Animations API + CSS custom properties. Digit characters are individually animated spans with character-level transitions. Supports `Intl.NumberFormat` options (currency, compact, percent). Spin direction is value-aware (upward move = upward spin). Built on the Web Animations API — no requestAnimationFrame polling.  
**GSE Surface:** Odds tiles (live -110 → -115 transition), bankroll balance display, confidence score change, subscriber count, total picks graded.  
**Effort:** 1/5 to use the package.  
**Adopt Mode:** VENDOR (MIT, but installs as npm dep) — or COPY-NOW the core digit-split + Web Animations pattern in ~100 lines TS.

---

#### C4. Motion (formerly Framer Motion) — Spring Physics
**Repo:** `motiondivision/motion` — https://github.com/motiondivision/motion  
**License:** MIT | **Stars:** 32.4k  
**Technique:** "Hybrid engine" — delegates CSS transitions to the browser for opacity/transform (GPU), keeps JS spring physics engine for complex values. Spring formula: `F = -k * displacement - damping * velocity`. Layout animation via FLIP under the hood. Gesture support (hover, tap, drag) via pointer events.  
**GSE Surface:** Page transitions (picks → game detail), pick card hover lift effect, drag-to-dismiss overlays, animated sidebar entry, scroll-triggered stat callouts with spring easing.  
**Effort:** 2/5 to use the package — wrapping `<div>` with `<motion.div whileHover={{ y: -4 }}>` is trivial.  
**Copy-Now for spring physics:** The damped spring formula is 15 lines of TS and can be used in any `requestAnimationFrame` loop without the library.  
**Adopt Mode:** VENDOR (MIT) or COPY-NOW (spring formula only)  
**Spring formula (COPY-NOW):**
```ts
function springStep(pos: number, vel: number, target: number,
  stiffness = 170, damping = 26, dt = 1/60) {
  const F = -stiffness * (pos - target) - damping * vel;
  return { pos: pos + vel * dt, vel: vel + F * dt };
}
```

---

#### C5. Marquee / Score Ticker
**Repo:** `superplug-in/supermarquee` (MIT) + CSS-only technique  
**License:** MIT  
**Technique (CSS-only, zero dep):** Duplicate content block twice side-by-side. `@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }` — since content is doubled, the loop is seamless. Pause-on-hover via `animation-play-state: paused`. GPU-accelerated (transform only). Speed via `animation-duration`.  
**GSE Surface:** Top-of-page live scores ticker, breaking line-movement banner ("Sharp action on Chiefs -7.5"), cross-sport game scores strip.  
**Effort:** 1/5 — One `<Ticker>` component, ~25 lines + CSS.  
**Adopt Mode:** COPY-NOW  
**Key CSS:**
```css
.ticker-track {
  display: flex;
  width: max-content;
  animation: marquee 30s linear infinite;
}
.ticker-track:hover { animation-play-state: paused; }
@keyframes marquee {
  to { transform: translateX(-50%); }
}
```

---

#### C6. Headless Tabs / Accordion (Radix Primitives)
**Repo:** `radix-ui/primitives` — https://github.com/radix-ui/primitives  
**License:** MIT | **Stars:** 19k  
**Components relevant to GSE:** `Tabs`, `Accordion`, `Tooltip`, `Dialog`, `Popover`, `DropdownMenu`, `Select`, `Slider`, `Switch`, `Checkbox`, `RadioGroup`, `HoverCard`, `Collapsible`.  
**Technique:** Each primitive provides the correct ARIA roles + keyboard navigation (WAI-ARIA design patterns) with zero visual styling. Pair with Tailwind. The `Collapsible` primitive implements the disclosure pattern correctly (aria-expanded, aria-controls). `Tabs` implements roving `tabindex` keyboard navigation.  
**GSE Surface:** Sport tabs (NFL | NBA | MLB | …), pick detail accordion (factors, odds history, injuries), game stats disclosure, subscription tier comparison tabs, mobile nav dropdown.  
**Effort:** 1/5 per component (already in shadcn/ui ecosystem).  
**Adopt Mode:** VENDOR (MIT, already likely in project via shadcn)

---

#### C7. Sonner Toast System (full)
**Repo:** `emilkowalski/sonner` — https://github.com/emilkowalski/sonner  
**License:** MIT | **Stars:** 12.5k  
**Full feature extraction:**
- Stacked depth: CSS `transform: scale(0.95) translateY(-8px)` on background toasts
- Swipe dismiss: `pointermove` delta threshold (~50px) triggers `translateX` + opacity fade
- Progress timer: CSS `scaleX` animation on a `::after` bar
- Rich content: `toast.custom(<PickWonCard />)` slots arbitrary JSX
- Promise integration: `toast.promise(fetchOdds(), { loading: '...', success: '...', error: '...' })`  
**GSE Surface:** Pick win notification, email alert confirmation, line movement alert, API error toast, subscription renewal reminder.  
**Adopt Mode:** VENDOR (MIT, shadcn/ui `<Sonner>` block wraps it)

---

#### C8. Scroll Progress Bar
**Technique:** Native CSS scroll-driven animation (zero dep, Chrome 115+):  
```css
#progress { 
  position: fixed; top: 0; left: 0; height: 3px;
  background: var(--brand-green);
  transform-origin: left;
  animation: progress-grow linear;
  animation-timeline: scroll(root);
}
@keyframes progress-grow { to { transform: scaleX(1); } from { transform: scaleX(0); } }
```
For broader support: 10-line `useScrollProgress()` hook using `window.scrollY / (document.body.scrollHeight - window.innerHeight)`.  
**GSE Surface:** Long-form picks analysis pages, calibration methodology page, article-style write-ups.  
**Effort:** 1/5  
**Adopt Mode:** COPY-NOW

---

#### C9. Bento Grid Layout
**Repo:** `starc007/tailwind-bento` (MIT) + CSS Grid technique  
**License:** MIT  
**Technique:** CSS Grid with `grid-template-areas` + `span` columns/rows. Each card has a predefined `grid-area` name. Responsive: collapse to single column at `sm:`. No JS required. Container queries (CSS `@container`) allow cards to self-adapt to their slot size rather than viewport size.  
**GSE Surface:** Homepage "Why GSE?" section (feature cards of different sizes), premium tier comparison, analytics cockpit widget grid (confidence ring, sparkline, win streak — mixed sizes).  
**Effort:** 2/5 — Define grid template in Tailwind `grid-cols-12` + `col-span-N row-span-N` per card.  
**Adopt Mode:** COPY-NOW  
**Key pattern:**
```tsx
<div className="grid grid-cols-12 grid-rows-3 gap-4 auto-rows-[120px]">
  <div className="col-span-8 row-span-2 ..."><!-- Hero pick --></div>
  <div className="col-span-4 row-span-1 ..."><!-- Confidence ring --></div>
  <div className="col-span-4 row-span-1 ..."><!-- Win streak --></div>
  <div className="col-span-12 row-span-1 ..."><!-- Odds ticker --></div>
</div>
```

---

#### C10. Glass / Frosted Card Effect
**Technique:** Pure CSS (Tailwind utilities):  
```tsx
<div className="
  bg-white/5 dark:bg-slate-900/40
  backdrop-blur-md
  border border-white/10
  rounded-xl
  shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
">
```
The `shadow-[inset...]` adds a top highlight that sells the glass illusion. Use sparingly — premium picks panels, notification overlays, modal dialogs.  
**Source:** `gkemp94/tailwindcss-glassmorphism` (MIT) for utility class reference.  
**GSE Surface:** Pick card overlaid on game photo, notification popup, premium tier upsell modal, "Expert pick of the day" spotlight.  
**Effort:** 1/5  
**Adopt Mode:** COPY-NOW

---

#### C11. CountUp.js (number animation, simpler alternative to A1)
**Repo:** `inorganik/countUp.js` — https://github.com/inorganik/countUp.js  
**License:** MIT | **Stars:** ~10k  
**Technique:** `requestAnimationFrame` loop with easing function. Animates from `start` to `end` over `duration` ms. Handles decimals, separators, prefixes, suffixes. TypeScript native since v2.  
**GSE Surface:** Stat callouts on homepage ("10,432 picks graded", "52.7% ATS"), subscriber milestones, rolling bankroll tracker.  
**Effort:** 1/5 — VENDOR or copy the 40-line easing + rAF loop.  
**Adopt Mode:** VENDOR (MIT) or COPY-NOW (the rAF easing pattern)

---

#### C12. Accessibility: Roving TabIndex for Keyboard Nav
**Source:** Radix UI primitives source + W3C APG patterns  
**License:** MIT (Radix)  
**Technique:** `roving-tabindex` pattern: one item in a group has `tabIndex=0`, all others `tabIndex=-1`. Arrow-key `keydown` handlers move focus and update `tabIndex`. No external library needed — ~30 lines of TS for any custom component.  
**GSE Surface:** Pick cards grid (arrow-key navigation), sport filter chips, odds comparison table row navigation, any custom tab-like component.  
**Effort:** 2/5  
**Adopt Mode:** COPY-NOW  
**Key implementation:**
```ts
function useRovingTabIndex(itemCount: number) {
  const [focus, setFocus] = useState(0);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setFocus(f => (f + 1) % itemCount);
    if (e.key === 'ArrowLeft') setFocus(f => (f - 1 + itemCount) % itemCount);
  };
  return { focus, onKeyDown, getTabIndex: (i: number) => i === focus ? 0 : -1 };
}
```

---

#### C13. Reliability Diagram (Calibration Scatter)
**Technique:** Custom SVG — no library needed beyond a `buildPath` utility.  
**Source pattern:** Recharts `<ScatterChart>` (MIT, 27.3k stars) + D3 linear scale (MIT).  
**Implementation:** X-axis = predicted confidence bins (0–100 in 10-point steps). Y-axis = actual win rate in each bin. Plot dots + error bars. Overlay the perfect-calibration diagonal `y=x`. Color dots by sample size. This is a core GSE credibility feature.  
**GSE Surface:** Calibration/accuracy dashboard (public track record page), model audit view, premium landing page proof section.  
**Effort:** 3/5 — A `<CalibrationChart bins={data} />` component using Recharts `<ScatterChart>` + `<ReferenceLine slope={1} intercept={0}/>`.  
**Adopt Mode:** COPY-NOW (SVG technique) or VENDOR (Recharts, MIT)

---

#### C14. Frappe Charts — GitHub-Style Zero-Dep Charts
**Repo:** `frappe/charts` — https://github.com/frappe/charts  
**License:** MIT | **Stars:** 15.1k  
**Technique:** Zero dependencies. Data-driven SVG. Types: line, bar, pie, percentage, heatmap, mixed axis. Heatmap is GitHub-contribution-graph style. API: `new Chart('#target', { type: 'line', data, ... })`. Vanilla JS — wrap in a `useEffect` for React. Simpler than recharts but less composable.  
**GSE Surface:** Quick stat charts on public pages (no React overhead needed for static pages), heatmap variant as a simpler alternative to react-calendar-heatmap.  
**Effort:** 2/5  
**Adopt Mode:** VENDOR (MIT, zero-dep, 30KB)

---

#### C15. AutoSkeleton (structure-aware, zero config)
**Repo:** `ShanukJ/auto-skeleton` (MIT) + `darula-hpp/shimmer-from-structure` (MIT)  
**License:** MIT  
**Technique:** Wraps a component in a higher-order component or hook that: (1) renders the real component invisibly, (2) calls `querySelectorAll('*')` to measure each element's `getBoundingClientRect()`, (3) overlays absolutely-positioned shimmer `<div>` rectangles matching those bounds. When `loading=false`, overlays fade out.  
**GSE Surface:** Picks feed skeleton (precisely matches card layout), odds table skeleton, stats panel skeleton — no manual skeleton markup maintenance.  
**Effort:** 3/5 to implement the measurement + overlay system robustly.  
**Adopt Mode:** COPY-NOW (measurement loop is ~80 lines) or VENDOR (`auto-skeleton` MIT package)

---

#### C16. Infinite Scroll via IntersectionObserver
**Technique:** Native browser API — zero dependency.  
```ts
function useInfiniteScroll(fetchMore: () => void) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchMore();
    }, { rootMargin: '200px' });
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [fetchMore]);
  return sentinelRef;
}
```
**GSE Surface:** Picks feed pagination, odds history load-more, search results, notification inbox.  
**Effort:** 1/5  
**Adopt Mode:** COPY-NOW

---

#### C17. CSS Aurora / Gradient Background (Animated)
**Technique:** Pure CSS — zero dep.  
```css
@keyframes aurora {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.aurora-bg {
  background: linear-gradient(-45deg, #0f172a, #1e3a5f, #0f2d1a, #1a0f2e);
  background-size: 400% 400%;
  animation: aurora 15s ease infinite;
}
```
Use on hero sections only — not on data-dense areas.  
**Source inspiration:** shadcn/ui community blocks, Glass UI (MIT)  
**GSE Surface:** Homepage hero behind the "Edge starts here" headline, premium tier upgrade banner, elite subscriber dashboard header.  
**Effort:** 1/5  
**Adopt Mode:** COPY-NOW

---

#### C18. Circular Progress Ring for Confidence
**Repo:** `naikus/svg-gauge` (MIT, 331 stars, zero-dep) + `tomickigrzegorz/circular-progress-bar` (MIT, 55 stars, zero-dep)  
**Core technique (already detailed in A5, summarized here for catalog completeness):**  
A `<ConfidenceRing pct={78} label="78" color="var(--brand-green)" />` component where the ring fills based on `stroke-dashoffset`. The color can be derived from pct: `pct >= 65 → green, 55-64 → yellow, <55 → red`.  
**GSE Surface:** Pick cards (primary visual hook), game detail sidebar, calibration by-bucket display.  
**Adopt Mode:** COPY-NOW

---

#### C19. Collapsible / Expand-Collapse (smooth height animation)
**Repo:** `projectcss/react-collapsed` (MIT, "react-collapsed" package) + `roginfarrer/collapsed` (MIT)  
**Technique:** Animating from `height: 0` to `height: auto` is historically impossible in pure CSS (auto is not animatable). The solution:
1. On open: set `height: 0` → measure `scrollHeight` → set `height: ${scrollHeight}px` → on `transitionend` set `height: auto`.
2. On close: set `height: ${scrollHeight}px` → rAF → set `height: 0`.  
The `@starting-style` CSS rule (Chrome 117+) now allows `height: auto` transitions natively.  
**GSE Surface:** Pick factor trail (expand to see all factors), FAQ accordion, game injury report collapse, odds history panel, analysis article "read more".  
**Effort:** 2/5 — A `useCollapsible()` hook is ~40 lines.  
**Adopt Mode:** COPY-NOW

---

#### C20. Typewriter Text Effect (AI insight reveal)
**Source:** `maxeth/react-type-animation` (MIT, 458+ stars) or CSS-only technique  
**License:** MIT  
**Technique (CSS-only, zero dep):** Use `steps()` timing function with `overflow: hidden` + `white-space: nowrap` + `border-right` (blinking cursor). `@keyframes typing { from { width: 0 } to { width: 100% } }` + `animation: typing 2s steps(30)`. For dynamic strings, JS: iterate through `text.slice(0, i)` in a `setInterval` incrementing `i`.  
**GSE Surface:** AI-generated pick analysis reveal (dramatic effect on premium pick unlock), landing page hero rotating proof statements, "Model says: ..." streaming text.  
**Effort:** 1/5 (CSS) or 2/5 (JS for dynamic text).  
**Adopt Mode:** COPY-NOW

---

#### C21. next-themes — Advanced Pattern (System + Custom Themes)
**Repo:** `pacocoursey/next-themes` (MIT, 6.3k stars) — expanded notes beyond #10 above.  
**Additional pattern:** Support `system` (follows OS preference), `dark`, `light`, and a custom `high-contrast` theme. All via `data-theme` attribute on `<html>`. CSS variables are scoped: `:root[data-theme="dark"] { --bg: #0f172a; }`. No class-toggling needed — attribute selectors are more specific and predictable.  
**GSE Surface:** GSE is dark-first but should offer light mode for accessibility compliance. System detection respects user OS settings. High-contrast mode for accessibility.  
**Adopt Mode:** VENDOR (MIT) — already recommended in #10

---

#### C22. Odds Color-Delta Highlight (Price Flash)
**Technique:** Pure CSS + `useRef`. When a numeric value changes (e.g. odds line), apply a CSS class that triggers a brief background pulse.  
```ts
const prevOdds = useRef(odds);
const [flash, setFlash] = useState<'up'|'down'|null>(null);
useEffect(() => {
  if (odds !== prevOdds.current) {
    setFlash(odds > prevOdds.current ? 'up' : 'down');
    prevOdds.current = odds;
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }
}, [odds]);
```
CSS: `.flash-up { animation: flash-green 0.8s ease-out; } .flash-down { animation: flash-red 0.8s ease-out; }`  
**GSE Surface:** Live odds table — when The Odds API pushes a line change, the affected cell flashes green (line shortened = value lost) or red. Instant visual signal for sharp bettors.  
**Effort:** 1/5  
**Adopt Mode:** COPY-NOW

---

#### C23. Share Widget (Web Share API + Clipboard Fallback)
**Technique:** Native `navigator.share()` (mobile, supported Chrome/Safari/Firefox):  
```ts
async function share(pick: Pick) {
  if (navigator.share) {
    await navigator.share({ title: pick.title, text: pick.summary, url: pickURL });
  } else {
    await navigator.clipboard.writeText(pickURL);
    toast.success('Link copied!');
  }
}
```
Native share invokes the OS share sheet on mobile (no UI needed). Desktop fallback shows a custom modal or clipboard copy.  
**GSE Surface:** Pick card share button, analysis article share, referral link share.  
**Effort:** 1/5  
**Adopt Mode:** COPY-NOW

---

#### C24. Recharts Calibration / Reliability Diagram (full implementation path)
**Reference:** `recharts/recharts` (MIT, 27.3k stars)  
**Implementation specifics for GSE:**
- `<ScatterChart>` with `<Scatter data={bins}>`
- `bins = [{ x: predictedPct, y: actualWinRate, n: sampleSize }]`
- `<ReferenceLine segment={[{x:0,y:0},{x:100,y:100}]}` for perfect calibration diagonal
- Dot `fill` mapped to `n` (sample size → opacity or color saturation)
- Error bars via custom `<Dot>` + `<ErrorBar>`
- Add `<Label>` annotations for "Overconfident" (above diagonal) and "Underconfident" (below)  
**GSE Surface:** Public calibration dashboard — the single most important credibility chart on the site.  
**Adopt Mode:** VENDOR (Recharts, MIT)

---

#### C25. LyteNyte Grid — Zero-Dep Apache-2.0 Data Grid (future option)
**Repo:** `1771-Technologies/lytenyte` — https://github.com/1771-Technologies/lytenyte  
**License:** Apache-2.0 (core edition) | **Stars:** 777  
**Technique:** DOM-based (not canvas), row + column virtualization, 10k updates/sec, ~40KB zero-dependency. 150+ enterprise features including pivoting, aggregations, grouping. Renders via native browser scroll (no custom scroll container, no scroll jank).  
**GSE Surface:** Power-user analytics grid (all picks with every column visible, sortable/filterable), admin subscriber table.  
**Effort:** 3/5  
**Adopt Mode:** PARK → VENDOR when AG Grid / TanStack Table hit limits (Apache-2.0 is fully permissive for commercial use)

---

## IMPLEMENTATION PRIORITY MAP

### Night 1 — Zero-dep quick wins (COPY-NOW, effort 1-2)
1. CSS shimmer skeleton (A3) — apply to all loading states immediately  
2. Odds delta flash highlight (C22) — live odds table killer feature  
3. CSS marquee ticker (C15/C5) — top-of-page live scores strip  
4. Copy-to-clipboard hook (A9) — pick card share button  
5. Dark-mode no-flash script (A10) — eliminate FOUC  
6. CSS scroll-reveal (A4) — homepage hero section  
7. Aurora hero background (C17) — homepage visual polish  
8. Glass card (C10) — premium pick card overlay  
9. Bento grid (C9) — homepage feature grid  
10. Web Share API (C23) — mobile pick sharing  

### Night 2 — Charts & data features (COPY-NOW, effort 2-3)
11. SVG sparklines (A2) — pick card trend lines, odds movement  
12. Animated SVG gauge (A5) — confidence ring on pick cards  
13. Calendar heatmap (A6) — ATS history calendar  
14. Scroll progress bar (C8) — long analysis pages  
15. Typewriter effect (C20) — AI analysis reveal  
16. Collapsible expand (C19) — factor trail accordion  
17. Infinite scroll hook (C16) — picks feed pagination  
18. CountUp callout (C11) — homepage stat counters  
19. Roving tabindex (C12) — keyboard nav on pick grid  

### Night 3 — Interaction & animation (VENDOR or moderate COPY-NOW)
20. AutoAnimate (B7) — picks list add/remove  
21. Animated numbers (A1 / C3) — live odds transitions  
22. Sonner toast (B1/C7) — notification system  
23. tailwindcss-motion (A8) — pick card entrance animations  
24. Vaul drawer (B5) — mobile overlay  
25. FLIP list reorder (A7) — live ranking shuffle  

### Night 4 — Advanced charts & power features
26. Recharts calibration chart (C24) — track record dashboard  
27. Faceted filter table (B9 + B3) — picks discovery  
28. Command palette (B2) — ⌘K global search  
29. Confetti win celebration (B8) — pick win moment  
30. Canvas data grid (B4) — large odds archive  

---

## LICENSE AUDIT (quick reference)

| Repo | License | Safe for commercial use? |
|------|---------|------------------------|
| barvian/number-flow | MIT | YES |
| fnando/sparkline | MIT | YES |
| romboHQ/tailwindcss-motion | MIT | YES |
| emilkowalski/sonner | MIT | YES |
| emilkowalski/vaul | MIT | YES |
| pacocoursey/cmdk | MIT | YES |
| pacocoursey/next-themes | MIT | YES |
| TanStack/table | MIT | YES |
| TanStack/virtual | MIT | YES |
| glideapps/glide-data-grid | MIT | YES |
| formkit/auto-animate | MIT | YES |
| floating-ui/floating-ui | MIT | YES |
| motiondivision/motion | MIT | YES |
| recharts/recharts | MIT | YES |
| plouc/nivo | MIT | YES |
| airbnb/visx | MIT | YES |
| frappe/charts | MIT | YES |
| naikus/svg-gauge | MIT | YES |
| kevinsqi/react-calendar-heatmap | MIT | YES |
| zenorocha/clipboard.js | MIT | YES |
| alampros/react-confetti | MIT | YES |
| inorganik/countUp.js | MIT | YES |
| joshwcomeau/react-flip-move | MIT | YES (archived) |
| AntonVoronezh/simple-flip-motion | MIT | YES |
| openstatusHQ/data-table-filters | MIT | YES |
| sadmann7/tablecn | MIT | YES |
| 1771-Technologies/lytenyte | Apache-2.0 | YES |
| tomickigrzegorz/circular-progress-bar | MIT | YES |
| radix-ui/primitives | MIT | YES |
| flackr/scroll-timeline | MIT | YES |
| CSS native techniques | N/A (native browser) | YES |

**EXCLUDED (GPL/AGPL/no-license — per instructions, not documented):** None identified in research — all documented repos are permissive.

---

## TECHNIQUE-LEVEL QUICKREF (for integration night)

### Shimmer in 4 lines of Tailwind config
```js
// tailwind.config.ts
animation: { shimmer: 'shimmer 1.5s infinite' },
keyframes: { shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } } }
// className: "bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 bg-[length:200%_100%] animate-shimmer"
```

### SVG Sparkline in ~60 lines
```ts
function buildSparkPath(data: number[], w: number, h: number, pad = 4): string {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (w - pad * 2),
    pad + (1 - (v - min) / range) * (h - pad * 2)
  ]);
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}
```

### Confidence Ring in ~40 lines
```tsx
function ConfidenceRing({ pct, size = 64, stroke = 6 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const color = pct >= 65 ? '#16a34a' : pct >= 55 ? '#ca8a04' : '#dc2626';
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 600ms ease-out' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size * 0.22} fill="white" fontWeight="600">{pct}</text>
    </svg>
  );
}
```

### Odds Flash in ~15 lines
```ts
function useOddsFlash(value: number) {
  const prev = useRef(value);
  const [dir, setDir] = useState<'up'|'down'|null>(null);
  useEffect(() => {
    if (value !== prev.current) {
      setDir(value > prev.current ? 'up' : 'down');
      prev.current = value;
      const t = setTimeout(() => setDir(null), 800);
      return () => clearTimeout(t);
    }
  }, [value]);
  return dir;
}
// className={cn('tabular-nums transition-colors', dir === 'up' && 'animate-flash-green', dir === 'down' && 'animate-flash-red')}
```
