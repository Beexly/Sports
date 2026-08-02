---
name: dspy-gepa
description: Offline GEPA/DSPy skill compile for GSE. Use when optimizing agent skills or prompt metrics without live product changes.
---

# DSPy / GEPA (GSE offline)

## Laws (Session 2 extract)
1. Metric must return **`Prediction(score, feedback)`** — feedback drives reflection.
2. **Reflection LM temperature = 1.0** (diversity). Do not lower it "to be safe."
3. **Task LM temperature = 0** (deterministic eval).
4. Default budget: **`auto="light"`**. MIPROv2 only after light plateaus.
5. Promote fixtures → **Examples** with explicit train/val (`promote.mjs`).
6. Named metric: **`gse_metric`** in `scripts/dspy-gse/gse_metric.mjs`.
7. Never touch settlement/Stripe/outbox code from a GEPA run.

## Commands
```bash
node scripts/dspy-gse/promote.mjs   # goldens → data/examples.json
node scripts/dspy-gse/run.mjs       # gse_metric dry-run + config assert
npm run dspy:gse
```

## Live GEPA (operator + keys)
Install Python `dspy`, wire `gse_metric` as metric_fn, set reflection temp 1.0 / task temp 0 / auto=light.
Config contract: `scripts/dspy-gse/gepa_config.json`.
