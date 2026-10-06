# Audit: `data/gse-dataset/bridge-premises.jsonl`

Slice 2, 2026-09-27. Read-only audit. Nothing was deleted, nothing was fed to
`aggregateSignals`, no code change was made.

**Verdict: PASS (audited). The file is NOT in-sample, and the constant
`sample_count` is not a leak. It is the size of the single training fit.**

## What the file is

285 rows, one per 2025 holdout game. One `signal_id` (`pregame_context_logit`),
one `method` (`logistic-irls`).

| property | measured |
|---|---|
| rows | 285 |
| distinct `game_id` | 285 |
| duplicate `game_id` rows | 0 |
| distinct `signal_id` | 1 (`pregame_context_logit`, ×285) |
| distinct `method` | 1 (`logistic-irls`, ×285) |
| distinct `sample_count` | **1** (`6955`, ×285) |
| probability outside (0,1) | 0 |
| probability range | 0.18944950 … 0.88231212 |

## Writer

`scripts/run-bridge.mjs:93` writes the file. It is not `UNKNOWN_WRITER`.

## The `sample_count` question, answered

The prompt flagged a constant `sample_count` on holdout rows as a smell and asked
for the conclusion. Measured conclusion:

`sample_count = 6955` is **the number of training rows in the one IRLS fit**, written
onto every prediction. It is a property of the model, not of the game. It is not a
per-game sample size and must never be read as one. The value is not fabricated; it
reproduces the training row count.

## Is it in-sample? No.

`scripts/run-bridge.mjs:48` — `if (row.season >= 2025) continue;` — training rows are
drawn only from seasons strictly before 2025, and emitted rows are filtered to
`holdout.jsonl` (line 64). Measured:

- training seasons used: **1999–2024 (26 seasons)**, ≈6955 rows
- holdout season: **2025 only**, 285 games
- every premise `game_id` is in the holdout set: **true**
- no premise row is a 2025 *training* row

FORBIDDEN #16 ("fitting on 2025 then scoring 2025") is **not** violated. The prompt's
warning that "two seasons are not a training set" also does not apply: `features.jsonl`
spans 1999–2026, not two seasons.

## Why this still cannot become a LIVE part

Independent of fit quality, the scalarizer blocks it. `pregame_context_logit` is a
pregame team-strength context model over `margin_diff`, `scored_diff`,
`allowed_diff`, `rest_diff`, `dome`, `neutral` — i.e. the same information class as
`historical_strength`, which already holds a representative in
`data/reasoning/parts-registry.jsonl`.

`historical_strength` is LIVE at weight 0.08. So `f2 = 1` for this direction, and by
THE SCALARIZER, *"If f2 is the winning term, DARK."* No amount of correlation clears
it. This file is a **context prior**, and the prompt already rules that context never
becomes the objective.

## Standing instruction, unchanged

Do not pipe this file into the live edge. `selectPart` must return LIVE on a fit that
was not trained on 2025 before any of these probabilities are used, and even then the
duplicate check above is disqualifying on its own.

## Reproduce

```powershell
node scripts/overnight/audit-bridge-premises.mjs
```

Machine-readable copy: `docs/reasoning/bridge-premises-audit-2026-09-27.json`.
