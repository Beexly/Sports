# [1109] Population-based metaheuristics for Association Rule Text Mining (arXiv:2001.06517v1)

**Citation:** Iztok Fister, Suash Deb, and Iztok Fister (2020). *Population-based metaheuristics for Association Rule Text Mining*. arXiv:2001.06517v1. URL: https://arxiv.org/abs/2001.06517v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — descriptive rule mining with no predictive validation, no stability analysis, and subjective interpretation; not worth GSE adaptation. Replaced by ledger 1307 (arXiv:2508.05891v1).

## 1. Research question
Can particle swarm optimization (PSO) mine association rules from text (triathlete RSS/blog feeds) more effectively than classical Apriori-style mining?

## 2. Dataset / schema
4,271 triathlete RSS/blog feeds; only the 1,000 most frequent terms kept. PSO: population 200, 5 runs, 10,000 fitness evaluations; C1=C2=2.0, inertia 0.7. Fitness = equal average of support, confidence, and an aggregate weighted score.

## 3. Method / model
PSO-based association rule mining (PSO-ARTM): particles encode rule antecedent/consequent sets over the 1,000-term vocabulary; fitness trades off support, confidence, and a weighted aggregate. Rule counts for K=5,6,7,8: 4,594 / 1,947 / 282 / 273 rules.

## 4. Rejection grounds
(1) No predictive baseline, no holdout, no stability or significance test — the mined rules are never shown to predict anything or replicate. (2) The fitness function equally averages support, confidence, and an ad-hoc weighted score with no justification; results are a function of this arbitrary choice. (3) "TF/ITF" terminology is questionable/non-standard (likely TF-IDF mislabeled) and interpretation of rules is subjective narrative. (4) Rule counts collapse from 4,594 to 273 as K grows, with no analysis of which rules are real. Nothing here transfers to a calibration-first prediction company.

## 5. Replacement
Replaced by full ledger 1307: arXiv:2508.05891v1 — "Bayesian weighted discrete-time dynamic models for association football prediction" (dynamic team-strength modeling with commensurate priors), a rigorous Bayesian read.
