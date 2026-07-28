# @sports/historical-eval (HEOS)

Leakage-proof walk-forward evaluation for 2020–2025+ data.

**Law:** Does not enable LIVE_BOARD. Does not invent ROI. Does not bypass selective-gate for live FIRE. Inject real IVAP via `intervalFn` — do not rewrite pav/ivap.

## Decision kernel

```
fire ⇔ n≥N_min ∧ width≤w_max ∧ (p_lo − q) > τ
```

## Modules
- `asof.ts` — calibration and quote as-of guards
- `multiprob-decision.ts` — FIRE / NO_BET / NOT_EVALUABLE
- `metrics.ts` — Brier, log loss, coverage, risk-coverage
- `walk-forward.ts` — monthly slices + replay
- `sql/vault-schema.sql` — append-only snapshots
