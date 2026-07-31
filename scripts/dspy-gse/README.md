# DSPy/GEPA offline skill compile (GSE)

Promotes agent-eval goldens → train/val for reflective prompt optimization.

- `data/goldens.json` — 8 trajectories (settlement + coding)
- `run.mjs` — dry-run metric: skill SKILL.md must encode free-path, idempotency, Polymarket hold
- Live GEPA: install `dspy`, use `Prediction(score, feedback)`, reflection LM temp **1.0**, task LM temp **0**, `auto="light"`

```bash
node scripts/dspy-gse/run.mjs
```

Does **not** touch product settlement/Stripe code.
