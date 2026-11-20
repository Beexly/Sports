# OpenResearch `Beexly/gse-gsi` Review & Wave E External Research Synthesis (2026-11-20)

## 1. Read-Only Architecture Audit of `Beexly/gse-gsi`
- **Core structural pattern adopted into `Beexly/Sports`:**
  - Immutable calibration-first scoring kernel under `evaluation/frozen/score_walkforward_calibration_v1.py`: computes Brier score, Log-Loss, Equal-Width ECE, tie-pooled adaptive Equal-Mass ECE, Venn-ABERS inductive interval midpoints and mean width, and paired Maurer-Pontil Empirical-Bernstein Lower Confidence Bounds (`RANGE_WIDTH = 2`, exact parity with `packages/prediction-engine/src/promotion/empirical-bernstein.ts`).
  - Declarative JSON ablation ladder (`configs/ablation_ladder/*.json`) executed strictly walk-forward by `scripts/calibration/run_frozen_ablation_ladder.py`, writing verifiable JSON receipts rather than hand-waving post-hoc confidence tweaks.
- **Strictly preserved repo boundaries:** Zero mutations to `C:\Users\Garrett\OpenResearch\gse-gsi`; `MODEL_VERSION`, `packages/types/src/signal-registry.ts` (8 `SignalFamily` members), `brain/mind.jsonl` (single-writer trainer ownership), and `intelligence/research_gated/*` (`weight = 0.0`) remain untouched.

## 2. External Literature & Empirical Method Synthesis
1. **Opponent-Adjusted Early Pass-Rush & Positional Vulnerability (L-RAPM + Dummy-RAPM + Catalytic Shrinkage):**
   - Naive positional Defense-vs-Position (DvP) credits or blames a defense for facing elite vs backup offenses. Adapting Pipping-Gamón et al. (Bradley-Terry early rush/protection adjustment) and Pelechrinis-style Ridge RAPM with a Dummy-RAPM low-volume absorber ($\rho = 2.2$) plus catalytic shrinkage ($n_d / (n_d + k_0)$) decomposes opportunity-weighted EPA per play across regular offensive players and 32 defenses simultaneously.
   - Wired live in `intelligence/coaching/causal_positional_vulnerability_engine.py` (**Stream 15P**) over cleared CC-BY-4.0 `nflverse` parquets (`stats_player_week_2025.parquet` and `stats_player_week_2026_w1_w10.parquet`, strictly `week < as_of_week`).
2. **Inductive Venn-ABERS & Conformal Shrinkage (`MAPIE` / Vovk et al.):**
   - Inductive Venn-ABERS adds `(x, 0)` and `(x, 1)` pseudo-observations into PAVA isotonic calibration to emit finite-sample prediction intervals `[p0, p1]` and calibrated midpoints `p1 / (1 - p0 + p1)`, eliminating uncalibrated probability overconfidence without throwing away ranking power.
3. **Zero-Waste Queue & Game-Theoretic DFS Constraints (Haugh-Singal KL Leverage):**
   - `intelligence/dfs/institutional_dfs_v2_portfolio.py` optionally bridges causal Stream 15P positional matchup z-scores (`positional_vuln_weight`, defaulting to `0.0`) into both Classic 9-man and Showdown 6-man MILP objectives while preserving Hunter-Vielma-Zaman overlap caps, Dirichlet duplication penalties, Liu-Pom utility, and Newell recourse scoring.

## 3. Observed Walk-Forward Quantitative Receipts (Wave E)
### A. Frozen Ablation Ladder (`scripts/calibration/run_frozen_ablation_ladder.py`)
| Slice | `test_n` | Raw Brier -> Venn-ABERS Brier | Raw ECE -> Venn-ABERS ECE |
|---|---:|---:|---:|
| `synthetic_settled` | 120 | `0.245036 -> 0.235476` | `0.145714 -> 0.114529` |
| `real_moneyline` | 488 | `0.252942 -> 0.243992` | `0.147008 -> 0.109380` |
| `real_spread` | 318 | `0.299175 -> 0.267039` | `0.218491 -> 0.143496` |
| `real_total` | 260 | `0.271874 -> 0.254596` | `0.175038 -> 0.116034` |
| `nflverse_2026_wr_te_rec_38_5` | 330 | `0.229944 -> 0.226767` | `0.076274 -> 0.038073` |

### B. Stream 15P Walk-Forward OOS Evaluation (`eval_weeks = 4..10`, `n = 2,109` player-family obs)
- **Baseline family mean weighted MSE:** `0.162390`
- **Naive unadjusted raw DvP weighted MSE:** `0.172101` (degrades vs baseline due to schedule/QB confounding)
- **Stream 15P L-RAPM + Dummy-RAPM + Catalytic Shrinkage weighted MSE:** `0.157941` (`+0.014161` wMSE improvement vs raw DvP; `+0.004449` vs baseline; OOS `r = 0.197186`; beats both baselines in **7/7 weeks** from Week 4 through Week 10).
