# Where the picks are — production database read, 2026-09-02 21:30 UTC

Source: direct read-only SQL against the production Neon project (gse-postgres) plus the live
`/api/ops/public-surface-truth` snapshot. Every number below was observed, not estimated.
Internal document: none of these rates clears the platform's own publication gates yet (see
§4), so none of them may be quoted publicly as a track record.

## 1. The ledger in one table

| | Count |
|---|---|
| Picks ever generated | 2,577 |
| Graded WIN | 870 |
| Graded LOSS | 789 |
| Graded PUSH | 5 |
| VOID (line unavailable / postponed evidence) | 461 |
| PENDING | 452 |
| … of which overdue past the 6h grace (settlement backlog) | 92 |
| … of which on games that have not started | 360 |
| Canonical settled (the number the pricing ladder counts) | 1,664 |

Graded record over all sports: **870–789–5** (52.4% of decided picks; 52.4% is also exactly the
vig break-even, so this is not an edge claim).

## 2. By sport and market (graded picks only; PENDING/VOID excluded from the rate)

| Sport | Market | W | L | Push | Void | Pending | Win rate | Brier (W/L) | Avg conf |
|---|---|---|---|---|---|---|---|---|---|
| MLB | Moneyline | 315 | 160 | 0 | 11 | 79 | 66.3% | 0.243 | 64.7 |
| MLB | Spread (run line) | 219 | 253 | 0 | 186 | 25 | 46.4% | 0.299 | 67.4 |
| MLB | Total | 197 | 246 | 5 | 186 | 0 | 44.5% | 0.285 | 63.5 |
| MLS | Moneyline | 53 | 39 | 0 | 13 | 14 | 57.6% | 0.250 | 63.1 |
| MLS | Total | 23 | 17 | 0 | 15 | 6 | 57.5% | 0.241 | 56.6 |
| MLS | Spread | 18 | 23 | 0 | 15 | 4 | 43.9% | 0.274 | 58.6 |
| NFL (preseason) | Moneyline | 21 | 15 | 0 | 0 | 8 | 58.3% | 0.252 | 62.4 |
| NFL (preseason) | Total | 5 | 7 | 0 | 0 | 23 | 41.7% | 0.277 | 59.8 |
| NFL (preseason) | Spread | 2 | 11 | 0 | 0 | 133 | 15.4% | 0.408 | 67.3 |
| NCAAF (week 1) | Moneyline | 8 | 0 | 0 | 0 | 27 | 100% | 0.055 | 81.8 |
| NCAAF (week 1) | Spread | 4 | 3 | 0 | 0 | 83 | 57.1% | 0.320 | 79.6 |
| NCAAF (week 1) | Total | 1 | 4 | 0 | 0 | 50 | 20.0% | 0.275 | 60.6 |
| NHL / NBA (June, season end) | all | 4 / 0 | 4 / 7 | 0 | 15 / 19 | 0 | — | — | — |

Reading it honestly:

- **MLB moneyline is the only market with volume and a rate above break-even** (315–160). Its
  Brier of 0.243 is still above the 0.22 floor the calibration gate requires.
- **MLB run line and totals are below 50%** and carry 186 voids each (line unavailable at
  settlement); those are the two "dead groups" the founder paused on 2026-08-10, and the
  live diagnostics still list `americanfootball_nfl|MONEYLINE` as significance-dead and NOT
  yet paused.
- **NFL numbers are preseason only** (games Aug 8–28). 133 spread picks are pending on regular
  season games. The 2–11 preseason spread record is a warning about spread confidence
  (avg 67.3 on a 15% hit rate), not a season verdict.
- **NCAAF is one week of data.** 8–0 on moneyline at 81.8 average confidence is 8 games.
- Brier below 0.25 means better than a coin flip at the stated confidence; the platform's
  publication floor is 0.22 with ECE ≤ 0.05, and the all-sport figure today is 0.243 / 0.051.

## 3. Closing-line value (the judge the product says it lives by)

| | Count |
|---|---|
| Graded picks with a CLV verdict | 1,110 |
| BEAT_CLOSE | 266 |
| MATCHED_CLOSE | 431 |
| LOST_TO_CLOSE | 413 |
| Beat-close rate (beat / graded, the platform's definition) | **24.0%** |
| Beat-close rate excluding matched lines | 39.2% |
| Picks with a stored closing line | 950 |

The ESTABLISHED pricing rung requires a verified beat-close rate ≥ 52.4%. Until this session the
evaluator that checks that rung was hard-wired to `null` and could never observe it; it now
reads the real counts (this PR). The real number is far below the rung, which is the honest
state and the reason the ladder stays at FOUNDING.

## 4. Calibration and the gates

| Gate | State | Why |
|---|---|---|
| Sample floor (≥100 canonical settled) | **Met** (1,664) | |
| Calibration eligibility | **RED** | Brier 0.2430 > 0.22; ECE 0.0513 > 0.05; settlement not healthy; consecutiveGreen 0/3 |
| PUBLIC_PICKS_ENABLED | **ON** | Board serves 55 picks/day; docs said "do not flip" — corrected in this PR |
| PERFORMANCE_STATS_ENABLED | OFF | Correct: eligibility RED |
| LIVE_BOARD / PUBLISH_LEDGER | OFF | Founder YES only |
| Pricing phase | FOUNDING | PROVEN needs published calibration + healthy settlement |

The Brier miss is 0.023 and the ECE miss is 0.0013. Settlement health is the third blocker and
it is fixable now (§5). Model version on graded picks is mixed v5.2.4–v5.2.7 (2026-06-18 →
2026-09-02).

## 5. Settlement backlog (the P0)

- 92 overdue picks: MLB 61 (games Aug 27 – Sep 2), MLS 24 (Aug 22–30), NFL preseason 5
  (Aug 21–28), NCAAF 2 (Aug 29/30). Every one sits on a `games` row still at SCHEDULED with
  no score.
- The paid settlement path (Odds API scores, which writes `settlement_runs`) has recorded no
  run since 2026-08-24 15:00 UTC. Everything graded since then came from the free ESPN path.
- The `settlement_anomalies`, `settlement_observations` and `owner_decision_requests` ledgers
  are empty — the "why was this not settled" trail has never fired in production.
- **Duplicate game rows.** Each real game exists up to three times with different external ids
  (Odds API hash with short team names like "Los Angeles"; `espn:baseball_mlb:<id>`;
  legacy `espn:mlb:<id>`). Duplicate ESPN-id groups: MLB 284, MLS 75, NFL 48, NCAAF 45. NFL
  Week 1 games already have all three variants. Picks exist on all variants, so one variant
  can grade while its twins stay pending, and the public board can show the same game more
  than once.
- 18 PENDING picks from model v5.0.0 (generated May 22 – Jun 4 on May lines) sit on NFL and
  NCAAF games kicking off Sep 5 – Nov 8, alongside fresh v5.2.7 picks.
- Root cause, traced in code and confirmed in the database (all landed in PR #684):
  1. The Odds API key stopped working at 2026-08-24 15:05 UTC (the provider snapshots switch to
     TheRundown two minutes later). The paid scores fetch has thrown every hour since, with no
     ledger row and no Sentry event. Fix: the cron now hands any failed sport to the free ESPN
     path in the same cycle, and the cron's swallowed errors are captured.
  2. The free backfill only inspected games older than 3 days (the paid path's window) and
     re-read the same oldest 50 rows every hour. Fix: it now covers everything past the 6h
     grace, 200 per run, and records holds with their reason.
  3. The matcher held every game of a multi-day series as ambiguous (three finals inside the
     date tolerance) and matched city-only names ("Los Angeles") to either team of that
     city. Fix: nearest start time wins; city-only names that fit two teams are held.
  4. The autonomy planner's "free settle" action ran the paid branch (missing `?path=free`).
  ESPN had every one of these finals the whole time; nothing here was a data problem.
- Expected effect after the deploy that carries PR #684: the 92 (88 at last check) drain on
  the next hourly cycle except the city-only rows that genuinely fit two teams, which stay
  held on purpose and now show up with their reason. Duplicate game rows are stopped at the
  source going forward (canonical game identity in the ingestion layer, same PR); merging
  the existing duplicates is an owner-reviewed offline job, not a launch-week cron.

## 6. What the owner can say today, and what not

Can say: the platform has graded 1,664 canonical picks since June under a frozen, versioned
model, with every result and closing line stored and hash-chained; the numbers above are the
real ones; the calibration gate is 0.023 Brier away from GREEN.

Cannot say (the product's own gates forbid it and the numbers do not support it): any win-rate
or ROI claim, "proven", "verified", or a CLV edge. MLB moneyline at 66% is 475 decided picks
with a Brier above the floor and a beat-close rate under 25%.
