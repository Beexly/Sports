# [0811] Causal Feature Selection Method for Contextual Multi-Armed Bandits in Recommender System (arXiv:2409.13888)

**Citation:** Zhenyu Zhao, Yexi Jiang (2024). *Causal Feature Selection Method for Contextual Multi-Armed Bandits in Recommender System*. arXiv:2409.13888. URL: https://arxiv.org/abs/2409.13888
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; LateXML conversion of the RecSys 2024 Bari paper).
**Verdict:** ADAPT — HIE/HDD are cheap, model-free feature screens that rank features by heterogeneous treatment effect across arms rather than outcome correlation; directly usable as a pre-screen for GSE's pick-selection / abstention bandits, but built for binary rewards and randomized arm assignment, so the scores must be re-derived for win/loss/ROI rewards before adoption.

## 1. Research question
In contextual multi-armed bandits, conventional feature selection (correlation with the outcome) fails because what matters is not predicting the average reward but identifying features that change WHICH arm is optimal (heterogeneous treatment effects across arms). The paper introduces two model-free filter scores — Heterogeneous Incremental Effect (HIE) and Heterogeneous Distribution Divergence (HDD) — that rank features by the HTE they induce, and validates them on synthetic ground-truth data and a 600k-sample Roblox recommender experiment.

## 2. Dataset / schema
(a) Synthetic: CausalML heterogeneous-treatment-effect data generator; 10 trials × 50,000 samples, 3 arms, 10 features (5 true HTE-important, 2 correlated with outcome but no HTE, 3 irrelevant). Ground truth known. (b) Real: online randomized experiment at Roblox optimizing content cover image — 4 variants (arms), 600,000 samples; reward computed by offline matching (count reward where the model's selected arm equals the observed arm). Feature list not enumerated in text; "most features are categorical"; one synthetic irrelevant random feature added as a negative control. Access: synthetic generator is public (CausalML package); Roblox data proprietary.

## 3. Method / model
For each feature x: bin into m_x bins (each of size N_b) to capture nonlinearity and handle continuous/categorical uniformly.
- HIE: within bin b, winning arm w_b = argmax_i P_{b,i}(Y=1); global winner w*. Score = sample-weighted incremental gain of using per-bin winners over the global winner.
- HDD: sample-weighted contextual KL divergence between arm reward distributions within bins, minus the non-contextual (pooled) KL divergence — i.e., how much MORE the arm distributions diverge once conditioned on the feature.
- Combined: FI(x) = α1·ĤI_HIE(x) + α2·ĤI_HDD(x), min-max normalized, α's as hyperparameters.
Evaluation of downstream value: LinUCB, nonlinear LinUCB (quadratic term), and Cohort-based Thompson Sampling CMAB trained with selected vs unselected features; reward compared.

## 4. Equations & assumptions
HIE: FI_HIE(x) = Σ_{b=1}^{m_x} (N_b/N)·(P_{w_b}(Y=1) − P_{w*}(Y=1)), with w_b = argmax_{i∈{1..k}} P_{b_i}(Y=1), w* the global winning arm.
HDD: FI_HDD(x) = Σ_b (N_b/N)·D_b(P_{b_1},…,P_{b_k}) − D(P_1,…,P_k), where D_b = Σ_{i,j} (N_{b_i}N_{b_j}/N_b²)·Σ_{v∈{0,1}} P_{b_i}(Y=v)·log(P_{b_i}(Y=v)/P_{b_j}(Y=v)) (pairwise KL over binary outcomes), and the pooled term is the same with bin subscripts dropped.
Combined: FI(x) = α1·ĤI_HIE(x) + α2·ĤI_HDD(x).
Assumptions (stated or implied): binary reward Y (derivation given for binary; extension not shown); arms were randomly assigned in the logging data (needed for the per-bin arm-conditional probabilities to be causal — the real experiment was randomized); binning granularity chosen by the analyst; min-max normalization across features for the combined score.

## 5. Features / target
Input features: candidate context features for a CMAB (categorical or continuous; real-data list not enumerated). Target: the feature-importance score itself (HIE/HDD/combined), used to select which features enter the downstream CMAB. Downstream target: binary reward Y=1 (click/conversion analog; in GSE terms: pick win). Prediction horizon: per decision (per recommendation / per pick).

## 6. Validation design
Synthetic: 10 trials, ground-truth important features known; check that HIE/HDD/combined rank the 5 true HTE features above the 2 correlational-but-non-HTE and 3 irrelevant features, and that CMABs using selected features earn higher reward. Real: 600k-sample randomized experiment; feature-importance ranking vs downstream CMAB reward via offline matching (LinUCB; nonlinear LinUCB excluded because features mostly categorical); negative-control random feature should rank last. Baselines compared: model-based selection (feature importance inferred from incremental MAB-model reward — LinUCB, nonlinear LinUCB, CohortMAB) vs the model-free HIE/HDD. Time-ordering: not applicable (randomized experiment + synthetic).

## 7. Numerical results / baselines
All results figure-reported (Figures 2–3); the one exact table is compute time:
- Synthetic: HIE, HDD, and combined "effectively select the true important features that produce high CMAB rewards" across LinUCB, nonlinear LinUCB, and Cohort Thompson Sampling (Figure 2, qualitative — no reward numbers in text).
- Real: importance scores "align with the CMAB rewards"; the added irrelevant random feature "ranked the lowest"; HIE "more sensitive — dropping to the lowest for unimportant features" (Figure 3, qualitative).
- Table 1 (exact, seconds per trial, 10 features × 50,000 samples): HIE+HDD 2.7s vs LinUCB 647.3s vs nonlinear LinUCB 665.5s vs CohortMAB 82.5s — the model-free screen is ~240× faster than LinUCB-based selection and ~30× faster than CohortMAB.
- Paper's claim: model-free HIE/HDD match or beat model-embedded selection on downstream CMAB reward with far less compute and no model-misspecification risk. No p-values or confidence intervals stated.

## 8. Code / data availability
CausalML Python package (public, cited for the synthetic generator). No code link for HIE/HDD themselves stated. Roblox data proprietary.

## 9. Leakage & limitations
- Adversarial: no exact reward numbers, no significance tests — "effectively selects" rests on bar charts. Real-data evaluation uses offline matching (only logged arm = selected arm counts), which is unbiased only under the randomized logging policy — fine here, but GSE has no randomized pick-assignment log, so the per-bin arm-conditional probabilities would be confounded by the engine's own selection bias (good picks get posted; bad ones don't). This is the single biggest transfer risk: without randomization or IPS weighting, HIE/HDD measure selection artifacts, not HTE.
- Binary-reward derivation only; GSE rewards are ternary-ish (win/loss/push) plus continuous ROI — the KL terms need re-derivation (or reward binarization, which discards stake sizing info).
- Bin count m_x is a free parameter with no guidance; too few bins hides nonlinearity, too many makes per-bin arm estimates noisy.
- HDD's pooled-divergence subtraction can go negative; the paper doesn't discuss interpreting negative scores.
- Future-work section admits the online validation (10k contents × CMAB with different feature sets) was not yet run — the "online" claim is pending.

## 10. GSE overlap
Existing-research map line 144: "RL / bandits for pick selection — ML brief lists contextual bandits, but no papers read. Selection-under-budget, learning-to-abstain with coverage-risk curves." → first bandit feature-selection paper read; no duplication. Pairs with ledger 0810 (AMS): HIE/HDD would be the feature screen feeding a pick-selection/abstention bandit. GSE's props/DFS lane and the abstention lane (learning-to-abstain) are the natural consumers — features that change WHICH pick to make (or whether to post) are exactly HTE features.

## 11. GSE implementation spec
Adaptation: build HIE/HDD as a feature-screening module for GSE's pick-selection and abstention models. Arms: for pick selection, arms = bet types (spread/ML/total) or engine versions per game; for abstention, arms = {post, skip}. Rewards: binarized pick outcome (win=1, loss=0; pushes dropped or half) — or re-derive KL for graded rewards (recommended: keep binary first). Critical fix for the randomization gap: use inverse-propensity weighting from the engine's own posting policy, or restrict to quasi-randomized subsets (e.g., all-model-output games before the posting filter, which GSE logs in the predictions DB). Pipeline: nflverse + FTN charting features → bin (quantile bins, m_x=10) → HIE/HDD per feature → rank → feed top-k into LinUCB/Thompson pick selector. Effort: ~2-3 days for the binary version on historical picks; graded-reward KL derivation +1-2 days.

## 12. Reproducible test
Dataset: GSE engine predictions DB (picks table, 3,411+ picks, SPREAD/MONEYLINE/TOTAL), 2024 season + 2025 Weeks 1-2. Protocol: compute HIE/HDD for candidate context features (spread magnitude, total, rest days, home/road, divisional, line movement) with arms = {bet, skip} (abstention framing) and binary reward = pick won. Downstream test: LinUCB pick selector trained with top-k HIE/HDD features vs top-k correlation-selected features vs all features; evaluate on 2025 holdout (time-ordered) by ROI and Brier. Baseline to beat: correlation-based selection (the paper's foil). Metric: ROI per pick and cumulative regret; success = HTE-selected features beat correlation-selected by ≥ 1.5 ROI points on holdout.

## 13. Acceptance / rejection gate
ADAPT if on the GSE 2025 holdout replay (a) HIE/HDD rank a known-spurious correlate (e.g., raw team win% — predictive of outcome but not of arm-differentiation) below true HTE features like line-movement buckets, AND (b) the LinUCB selector using HIE/HDD top features beats the correlation-selected selector by ≥ 1.5 ROI points per 100 picks. REJECT if either fails — the method then adds machinery without beating a plain correlation screen on GSE's data.

## 14. Improvement experiment
Two extensions: (1) Re-derive HDD for continuous graded rewards (ROI per pick) using differential-entropy / KL between per-bin reward densities (KDE or quantile-parameterized), so stake-sizing and push information isn't discarded — test whether graded HDD beats binary HDD on the same holdout. (2) Time-varying HIE: compute HIE in rolling 4-week windows and select features whose HTE is stable vs emerging (e.g., weather features gain HTE in December) — a "regime-conditional feature screen" that feeds the changepoint-resetting bandit from ledger 0810's improvement experiment, closing the loop between feature selection and non-stationary model selection.
