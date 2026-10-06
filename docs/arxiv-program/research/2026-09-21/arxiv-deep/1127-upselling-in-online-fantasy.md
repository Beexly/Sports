# [1127] Upselling in Online Fantasy Sports: Dream11 Experiments and Causal Policy (arXiv:2409.00629)

**Citation:** Authors (2024). *Upselling in Online Fantasy Sports*. arXiv:2409.00629v2. URL: https://arxiv.org/abs/2409.00629
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — not for sports prediction, but the multi-treatment deposit-policy experiment design and the CATE-based assignment framework transfer directly to GSE's own packaging/pricing experiments (kit upsells, pick-pack tiers), with the paper's own outcome-definition ambiguity flagged as the thing to fix.

## 1. Research question
How do upsell intensity treatments (discount multipliers on deposit offers) affect deposit behavior on the Dream11 fantasy-sports platform (stated as 200M+ users), and can heterogeneous treatment-effect (CATE) learners identify which users should get which intensity to maximize revenue without harming conversion?

## 2. Dataset / schema
Proprietary Dream11 transaction dataset: millions of deposit transactions. Schema (per text): user identifiers/cohorts (new vs existing users), deposit amounts, transaction completion (deposit completion vs total deposit — the outcome definition shifts between sections, see §9), treatment arm (1x, 1.25x, 1.5x, 2x intensity), timestamps over an 8-week live experiment window, 2024-01-01 to 2024-02-28. Exact row counts not stated; described as "millions of transactions". Not public, not replicable.

## 3. Method / model
- Stage 1 (supervised prediction): weighted-F1 comparison of models predicting deposit behavior — heuristic baseline, LightGBM regressor, LightGBM classifier, focal-loss classifier. Results: heuristic 0.736, LGBM regressor 0.758, LGBM classifier 0.804, focal-loss classifier 0.852.
- Stage 2 (experimentation): 8-week live experiment with four intensity arms (1x, 1.25x, 1.5x, 2x upsell intensity).
- Stage 3 (causal policy): S/T/X/R learners implemented with XGBRegressor and a fixed propensity score of 0.5; hyperparameter search with 1,000 Hyperopt trials. Offline-derived assignment policy estimated to deliver 10.7% revenue uplift; new-user 1x assignment arm reported 2.1% conversion improvement.
- Immediate effects: +5.6% per-transaction value from upselling, but the most aggressive variant (2x) showed a 4.8% transaction decline; conversion fell almost 2.1% overall.

## 4. Equations & assumptions
No formal equations stated for the CATE estimators in the extracted text — learners are described by name (S/T/X/R with XGBRegressor) and procedure (1,000 Hyperopt trials, fixed propensity 0.5). Assumptions: unconfoundedness conditional on the features used in the causal learners; the fixed propensity of 0.5 is asserted rather than estimated — questionable with five policy arms (see §9). Weighted-F1 used for the supervised stage.

## 5. Features / target
Features: user transaction history, cohort (new/existing), deposit behavior features (exact list not fully enumerated in extracted text). Targets: per-transaction deposit value (immediate +5.6%), total deposit / deposit completion (outcome definition inconsistent across sections), conversion (down ~2.1%), transaction count (down 4.8% at 2x).

## 6. Validation design
- Offline supervised comparison on historical transactions (weighted-F1; split protocol not stated — see §9).
- 8-week randomized live experiment (Jan 1–Feb 28, 2024), four intensity arms vs control.
- Offline CATE policy evaluation estimating 10.7% revenue uplift — no online A/B validation of the CATE-derived assignment policy is reported.

## 7. Numerical results / baselines
- Supervised (weighted-F1): heuristic 0.736; LGBM regressor 0.758; LGBM classifier 0.804; focal-loss classifier 0.852.
- Experiment: per-transaction value +5.6%; most aggressive (2x) variant: transaction decline 4.8%; conversion decline ≈2.1%.
- CATE policy: offline-estimated revenue uplift 10.7%; new-user 1x assignment: conversion improvement 2.1%.
- These are the paper's claims from a proprietary dataset; no independent verification possible.

## 8. Code / data availability
None stated (proprietary Dream11 data; no code link in extracted text).

## 9. Leakage & limitations
- The outcome definition shifts between "total deposit" and "deposit completion" across sections — the 10.7% uplift and the −2.1% conversion numbers may not describe the same quantity.
- Fixed propensity 0.5 with five policy arms (control + 4 intensities) is methodologically suspect; estimated propensities or overlap diagnostics are not reported.
- The CATE policy's 10.7% uplift is offline-estimated only; no online validation of the derived assignment policy is shown.
- Split protocol for the supervised stage is not stated; no confidence intervals on any estimate.
- The 2x intensity's 4.8% transaction decline with only 2.1% conversion decline suggests composition effects (fewer, larger deposits) that the paper does not decompose.
- External validity to GSE: Dream11 is a deposit-driven fantasy-wallet product; GSE sells subscriptions/kits/picks, so the outcome mechanics differ.

## 10. GSE overlap
New capability for the monetization lane, not the prediction engine. The existing-research map's prediction-market and affiliate lanes cover pricing but nothing covers multi-treatment pricing experiments or CATE-based offer assignment. The Kit lane ($350 sites, $49/mo AI receptionist upsell) and any future pick-pack tiers are the natural application surface. The experimental-design lesson (measure both intensive margin +5.6% and extensive margin −2.1% conversion) is directly reusable.

## 11. GSE implementation spec
- Design a 4-arm pricing experiment for GSE pick subscriptions or Kit upsells: arms = no offer / standard / +25% bonus content / 2x bonus content (mirror of 1x–2x intensities), randomized at signup over ≥4 weeks.
- Measure BOTH margins the paper shows matter: revenue per user (intensive) and conversion/cancellation (extensive). Pre-register which is primary to avoid the paper's outcome-definition drift.
- Fit T-learner/X-learner with XGBoost on user features (traffic source, pages viewed, sport interest) to build an assignment policy; require estimated propensities, not a fixed 0.5, and enforce overlap trimming.
- Effort: experiment infra ~1 week (if a feature-flag/AB system exists; else the infra is the project), analysis notebook 2–3 days.

## 12. Reproducible test
Dataset: GSE's own signup/purchase log (Kit + pick-pack sales). Metric: per-visitor revenue and conversion by arm. Baseline to beat: current static pricing. Gate: an arm or CATE policy must show ≥5% per-visitor revenue lift with conversion not declining more than 1 point, sustained over a 4-week window, before rollout.

## 13. Acceptance / rejection gate
ADAPT the experiment design if: a pre-registered dual-margin experiment shows ≥5% revenue-per-visitor lift with conversion decline <1 pp over ≥4 weeks. REJECT the CATE-assignment half if offline uplift estimates cannot be replicated in a live A/B (the paper's own gap) — ship only the best uniform arm.

## 14. Improvement experiment
Contextual bandit instead of fixed-arm experiment: Thompson-sampling assignment of the four intensities using the T-learner's uncertainty, minimizing regret during the experiment itself. Compare cumulative revenue of the bandit vs the fixed-arm design in simulation from the experiment's own data; hypothesis: the bandit captures most of the 10.7%-style uplift while spending fewer users in the harmful 2x arm.
