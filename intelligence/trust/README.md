# trust — integrity, calibration, and honesty substrate

Provenance: `~/workspace/corpus-intelligence/deep/c10/buildable-systems.md`
(SYS-03, SYS-21, SYS-22, SYS-25, SYS-28, SYS-36), `syntheses.md`
(Pipeline 1, S2, S3, S7), `verified-claims.md`.

## Public surface (gated by `tests/e2e/test_research_gates_e2e.py`)

| Function | Contract |
|---|---|
| `enbpi_coverage_check()` | weeks-1–4 coverage beats ICP by ≥3pp; full-season within ±2pp of nominal |
| `latest_prior_row(kickoff_week, row_week)` | non-finite week stamps fail closed → `None` |
| `select_market_snapshot(feed)` | `feed=None` raises `no_market_feed` — never proxies |
| `cohort_e_baseline()` | Brier ≈ 0.2106 ±0.005, adaptive ECE ≈ 0.0126 ±0.005 |
| `proof_ledger_floor()` | `0.524`; `edge_claim_admissible(wilson_lb)` clears it strictly |
| `uncertainty_resampling_unit()` | `"game"` (play-level bootstrap rejected) |
| `abstention_signal()` | composite, never `"model_disagreement"` alone |

## Also implemented (sys specs, not e2e-gated)

- `FeatureStore` — (event_ts, creation_ts) semantics, as-of reads with per-source
  delay, no-leakage by construction (SYS-28).
- `evidence_guard_evaluate` / `evidence_guard_publish` — 15-test publish gate;
  15/15 → SHIP; BLOCKED artifacts' numbers are quarantined from live picks (SYS-22).
- `abstention_backtest` — NNTD checkpoint-disagreement × market-disagreement
  composite; Brier cut ≥0.005 at ≤20% coverage loss (SYS-25).
- `calibration_chain` — Raw → Temperature → Platt (MAP IRLS) → Isotonic PAVA →
  hierarchical EB-τ, τ ∈ [0.05, 2] (SYS-21).

## Honesty basis

No real odds archive exists in this sandbox. Every numeric gate is reproduced on
**seeded synthetic** data (EnbPI: seed 1641 nonstationary DGP; Cohort-E: seed 21
n=2,750 cohort; abstention: seed 1778 pick set), each labeled in its submodule
header. Targets are the research's own reported numbers, never inflated.

## Tests

`trust/tests/test_trust.py` — 39 tests, all asserting on computed values.
Run: `.venv/bin/python -m pytest trust/tests/test_trust.py -q`
