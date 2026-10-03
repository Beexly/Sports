# [2186] Accurate and Robust Feature Importance Estimation under Distribution Shifts (arXiv:2009.14454v1)

**Citation:** Jayaraman J. Thiagarajan, Vivek Narayanaswamy, Rushil Anirudh, Peer-Timo Bremer, and Andreas Spanias (2020, Lawrence Livermore National Lab / Arizona State). *Accurate and Robust Feature Importance Estimation under Distribution Shifts*. arXiv:2009.14454v1. URL: https://arxiv.org/abs/2009.14454
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* "PRoFILE": jointly trains a loss estimator alongside the predictor and scores feature importance with a Granger-causal masking objective that needs no retraining and stays faithful under distribution shift; GSE adapts it as (a) a shift-robust feature-importance engine for seasonal feature audits, and (b) a regime-shift detector, since the loss estimator's outputs rise monotonically with shift severity.

## 1. Research question
Post-hoc feature-importance methods (LIME, SHAP, CXPlain, masking-based) are computationally expensive, tied to specific masking strategies (requiring retraining when the strategy changes), and — critically — not robust to distribution shift. Can a method that jointly trains an auxiliary **loss estimator** with the predictor, then applies a causal masking objective on loss estimates, produce feature importances that are accurate (high fidelity), cheap, masking-agnostic, and robust under real-world distribution shifts?

## 2. Dataset / schema
- **Fidelity benchmarks (in-distribution):** UCI Handwritten Digits (8×8, 1797 samples); OpenML benchmarks (Kr-vs-Kp, Letter, Pokerhand, RBF; 10–64 dims, up to 13750 samples); Cifar-10 (50K 32×32 RGB train). ~90/10 train-test splits for UCI/OpenML; 50 test images for Cifar-10 fidelity (to keep LIME/SHAP tractable).
- **Synthetic shift study:** 5K-sample datasets, covariates 10–50, drawn from N(μ,Σ) with μ_ii=α, Σ_ii=1, Σ_ij=β (α∈U[-2,2], β∈U[-1,1]); labels from nested concentric multi-dimensional spheres on quantiles. **Correlation shift:** β̄ = β + δ_β, δ_β∈U[-0.2,0.2]. **Variance shift:** Σ_ii += κ, κ∈U[0.25,0.75]. 10 realizations; model trained on original only, explanations evaluated on shifted.
- **Real shift:** MNIST→USPS (digit domain shift); Cifar10→Cifar10-C (natural corruptions at severities 1–5, Hendrycks & Dietterich 2019).

## 3. Method / model
**PRoFILE** (two phases):
1. *Training:* predictor F(Θ): x∈R^d → ŷ∈R^k trained with loss L(y,ŷ) (cross-entropy/MSE). Simultaneously train auxiliary **loss estimator** G(Φ;Θ): x → ŝ ≈ L(y, F(x)) using latent representations from multiple stages of F (every FCN layer / conv block), each transformed by linear+ReLU, concatenated, mapped to the loss. Gradients from both losses update Θ. Two training objectives for G:
   - (a) **Contrastive training** L_aux^C = Σ_{(i,j)} max(0, -I(s_i,s_j)·(ŝ_i - ŝ_j) + γ), I=1 if s_i > s_j — preserves the *ranking* of losses, discards scale.
   - (b) **Dropout calibration** L_aux^DC = Σ_i max(0, ŝ_i - (μ_{s_i}+σ_{s_i}) + ξ) + max(0, (μ_{s_i}-σ_{s_i}) - ŝ_i + ξ) — hinge penalty pulling ŝ_i into the MC-dropout prediction interval [μ-σ, μ+σ] of the loss (T forward passes; G uses dropout-averaged latents).
2. *Explanation (no retraining):* Granger-causality objective — feature j's importance for sample x: Δε_{x,j} = ε_{x\{j\}} - ε_x (Eq. 4), where ε is the *loss-estimator's* error with/without feature j masked. Masking strategy arbitrary (zero, constant, distributional) — no retraining needed, unlike CXPlain. Cost: p loss-estimator evaluations (parallelizable), marginally more than CXPlain, far cheaper than LIME/SHAP.

## 4. Equations & assumptions
- L_aux^C = Σ_{(i,j)} max(0, -I(s_i,s_j)·(ŝ_i - ŝ_j) + γ), I(s_i,s_j) = 1 if s_i > s_j else 0.
- L_aux^DC = Σ_i [max(0, ŝ_i - (μ_{s_i}+σ_{s_i}) + ξ) + max(0, (μ_{s_i}-σ_{s_i}) - ŝ_i + ξ)].
- Feature importance (Granger/Humean): Δε_{x,j} = ε_{x\{j\}} - ε_x (Eq. 4).
- Fidelity metric: Δ log-odds from masking top-25% features (median + 25th/75th percentiles across samples/realizations).
- Assumptions: (i) sample x contains all relevant variables and temporally precedes y (Granger assumptions); (ii) loss ranking is what matters for masking-based importance (contrastive discards scale deliberately); (iii) the loss estimator generalizes to shifted data — empirically validated, not proven; (iv) MC-dropout intervals are meaningful uncertainty for the DC objective.

## 5. Features / target
Inputs: raw features of each benchmark (pixels, tabular covariates). Target of the predictor: class labels (digits, OpenML classes, Cifar-10). Target of the loss estimator: the predictor's scalar loss s = L(y, F(x)). No feature engineering — method is modality-agnostic by design.

## 6. Validation design
Fidelity: Δ log-odds after masking top-25% important features, per-sample, median/IQR reported; baselines LIME, SHAP, CXPlain, gradient methods. Shift robustness: same metric on correlation-shifted and variance-shifted synthetic data (10 realizations) and Cifar10-C corruptions, model+estimator trained on unshifted data only. Shift *detection*: average loss estimates vs corruption severity (Cifar10-C, 500 samples/corruption); qualitative USPS inspection.

## 7. Numerical results / baselines
Results reported graphically (median Δ log-odds with 25th/75th percentile bars); paper's stated findings:
- PRoFILE (both Ours(C) and Ours(DC), performing similarly) **outperforms all baselines on every fidelity benchmark**; LIME and SHAP lower fidelity and computationally inefficient; CXPlain (same causal objective family) significantly lower fidelity.
- Under correlation and variance shifts (synthetic, 10 realizations): PRoFILE "significantly outperforms the baselines" — baselines degrade, PRoFILE stays faithful.
- Cifar10-C: superior fidelity on all corruptions except glass blur (comparable).
- Shift detection: loss estimates rise **monotonically with corruption severity** across 5 natural corruptions (averaged over 500 examples); USPS class-8 samples with highest loss estimates show writing styles absent from MNIST (prototypical styles get lowest estimates).
- No absolute Δ log-odds numbers tabulated — all comparisons are figure-based; treat magnitudes as paper claims, not quotable constants.

## 8. Code / data availability
No PRoFILE code link stated in the paper. Baseline code linked (LIME: github.com/marcotcr/lime). Datasets: UCI, OpenML, Cifar-10/Cifar10-C, MNIST, USPS — all public.

## 9. Leakage & limitations
Adversarial read: (i) all headline numbers are figure-based (no tables of Δ log-odds) — magnitudes unverifiable from text; (ii) method requires training an auxiliary network on internal latents — needs white-box access during training, so it cannot explain GSE's *market* or third-party black boxes, only GSE's own models; (iii) the loss estimator is trained on in-distribution losses — its shift-detection monotonicity is empirical on image corruptions, may not transfer to tabular NFL regime shifts; (iv) contrastive objective discards loss scale, which is fine for ranking features but loses calibration of *how much* a feature matters; (v) MC-dropout calibration needs T forward passes — cheap for small nets, costly for large ensembles; (vi) Granger-causal masking on tabular sports features with heavy correlation (EPA, success rate, DVOA move together) inherits the standard masking-correlation critique (Janzing et al.): masking one of a correlated pair understates its importance; (vii) fidelity metric (Δ log-odds) measures self-consistency, not ground-truth correctness.

## 10. GSE overlap
GSE's explainability story (existing-research map) is metric tables and public pick records — there is no documented feature-importance engine for the prediction model itself, and no shift-detection on model inputs. The loss estimator fills two gaps at once: (a) **feature audit**: which features actually drive predictions each season, robust to the regime changes that break SHAP/LIME-style attributions (complements ledger 2185's SHAPEffects pruning — PRoFILE explains, SHAPEffects prunes); (b) **shift detection**: a rising mean loss-estimate on incoming weekly data (new season, post-injury, weather regime) is an automatic, unsupervised alarm that the current feature regime has drifted — directly serving the engine's recalibration triggers. New capability, not duplication.

## 11. GSE implementation spec
1. Data: game-level feature rows (gse-lab set), target = ATS cover (classification) — predictor = LightGBM or small MLP (MLP preferred: PRoFILE needs latent stages; use a 3-layer MLP with the contrastive loss estimator head on concatenated hidden layers).
2. Train jointly: predictor + contrastive loss estimator G on 2018–2023 seasons.
3. Weekly pipeline: for each game, compute per-feature Δε_{x,j} via the loss estimator with mean-imputation masking (masking-agnostic property lets us use distributional masking later without retraining); aggregate to season-level importance = median over games.
4. Shift alarm: track mean ŝ over each week's games; alert if trailing-4-week mean exceeds the training-season mean by >2σ — triggers the recalibration review (ties into ledger 2183's shock detector as a model-side complement).
5. Cost: p ≈ 60–80 features → one batched forward pass per mask; trivial on GPU.
6. Effort: ~4 engineer-days (MLP predictor + auxiliary head + masking pipeline). Note: this means maintaining an MLP alongside LightGBM — justified only if the gate clears.

## 12. Reproducible test
Dataset: nflverse 2018–2025, features = gse-lab set, target = ATS cover. Train MLP predictor + contrastive loss estimator on 2018–2023. Test A (fidelity): on 2024–2025, mask top-25% features per PRoFILE ranking, measure Δ log-loss vs random-25% masking and vs SHAP top-25% masking — PRoFILE must win. Test B (shift robustness): train on 2018–2021 only, evaluate fidelity on 2022–2025 (rule-change era); PRoFILE's fidelity degradation must be smaller than SHAP's. Test C (shift detection): mean ŝ per week 2018–2025 — verify spikes align with known regime breaks (2020 COVID season, 2024 kickoff rule).

## 13. Acceptance / rejection gate
**Adopt PRoFILE iff** (a) on Test A its top-25% masking degrades log-loss more than SHAP's top-25% by a relative margin ≥ 10% (higher fidelity), AND (b) on Test B its fidelity degrades less than SHAP's under the 2022+ era shift, AND (c) on Test C mean weekly ŝ spikes (top-5% weeks) coincide with documented regime breaks at ≥ 60% hit rate. Reject if the loss estimator fails to train stably (contrastive ranking collapse), if fidelity merely ties SHAP (not worth the auxiliary MLP), or if shift-detection spikes are indistinguishable from noise. No adoption for third-party/market black boxes — white-box training access is a hard requirement.

## 14. Improvement experiment
Beyond the paper: train the loss estimator with **season-aware contrastive pairs** — sample pairs (i,j) from *different* seasons so the ranking objective explicitly learns cross-season loss ordering, making G itself shift-aware rather than relying on in-distribution generalization. Then use Δε_{x,j} computed per-season to build a "feature importance migration map" (which features gained/lost causal influence each season) — a public-content asset for @GalaxySportsHQ ("the features that actually moved the needle shifted after the kickoff rule change") that doubles as the engine's annual feature-review input.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2009.14454 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
