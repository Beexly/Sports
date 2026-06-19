# Autonomous Integration Loop — ledger

**Mission.** Convert the ~155 built-but-dormant pure-TS libraries (50 sports + 36 math +
30 analytics + lab) into realized product value — backend *and* customer-facing — and drive
the full 48-hour body of work onto the deployable branch (`claude/compassionate-ramanujan-qqt5nb`),
integrated, green, and launch-ready. Keep researching/improving as opportunities appear.

## What "live" means here (honest boundary)
- The **branch is the deployable artifact**; every verified slice pushed here IS the live source of truth.
- **Owner-only final flip** (NOT done autonomously, kept as a checklist): production deploy, DATABASE_URL +
  migrate, Stripe product/price IDs, attaching `THE_ODDS_API_KEY`, optional free-LLM keys.
- **Data-integrity gates stay honest**: `PUBLIC_PICKS_ENABLED` / calibration / learning-sample gates are NOT
  force-flipped. Learning sample accrues honestly (16/100). They auto-open when their real condition is met.

## Invariants (never crossed by any slice)
No secret displayed/logged/rotated; no broad Odds-API calls (quota). No MODEL_VERSION bump. No weakening of
source gating, compliance, responsible-gaming, owner approval, or rights posture. No fabricated subscribers /
traffic / testimonials / performance / CLV / picks / revenue. No auto-publish, no auto paid-spend. Every data
source through the Scraping Clearance Engine. TypeScript strict, no `any`. Honest empty states only.

## The loop (per slice)
1. Pick the next queued slice (non-overlapping file area vs. any in-flight slice).
2. Build it (real lib consumption, tests, honest empty states).
3. GREEN GATE: `tsc -p apps/web` (+ affected packages) · targeted `vitest` · `trust-gate.mjs` ·
   `model-freeze.mjs` · `next build` when app/components/routes touched.
4. Review diff for correctness + honesty + integrity. Green + clean → commit one logical slice + push.
   Not green → fix or revert. **Never push red.**
5. Append a line below. Continue until the queue is exhausted.

## Same-file serialization
At most ONE in-flight slice editing `app/cockpit/layout.tsx` (cockpit nav) and ONE editing
`app/lab/page.tsx` (Lab page) at a time, to avoid working-tree conflicts.

## Shipped
| # | Slice | Wave | Commit | Gate |
|---|---|---|---|---|
| 1 | Free-data keyless score/schedule provider pool (Odds-key phase-out, settlement) | backend | `8b8637eb`+`c5a49243` | tsc+39 vitest+trust+freeze |
| 2 | Pick Analytics & Grading workbench (`/cockpit/pick-analytics`) | A (internal) | `b8d52fac` | tsc+10 vitest+trust+freeze+build |
| 3 | Pace & Schedule Optimizer Lab tool (`/lab`, `/api/lab/optimize-pace-schedule`) | B (customer) | `ab1bbf7e` | tsc+22 vitest+trust+build |
| 4 | Market & Line Intelligence workbench (`/cockpit/market-analysis`, DB-read only) | A (internal) | `882be401` | tsc+10 vitest+nav 42+trust+freeze+build |
| 5 | Multi-Sport Matchup Compare Lab tool (`/lab`, `/api/lab/compare-matchup`) | B (customer) | `1d3246b1` | tsc+22 vitest+trust+build |
| 6 | Sports Diagnostics workbench (`/cockpit/sports-diagnostics`, DB-read only) | A (internal) | `3d2662e1` | tsc+9 vitest+nav 43+trust+freeze+build |
| 7 | No-Vig Fair Odds & Hold calculator Lab tool (`/lab`, `/api/lab/no-vig`) | B (customer) | `272212ee` | tsc+22 vitest+trust+build |

## Queue (priority order; honest value × low effort × low risk first)
- [x] Line-Movement / Market Intelligence workbench → shipped (slice 4).
- [x] Multi-Sport Matchup Compare Lab tool → shipped (slice 5).
- [x] Sports Diagnostics workbench → shipped (slice 6).
- [x] No-Vig Fair-Odds & Hold calculator → shipped (slice 7).
- [ ] Calibration Learning workbench (extend `/cockpit/calibration`) — `forecasting-analytics`,
      `clustering`, `regression`, `statistics` on pick signal snapshots → signal-outcome correlation
      (honest "correlation not causation" + small-sample caveats). Internal.
- [ ] Discoverability + polish pass: surface the Lab tools on relevant public pages; ensure honest
      gated/empty states; SEO metadata on new public routes.

## Realized-value scorecard (running)
8 Lab tools live (game-sim, parlay, bankroll, pace-schedule, matchup-compare, no-vig, glass-box,
calibration-explorer) + 3 internal cockpit workbenches (pick-analytics, market-analysis,
sports-diagnostics) + the free-data settlement pool. The dormant 50 sports / 36 math / 30 analytics
libs are now consumed across these surfaces (sports: power-ranking/elo/schedule/pace/spread-math/
team-normalize live; math: probability/probability-distributions/statistics/bankroll/
line-movement-classify live; analytics: line-movement/market-analytics/streak live). Remaining
dormant = the per-league niche libs (no published picks) + weather/injury (no data) — honestly deferred.

## Deferred (honest)
- Niche-sport libs (~20: archery/badminton/curling/…) and weather/injury libs: framework-ready, **no data
  path or no published picks today** → not force-wired; surfaced honestly as "coming when we publish those /
  wire that data."
- Browser-bound QA (Lighthouse, visual de-AI pass, axe a11y, Playwright): deferred to local/browser session.
- Owner-credential go-live steps: see the go-live checklist.
