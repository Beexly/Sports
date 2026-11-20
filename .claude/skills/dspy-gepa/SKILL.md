---
name: dspy-gepa
description: Offline GEPA/DSPy skill compile and metric verification for GSE without live product mutations.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(node scripts/dspy-gse/*), Bash(npm run dspy:gse*)
---

# DSPy / GEPA (GSE offline)

## Laws (Session 2 Extract)
1. Metric **`gse_metric`** (`scripts/dspy-gse/gse_metric.mjs`) returns `Prediction(score, feedback)` — diagnostic feedback drives reflection.
2. **Reflection LM temperature = 1.0** (diversity; never lower).
3. **Task LM temperature = 0** (deterministic evaluation).
4. Default budget: **`auto="light"`** (`scripts/dspy-gse/gepa_config.json`; MIPROv2 only after `light` plateaus).
5. Promote `scripts/dspy-gse/data/goldens.json` -> `data/examples.json` via `scripts/dspy-gse/promote.mjs` only when intentionally updating examples.
6. Never mutate settlement, Stripe, or outbox product code during a GEPA compile.

## Commands & Hygiene
```powershell
node scripts/dspy-gse/run.mjs --check   # read-only verification across .claude + .agents skills
npm run dspy:gse                         # promotes goldens -> examples.json and evaluates
```
- Note: `scripts/dspy-gse/gse_metric.mjs` is Node ESM; for live Python `dspy` (`dspy==3.3.0`) reflection runs, wrap `node scripts/dspy-gse/run.mjs --check` or keep reflection prompts aligned with `gepa_config.json`.

## Completion Criteria
Done when `node scripts/dspy-gse/run.mjs --check` exits `0` with `config_ok: true` and `failed: 0`.
