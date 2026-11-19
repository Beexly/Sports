# NFL 2026 Weeks 1-10 Chronological Walk-Forward Out-of-Sample Ablation

- **Generated UTC:** `2026-11-18T22:30:58.032621+00:00`
- **Completed 2026 Regular-Season Games Evaluated:** `147` (`Weeks 1-10`)
- **Bitemporal ASOF Cutoff:** `enforce_bitemporal_asof_freeze(strict_fail=True)` (`NFL_EPA_MIN_GAMES = 4`)
- **Purged + Embargoed CPCV Folds (`purge=3, embargo=1`):** `4`
- **Live-Money Stake Status:** `real_money_stake_cleared = False` (`live_stake_fraction = 0.0`)

## 1. Out-of-Sample Proper Scoring Rules & Calibration Summary

| Metric | Closing Market Baseline | GSE v4.1 Coupled OOS | Delta / Target Check |
|---|---:|---:|---|
| Raw Margin CRPS (`n=147`) | `7.0108` | `6.9065` | `-0.1043` |
| Normalized CRPS vs `7.109` Close Ref | `7.1090` | `7.0047` | `<= 7.099`: `True` |
| Margin MAE (pts) | `9.7687` | `9.641` | `-0.1277` |
| Win-Probability Brier Score | `0.21988` | `0.21915` | `-0.00073` |
| Overall Calibration ECE | `0.07171` | `0.07017` | `<= 0.025`: `False` |
| Multivariate Energy Score | `-` | `8.5139` | Proper 2D score distribution |
| Variogram Score (`p=0.5`) | `-` | `6.0124` | Cross-team score dependence |

## 2. Week-by-Week Chronological Progression (`Weeks 1-10`)

| Week | Games | Closing Margin CRPS | GSE v4.1 Margin CRPS | Ville Wealth `W_{m,t}` |
|---:|---:|---:|---:|---:|
| `1` | `16` | `7.8482` | `7.8687` | `0.74364` |
| `2` | `16` | `8.0684` | `8.0295` | `0.619996` |
| `3` | `16` | `6.5731` | `6.4064` | `1.177693` |
| `4` | `16` | `5.4474` | `5.3062` | `2.364764` |
| `5` | `14` | `7.7001` | `7.7` | `2.020156` |
| `6` | `14` | `4.8108` | `4.718` | `2.973908` |
| `7` | `14` | `7.3755` | `7.3474` | `3.126097` |
| `8` | `13` | `8.8171` | `8.498` | `11.092804` |
| `9` | `15` | `6.1406` | `5.9337` | `29.956653` |
| `10` | `13` | `7.5736` | `7.4839` | `45.712933` |

## 3. K25 Trauma Isolation & Sequential Ville E-Process Governance

- **Ville Multiplicity Mode:** `agrapa` (`M_active = 5`, threshold `100.0`)
- **Accumulated Non-Trauma Steps:** `146` (`final_wealth_w_mt = 45.712933`)
- **Munich `2026_10_NE_DET` Opening-Drive Trauma Isolated (`learning_weight = 0.0`):** `True`
- **Completed Week 10 Thursday (`WAS 24-21 NYG`) & Sunday Night (`PIT 18-38 CIN`) Included:** `True`
- **Stake Governance Policy:** Live-money stake freeze remains strictly active (0.0u) until N >= 250 live prospective settled bets clear Ville W_{m,t} >= 20*M_active.

## 4. Wave 26 CPCV, rliable IQM & Monotonic OOS Ratchet

- **rliable IQM Skill:** `0.733567` (95% CI `[0.692208, 0.771175]`, optimality gap `0.345326`)
- **FWL Orthogonal Residual Slope:** `1.49271` (t=`21.607405`, verified=`True`)
- **Monotone Ratchet Promote:** `True` (accepted_loss=`7.0047`, live_weight_multiplier=`1.0`)
- **Wave 19-21 Floors Held:** `True` (crps=`7.0047`<=7.0944, pass_mae=`56.64`, rush_mae=`24.29`, player_mae=`24.72`, game_total_mae=`8.85`, min_ess=`0.864`)
