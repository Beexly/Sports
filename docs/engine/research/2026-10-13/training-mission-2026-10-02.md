# TRAINING MISSION — train on history + 2026 W1–4, starting now (2026-10-02)

**Directive (Garrett):** WE DO NOT WAIT FOR THE 2026 SEASON TO TRAIN. The training set is 2022–2025 full seasons + 2026 Weeks 1–4, and it is available TODAY.

## Data — on the branch, no host-local files needed

- `intelligence/coaching/data/play_by_play_2022.parquet` through `play_by_play_2025.parquet` (committed `0170769`, ~20MB each)
- `intelligence/coaching/data/play_by_play_2026.parquet` (weeks 1–4 — refresh to current, then freeze)
- Seed CSVs (`coach_offense/defense`, `off_tendencies`, `def_tendencies`), `tau_hat.csv` + `tau_hat.manifest.json`
- nflverse injuries + depth charts via the OL provider (`a704d0ca5`)

## Rules

1. **Walk-forward only.** Train 2022–2024, validate 2025, live-check 2026 W1–4. The tau 2026-cell leak (in-season weeks pooled into a table presented as pre-kickoff) is the exact failure to avoid — every fit ships a train/eval year manifest, and the held-out check gates it (train_years ∩ eval_years = ∅ or the metric is contaminated).
2. **Calibrate each component as it wires.** Wired → weighted (backtest) → calibrated → tested, per component, immediately. The sequence holds per component; the calendar does not gate it. No end-of-season calibration batch.
3. **Sync the vintage.** Reasoning (`analyze()`) and intelligence (tau, signals, OL, EPA facets) train on the SAME frozen data vintage. Record it once: parquet hashes + week-4 freeze date + injury pull date, in one manifest. A component trained on a different vintage is untrained.
4. **Calibrate the refusals.** The engine returned INVALID on its first real game. On 2022–2025 historical games, how often SHOULD it have refused vs. picked? An abstention threshold with no historical basis is a guess. Measure it.
5. **Refresh and freeze 2026.** Pull 2026 PBP through the current week, verify week-4 completeness (the TNF gap from 10-01), then freeze. The frozen vintage is what every component trains on until the next scheduled refresh.

## Targets (in order)

1. **Coaching tau** — walk-forward fit on 2022–2024, validate on 2025, live-check on 2026 W1–4. Replaces the pooled table as the served artifact once it beats the held-out +6.77pp baseline honestly.
2. **EPA facets** — the PIT@CLE kernel (pass/rush/turnover splits) backtested on 2022–2025: are the splits stable and predictive, or descriptive? Answer with numbers.
3. **Each wired signal** — as Phase B wires it, weight it by 2022–2025 backtest, check it on 2026 W1–4. No signal enters the registry as wired without its calibration row.
4. **OL availability** — backtest the injury/depth-chart provider's game-day accuracy on 2022–2025 (where nflverse history allows), live-check W1–4.

## Report format (per component)

Train years | eval years | metric | n | 2026 W1–4 live-check | vintage manifest SHA. No aggregate "calibrated" claims — one row per component or it didn't happen.

Commit per component. Proof standard unchanged: files changed, tests with counts, what was exercised, log locations. Push to the branch.
