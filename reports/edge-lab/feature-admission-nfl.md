# Feature admission — NFL team-form candidates (real nflverse data)

Generated 2026-07-16T22:01:40.072Z by `scripts/edge-lab/feature-admission.ts` (provenance 60b286d6ef6593d3…, model v5.1.0).

The registered attempt at a path out of FIRE_NOTHING: five prior-window team-form
features from real play-by-play, each tried ONCE through the trials registry
(family `nfl-team-form-2026-07`) with the market-conditional MI probe I(feature; Y | q_close)
against a 1000-draw permutation null, decided together under BH-FDR q=0.1.

| item | value |
|---|---|
| games loaded | 1871 (2019–2025) |
| sealed holdout | season 2025: 272 games — NEVER evaluated, pbp never downloaded |
| pbp rows (projected) | 293478 → 200065 usable scrimmage plays, 1599 games |
| eval rows | 1529 (skipped: {"noOdds":1,"noScores":0,"thinHistory":64,"tie":5}) |
| pbp↔games join | 1599/1599 completed games (100.0%) |
| window | last 8 completed games, min 4, pooled per-play |
| family decision | **1 of 5 admitted** at BH-FDR q=0.1 |
| admitted set hash | ace09ab2a89cffa6… |
| trials chain | valid (6 entries incl. run-config grid) |

## Per-feature trials (each recorded BEFORE the family decision)

| feature | MI (nats) | p | BH-adj p | admitted |
|---|---|---|---|---|
| `form:off_epa_pp_diff` | 0.00318 | 0.4570 | 0.5713 | no |
| `form:def_epa_pp_allowed_diff` | 0.00317 | 0.4550 | 0.5713 | no |
| `form:off_success_rate_diff` | 0.00365 | 0.3580 | 0.5713 | no |
| `form:pass_rate_diff` | 0.00086 | 0.8960 | 0.8960 | no |
| `form:net_epa_pp_diff` | 0.00848 | 0.0120 | 0.0600 | **YES — flag for adversarial review** |

## Honest interpretation

1 of 5 candidates cleared BH-FDR at q=0.1 (form:net_epa_pp_diff). DO NOT treat this as edge: an admission at this stage is a red flag for leakage before it is evidence of signal, because the closing price already encodes team form heavily. Leading benign-but-not-edge explanation to rule out FIRST: the MI probe conditions on q_close via coarse equal-mass strata, and a feature this correlated with the price can pick up RESIDUAL WITHIN-STRATUM MARKET INFORMATION (reconstructing the close, not beating it). Required next checks before ANY downstream use, each as a NEW registered family (never silent re-runs): (1) finer-conditioning re-probe — more q strata / score bins, fresh seeds — expecting the MI to shrink if it is residual-market artifact; (2) adversarial leak review of the windowing and observedAt stamps for the admitted key(s), plus the shuffled-time placebo on exactly these features; (3) walk-forward EV-vs-close with the admitted key(s) added to the Phase-1 logit-pool, expecting the β test — not this MI probe — to be the binding gate.

## Expectation management (written before the numbers existed)

The closing price already prices team form heavily — public EPA/success/pass-rate
aggregates are the most-modeled quantities in this market — so few-or-zero admissions
was the expected honest outcome of this run. The deliverable is the REGISTERED,
reproducible answer with real numbers, not a positive result. An admission here would
be treated first as a possible leak (adversarial review + shuffled-time placebo on the
admitted key) and only after surviving that as candidate signal.

Attribution: Data via nflverse (nflverse-data), licensed CC BY 4.0.