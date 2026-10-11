# Prediction-Engine Module Evaluations 17–20

**Branch:** `research/rating-atlas-2026-10-09-packet`
**Evaluated:** 2026-10-11
**Data:** nflverse play-by-play parquets 2020–2025 (`~/workspace/gse-discovery/symbolic-regression/data/`)
**Status:** Runnable Python, not docs. Each file implements its gate spec from `docs/gates/GATE-SPECS.md`.

## Results

| # | Module | Family | Verdict | Key number |
|---|--------|--------|---------|------------|
| 17 | `2303-12401v2` hierarchical-live-probit | bayesian | **PASS** | mean log-loss delta +0.52 (live beats static baseline, rolling origin) |
| 18 | `2304-01538` doubly-self-exciting-scores | bayesian | **FAIL** | DSE log-lik −16661 vs baseline −16655 (Δ −6.4); self-excitation param a→0 |
| 19 | `1905-07886` conformal-ncp-intervals | calibration | **FAIL** | NCP coverage 0.864 (need 0.88–0.92), width 52.3 > plain 50.8 |
| 20 | `1803-01422v2` notears-dag | causal | *running* | bootstrap NOTEARS in progress |

## Honesty notes

- **Mod 17 PASS caveat:** the static baseline is weakly calibrated (log-loss 1.12–1.14, worse than coin flip). The live probit wins decisively, but part of the margin is baseline weakness. A sharper baseline (market-implied win prob) would be a stricter test.
- **Mod 18 FAIL** matches the paper's own evidence: game-level self-excitation usually not supported. Drive-level DSE adds nothing here. Production must propagate uncertainty jointly (no plug-in).
- **Mod 19 FAIL:** NCP undercovers and is wider than plain CP on the 2025 holdout. Path-selection protocol KEPT (process). Random-split calibration REJECTED per spec.
- All stamps: `{"module", "family", "file", "verdict", "note", "gate"}` + metrics. Nothing promoted; diagnostic only.

## Files

- `mod17_hierarchical_live_probit.py`
- `mod18_doubly_self_exciting.py`
- `mod19_conformal_ncp.py`
- `mod20_notears_dag.py`
- `run_all.py` (runner)
