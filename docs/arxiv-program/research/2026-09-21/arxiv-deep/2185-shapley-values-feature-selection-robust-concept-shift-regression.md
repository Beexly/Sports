# [2185] A Feature Selection Method Based on Shapley Values Robust to Concept Shift in Regression (arXiv:2304.14774v3)

**Citation:** Carlos Sebastián and Carlos E. González-Guillén (2023, Fortia Energía / Universidad Politécnica de Madrid). *A Feature Selection Method Based on Shapley Values Robust to Concept Shift in Regression*. arXiv:2304.14774v3. URL: https://arxiv.org/abs/2304.14774
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* "SHAPEffects": backward feature selection that relates local SHAP values to validation-set prediction errors, eliminating variables whose effect pushes predictions in the wrong direction under concept shift; beats Boruta/Lasso/PIMP when relationships change. GSE adapts it as the feature-pruning layer for regime changes (new OC, QB turnover, rule changes) where standard importance-based selection keeps stale-but-influential features.

## 1. Research question
Standard feature selection ranks variables by global importance/influence — sensible in a static joint distribution, but blind under concept shift (changes in the X→y relationship), where a historically influential variable can actively hurt current predictions. Can a selection method that relates *local* Shapley values to *local* prediction errors detect and eliminate exactly those variables whose learned effect has become counterproductive, outperforming SOTA selectors under shift while matching them in static settings?

## 2. Dataset / schema
- **Synthetic (sudden + incremental shift):** f(x_t) = 2x_{1,t} + λ₁x²_{2,t} + 3sin(2πx_{3,t}) - 0.4x_{4,t} + λ₂x²_{5,t} + (same 5 terms at t-1) + ε_t, ε~N(0,0.01); x_i ~ U(0,1), i=1..10 (only first 5 informative) + lag of target as extra variable. λ₁: {-10,-1,-0.1}→{-4,-0.4,-0.04}, λ₂: {10,1,0.1}→{-25,-2.5,-0.25}; all 81 combinations. Sudden shift at sample 20001; incremental shift linearly over samples 20001–25000. Train 1–20000 / validation 20001–25000 / test 25001–30000 (temporal order; shift begins inside validation — the first moment an algorithm could detect it).
- **Real case 1 — Spanish day-ahead electricity price (EPF):** 335 explanatory variables (ESIOS portal + MIBGAS gas price); concept shift = June 15, 2022 Iberian gas-price cap decree, which broke the electricity–gas price relationship (documented via monthly correlation plots).
- **Real case 2:** (tables labeled first/second shift case; second draws on Sberbank Russian Housing market per references).
- **Static benchmarks:** CAT Scan Localization (UCI, 384 features, 53500 CT slices/74 patients), Appliances Energy Prediction (UCI, 28 variables + 2 random), Max Planck Weather (12 atmospheric vars, lags 1 day–1 week → 80 variables, wind-speed target). Random train/val/test splits.

## 3. Method / model
**SHAPEffects** — backward selection in two phases:
1. *Optional preprocessing:* add a random (permuted) copy of the most influential variable; repeat n_iter_prev trainings with different seeds; drop variables whose mean global influence ≤ the random variable's (Boruta-style noise filter).
2. *Core loop:* train model on current feature set → compute SHAP values on the **validation** set → classify validation observations by prediction error err(x,y) = y - ŷ(x) into Correctly Predicted / Over-Predicted / Under-Predicted using error quantiles Q_low = Quantile(err, q_low), Q_high = Quantile(err, q_high), with bias-translation (Q*_low, Q*_high) when 0 ∉ [Q_low, Q_high] so model bias lands in the "wrongly predicted" space (Definition 1). Per-observation effect: Effect_{var,x} = sgn(SHAP_var) · SHAP_var² (squaring amplifies the most influential). Group effect Ef_{var,group} = Σ_{x∈group} Effect_{var,x}. *Negative influence* (Definition 2, 5 cases): infinite if the variable has zero effect anywhere (pure noise/overfit candidate — all such dropped at once); otherwise computed from how the variable's group effects align with the model's current bias direction (median error q₂(err)): e.g., if the model over-predicts (q₂(err)<0) and the variable increases over-predictions while reducing under-predictions, its negative influence = |Ef_O.P| - |Ef_U.P| (undesirable minus desirable); a variable that worsens both tails gets |Ef_U.P|+|Ef_O.P|. The variable with the largest non-zero negative influence is dropped; iterate until none remain. The feature set with the best validation metric (MAE/MSE/R², informative only) is returned. Baselines: Powershap, Boruta-Shap, Shapicant, Boruta, PIMP, best-Lasso.

## 4. Equations & assumptions
- Shapley value: φ_i = Σ_{S⊆N\{i}} |S|!(|N|-|S|-1)!/|N|! · (v(S∪{i}) - v(S)).
- Permutation form: φ_i = 1/|Π(N)| Σ_{π∈Π(N)} (v(P_i^π ∪ {i}) - v(P_i^π)), P_i^π = {j: π(j) < π(i)}.
- Effect: Effect_{var,x} = sgn(SHAP_var(x,y,ŷ)) · SHAP_var(x,y,ŷ)²; Ef_{var,group} = Σ_{x∈group} Effect_{var,x}.
- Error grouping (Definition 1): x correctly predicted iff err ∈ [Q*_low, Q*_high]; under-predicted iff err > Q*_high; over-predicted iff err < Q*_low; Q*_ adjustments translate quantiles when model is biased.
- Assumptions: (i) SHAP (TreeSHAP in practice) faithfully attributes per-observation effects; (ii) validation-set error stratification reflects the current regime; (iii) a feature whose effect consistently opposes the correction direction is shifted, not merely noisy; (iv) method does NOT detect shift explicitly — it only eliminates variables with negative local influence; (v) regression only (classification extension is future work); (vi) O(2^|N|) exact Shapley infeasible — approximations used.

## 5. Features / target
Synthetic: 10 uniform features + target lag (5 informative); target = f(x_t) with regime-changing λ's. EPF: 335 market/fuel variables; target = day-ahead electricity price. Static: as listed above. The method is model-agnostic but evaluated with tree models (TreeSHAP).

## 6. Validation design
Temporal train/val/test for shift scenarios (shift starts inside validation); random splits for static. 81 sudden-shift + 81 incremental-shift synthetic scenarios. Comparison = histogram of (SHAPEffects mean MAE − competitor mean MAE) over scenarios, plus per-case test tables (mean/std/max/min of MAE, RMSE, R² across repeats). Metric used for final set selection: validation MAE/RMSE/R² (informative, not decision-driving within the loop).

## 7. Numerical results / baselines
- **81 synthetic scenarios:** MAE-difference histograms predominantly negative (SHAPEffects better); positive differences "practically negligible", occurring only when shifted variables' coefficients were near-insignificant. Sudden vs incremental shift results nearly identical.
- **Real shift case 1 (sudden, test set):** SHAPEffects(0.1–0.9) MAE 12.61, RMSE 15.60, R² -0.99 vs Boruta 13.41/17.14/-1.40, PIMP 13.39/17.11/-1.39, Best Lasso(0.001) 13.41/17.14/-1.40, Shapicant 19.27/22.30/-3.07. (~6% MAE improvement over the best SOTA selector.)
- **Real shift case 2 (test set):** SHAPEffects(0.2–0.8) MAE 12.97, RMSE 15.98, R² -1.09 vs Boruta-Shap 13.71/17.52/-1.51, PIMP 13.65/17.44/-1.49.
- **Static scenarios:** SHAPEffects comparable to SOTA (CAT Scan, Appliances, Max Planck tables) — also eliminates overfitting variables that create "forced relationships" in training.
- Quantile parameters (q_low, q_high) matter: (0.25–0.75) vs (0.1–0.9) give different elimination paths; (0.1–0.9) best in real case 1.
- Note: R² negative in real cases — all methods struggle post-shift in absolute terms; the claim is relative superiority.

## 8. Code / data availability
Algorithm code + databases + results: https://github.com/CCaribe9/SHAPEffects. Synthetic data generated by given equations; EPF data from ESIOS/MIBGAS portals (public); static sets from UCI/Kaggle (public).

## 9. Leakage & limitations
Adversarial read: (i) shift begins *inside the validation set* — the method needs post-shift validation data; if GSE validates on a stale season, nothing is detected; (ii) backward elimination with TreeSHAP refits per iteration — expensive at GSE's feature counts unless restricted to a candidate shortlist; (iii) Sundararajan & Najmi / Janzing critique (cited in-paper): TreeSHAP can assign non-zero values to irrelevant-but-correlated features — the "infinite negative influence" pruning may kill correlated-but-useful features; (iv) the q_low/q_high choice changes results materially and has no automatic selection (authors' own stated future work); (v) regression-only — GSE's classification targets (cover/no-cover) need the unbuilt extension; (vi) synthetic shifts change only λ₁, λ₂ coefficients — real NFL shift changes feature *semantics* (new scheme), a harder case; (vii) R² < 0 post-shift even for the winner — selection mitigates, doesn't solve, regime breaks.

## 10. GSE overlap
GSE's feature program (existing-research map: hand-built gse-lab metrics; no documented feature-selection-under-shift protocol) currently selects features by global importance — exactly the paradigm this paper shows fails under concept shift. NFL is a shift-rich domain: OC/DC turnover (~25%/yr), QB changes, rule changes (kickoff 2024), CBA-era effects. A concrete GSE failure mode this addresses: "pressure rate" learned as strongly predictive in 2019–2022 may invert or attenuate after a scheme change; global importance keeps it, SHAPEffects' local error analysis drops it when its effect starts pushing predictions the wrong way. New capability, not duplication.

## 11. GSE implementation spec
1. Data: game-level rows 2018–2026, features = gse-lab metric set (~60–80 features); targets = margin (regression, ATS margin) — regression-only constraint satisfied by using margin-of-victory vs spread rather than cover classification.
2. Model: LightGBM regressor + TreeSHAP (exact per the paper's implementation).
3. Protocol: train on seasons ≤ S-2, validation = season S-1 (most recent completed season = "current regime"), following the paper's temporal placement. Run SHAPEffects backward elimination with q_low/q_high ∈ {(0.25,0.75),(0.1,0.9)}; keep the config with better validation MAE.
4. Output: pruned feature set per season; features eliminated flagged with their negative-influence magnitude as a "regime-casualty report" for the DFS packet / edge notes (interpretable story: "YPRR dropped after scheme change").
5. Cadence: run each offseason + Week 9 checkpoint (validation = weeks 1–8 of current season).
6. Effort: ~3 engineer-days (TreeSHAP loop + quantile stratification; reuse existing LightGBM pipeline).

## 12. Reproducible test
Dataset: nflverse 2018–2025 game rows; features = hand-built set; target = actual margin − closing spread (regression). Train 2018–2022, validation 2023, test 2024; then train 2018–2023, validation 2024, test 2025. Baselines: (a) full feature set, (b) Boruta-selected set, (c) Lasso-selected set. Metric: test MAE on margin-vs-spread. Also track: which features SHAPEffects drops that Boruta keeps, and whether dropped features' SHAP effects indeed had the wrong sign on validation errors (sanity check of the mechanism).

## 13. Acceptance / rejection gate
**Adopt SHAPEffects pruning iff** on the 2024 and 2025 held-out test seasons it reduces MAE vs the full-feature baseline by ≥ 0.15 points AND beats Boruta/Lasso on at least one of the two seasons, with the elimination list stable (≥50% overlap) across the two runs and q-configs. Reject if it merely matches SOTA selectors (the paper's static-scenario outcome — fine but not worth the TreeSHAP compute), if it eliminates >40% of features (degenerate pruning), or if the dropped-feature sign check fails (mechanism not working as theorized on NFL data). Regression targets only — no classification adaptation until the gate clears.

## 14. Improvement experiment
Beyond the paper: (a) make the quantile thresholds adaptive — set (q_low, q_high) from the validation error distribution's own tail mass (e.g., symmetric 10% tails) instead of fixed grids, addressing the authors' stated open problem, and compare elimination paths; (b) extend to classification via the same local logic on log-loss residuals: group validation observations by signed log-loss residual quantiles and compute Effect from TreeSHAP values of the cover-probability model — this would unlock the method for GSE's primary cover/no-cover target, the generalization the authors left as future work.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2304.14774 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
