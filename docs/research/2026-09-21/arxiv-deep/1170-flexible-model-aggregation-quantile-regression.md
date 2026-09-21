# 1170 Flexible Model Aggregation for Quantile Regression (arXiv:2103.00083)

**Citation:** Rasool Fakoor, Taesup Kim, Jonas Mueller, Alexander J. Smola, Ryan J. Tibshirani (2023). *Flexible Model Aggregation for Quantile Regression*. JMLR 24:1–41. arXiv:2103.00083v5. URL: https://arxiv.org/abs/2103.00083
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v5, 41 pp, via arxiv.org/pdf).
**Verdict:** ADAPT

Adapt the quantile-aggregation framework for GSE's interval pipeline: (1) medium-resolution aggregation — per-model × per-quantile-level weights, so models that are better in the tails vs the center get credit where they earn it; (2) the post-sort / post-PAVA isotonization guarantee (Proposition 2: can only improve WIS) as a mandatory non-crossing post-processing step; (3) the nested CV+ conformalization scheme for finite-sample coverage on GSE's intervals. The post-sort rule itself is ADOPT-ready (apply as-is); the weighting framework is the ADAPT.

## 1. Research question
How should any number of conditional quantile models be aggregated into one estimator? A meta-view: weighted linear ensembles ĝ_w(x) = Σ_j w_j(x)·ĝ_j(x) where weights may vary over models, quantile levels, and feature values (coarse/medium/fine × global/local), with guaranteed non-crossing and conformal calibration — without modifying the base models.

## 2. Dataset / schema
34 datasets: 8 from the UCI Machine Learning Repository + 26 from the AutoML Benchmark for Regression (OpenML). Protocol: 5 random train/validation/test splits (72%/18%/10%) per dataset; features and response standardized; base models tuned by validation WIS. m = 99 quantile levels T = {0.01,...,0.99}. p = 6 base models: CGN, SQR, DQR (new, from this framework with p=1), quantile RandomForest, ExtraTrees, LightGBM. Aggregation weights trained on out-of-fold (K=5) base predictions (eq. 15). Metric: WIS averaged over out-of-sample predictions. Code: https://github.com/amazon-research/quantile-aggregation.

## 3. Method / model
- Coarse (eq. 16): one weight w_j per model, Σw_j=1. Medium: weight w_{jτ} per model × quantile level, Σ_j w_{jτ}=1 per τ (Hadamard product). Fine: weight w_{jτ,ν} per model × output level τ × input level ν, Σ_jΣ_ν w_{jτ,ν}=1 per τ (matrix-vector product — aggregate median informed by all quantiles of all models).
- Global: constant weights, fit by SGD on pinball loss with softmax parametrization (LP-equivalent, scalable, implicit regularization). Local: weights as neural network w^τ(x) = SoftMax(W^τ f_θ(x)) (eq. 17), trained end-to-end (eq. 18) — a mixture-of-experts / attention interpretation (Figs. 3–4).
- Noncrossing: crossing penalty ρ(g) = Σ_{x∈X0}Σ_{τ<τ'} (g(x;τ) − g(x;τ') + δ_{τ,τ'})_+ (eq. 19); adaptive margins δ_{τ,τ'} = δ_0(Q_{τ'}({R_i}) − Q_τ({R_i}))_+ from pilot residuals (eq. 21); isotonization operators — Sort (12), IsoProj/PAVA (13), new min-max sweep (23): cumulative max upward / cumulative min downward from the median; usable post hoc (guaranteed) or end-to-end as differentiable layers (eq. 22).
- Conformal: CQR (eq. 26) with finite-sample coverage ≥ 1−α (eq. 27), upper-bounded by 1−α+1/(n_2+1); CV+ (eq. 28) with guarantee ≥ 1−2α − min{2(1−1/K)/(n/K+1), (1−K/n)/(K+1)} ≥ 1−2α − √(2/n) (eq. 29); nested CV+ scheme exploiting ĝ_j^{−k,ℓ} = ĝ_j^{−ℓ,k} symmetry → base models trained K(K−1)/2 times instead of K(K−1) or K².

## 4. Equations & assumptions
- Pinball loss ψ_τ(Z−q) = τ|Z−q| (Z≥q), (1−τ)|Z−q| (Z<q) (eq. 3); E[ψ_τ] minimized at the true quantile.
- CRPS(F,Y) = ∫(F(y)−1{Y≤y})²dy = 2∫_0^1 ψ_τ(Y−F^{−1}(τ))dτ (eqs. 5–6).
- WIS(F^{−1},Y) = Σ_{α∈A} {α(u_α−ℓ_α) + 2·dist(Y,[ℓ_α,u_α])} = 2Σ_{τ∈T} ψ_τ(Y−F^{−1}(τ)) (eqs. 7–8) — optimizing pinball loss ≡ optimizing WIS.
- Prop. 2 (NEW): Σ_τ ψ_τ(y−g̃(x;τ)) ≤ Σ_τ ψ_τ(y−ĝ(x;τ)) for g̃ = Sort(ĝ) or IsoProj(ĝ); with T symmetric, WIS can only improve; strict if sorting nontrivial. Prop. 1: ℓ_p error can only improve for any p≥1.
- Prop. 3: quantile averaging is shape-preserving for location-scale families (the only such procedure of the form H(F)^{−1}(u)=h(Q_1(u),...,Q_p(u))).
- Prop. 4: probability and quantile averages have equal means; quantile average always sharper: m_k(F̄) ≤ m_k(F) for even k≥2.
- Prop. 5 (NEW): p=2, f_2(v)=o(f_1(v)), f_1 log-concave → quantile-averaged density f̄(v)=o(f_1(v)) (thinner tails) vs probability average f(v) ~ w_1·f_1(v) (same tail order).
- Assumptions: i.i.d. train/test for conformal guarantees (marginal, not conditional — conditional coverage is impossible distribution-free); K-fold OOF predictions prevent ensemble overfitting.

## 5. Features / target
Inputs: p base models' quantile predictions at m levels, feature values x. Targets: the aggregated quantile vector; WIS; empirical coverage and interval length at nominal 0.8.

## 6. Validation design
34-dataset benchmark, 5 random splits each, validation-tuned hyperparameters, test WIS. Comparisons: 6 base models + Average/Median/QRA/FQRA aggregators vs 6 framework variants (global/local × coarse/medium/fine); isotonization ablations vs "none"; conformalized vs raw DQA coverage/length. OOF base predictions throughout.

## 7. Numerical results / baselines
- DQA (local-fine, CrossPenalty+PostSort): best average relative WIS across all 34 datasets (Figs. 1, 6). QRA/FQRA are runners-up; on some datasets they are up to 50% worse than DQA (relative factor 1.5); on none do they beat DQA.
- Flexibility trend (Fig. 7): local > global and fine > medium > coarse, especially at higher PVE (higher signal-to-noise); local-fine best overall.
- Isotonization (Fig. 8): all methods improve on "none" but second-order (relative WIS range ~0.90–1.10) vs the first-order DQA-vs-base gains; AdaptCrossPenalty + GradMinMax best average; paper standardizes on CrossPenalty + PostSort.
- Prop. 2 verification (Fig. 9): PostSort and PostPAVA never hurt WIS on any of the 34 datasets; PostMinMax hurts on a few (dataset 19 most noticeable).
- Conformal (Figs. 10–11, nominal 0.8): raw DQA hits ~0.8 averaged over datasets but misses per-dataset; conformalized DQA achieves ≥0.8 coverage on every individual dataset. Interval inflation: never more than 75% (factor 1.75), typically 0–30%. Average/Median overcover; QRA/FQRA cover on average but miss on several datasets. Conformalized DQA is the only method robust to base-model miscalibration.

## 8. Code / data availability
Code: https://github.com/amazon-research/quantile-aggregation. 34 benchmark datasets from public repositories (UCI, OpenML).

## 9. Leakage & limitations
- Aggregation weights trained on OOF predictions — correct protocol, but the fine/local variants have p×m×m weights (up to 6×99×99) and rely on SGD implicit regularization + early stopping; overfitting risk on small GSE samples.
- Conformal guarantees are marginal, not conditional on x; CV+ guarantee is weaker (1−2α) than split CQR (1−α).
- End-to-end isotonization (GradSort/GradPAVA) loses the Prop. 2 guarantee; only post hoc sorting/PAVA is guaranteed.
- Min-max sweep is not WIS-guaranteed post hoc (verified empirically to hurt on some datasets).
- GSE's target is probabilities of discrete outcomes, not continuous quantiles — the framework maps to GSE's interval/prop-distribution outputs, not directly to win probabilities.

## 10. GSE overlap
Direct complement to GSE's interval pipeline. The Drive deep-read audit already found a live bug in GSE's cqr.ts (clamping rank to n−1, falsely certifying 90% coverage at 83.33%) — this paper's CQR/CV+ treatment is the reference for repairing and upgrading that module. No assigned paper so far covers quantile aggregation, non-crossing guarantees, or conformal calibration of intervals. Overlap with 1169 is complementary: 1169 aggregates point probability forecasts (linear/log pooling); this paper aggregates quantile functions (tail-aware intervals).

## 11. GSE implementation spec
1. Post-sort isotonization (ADOPT-ready, ~30 min): after GSE produces any quantile vector (intervals for props/totals), apply Sort (or PAVA) before publishing — Prop. 2 guarantees WIS cannot worsen and non-crossing is enforced at every x.
2. Medium quantile aggregation (~1–2 days): for GSE's interval outputs (e.g., predicted total points quantiles from each component model), learn per-model × per-quantile-level weights w_{jτ} via SGD on pinball loss over OOF predictions from trailing seasons; softmax-parametrized; unit-sum per τ. Expect tail quantiles to weight different models than the median.
3. Nested CV+ conformalization (~1 day): wrap the interval pipeline in the paper's nested K-fold scheme (exploit the ĝ_j^{−k,ℓ}=ĝ_j^{−ℓ,k} symmetry to halve base-model refits); report empirical coverage at 0.8/0.9 nominal alongside interval lengths. Use as the acceptance test for the cqr.ts repair.

## 12. Reproducible test
Dataset: 2024–2025 NFL seasons; component-model quantile predictions for game totals (or player-prop distributions) vs realized values. (a) Post-sort test: compute WIS of raw vs post-sorted quantile vectors per game; verify post-sort never worsens WIS (Prop. 2 check on real data) and count crossing violations in raw outputs. (b) Medium aggregation: train w_{jτ} on 2024 OOF predictions, evaluate 2025 WIS vs equal-weight quantile average and vs QRA-style linear aggregation; report per-τ weight matrices to confirm tail-vs-center specialization. (c) Conformal: nested CV+ on 2025, report empirical coverage at 0.8 nominal and mean interval-length inflation vs raw.

## 13. Acceptance / rejection gate
ADOPT post-sort isotonization immediately if raw GSE quantile outputs show any crossing violations on 2025 data (Prop. 2 guarantees no WIS downside). ADAPT the medium aggregator if it beats the equal-weight quantile average on 2025 WIS by ≥3% with per-τ weights that differ meaningfully between tail and center levels (evidence the flexibility is earning its keep, not overfitting). REJECT fine aggregation (p×m×m weights) unless the training sample exceeds ~10× the parameter count — on GSE-sized samples the paper's own trend (flexibility wins at high PVE) warns that fine aggregation will overfit low-signal regimes.

## 14. Improvement experiment
Beyond the paper: the paper's local weights vary with x but are static in time; GSE's model skill drifts within a season (injuries, scheme changes). Extend the medium aggregator with time-local weights w_{jτ}(t) via exponentially-weighted pinball loss (recent weeks weighted more), keeping the softmax parametrization — a temporal analog of the paper's spatial locality. If time-local medium aggregation beats static medium aggregation on 2025 WIS, GSE gets an interval ensemble that adapts to within-season regime shifts, which the paper's framework doesn't cover.
