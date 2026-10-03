# Engine ranking when Murphy resolution ≈ 0

## Live diagnosis (do not invent)
Overall Murphy **resolution ~0.002**, Brier ~0.275, ECE ~0.11 → eligibility RED is **correct**.

## Meaning
Forecasts barely rank winners vs losers. **Maps (Platt/Temp/PAVA) fix reliability, not ranking.** Enabling adjustments to mask Res~0 is forbidden.

## Path to PROVEN
1. Per-group resolution artifact (`resolution-by-group.json` from calibration-metrics)
2. Focus sports/markets with higher Res; de-emphasize bottom groups
3. Edge filter: only rows with |p − market_implied| ≥ ε; re-measure Res
4. Market-relative features + sport models
5. Re-run frequentist floors → GREEN×K → AUTO_PUBLISH once

No floor lowering. No performance publish while RED.
