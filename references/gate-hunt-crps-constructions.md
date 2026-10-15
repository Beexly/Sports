# Gate-hunt CRPS constructions — census, 2026-10-15

HO-1 companion doc: the full chain of constructions tried on the frozen filter
(REG 2017 W1–2026 W5, n=2462, μ = +spread_line, σ baseline 13.45, expanding
window, min_prior gate, PIT fail-closed) with artifact paths so any lane can
open every reachable number. Land status as of this commit.

## Verified ladder (every number has a landed artifact on grok/walk-forward-2026-10-14)

| # | Construction | CRPS | Δ vs baseline | Artifact |
|---|---|---|---|---|
| 0 | Homoscedastic Gaussian σ=13.45 (baseline, reproduced per run) | 7.154021 | — | dfs/walk_forward/baseline_repro_2026-10-14.json |
| 1 | Best-fit expanding homo (prior-row RMSE σ) | 7.149032 | −0.004989 | research/compound-poisson-ceiling-2026-10-15.json |
| 2 | Joint hetero-Gaussian σ=13.45·exp(β_S·\|S\|/10+β_T·T/44) | 7.142622 | −0.011398 | dfs/walk_forward/pit_joint_result.json |
| 3 | Compound-Poisson atom mixture matched to family-2 σ | 7.142250 | −0.011771 | research/compound-poisson-ceiling-2026-10-15.json |
| 4 | Margin-key residual-relative hybrid (energy form) | 7.137930 | −0.016091 | dfs/walk_forward/hybrid_result.json |
| 5 | Student-t PIT-fit ν variance-matched | 7.137978 | −0.016043 | dfs/walk_forward/pit_round2_result.json |
| 6 | CHAMPION v1: atoms + cascade move-regime σ (move×rest) + EPA atom masses | 7.136486 | −0.017535 | research/gate_hunt_new_best_2026-10-15.json |
| 7 | CHAMPION v2: v1 + split atoms total×spread | 7.135471 | −0.018550 | research/gate_hunt_champion_v2_2026-10-15.json (beat block) |
| 8 | CHAMPION v3: + spread-vig regime in atom key | 7.134568 | −0.019453 | research/gate_hunt_champion_v2_2026-10-15.json — see reproducibility note |
| 9 | FAMILY 2 of pit_round2: hetero(β_T)+key atoms (p3,p7) PIT — VERIFIED BEST, independent Motif re-run digit-identical | 7.133199 | −0.020822 (SE 0.005920) | dfs/walk_forward/pit_round2_result.json |

Refused / dead-ends (all full-filter Δ ≥ 0 or doubly-negative cross-check):
BSTS zero-mean residual scale 7.156409 (research/bsts-residual-scale-2026-10-15.json);
no-vig continuous μ 7.158048 t=+0.66 (research/novig-mu-2026-10-15.json);
line movement 64-row subset −0.0070 t=−0.088 n<150 (research/line_movement_clv_2026-10-15.json);
BQP improves manifest +0.0047 / degrades cross-check −0.0009 — Stop A NOT CLEARED
(dfs/walk_forward/bqp_result.json); SWCC degrades on both sets (swcc_result.json).
v3 negative results inside this pass (from the champion_v2 json): total-bin sigma
blend monotone-dead, half-point atom splits 7.1426, total-decile sigma layer 7.1369,
vig-in-sigma 7.1354, 3-bin vig 7.1378.

## Data planes (now landed on-branch; the champion runs read them from
## $LOCALAPPDATA/hermes/cache/scratch/ by path — copies here fix them forever)
- research/espn_rows.json — 2,397 games real open→close line movement, ESPN core
  API teamrankings harvest 2026-10-15, per row: game_id, move, observed_at (=gameday,
  pre-settled snapshot date), open_spread, close_spread, open/close source (tr|dk),
  close_vs_nflverse.
- research/gatehunt_master2.json — 2,462 rows, rolling prior EPA/play diff per game
  (nflverse pbp 2017–2025), key epa_diff.
- research/gatehunt_feat.json — 2,462 rows (gid, mu, total, margin, wp, move, close).
- research/gate_hunt_champion.py — champion v1 scoring code (reads the planes above
  through the harness location lock).

## Champion v3 reproducibility — honest state
v3 (7.134568) has NO standalone script in any scratch or repo directory on this host;
the final variant chain was run interactively. Its FULL frozen config is recorded in
research/gate_hunt_champion_v2_2026-10-15.json (sigma cascade, atom_key with
vig_lvl split, priors 90/50, fallbacks 0.075/0.045, data planes) plus the holdout
block (fit 2017–2023 n=1839 / score 2024–2026W5 n=623: champion 6.985187 vs flat
7.009786, Δ −0.0246). Motif reproduced the holdout flat control 7.009786 exactly
and family 2 at 7.133199 digit-identical; only v3's exact 7.134568 needs the config
re-expressed as a script. Per the fleet ruling it records as CLAIMED, bracket
[7.134, 7.139], NOT promoted; verified best on the frozen filter is FAMILY 2 7.133199
(DIAGNOSTIC).

## Rules this census enforces fleet-wide
1. ~50 variants were tuned on the same walk-forward series — multiplicity warning
   stands: true skill estimate 7.134–7.139, gate 7.099 UNCLEARED (gap 0.0342 from
   verified best). No number outside this table may be cited without a landed artifact.
2. Freeze / no-retune endorsed: no further residual retunes on the frozen filter.
   Next movement requires a named new data source (pre-kickoff observables), not a
   reshaping of spread/total residuals.
3. Gate arithmetic: operative gate = 7.109 (closing-market benchmark, 14,251-fixtures
   family) − 0.01 = 7.099 on n≥150. Source: research/gate-decision-2026-10-15.md.
4. Emission ZERO_OBJECT. walk_forward.json untouched by every run listed here.
