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

## Queue (priority order; honest value × low effort × low risk first)
- [ ] Line-Movement / Market Intelligence workbench (`/cockpit/market-analysis`) — wires
      `analytics/line-movement`, `analytics/market-analytics`, `math/line-movement-classify`,
      `math/clustering`, `math/probability` on real Odds history. Internal, read-only.
- [ ] Multi-Sport Matchup Compare Lab tool — surfaces the per-league `sports/*` libs as a user-driven
      explorer (the biggest dormant chunk). Customer, pure compute, rate-limited, disclaimer.
- [ ] Sports Diagnostics workbench (`/cockpit/sports-diagnostics`) — `sports/nba|nfl-analytics`,
      `power-ranking`, `elo-utils`, `schedule-utils`, `team-normalize` on team game logs. Internal.
- [ ] Calibration Learning workbench (extend `/cockpit/calibration`) — `forecasting-analytics`,
      `clustering`, `regression`, `statistics` on pick signal snapshots → signal-outcome correlation
      (honest "correlation not causation" + small-sample caveats). Internal.
- [ ] Discoverability + polish pass: surface the Lab tools on relevant public pages; ensure honest
      gated/empty states; SEO metadata on new public routes.

## Deferred (honest)
- Niche-sport libs (~20: archery/badminton/curling/…) and weather/injury libs: framework-ready, **no data
  path or no published picks today** → not force-wired; surfaced honestly as "coming when we publish those /
  wire that data."
- Browser-bound QA (Lighthouse, visual de-AI pass, axe a11y, Playwright): deferred to local/browser session.
- Owner-credential go-live steps: see the go-live checklist.
