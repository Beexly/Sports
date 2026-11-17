# NFL 2026 Weeks 1-10 Chronological Walk-Forward Out-of-Sample Ablation

- **Generated UTC:** `2026-11-17T18:14:33.587801+00:00`
- **Completed 2026 Regular-Season Games Evaluated:** `147` (`Weeks 1-10`)
- **Bitemporal ASOF Cutoff:** `enforce_bitemporal_asof_freeze(strict_fail=True)` (`NFL_EPA_MIN_GAMES = 4`)
- **Purged + Embargoed CPCV Folds (`purge=3, embargo=1`):** `4`
- **Live-Money Stake Status:** `real_money_stake_cleared = False` (`live_stake_fraction = 0.0`)

## 1. Out-of-Sample Proper Scoring Rules & Calibration Summary

| Metric | Closing Market Baseline | GSE v4.1 Coupled OOS | Delta / Target Check |
|---|---:|---:|---|
| Raw Margin CRPS (`n=147`) | `7.0108` | `6.9915` | `-0.0193` |
| Normalized CRPS vs `7.109` Close Ref | `7.1090` | `7.0897` | `<= 7.099`: `True` |
| Margin MAE (pts) | `9.7687` | `9.761` | `-0.0077` |
| Win-Probability Brier Score | `0.21988` | `0.21976` | `-0.00012` |
| Overall Calibration ECE | `0.07171` | `0.07102` | `<= 0.025`: `False` |
| Multivariate Energy Score | `-` | `8.6218` | Proper 2D score distribution |
| Variogram Score (`p=0.5`) | `-` | `6.3662` | Cross-team score dependence |

## 2. Week-by-Week Chronological Progression (`Weeks 1-10`)

| Week | Games | Closing Margin CRPS | GSE v4.1 Margin CRPS | Ville Wealth `W_{m,t}` |
|---:|---:|---:|---:|---:|
| `1` | `16` | `7.8482` | `7.9177` | `0.883708` |
| `2` | `16` | `8.0684` | `8.1029` | `0.883708` |
| `3` | `16` | `6.5731` | `6.5171` | `0.883708` |
| `4` | `16` | `5.4474` | `5.2777` | `1.275611` |
| `5` | `14` | `7.7001` | `7.6953` | `1.154078` |
| `6` | `14` | `4.8108` | `4.7018` | `1.891462` |
| `7` | `14` | `7.3755` | `7.3954` | `1.632054` |
| `8` | `13` | `8.8171` | `8.7646` | `1.995556` |
| `9` | `15` | `6.1406` | `6.1589` | `1.730499` |
| `10` | `13` | `7.5736` | `7.6372` | `1.534772` |

## 3. K25 Trauma Isolation & Sequential Ville E-Process Governance

- **Ville Multiplicity Mode:** `agrapa` (`M_active = 5`, threshold `100.0`)
- **Accumulated Non-Trauma Steps:** `146` (`final_wealth_w_mt = 1.534772`)
- **Munich `2026_10_NE_DET` Opening-Drive Trauma Isolated (`learning_weight = 0.0`):** `True`
- **Completed Week 10 Thursday (`WAS 24-21 NYG`) & Sunday Night (`PIT 18-38 CIN`) Included:** `True`
- **Stake Governance Policy:** Live-money stake freeze remains strictly active (0.0u) until N >= 250 live prospective settled bets clear Ville W_{m,t} >= 20*M_active.

## 4. Wave 26 CPCV, rliable IQM & Monotonic OOS Ratchet

- **rliable IQM Skill:** `0.731646` (95% CI `[0.689157, 0.769343]`, optimality gap `0.349573`)
- **FWL Orthogonal Residual Slope:** `1.398187` (t=`21.439465`, verified=`True`)
- **Monotone Ratchet Promote:** `True` (accepted_loss=`7.0897`, live_weight_multiplier=`1.0`)
- **Wave 19-21 Floors Held:** `True` (crps=`7.0897`<=7.0944, pass_mae=`56.85`, rush_mae=`24.61`, player_mae=`24.79`, game_total_mae=`8.85`, min_ess=`0.864`)
