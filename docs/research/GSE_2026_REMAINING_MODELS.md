# GSE 2026 — Remaining Models (Sprint 6): shrinkage, injury, survivor, query

Finishes the buildable (DB-free) gaps. Pure, dependency-free, tested.

| Module | Closes | Functions | Notes |
|---|---|---|---|
| `shrinkage.ts` | hier_bayes + shrinkage_cov method gaps | `empiricalBayesShrink`, `jamesSteinEstimate`, `shrinkCovariance` | Regression-to-the-mean for stable early-season projections; Ledoit-Wolf-style covariance shrinkage to condition the DFS correlation matrix |
| `injury-model.ts` | injury_probability feature gap | `assessInjury` | Transparent miss-time: P(miss next game) + expected games missed + 1–5 durability + named rationale. **Base rates are ILLUSTRATIVE** (`illustrative: true`) — replace with sourced rates before public use |
| `survivor-optimizer.ts` | pool_survivor feature gap | `planSurvivor` | EV-optimal survivor path with future-equity (don't burn a strong future team early); explainable greedy with per-pick reasons |
| `query-engine.ts` | query_builder feature gap (#2) | `runQuery`, `matchesPredicate`, `serializeQuery`, `deserializeQuery` | Stathead-style Finder: composable AND-predicate filters (eq/ne/gt/gte/lt/lte/in/contains/between) + sort + limit + saved queries |

After this, the only remaining `gap` methods are **matrix-factorization comps** and **gradient
boosting** — both want a Python training worker + ONNX inference (see the open-source ledger), not
pure TS.

## Verification
`tsc --noEmit` exit 0; `gse-remaining-models.test.ts` (11) pass; full GSE + cockpit-gating green
(222); brand-safety 2,164; ESLint clean. No live data; injury base rates explicitly flagged illustrative.
