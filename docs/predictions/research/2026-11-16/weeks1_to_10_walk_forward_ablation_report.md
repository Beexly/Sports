# NFL 2026 Weeks 1-10 Chronological Walk-Forward Out-of-Sample Ablation

- **Generated UTC:** `2026-11-17T00:22:45.391407+00:00`
- **Completed 2026 Regular-Season Games Evaluated:** `147` (`Weeks 1-10`)
- **Bitemporal ASOF Cutoff:** `enforce_bitemporal_asof_freeze(strict_fail=True)` (`NFL_EPA_MIN_GAMES = 4`)
- **Purged + Embargoed CPCV Folds (`purge=3, embargo=1`):** `4`
- **Live-Money Stake Status:** `real_money_stake_cleared = False` (`live_stake_fraction = 0.0`)

## 1. Out-of-Sample Proper Scoring Rules & Calibration Summary

| Metric | Closing Market Baseline | GSE v4.1 Coupled OOS | Delta / Target Check |
|---|---:|---:|---|
| Raw Margin CRPS (`n=147`) | `7.0023` | `6.9876` | `-0.0146` |
| Normalized CRPS vs `7.109` Close Ref | `7.1090` | `7.0944` | `<= 7.099`: `True` |
| Margin MAE (pts) | `9.7449` | `9.7439` | `-0.0010` |
| Win-Probability Brier Score | `0.21926` | `0.21926` | `+0.00000` |
| Overall Calibration ECE | `0.07101` | `0.0649` | `<= 0.025`: `False` |
| Multivariate Energy Score | `-` | `8.6171` | Proper 2D score distribution |
| Variogram Score (`p=0.5`) | `-` | `6.3171` | Cross-team score dependence |

## 2. Week-by-Week Chronological Progression (`Weeks 1-10`)

| Week | Games | Closing Margin CRPS | GSE v4.1 Margin CRPS | Ville Wealth `W_{m,t}` |
|---:|---:|---:|---:|---:|
| `1` | `16` | `7.8482` | `7.9069` | `0.896429` |
| `2` | `16` | `8.0684` | `8.0926` | `0.896429` |
| `3` | `16` | `6.5731` | `6.5212` | `0.896429` |
| `4` | `16` | `5.4474` | `5.3` | `1.310296` |
| `5` | `14` | `7.7001` | `7.6907` | `1.270139` |
| `6` | `14` | `4.8108` | `4.7177` | `1.93819` |
| `7` | `14` | `7.3755` | `7.3968` | `1.676221` |
| `8` | `13` | `8.7207` | `8.7004` | `1.788489` |
| `9` | `15` | `6.1406` | `6.1708` | `1.475001` |
| `10` | `13` | `7.5736` | `7.624` | `1.372559` |

## 3. K25 Trauma Isolation & Sequential Ville E-Process Governance

- **Ville Multiplicity Mode:** `agrapa` (`M_active = 5`, threshold `100.0`)
- **Accumulated Non-Trauma Steps:** `146` (`final_wealth_w_mt = 1.372559`)
- **Munich `2026_10_NE_DET` Opening-Drive Trauma Isolated (`learning_weight = 0.0`):** `True`
- **Completed Week 10 Thursday (`WAS 24-21 NYG`) & Sunday Night (`PIT 18-38 CIN`) Included:** `True`
- **Stake Governance Policy:** Live-money stake freeze remains strictly active (0.0u) until N >= 250 live prospective settled bets clear Ville W_{m,t} >= 20*M_active.
