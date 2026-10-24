# EPA residualiser — opponent terms, and it does not generalise

Added the opponent adjustment the previous cycle said was missing. Two encodings, both reported:

| encoding | holdout R² | train R² |
|---|---|---|
| opponent one-hot (32 dummies in a GBM) | **0.0007** | 0.0172 |
| opponent target-encoded (train-only means) | **0.0012** | 0.0189 |

Neither generalises. One-hot is worse, which is the classic GBM-with-high-cardinality failure, and
target encoding only barely helps. **Out of sample the situational+opponent basis explains ~0.1% of EPA
variance** — the model is barely better than predicting the mean.

## What survives anyway
The residual *ordering* is identical across all four models now run (no opponent, +field position,
one-hot, target-encoded): LAR +0.150, BUF +0.122 at the top; CLE −0.147, NYJ −0.108, LV −0.099 at the
bottom. Same names every time, ±0.01.

That is the honest takeaway, and it points somewhere specific: the ordering is a stable *descriptive*
statistic of team EPA quality, but it is not being earned through the regression. The situational basis
is nearly exhausted; a residual built on it mostly reproduces raw team quality. Anyone wanting a real
context-adjusted metric needs the terms that are missing here — personnel, opponent coverage tendency,
score-state interaction — not more EPA on the same five columns.

## Caveats
- Holdout split is random on plays, so correlated plays from one game straddle train/test; a game-level
  split would be lower still.
- Target encoding is computed on train only (no leakage) but game-level TV is not applied.
- EPA sign ambiguity from earlier notes carries over; ordering only.
