# DSPy/GEPA offline skill compile (GSE) — Session 2

## Laws
- Metric: **`gse_metric`** → `Prediction(score, feedback)`
- Reflection LM temperature **1.0**
- Task LM temperature **0**
- Default budget: **`auto="light"`** (MIPROv2 not default)

## Layout
| File | Role |
|------|------|
| `data/goldens.json` | Source trajectories (settlement + coding + calibration) |
| `promote.mjs` | goldens → `data/examples.json` train/val |
| `gse_metric.mjs` | Named metric (score + feedback) |
| `gepa_config.json` | Config contract asserted by `run.mjs` |
| `run.mjs` | Promote + score + config assert (no network) |

```bash
npm run dspy:gse
# or
node scripts/dspy-gse/run.mjs
```

Does **not** touch product settlement/Stripe code.
