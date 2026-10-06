# [0701] Distributional regression with reject option (arXiv:2503.23782v1)

**Citation:** Clément Dombry, Ahmed Zaoui (2025). *Distributional regression with reject option*. arXiv:2503.23782v1. URL: https://arxiv.org/abs/2503.23782v1
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2503.23782.txt`, ar5iv-converted HTML text; complete paper §§1–5, conclusion, references, and supplementary proofs Appendices A–D — Lemmas 1–6, Propositions 1–6, Theorems 1–2, Corollaries 1–3 — read in full).
**Verdict:** ADAPT — the optimal reject rule at a *fixed* rejection rate is exactly the GSE publish-gate problem: fix a sit-out fraction ε and the optimal rule rejects the highest-CRPS-entropy distributional predictions. This gives a theoretically grounded publish/withhold rule for a probabilistic GSE engine, complementing the ROC-tuned conformal threshold in ledger 0700.

## 1. Research question
Can the reject option be extended from classification/regression to distributional regression — i.e., abstain from estimating the full conditional distribution Y|X when uncertainty is too high — with an optimal rule at a fixed, exactly controlled rejection rate?

## 2. Dataset / schema
Three UCI regression benchmarks: QSAR Aquatic Toxicity (546×8, target 0.12–10.05, low heteroscedasticity), Airfoil Self-Noise (1503×5, target 103–140, strong heteroscedasticity), Concrete Compressive Strength (1030×8, target 2.33–82.6 MPa, strong heteroscedasticity). No sports data. Split: 50% labeled train / 20% unlabeled calibration / 30% test.

## 3. Method / model
Distributional regression with reject option. Risk: R_λ(Γ_F) = E[CRPS(F_X,Y)·1{Γ_F(X)≠re}] + λ·r(Γ_F). The optimal predictor (Prop. 1): Γ*_λ(X) = F*_X if ent(F*_X) ≤ λ, else reject — i.e., reject when the CRPS entropy exceeds a threshold. At fixed rejection rate ε (Prop. 3): Γ*_ε = Γ*_{λ_ε} with λ_ε = G_ent^{-1}(1−ε), achieving exactly r = ε. Semi-supervised plug-in estimator: labeled D_n fits F̂_{n,X} (distributional KNN or distributional random forest); unlabeled D_N calibrates the entropy CDF Ĝ; randomization ζ ~ U[0,u] ensures exact rate attainment. Rejection-rate control is distribution-free: E[|r(Γ̂_ε) − ε|] ≤ CN^{-1/2} (Prop. 5).

## 4. Equations & assumptions
- CRPS(H,y) = ∫(H(u) − 1{y≤u})²du; average-CRPS decomposition: CRPS̄(H,K) = ent(K) + Div(H,K) with ent(K) = ∫K(u)(1−K(u))du, Div(H,K) = ∫(H(u)−K(u))²du (Lemma 5). Lemma 1: E[CRPS(F*_X,Y)|X] = ent(F*_X).
- Optimal rule: Γ*_λ(X) = F*_X iff ent(F*_X) ≤ λ (Prop. 1); λ_ε = G_ent^{-1}(1−ε) (Prop. 3).
- Excess risk: E[ℰ_{λ_ε}(Γ̂_ε)] ≤ 2E[Div(F̂_{n,X},F*_X)] + E[|ent(F̂_{n,X})−ent(F*_X)|] + MC/√N + u (Thm. 1); ≤ 3E[W_1(F̂_{n,X},F*_X)] + MC/√N + u (Cor. 1); distributional KNN rate ≲ n^{-h/(2h+d)} + N^{-1/2} for d≥2 (Cor. 3).
- Plug-in entropy for weighted-average estimators: ent(F̂_{n,X}) = Σ_iΣ_j w_i w_j (Y_j−Y_i)1{Y_i<Y_j} (Lemma 6).
- Assumptions: ent(F*_X) has a continuous distribution (needed for exact ε); ent bounded by M; W_1-regular conditional laws for the KNN rates.

## 5. Features / target
Covariates → full conditional distribution of a continuous outcome (not just a point forecast). For GSE: features → conditional distribution of margin of victory (or spread result); CRPS entropy = the publish/withhold statistic.

## 6. Validation design
Semi-supervised procedure with genuinely unlabeled calibration data; rejection rate ε swept over {0, 0.1, …, 0.9}; 100 repetitions, mean ± std of empirical error and rejection rate; baselines DRF vs KNN estimators; CRPS computed with the R `ScoringRule` package.

## 7. Numerical results / baselines
- Airfoil DRF: Err 1.53(0.05) at ε=0 → 1.11(0.06) at ε=0.5 → 0.78(0.09) at ε=0.9.
- Rejection rates track targets almost exactly: ε=0.1 → r̂=0.10(0.02); ε=0.5 → r̂=0.50(0.04); ε=0.9 → r̂=0.90(0.02), even with only 20% unlabeled data.
- Concrete DRF: Err 3.55(0.14) at ε=0 → 1.92(0.22) at ε=0.9; QSAR DRF: 0.65(0.04) → 0.37(0.09).
- DRF uniformly beats distributional KNN on error; authors conclude calibration of the entropy threshold matters more than the estimator choice.

## 8. Code / data availability
Code: https://github.com/ZaouiAmed/DistributionalRegression_RejectOption. Datasets are public UCI. R implementations via `KernelKnn`, `DRF`, `ScoringRule` packages.

## 9. Leakage & limitations
- Theory is clean but the KNN minimax rate n^{-h/(2h+d)} suffers the curse of dimensionality; GSE feature spaces are wide.
- The optimal rule depends on the *estimated* entropy; Lemma 6's plug-in is for local-average estimators — for neural/GNN distributional models there is no such closed form (would need a separate entropy head).
- Assumption 1 (continuous ent) fails if the entropy distribution has atoms (e.g., degenerate distributions in NFL score mixtures); the ζ-randomization handles estimation but the exact-ε claim is asymptotic.
- No sports or high-dimensional evaluation; no comparison against simply thresholding predictive variance.
- The divergence term bounds are in W_1, which is coarse for sharp distributional forecasts.

## 10. GSE overlap
Directly new: no distributional-regression-with-reject-option in the corpus. Pairs with 0700 (conformal abstention): 0700 gives a coverage guarantee + ROC-optimal threshold; 0701 gives the *optimal* rule for a *fixed* sit-out rate under CRPS — the two are the natural candidates for GSE's publish gate and should be A/B'd.

## 11. GSE implementation spec
1. Fit a distributional model of MOV (margin of victory): distributional random forest or quantile-based network, evaluated by CRPS.
2. Compute CRPS entropy ent(F̂_{n,x}) per game via Lemma 6 (for DRF) or an entropy head (for NN).
3. Choose target sit-out rate ε (e.g., 15%); calibrate λ_ε on a rolling unlabeled window of historical games via the empirical entropy CDF (semi-supervised step — no labels needed).
4. Publish picks only when ent(F̂_{n,x}) ≤ λ_ε; report the empirical coverage guarantee E[|r̂−ε|] ≤ CN^{-1/2} on the gate.
Effort: ~1 week (DRF via Python `quantile_forest`-style implementation + Lemma 6 entropy).

## 12. Reproducible test
Dataset: nflverse 2015–2025 MOV. Fit DRF distributional regression ≤2023 (labeled), calibrate λ_ε on 2024 features (unlabeled), test 2025. Sweep ε ∈ {0, 0.1, …, 0.3}. Metrics: CRPS error on published games, realized rejection rate vs ε, ROI of published games vs (a) the 0700 conformal gate and (b) no-gate baselines. Baseline to beat: (a).

## 13. Acceptance / rejection gate
ADAPT if the ε=0.15–0.2 plug-in rule achieves |r̂−ε| ≤ 2pp and beats the no-gate baseline on published-game ROI by ≥1pp with lower CRPS error; adopt the entropy criterion if it also beats the 0700 conformal gate.

## 14. Improvement experiment
Replace the static ε with a *regime-conditional* rejection budget: allocate larger sit-out fractions to high-entropy regimes (division games, heavy weather, short rest) and smaller to clean games, and test whether regime-conditional ε improves published ROI vs the global ε — analogous to the improvement proposed in 0700, attacking the paper's single-global-λ limitation.
