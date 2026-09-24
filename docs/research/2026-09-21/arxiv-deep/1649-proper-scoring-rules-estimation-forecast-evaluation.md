# [1649] Proper Scoring Rules for Estimation and Forecast Evaluation (arXiv:2504.01781)

**Citation:** Kartik Waghmare, Johanna Ziegel (2025). *Proper Scoring Rules for Estimation and Forecast Evaluation*. arXiv:2504.01781. ETH Zurich, Seminar for Statistics. URL: https://arxiv.org/abs/2504.01781
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: definition, characterization, geometric properties, families — kernel scores, local scores, weighted/threshold scores — estimation, forecast evaluation, applications).
**Verdict:** ADOPT — this survey is the mathematical foundation for GSE's entire forecast-evaluation doctrine: WHY Brier/log/CRPS are the right objectives (strict propriety ⇒ truth-telling incentives), HOW to choose among them (kernel scores/MMD/energy statistics unify CRPS; weighted scoring rules target the tails GSE cares about), and WHEN minimum-score estimation beats MLE. Adopt CRPS as the primary proper objective for margin/total distributional forecasts, Brier/log for cover probabilities, with the paper's characterization results as the reference.

## 1. Research question
Proper scoring rules are used both to EVALUATE probabilistic forecasts and to ESTIMATE distributions (minimum-score estimation). What are their mathematical foundations (characterization, geometry), what are the important families, and how should a practitioner choose among them for estimation vs forecast evaluation?

## 2. Dataset / schema
Theory/survey paper — no experiments, no datasets. Value is foundational: definitions, characterization theorems (Savage representation, kernel-score construction), and the catalogue of families with their properties. Evidence is mathematical (proofs) plus documented application history (meteorology, economics).

## 3. Method / model
Framework, not a model: a scoring rule S(P, y) assigns a penalty to forecast distribution P given outcome y; expected score S(P, Q) = E_{Y~Q}[S(P, Y)]. **Proper**: S(Q, Q) ≤ S(P, Q) ∀P, Q (strict if equality ⟺ P = Q). Key families: (1) **Brier/quadratic**: S(P,y) = (p−y)² (binary); (2) **Logarithmic/ignorance**: S(P,y) = −log p(y); (3) **CRPS**: CRPS(P,y) = ∫(F_P(x) − 1{y≤x})²dx; (4) **Kernel scores**: S(P,y) = E_P[k(X,X′)] − 2E_P[k(X,y)] (+ const) — CRPS as special case, squared MMD distances between kernel mean embeddings, energy statistics; (5) weighted/threshold-weighted scores targeting regions of interest; (6) scores for estimation (minimum CRPS/log-score estimation as robust MLE alternatives).

## 4. Equations & assumptions
- Propriety: `S(Q, Q) ≤ S(P, Q)` ∀P, Q (Eq. 1); strict iff equality ⟺ P = Q (Definition 4)
- Brier: `S_Brier(P, y) = (p − y)²`
- Log score: `S_log(P, y) = −log p(y)`
- CRPS: `CRPS(P, y) = ∫ ( F_P(x) − 1{y ≤ x} )² dx`
- Kernel score: generalization of CRPS via entropies; `S_k` = squared distance between kernel mean embeddings (Steinwart & Ziegel 2021); connected to MMD (Gretton et al. 2006) and energy statistics (Székely & Rizzo 2013)
- Savage representation: every regular proper score = Bregman divergence of its entropy function (characterization §2.2)
- Assumptions: forecasts are full distributions (or enough of them); outcomes observed; propriety needs the forecaster's belief Q in the model class for strictness to bite.

## 5. Features / target
Distribution forecasts → realized outcomes, any domain. Transfer: GSE engine's predictive distributions over margin/total/cover → realized game outcomes.

## 6. Validation design
N/A (survey). The "validation" is the literature: CRPS standard in meteorology (ECMWF), log score in economics, Brier in classification — each with documented incentive properties.

## 7. Numerical results / baselines
No experiments. Key comparative claims (with citations): log score is sensitive to tail misspecification (one bad density evaluation dominates); CRPS is more robust and rewards the whole distribution; kernel scores let you choose the geometry (which differences between distributions you penalize); weighted scores let you emphasize extremes (e.g., blowout tails). Minimum-score estimators can beat MLE under misspecification.

## 8. Code / data availability
Survey — no code. All formulas implementable in ~20 lines; GSE already has `brier.ts`.

## 9. Leakage & limitations
(a) No empirical guidance on WHICH rule for sports data — the choice among Brier/log/CRPS for GSE is left to us. (b) Properness assumes the forecaster reports their true belief — GSE's engine outputs pass through market-shading and display rounding, breaking strict incentive alignment. (c) CRPS for discrete/point-mass forecasts needs care (mixed distributions). (d) Weighted scoring rules need the weight function chosen a priori — another tuning surface. (e) Minimum-score estimation theory is asymptotic; small-sample behavior unaddressed.

## 10. GSE overlap
GSE has `brier.ts`, `brier-ece.test.ts`, `scoring-reliability.ts`, `skill-metrics.ts` — Brier-centric evaluation, no CRPS, no log-score doctrine, no properness rationale written down anywhere. Ledger [0290] (betting paper) touches evaluation loosely. This paper supplies the missing FOUNDATION: why the metrics are what they are, and the upgrade path (CRPS for distributional margin/total forecasts).

## 11. GSE implementation spec
(1) **Evaluation doctrine**: Brier for cover/no-cover probabilities, log score as tail-sensitive diagnostic, CRPS as the PRIMARY objective for margin/total predictive distributions; (2) implement `crps.ts` in `apps/web/lib/calibration/` (empirical-CDF CRPS for ensemble forecasts; closed form for Gaussian); (3) **minimum-CRPS estimation**: train the distributional heads by minimizing CRPS instead of NLL (robustness per §1.1 of the paper); (4) threshold-weighted CRPS emphasizing |margin| > 14 (blowout tails GSE prices). Effort: 2–3 days.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025, predictive distributions vs outcomes. Compute Brier, log score, CRPS, threshold-weighted CRPS per model version; rank models by each rule and check rank agreement/disagreement (where log and CRPS disagree, diagnose tail vs body). Test minimum-CRPS-trained distributional head vs NLL-trained on held-out 2025 CRPS.

## 13. Acceptance / rejection gate
ADOPT CRPS as primary if: model rankings by CRPS are stable across 2023/2024/2025 (Spearman ≥ 0.8 year-to-year) and CRPS-selected models also win on realized betting utility (CLV). REJECT minimum-CRPS training if it degrades NLL-based tail diagnostics (log score) by >10% — keep NLL training, CRPS evaluation.

## 14. Improvement experiment
**Market-implied proper scores**: compute CRPS/Brier of the MARKET's implied distributions (from spreads/totals and moneylines) vs GSE's — a proper-score "skill gap" decomposition. Where GSE's CRPS beats the market's consistently (by week, by team tier), that's the publishable edge; where it loses, that's the model-repair backlog. This turns the survey's evaluation theory into GSE's weekly model-vs-market scoreboard.

**Verdict:** ADOPT — adopt the paper's proper-scoring framework as GSE's forecast-evaluation doctrine (Brier for cover probs, CRPS primary for margin/total distributions, threshold-weighted CRPS for blowout tails); implement `crps.ts` and score every model version against the market-implied distributions weekly.
