# [1522] Reaching the Tail: Calibration Diversity Drives Conformal Coverage under Data Scarcity (arXiv:2608.21591)

**Citation:** Donald Aadithiyan (2026). *Reaching the Tail: Calibration Diversity Drives Conformal Coverage under Data Scarcity*. arXiv:2608.21591v1 [econ.EM] (stat.ML cross-list). URL: https://arxiv.org/abs/2608.21591
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv; abstract through references + appendices A–B).
**Verdict:** ADAPT — GSE's conformal calibration layers (CPIT from ledger 1521, CQR) currently use trailing-window calibration sets; under data scarcity this paper's diversity-maximizing selector is the correct replacement rule.

## 1. Research question
In rare-event forecasting under data scarcity and broken exchangeability (autocorrelated series), what actually drives conformal coverage — the number of rare events in the calibration set, or its diversity? And can a selector built on the answer fix long-horizon coverage where Mondrian, shift-robust, and extreme-value conformal baselines fail?

## 2. Dataset / schema
U.S. recession forecasting: 12 FRED macro indicators (Treasury 1/3/6/10y, CPI, PPI, Industrial Production, Unemployment, Share Price Index, GDP per capita, OECD CLI, Consumer Sentiment); target = FRED smoothed recession-probability series (RECPROUSM156N), horizons cur/1M/3M/6M; split at Jan 2020 (635 train / 65 test, COVID recession + 2022–23 tightening in test). External validation: Euro area, UK, Germany, Japan, Canada recession series + 7 synthetic scenarios. Calibration pool: 635 pre-2020 months; experiments use N=254 fixed-size subsets (200 random draws).

## 3. Method / model
Two-stage pipeline (Stage 1: Prophet/ARIMA-XGBoost hybrid indicator forecasts; Stage 2: CatBoost/LightGBM/RF stacking ensemble with ElasticNet meta-learner + RegressorChain across horizons, logit transform + focal loss) — the paper's Appendix A shows this is separable from the finding. Core method: diversity-maximizing calibration selector for Adaptive Conformal Inference (ACI, Gibbs & Candès 2021; nonconformity score = absolute forecast error). Given fixed budget N, select the N months maximizing support width p95−p5 of pooled nonconformity scores (extreme-tail months provably maximize this exactly). Proposition: coverage deficit Δ = G(Q_G(1−α)) − G(Q̂_C(1−α)) — coverage fails when the calibration set's (1−α) score quantile falls short of the test distribution's.

## 4. Equations & assumptions
- Selector: argmax over N-subsets of (p95 − p5) of pooled nonconformity scores; exact (not greedy) because extreme-tail months maximize width.
- Proposition: Δ = G(Q_G(1−α)) − G(Q̂_C(1−α)) monotone in the shortfall of Q̂_C vs Q_G; support width is a proxy for quantile reach, not the reach itself (necessary, not sufficient).
- ACI with α=0.10, online miscoverage-target updates.
- Assumptions: nonconformity-score ranking transfers across conditions (empirically validated: five-country Spearman 0.45–0.66 vs 0.02–0.23); autocorrelation acknowledged, handled via ACI not exchangeability; 200 random draws share one pool → R² descriptive, not a bound.

## 5. Features / target
Macro indicators → recession probabilities at 4 horizons. Nonconformity scores |y−ŷ|.

## 6. Validation design
Fixed-size (N=254) ablation varying rare-event count 0→16 months; 200 random subsets regressing coverage on support width vs. rare-event count; selector vs. pooled/trailing ACI vs. Mondrian vs. PID-conformal (Angelopoulos et al. 2023) vs. GPD-tail fit (Pasche et al. 2026) on 6-month coverage; out-of-fold honesty check (model refit at each point); synthetic scenarios (7) and five countries for generality; point-prediction benchmark (Table 3) with Diebold-Mariano + block bootstrap.

## 7. Numerical results / baselines
- Fixed-size ablation: apparent rare-event threshold vanishes; 6M coverage 62.7% (0 rare months) → 67.8% (16 rare months), gradual.
- 200 random subsets at 6M: support width R²=0.85 vs rare-event count R²=0.02 (up to 50-fold gap); diversity-matched redundancy check: residual rare-count correlation → ~0.
- Selector: 6M coverage 67.8%→81.4% (in-sample), only strategy that moves it; cost: intervals 10.6→32.6 points wide; still short of 90%. Out-of-fold: 84.75%→96.61% (gain 11.9 vs 13.6 points), but CIs span 90% — honest 90% remains open.
- Proposition check: Q̂_C(0.90)=3.01 vs Q_G(0.90)=27.06 predicts 57.6% coverage, within 5–10 pts of observed 62.7–67.8%.
- Mondrian: 67.8%→61.0% at 6M even with oracle labels; PID-conformal and GPD-tail fits also fail to close the gap.
- Synthetic: Spearman ρ(diversity) 0.42–0.68 vs ρ(rare) 0.02–0.45; five countries: ρ(diversity) 0.45–0.66 (Euro 0.64, UK 0.57, Germany 0.45, Japan 0.66, Canada 0.65) vs ρ(rare) 0.02–0.23.
- Point prediction: RegressorChain MAE 6.83/5.63/7.73/10.17 (Cur/1M/3M/6M), beats tuned independent-XGB at 3M/6M (DM significant); probit reaches ~97% ACI coverage but intervals are 40–335× wider than the target range — coverage without sharpness is vacuous.

## 8. Code / data availability
No code link in the paper text; data via FRED API (series named; RECPROUSM156N cited). Methods fully specified (reimplementable).

## 9. Leakage & limitations
- In-sample residuals used for the main coverage numbers; honest out-of-fold check shown but wide CIs. All preprocessing fit pre-2020 (explicit anti-leakage), causal lag windows.
- 65 test observations limit power. Full pipeline U.S.-only; only the diversity mechanism replicates cross-country.
- 6-month 90% coverage remains unresolved — the paper quantifies rather than resolves.
- Coverage-without-sharpness warning (probit: 97% coverage, 40–335× too wide) is a standing caveat for any GSE interval display.

## 10. GSE overlap
Existing research map calibration cluster uses trailing-window calibration (CQR, CPIT splits). No existing note studies *which* games belong in the calibration set. This fills that slot: composition (diversity) over size/recency. Complements ledger 1521 (CPIT needs a calibration split — this tells you which samples to put in it) and 1520 (rankECE as the measure to report after the selector runs).

## 11. GSE implementation spec
- For the engine's conformal/CPIT calibration splits (currently trailing windows), implement the diversity selector: given a budget of N games from the available pool, select the N whose pooled nonconformity scores (e.g., |realized margin − engine spread|) maximize p95−p5.
- Apply first to early-season calibration (weeks 1–6), where data scarcity is worst and trailing windows are narrow.
- Track interval width alongside coverage — the paper's cost (10.6→32.6) must be monitored so coverage gains don't become vacuous.
- Effort: 0.5–1 day.

## 12. Reproducible test
Dataset: engine's game-level predictions + outcomes, 2022–2024. For each season's first 6 weeks as "test", build calibration sets from the prior season: (a) trailing N games, (b) N rare-event-heavy games (upsets/blowouts), (c) diversity-selected N games (max p95−p5 of |margin−spread|). Run the engine's existing conformal interval pipeline on each; compare empirical coverage at 90% and mean width. Expect (c) ≥ (a),(b) on coverage with modest width cost.

## 13. Acceptance / rejection gate
ADOPT the diversity selector for early-season calibration if on 2022–2024 it raises 90%-interval coverage ≥5 points vs. trailing-window baseline with mean width increase ≤30%; otherwise keep trailing windows and log the paper's rule as a diagnostic (report support width of each calibration set in the QC report).

## 14. Improvement experiment
Go beyond the paper: the proposition's quantile reach Q̂_C vs Q_G is estimable *before* deployment. Build a pre-deployment "reach check" that predicts expected coverage deficit from the calibration set's score quantile vs. a rolling estimate of the test quantile, and triggers a "coverage warning" badge on GSE's public pick cards when predicted deficit exceeds 5 points — turning the paper's diagnostic into a user-facing trust feature.
