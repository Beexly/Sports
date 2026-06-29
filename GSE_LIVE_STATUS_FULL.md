CONTINUE — AND DO NOT STOP UNTIL THE ENTIRE BACKLOG IS BUILT.

You have finished Slice 0 (surface audit). Good. Now execute the FULL program to completion. Do not present a plan and wait. Do not stop after the first slice. Do not ask "should I continue." The ONLY acceptable stopping point is writing docs/CLAUDE_HANDOFF.md after every item below is either shipped-green or explicitly logged BLOCKED-ON-HUMAN. Treat every pause-to-confirm as a failure.

PRECEDENCE: GSE_INTEL_00_RIGOR_PASS.md is authoritative, then GSE_CODER_KICKOFF.md + GSE_CODEX_AUTONOMOUS_EXECUTION.md, then GSE_INTEL_01–05. Where any math conflicts, INTEL_00 wins — especially: the market anchor CONSERVES TEAM YARDS AND TDs (fantasy points are derived; never "fantasy points sum to the team total"); conformal uses Adaptive Conformal Inference (Mondrian by position); the "beats the market" test is Clark–West; the ladder has TWO tracks (fantasy MAE / betting CLV); the base fantasy estimator is Tweedie; add a correlation/copula layer.

BRANCH SAFETY (do this before ANY commit): you are on `master`. Create and switch to `codex/intelligence-core` off master. NEVER commit to master/main. Commit locally after each slice. GitHub CLI is unauthenticated — that is fine: keep committing locally, note "push pending (auth)" in the ledger, and DO NOT block on pushing. Never touch money, secrets, prod, or the human-gated flags (canPublishProjections, PROJECTIONS_PROVIDER, pricing rungs) — build behind OFF flags. You may only create DRAFT calibration proposals, never IMPLEMENTED.

THE LOOP (repeat until the checklist is exhausted): take the next unchecked item → implement it as ONE additive, flag-gated, tested slice (≤ ~8 files) → run the FULL gate: `npm run typecheck && npm run lint && (cd apps/web && npx vitest run) && npm run build` AND trust-gate + model-freeze + draft-only, all green → append one row to docs/EXECUTION_LEDGER.md → commit → immediately start the next item. If the gate is red, fix it before moving on. Never leave the branch broken. New estimators ship priced=false until they beat an equal-weight AND market-only baseline out-of-sample (Clark–West, purged/embargoed CV).

THE COMPLETE CHECKLIST — work through ALL of it, in order, no skipping:
[ ] A1 — LadderEvent (shadow): types + append-only model + pure reduceLadder() + INV-1 test + two-track RUNG_REQUIREMENTS (fantasy MAE/coverage; betting CLV). Reducer only logs; env flags stay authoritative.
[ ] A2 — GameSettledEvent heartbeat + idempotent DATA→FORECAST→PROOF→UNLOCK fan-out stub (writes ledger, recomputes counters) + ordering/idempotency tests.
[ ] E1 — Replay + historical-backtest harness over nflverse regular-season data (1999+), walk-forward with PURGED & EMBARGOED splits. Acceptance: reproduce one historical week deterministically AND emit an out-of-sample error number. (This is the substrate for everything below.)
[ ] B1 — Feature-store interface over lib/metrics/* (opponent-adjusted EPA exists) + a coverage-map row per metric; persistence seam (R2/DuckDB is [INFRA]).
[ ] B2 — Player-rate layer: empirical-Bayes / Beta-Binomial / normal-normal shrinkage emitting POSTERIORS with published w=n/(n+k); test vs no-shrinkage.
[ ] B3 — Market-anchored reconciliation: decompose total+spread → team yards & TDs; allocate by usage/efficiency posteriors; CONSERVE yards & TDs (not fantasy points); emit DIVERGENCE; convert to fantasy points as derived output.
[ ] BT — Tweedie baseline projection (flagged, shadow): gradient-boosted Tweedie on cleared features, ACI intervals, scored by the harness vs market-only via Clark–West.
[ ] B4 — Earned-weight ensemble (Hedge/multiplicative-weights) with BOUNDED loss + the must-beat-equal-weight-and-market-only gate (Clark–West).
[ ] B5 — Conformal intervals: Adaptive Conformal Inference, Mondrian by position, rolling recalibration; calibration weeks must not overlap fit weeks; coverage test.
[ ] B6 — Self-publishing calibration harness (extend lib/calibration/compute.ts + lib/tracker/clv.ts): pre-game commit, post-game MAE-by-position + interval coverage + rank-corr + Brier/log-loss/CRPS vs market baseline; writes the public artifact data; DEFINES (does not flip) canPublishProjections criteria.
[ ] C6 — Correlation/copula layer (lib/projections/correlation.ts): Gaussian copula over marginals (QB↔pass-catchers, game stacks); consumed by best-ball/parlay.
[ ] C1 — Regression/breakout engine (process-grade now): regression-to-mean + xTD/xCatch expected-vs-actual; extends receiving-opportunity.
[ ] C2 — Opportunity/role-migration: Markov role states + shrunk transitions + vacated-touch redistribution.
[ ] C3 — Game-script: Vegas WP-path → pass/run rate, plays, pace.
[ ] C4 — Availability/return + role-tenure: discrete-time hazard / Cox / Kaplan–Meier → P(active), E[snap%], role half-life.
[ ] C5 — Divergence layer: unify B3 + C1–C4 into one standardized signal routed to betting-candidate (shadow), fantasy buy-low/sell-high, and content.
[ ] D1 — Cross-market triangulation (prop-anchor.ts): third market (player props) reconciled against B3; residuals to divergence.
[ ] D2 — Options-style distribution outputs (distribution.ts): ceiling/floor/spike-prob/bust-risk from posteriors+conformal; surface in best-ball.
[ ] D3 — Model-parliament data feed (public CRPS leaderboard of internal models), flagged.
[ ] D4 — Replayable-provenance endpoint (re-derive calibration from the hash chain), flagged.
[ ] D5 — Community calibration-tournament scaffolding (lib/tournament/*, scored via the harness, draft-only-safe), flagged.
[ ] D6 — Active-learning uncertainty map (lib/metrics/uncertainty-map.ts) ranking worst-calibrated/widest-interval segments.
[ ] E2 — Scoring-rule + reliability-diagram reporting wired to the (gated) public observatory data.
[ ] E3 — Pipeline trace id + degradations[] + Board-health badge.
[ ] F1 — Persist-what-we-fetch serving-table/interface (R2/DuckDB seam; code only).
[ ] F2 — Coverage-map UI data ("stats we have that they don't").
[ ] F3 — Confirm shipped Phase-0 cost slices (deploy-gate, snapshot hash-only, CDN policy) green + ledgered.
[ ] FINAL — Write docs/DECISIONS_TO_RATIFY.md and docs/CLAUDE_HANDOFF.md (branch state per slice, final gate result, [OWNER]/[INFRA]/[DATA] checklist, next 5 tasks for Claude). Then stop.

Maintain the checklist in docs/EXECUTION_LEDGER.md and tick items as you go. After each commit, immediately begin the next item. Build → test → ledger → commit → NEXT. Run until FINAL. Go.