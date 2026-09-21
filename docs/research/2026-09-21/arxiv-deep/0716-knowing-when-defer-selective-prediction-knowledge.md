# [0716] Knowing When to Defer: Selective Prediction for Responsible Knowledge Tracing (arXiv:2509.21514v4)

**Citation:** Joshua Mitton, Prarthana Bhattacharyya, Ralph Abboud, Simon Woodhead (2026). *Knowing When to Defer: Selective Prediction for Responsible Knowledge Tracing*. arXiv:2509.21514v4. URL: https://arxiv.org/abs/2509.21514v4
**Ledger completed:** 2026-09-21. **Read:** full text (fetched: https://arxiv.org/pdf/2509.21514v4 — read complete: abstract, intro, related work, method §3, experiments §4 incl. figures, conclusion, limitations, Appendix A experimental setup, B quantitative accuracy, C uncertainty analysis). Note: the local cache holds only an older version (v1, titled "Uncertainty-Aware Knowledge Tracing Models"); the ledger uses v4 (renamed "Knowing When to Defer"), whose numbers and IRT/BALD analyses are new.
**Verdict:** ADAPT — MC-Dropout variance as a no-retraining, post-hoc abstention signal for the pick-posting gate; the paper's headline lifts (+2.3–3.0 pp accuracy at 80% coverage, tight bootstrap CIs) plus the BALD decomposition (classical proxies capture <4% of the epistemic signal) are the transferable substance.

## 1. Research question
Can existing deployed knowledge-tracing models be given an intrinsic "selective prediction layer" that defers the most uncertain predictions to a human teacher, improving accuracy/AUC/F1 on kept predictions without any retraining? And is the resulting uncertainty signal merely a proxy for classical psychometric features (question difficulty, student ability, IRT outcome ambiguity, curriculum coverage) — or is it model-native epistemic content those proxies cannot recover?

## 2. Dataset / schema
**Eedi mathematics dataset** (online math learning platform), filtered subset:
- 4,257 unique questions (4-choice multiple choice, misconception-tied distractors); features: questionID, question text, construct text, construct-ID, explanation text, misconception text.
- Train: 11,994 students, 1,199,266 interactions (avg 100/student); Validation: 1,493 students, 149,278 interactions. Student-disjoint splits. Students filtered to ≥100 responses; final 100 retained per student. Evaluation causal/left-to-right over the 100-response sequence.
- Curriculum hierarchy: 6 subjects / 50 topics / 212 subtopics / 1,463 constructs (context-target overlap: 81.4% subject, 6.2% construct).
Not public stated. No sports data.

## 3. Method / model
Three KT architectures as instantiations of Fθ: DKT (LSTM, 1.2M params), SAKT (self-attention, 1.7M), AKT (contextual attention with exponential forgetting decay, 3.3M). Training: Adam lr 3×10⁻⁴, cross-entropy, batch 64, 100 epochs, linear warmup + cosine scheduler; dropout 0.2 (DKT, AKT) / 0.5 (SAKT); embedding/hidden dim 128, 1 layer.
**Selective prediction layer (no retraining):** at inference, keep dropout active and run M=100 stochastic forward passes. Total uncertainty = entropy of aggregated predictive distribution; complementary measure = std/variance of predictions across MC samples. Sort predictions by MC-Dropout variance ascending; abstain on the most uncertain fraction to hit target coverage c. IRT baseline comparison: 2PL IRT (Lord et al. 1966), ability θu fit per validation student from first 30 questions via MLE with item parameters from a prefit table; abstention signal 1−2|p_IRT−0.5| evaluated on remaining 70 targets (~110,000 targets per model).
**BALD decomposition:** epistemic uncertainty = total entropy − expected aleatoric entropy across MC samples; regressed on nested predictor sets (question difficulty, + student ability, + IRT ambiguity, + curriculum coverage at 4 granularities) with cumulative R², linear and nonlinear (5-fold CV random forest).

## 4. Equations & assumptions
- Predictive entropy: H(p(r_{t+1}|q_{t+1},H_t)) = −Σ_k p̄_k log p̄_k, p̄_k = (1/M)Σ_{m=1}^{M} p_k^{(m)}.
- Per-class std over MC samples: σ_k = std_m(p_k^{(m)}); the paper's selective signal uses prediction variance.
- BALD epistemic uncertainty = total entropy − mean MC-sample entropy.
- Assumptions: dropout active at train-test time (Gal & Ghahramani 2016 Bayesian approximation); validation cohort held out by student; 2PL IRT representational capacity bounds the baseline; a human teacher exists to absorb deferred cases.

## 5. Features / target
Inputs: student interaction history {q_i, c_i, r_i} (question ID, pedagogical features, binary correctness r_i ∈ {Correct, Incorrect}); target: binary correctness of next response. Operating point c=0.80 (defer 20% most uncertain).

## 6. Validation design
Student-disjoint train/validation. Baselines: no-abstention per-model metrics; calibrated 2PL IRT abstention baseline on matched last-70 subset; reported 95% bootstrap CIs (200 resamples) on all lift numbers. Targeting analysis: error ratio (deferred/kept) within question-difficulty quartiles; fairness: abstention rate across student-ability quartiles. Variance decomposition via nested R² and random-forest bound. No time-ordered backtest (education logs).

## 7. Numerical results / baselines
(quoted exactly)
- Baseline binary-correctness accuracy: AKT 72.44%, SAKT 72.27%, DKT 72.20%; F1: AKT 55.42%, DKT 53.98%, SAKT 53.96%; AUC: 76.20% (SAKT) to 76.75% (DKT).
- At c=0.80 (20% deferred): MC-Dropout variance lifts accuracy by 2.3–3.0 pp, AUC by 1.9–2.4 pp, F1 by 1.4–4.3 pp across all three architectures, no retraining. 95% bootstrap CI margins: ±0.13 pp (accuracy), ±0.10 pp (AUC), ±0.20 pp (F1); "never cross zero."
- Targeting: deferred-set error rate 1.45–1.60× the kept set. Within every difficulty quartile the ratio >1.0; on hardest questions 2.3–2.5× across all three architectures.
- Fairness: abstention rate 16–23% across student-ability quartiles; weakest students (Q1) lowest at 16–17% (not disproportionately deferred).
- IRT baseline (matched subset): MC-Dropout variance AUC lift 2.0–2.4 pp at 80% coverage vs IRT 0.41–0.46 pp — "roughly five times smaller."
- Variance decomposition: difficulty alone 0.4–1.5%; +ability → 0.8–1.8%; +IRT ambiguity → 1.1–3.7%; +4-level coverage → cumulative linear ≤3.8%. Nonlinear RF: 9.8% (SAKT), 10.5% (AKT), 23.2% (DKT); residual unexplained 76.8–90.2%.
- Calibration caveat: mean entropy correlates −0.62 (Pearson, p<10⁻¹¹) with question difficulty — an artifact of binary correctness under class imbalance, not a failure of the uncertainty signal (Appendix C.3).

## 8. Code / data availability
None stated in paper. Data: proprietary Eedi platform logs.

## 9. Leakage & limitations
- Paper's own four limitations: (1) lifts are on validation metrics, not student outcomes — no classroom A/B test; (2) single dataset (Eedi), not validated on other KT corpora; (3) IRT baseline only 2-parameter logistic; temperature-scaled softmax of the deployed model and deep ensembles "remain promising future comparisons" — the paper explicitly flags these as stronger baselines it did not test; (4) no cold-start handling (<30 responses falls outside θ-fitting).
- Single fixed random seed — no multiseed robustness reported.
- MC-Dropout requires dropout in the deployed model and 100 forward passes per prediction (inference cost ×100).
- Education domain; no sports external validity.
- Eedi's blog companion post (eedi.com/news/knowing-when-to-defer) corroborates headline numbers independently.

## 10. GSE overlap
Existing-research map: GSE's abstention lane is conformal/Mondrian-based plus conditional-risk thresholding (BALToR, ledger 0714) and trajectory/disagreement signals (thesis 0715). This paper adds a fourth mechanism — MC-Dropout variance — that is cheaper than ensembles and stronger than calibrated-heuristic baselines (5× the IRT lift is the disciplining number). Its BALD result complements 0715's gap decomposition: heuristic proxies cannot recover model-native epistemic uncertainty, so GSE should not trust difficulty/consensus-style heuristics as abstention signals. New capability, not a duplicate.

## 11. GSE implementation spec
1. For any GSE model with dropout (or trainable with it): at posting time, run M=50–100 stochastic forward passes per candidate pick; compute per-pick prediction variance; defer the top-uncertain fraction to hit a target posting coverage (e.g., c=0.80).
2. For non-dropout models: emulate via seeded bootstrap refits (10 seeds) and use prediction disagreement — matches this paper's spirit at lower inference cost.
3. Run the paper's fairness analogue: check deferral rate across sports/leagues and across pick confidence quartiles to ensure the abstainer doesn't just defer the hardest games.
Effort: 3–5 days engineering + backtest.

## 12. Reproducible test
Dataset: GSE engine `picks` table 2024–2025 with probabilities. Implement MC-Dropout variance (or seed-disagreement) per pick; at c=0.80 coverage compare hit rate vs no-abstention and vs a calibrated-heuristic baseline (e.g., |p−0.5|-based abstention). Reproduce the paper's fairness check: deferral rate by league and by spread-size quartile must stay within ±8 pp of the 20% target.

## 13. Acceptance / rejection gate
ADOPT if, on 2024–2025 test window, MC-variance abstention at c=0.80 lifts cover/hit rate by ≥1.5 pp over no-abstention AND beats the |p−0.5| heuristic baseline by ≥1.0 pp, with deferred-set error ratio ≥1.3 vs kept set. REJECT otherwise — keep the BALToR/conformal gate instead.

## 14. Improvement experiment
Test the paper's own flagged baseline: compare MC-Dropout variance against a deep-ensemble (5 independently seeded refits) abstention signal on the same picks — the paper did not run this comparison, and it determines whether the cheaper dropout signal loses anything. Second: decompose GSE's per-pick uncertainty via the paper's nested-R² approach — regress engine uncertainty on matchup difficulty, team-strength gap, and line-movement features; if a large residual remains, that justifies the model-native signal over heuristics.
