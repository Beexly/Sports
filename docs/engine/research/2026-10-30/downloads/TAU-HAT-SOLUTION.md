# TAU_HAT — what it is, why it is dark, and the solution (in order)

Written by Motif, 2026-10-30 ~18:05 CT, from the QC operation's verified findings
(~/workspace/qc/lane2-findings.md Part 2a) and the repo's own manifest/doctrine files.
For: Garrett's coding agent. Status: Solution 1 RUNNING (see §3). Nothing here waits
on Garrett except the final merge, per the standing production-release gate.

## 1. What tau_hat is (plain English)

τ̂ ("tau-hat") is the engine's per-coach 4th-down number. From every 4th-down call a
coach has actually made, the fitter (intelligence/coaching/coach_risk.py, `TauFitter.fit`
— a Hamming-loss inverse problem per team / season / region / win-probability bin)
estimates the win probability of the action that coach is predicted to take in a given
spot. The consumer, `expected_wp_given_coach` (intelligence/coaching/behavior.py),
combines that with the SituationalEngine to produce a `wp_gap`: what the coach will
probably do vs what the win-probability-max call would be. In plain terms: it prices
*predictable coaching* — the coach who punts when he should go, or goes when he should
punt — before it happens, per coach, per situation.

The measurement that makes it matter (manifest `held_out_measurement_2026-10-02`,
also in intelligence/doctrine/held-out-discipline.md): a held-out fit trained on
2022-2023 and scored on 2024-2025 opponent-half 4th downs, n=3,988 plays, predicted
4th-down behavior at acc 0.3593 with tau vs 0.2916 for the WP-max baseline —
**+6.7703 points, against a pre-registered gate of ≥3 points. PASS.** It is the
biggest measured edge in the program. That fit was never put into service.

## 2. Why it is not live — three blockers, all data/feed, in dependency order

1. **The served table is the wrong fit.** intelligence/coaching/data/tau_hat.csv
   (1,523 rows) is ONE point fit: fit_window 2022-2026, `point_in_time: false` —
   "2026 unit cells pool in-season weeks," i.e. look-ahead for in-season use.
   calibration_rows.json says it outright: tau_hat_served fitted=false — "Served
   table is a point fit. Walk-forward passed and was not swapped.
   BLOCKED-ON-PRECISION." The manifest's do_not list forbids citing the served
   table as validated at +6.77pp — that number belongs to the held-out fit above.
2. **Precision/coverage.** Of the 1,523 served cells: unit 55, pooled 162,
   league_region 373, league 933. Serving this into decisions would mostly serve
   league medians wearing team labels — the silent-degradation failure the
   provider's DataGapError design exists to prevent.
3. **No live win-probability/state source on the reasoning host.**
   `expected_wp_given_coach` needs a real game state (yardline, down/distance,
   score diff, clock, actual WP). reasoning_engine/run_game.py (~line 71) refuses
   tau today: "No live win probability on this host. 0.5 would be a coin flip
   wearing a tau cell. Refuse it." The only live caller (integration/api.py
   analyze()) serves tau at a neutral WP of 0.50 into an observation that nothing
   downstream reads for a decision. test_run_game.py:34 currently asserts no
   tau_hat signal appears in the trace.

## 3. Solution 1 — produce the walk-forward table (COMPLETE 2026-10-30)

Owner: Motif's refit lane. Work dir: ~/workspace/tau-hat-fix/ — full evidence in
RUN-REPORT.md there. Result:

- **Candidate held-out delta: +11.1585pp on n=3,988** (acc_tau 0.4032 vs
  acc_wpmax 0.2916) — PASS vs the ≥3pp gate. Per year: 2024 +8.7133pp
  (n=1,974), 2025 +13.5551pp (n=2,014).
- **Leakage excluded by construction proof:** the manifest's original
  measurement (+6.7703pp) reproduces to all four decimals ONLY when TauFitter
  is built on the training seasons alone; building it on all seasons produces
  the contaminated variant (0.3992/0.3546). The candidate's higher number is
  mechanism, attributed in the report: expanding walk-forward windows (the
  larger share, per a league-fallback cross-check at +8.3080/+14.2006pp by
  year) + eval-year-keyed serving vs the original's league-fallback serving.
- **Artifacts:** candidate_tau_hat_walkforward.csv (sha256
  17656fdf6981c55dfbbfff99aae5f039e35c1e6172357cd6c9cb9f94dcd4594f) +
  manifest-draft.json (point_in_time: true, validated). Pins 4/4 PASS
  (2022-2025 parquets re-fetched from the manifest URLs, sha256 + bytes match
  parquet-pins.json). The 2026 parquet was deliberately NOT used — served-2026
  cells are fit on 2022-2025 only.
- **Coverage (honest):** the refit fixes validity, NOT the coverage blocker.
  Candidate 1,277 rows (2023-2026): unit 55, pooled 162, league_region 426,
  league 634. Like-for-like 2023-2025 unit coverage 43 vs the served table's
  42 — walk-forward costs no per-season precision. Served 2026 improves:
  319 rows, 12 unit / 42 pooled, vs the point fit's 246 partial rows at 0/0.
  Served 2022 is absent — no strictly-prior window exists in the pinned inputs.
- **Construction calls** JC-1…JC-6 are named in RUN-REPORT.md; JC-1 (each
  served season's rows = the most recent completed season's fitted cells from
  a prior-only fit — snapshot semantics) is the load-bearing one.
- **State:** served tau_hat.csv untouched (hash-verified after the run).
  Swap staging (branch/PR, gate-held) is Workstream A2 of the elimination
  offensive, gated on the coordinator's independent protocol verification.

**Swap acceptance rule (for whoever reviews the candidate):** swap only if the
candidate reproduces a ≥3pp held-out delta on its own protocol AND its manifest
reports coverage honestly. On swap: replace tau_hat.csv, update the manifest
(fit_window, point_in_time: true, sha256, fallback counts), and flip
calibration_rows.json tau_hat_served — only for the walk-forward table.

## 4. Solution 2 — the WP/state source (decision made; no new feed required)

Do NOT wait for a live WP feed. Scope the consumer to contexts that already carry
a REAL game state:
- **Simulation contexts** — the simulator generates states; every simulated
  4th-down state has a WP from the sim's own model. Tau consumes it there honestly.
- **Post-hoc / grading contexts** — nflverse pbp carries the actual state and WP
  for played games.
Pre-kickoff display stays exactly as today (neutral-bin observation). A
market-implied WP is NOT an acceptable substitute: it would change what tau means
and break books-last. This scoping is the one the QC spec itself names, and it
removes blocker 3 without new infrastructure.

## 5. Solution 3 — wire the consumer (ready-to-fire brief, after Solutions 1-2)

Fire this as ONE Jules session (no requirePlanApproval) or hand to the coding
agent verbatim once the walk-forward table is swapped:

> In Beexly/Sports, wire the tau_hat decision consumer. Preconditions already met:
> the served tau_hat.csv is the walk-forward table (manifest point_in_time: true)
> and simulation/post-hoc contexts supply real game state. Task: call
> `CoachingEngineProvider.expected_wp_given_coach(...)` from the live path that
> owns 4th-down state (the call site integration/api.py's own comment points at),
> in simulation and post-hoc contexts only, and feed its `wp_gap` /
> `action_predicted` into the reasoning trace as a NAMED SIGNAL — never as a
> probability replacement (emit_three.py's constraint stands). run_game.py's
> refusal stays in force for any context without a real WP/state: tau absent +
> named gap, exactly as today. Tests: (a) extend
> intelligence/tests/test_tau_gate_wiring.py — provider serves walk-forward cells,
> raises DataGapError on a missing cell; (b) replace the negative assertion in
> intelligence/reasoning_engine/test_run_game.py:34 FOR THE LIVE-STATE PATH ONLY —
> tau signal present when a real WP is supplied, absent with the named gap when
> it is not; (c) keep intelligence/gates/test_phase_wires.py observation
> assertions passing. HARD BANS: do not touch the dependency-audit script or any
> package/lock files; do not alter the tau tables, manifest, or
> calibration_rows.json (already swapped); do not serve tau into pre-kickoff
> decisions. Land as a PR; merge waits for Garrett (production-release gate).

## 6. What "done" looks like

- [x] Candidate walk-forward table staged + verified (Solution 1 — COMPLETE,
      +11.1585pp on n=3,988; coordinator's independent protocol check in flight)
- [ ] Swap reviewed against the acceptance rule and landed (PR, gate-held merge)
- [ ] Consumer wired in sim/post-hoc contexts with the named tests green (Solution 3)
- [ ] Reasoning trace shows tau as a named signal where real state exists, and the
      named gap where it doesn't — verified in the trace artifact, not the diff summary
