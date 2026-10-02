# GSE Intelligence Engine — "the mind"

**Branch:** `motif/gse-intelligence-build-2026-10-02`
**Built:** 2026-10-02, overnight agent-fleet build (10 corpus coordinators, ~600 readers)
**Status:** All 704 tests green (see `tests/last-run-report.md`). **Do NOT merge to main until the active codebase audit clears** — this branch is intentionally separate.

## What this is

The NFL intelligence program Garrett ordered after the October 1 Steelers–Browns card exposed the core failure: research existed but was never retrieved, connected, challenged, and applied at decision time. This is the "mind" that reasons over the data:

| Module | What it does |
|---|---|
| `qb-behavior/` | QB behavioral profile engine + situational splits (pressure, INT-by-situation) + trust-target/HHI modeling |
| `coaching/` | Coaching tendency engine + 4th-down risk preference (τ̂ per coach-team-season) + situational playcalling |
| `trust-signals/` | Trust-signal intake: X-account monitoring pipeline + news-wire intake + video/social extraction framework |
| `reasoning/` | L1–L5 reasoning engine per the reasoning-depth spec: escalation state machine, specialist agents, persisted traces |
| `integration/` | Unified intelligence API (`analyze()`, `adversary_review()`, `correlated_theses()`, `validate_checklist()`) |
| `ratings/`, `combining/`, `trust/`, `qb/`, `staking/`, `newregime/` | Ratings, forecast combination, calibration chain, QB residuals, Kelly staking, regime research lanes |
| `tests/` | Full suite + e2e gates; master runner `tests/run_all.py` |

Every source file carries a provenance header naming the research it implements.

## Key acceptance test

`tests/e2e/test_reasoning_trace_e2e.py::T1` — the mandatory regression test: given the Steelers–Browns Week 4 pre-kickoff data, the engine must build the L3 causal chain (OL injuries → Monken quick-game compensation → pressure neutralization), have the adversary mark breaking conditions met, bundle the four funnel legs as ONE correlated thesis, and REJECT the stack. It passes.

## Run the tests

```bash
python3 -m pytest tests/ -x -q   # or: python3 tests/run_all.py
```

Requires: Python 3.10+, numpy, pandas, pyarrow, scikit-learn (see each module's README).

## Honest limitations (do not hand-wave these)

- Backtests ran on seeded synthetic DGPs — real NFL validation is owed when data lands.
- No live X feed — extractors consume stored items; needs an X-accessible environment.
- NGS material is internal reasoning fuel only — never surfaces publicly.
- Contract converged 2026-10-02: `reasoning/` is the canonical engine contract;
  `integration/` is its provider-wired façade (no parallel implementation).

## Research

The deep research behind this build lives in `docs/engine/research/2026-10-02/` on this branch: per-slice verified claims, syntheses, challenges, buildable systems, the X intake registry, the reasoning-depth spec, and the Hugging Face open-models survey.
