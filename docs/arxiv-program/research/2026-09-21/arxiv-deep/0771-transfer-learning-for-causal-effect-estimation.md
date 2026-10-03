# [0771] Transfer Learning for Causal Effect Estimation (arXiv:2305.09126v3)

**Citation:** Song Wei, Hanyu Zhang, Ronald Moore, Rishikesan Kamaleswaran, Yao Xie (2023). *Transfer Learning for Causal Effect Estimation*. Georgia Tech / Emory. arXiv:2305.09126v3. URL: https://arxiv.org/abs/2305.09126. Code: https://github.com/SongWei-GT/L1-TCL
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/2305.09126.txt`; complete paper incl. abstract, §§1–5, appendices A–G excerpts (IHDP tables, theory), references, verified end-to-end).
**Verdict:** ADAPT — the ℓ₁-TCL framework (rough-estimate nuisance parameters on an abundant source domain, then ℓ₁-regularized bias correction of the sparse source–target difference on limited target data, then plug into IPW/OR/DR estimators) is directly portable to GSE's cross-league / cross-era causal questions: estimate a treatment effect in a data-poor target (e.g., NFL 2024 rule change, a new coach's scheme effect, UFL/XFL data) borrowing from a data-rich source (prior NFL seasons, college football), where treatment-assignment and response mechanisms are similar but not identical. Comes with non-asymptotic recovery guarantees under sparse-difference assumptions and a real-data case where target-only and merged estimators got the *sign wrong* while ℓ₁-TCL recovered the medically established answer.

## 1. Research question
How can transfer learning improve average causal effect (ACE) estimation in a target domain with limited data, when a related source domain shares the same covariate space but differs in treatment-assignment mechanism and treatment response? (Motivating case: effect of vasopressor therapy on 28-day mortality in sepsis — target-only IPW said vasopressors *increase* mortality, contradicting the medical literature.)

## 2. Dataset / schema
- **Real data:** in-hospital EMRs from two geographically adjacent academic level-1 trauma centers (2018): source (n_s: 207 treated + 1249 control) and target (n: 58 treated + 700 control). 34 features (demographics, vitals, labs). Outcome: 28-day mortality. Fitted propensity supports overlap heavily — source–target parameter difference supported on only 6 of 34 features (empirical justification for the sparse-difference assumption).
- **Benchmark:** IHDP pseudo-real dataset (Brooks-Gunn et al. 1992; Hill 2011): 747 subjects (139 treated / 608 control), 25 covariates; source–target split by a binary covariate. 50–1000 trials.
- **Simulations (Appx. F):** GLM nuisance models, varying n ≪ d regimes.

## 3. Method / model
**ℓ₁-TCL two-step** (same covariate space, inductive multi-task TL):
1. *Rough estimation:* fit nuisance parameter on abundant source data: β̂_s = argmin_b (1/n_s)Σᵢ[−z_{i,s}x_{i,s}ᵀb + G(x_{i,s}ᵀb)] (GLM negative log-likelihood).
2. *Bias correction:* β̂_t = argmin_b (1/n)Σᵢ[−zᵢxᵢᵀb + G(xᵢᵀb)] + λ_PS‖b − β̂_s‖₁ — Lasso on the *difference*, exploiting sparsity of Δβ = β_t − β_s.
3. *Plug-in:* use β̂_t in IPW/OR/DR estimators for the ACE on target data.
**NN extension:** same two steps with neural nuisance models (Dragonnet, 3-headed TARNet variant): rough-train on source, then estimate the sparse weight-difference with zero initialization on target. Hyperparameter selection via SMD (a proposed goodness-of-fit score) rather than CE/MSE, which the authors show mislead under misspecification.

## 4. Equations & assumptions
(1) GLM nuisance: E[Z|X] = g(Xᵀβ_t), E[Z_s|X_s] = g(X_sᵀβ_s). (2) Sparsity: Δβ = β_t − β_s is s-sparse, ‖Δβ‖₀ ≤ s. (3) Rough: β̂_s = argmin_b n_s⁻¹Σᵢ[−z_{i,s}x_{i,s}ᵀb + G(x_{i,s}ᵀb)]. (4) Bias correction: β̂_t = argmin_b n⁻¹Σᵢ[−zᵢxᵢᵀb + G(xᵢᵀb)] + λ_PS‖b−β̂_s‖₁. (5) Recovery bound (Thm. 1): |τ̂_TL − τ| = O(s√(log d/n) [bias-correction] + sd√(log d/n_s) [rough-estimation]) w.h.p. ≥ 1−1/n; consistency needs n_s ≫ s²d²log d, vs n ≫ d² without transfer. (6) IPW/OR/DR plug-in estimators standard.
Assumptions: same covariate space both domains; sparse nuisance-parameter difference (empirically checked via support overlap); GLM or NN nuisance correctly specified enough; unconfoundedness within target.

## 5. Features / target
EMR covariates (demographics, vitals, labs); IHDP's 25 covariates. Target: ACE of treatment on outcome in the target domain.

## 6. Validation design
- Theory: non-asymptotic bounds for TLIPW/TLOR/TLDR (Lemmas 1–3, Theorems 1–3, Appx. C–E).
- IHDP: 50 trials in-sample + 1000 trials out-of-sample absolute ACE error, comparing TO-CL (target only), WS-TCL (warm-start, Künzel et al. 2018), ℓ₁-TCL, across Dragonnet / 3-headed TARNet × IPW/OR/DR.
- Real data: vasopressor–mortality ACE with 90% CIs, bootstrap uncertainty; SMD-based model selection.

## 7. Numerical results / baselines
- **Real data** (truth from literature: vasopressors *reduce* 28-day mortality): target-only IPW (TO-CL) = +0.0002 (wrong sign), merged-domains (Merge-CL) = +0.0441 (worse — biased toward source), **ℓ₁-TCL TLIPW = −0.0013** (correct sign, most accurate; truth in a synthetic analogue τ=−0.067 where ℓ₁-TCL was closest). Baselines fail; ℓ₁-TCL recovers the inhibiting effect; bootstrap mean/median all agree on sign despite 90% CI covering zero.
- **IHDP** (Table 6, absolute ACE error, mean (sd)): in-sample, 3-headed TARNet + DR: TO-CL 0.415 (0.349), WS-TCL 0.337 (0.273), **ℓ₁-TCL 0.289 (0.238)**; out-of-sample: TO-CL 0.360 (0.301), WS-TCL 0.324 (0.282), **ℓ₁-TCL 0.301 (0.259)**. ℓ₁-TCL best in-sample and out-of-sample; TL helps every estimator; OR-based plug-ins beat IPW under NN misspecification.
- **Simulations (Appx. F):** GLM ℓ₁-TCL beats target-only across n ≪ d regimes, consistent with the O(s√(log d/n)) bound.

## 8. Code / data availability
Code public: https://github.com/SongWei-GT/L1-TCL. IHDP benchmark public. EMR data not public.

## 9. Leakage & limitations
(i) Sparse-difference assumption is load-bearing — if source and target mechanisms differ densely, bias correction needs n ≫ d² and there's no free lunch (merge-CL getting it *worse* is the cautionary tale); (ii) real-data ACE CI covers zero — sign recovery, not significance; (iii) NN hyperparameter selection required a custom SMD score because CE/MSE misled — tuning is fiddly; (iv) same-covariate-space requirement — can't directly borrow across different feature schemas without alignment; (v) propensity supports "similar" in the application (6/34 differing) — that empirical check must be replicated per GSE use case.

## 10. GSE overlap
New capability for the causal/injury lane: **cross-domain causal estimation**. GSE's causal questions are often data-poor in the target domain: effect of the 2024 kickoff rule on returns, of a mid-season coordinator change on EPA/play, of a new surface or stadium on injury risk, of Thursday short-rest on performance — with abundant source data (prior seasons, college football, other leagues). The existing map has causal forests (0769) but no transfer-learning recipe for borrowing nuisance models across domains. Portable: (a) the two-step rough-estimate + ℓ₁ bias-correction for propensity/outcome models; (b) the "merge is worse than target-only when mechanisms differ" warning — naive pooling of eras/leagues can *increase* bias; (c) the sparse-difference diagnostic (compare fitted supports across domains before trusting transfer).

## 11. GSE implementation spec
- **Cross-era/league CATE/ACE estimation**: for a target-domain causal question (e.g., effect of the new kickoff rule on expected return EPA in 2024–2025), fit propensity + outcome nuisance on 2018–2023 source data, then ℓ₁ bias-correction of the difference on 2024–2025 target data, then DR plug-in for the ACE. Use the 3-headed TARNet + DR variant per the IHDP winner.
- **Pre-flight diagnostic**: fit ℓ₁-regularized propensity models in both domains and compare supports; proceed only if the difference is sparse (paper's case: 6/34). If dense, report target-only with wide uncertainty instead of transferring.
- **Hyperparameter selection**: use the paper's SMD goodness-of-fit score, not validation CE/MSE, for the NN nuisance models.
- Effort: ~3 days to implement ℓ₁-TCL (GLM version is a few dozen lines on top of sklearn LogisticRegression; NN version follows the public repo); ~1 day per causal question.

## 12. Reproducible test
Dataset: 2018–2025 NFL play-by-play (nflverse). Target: effect of the 2024 kickoff-rule change on return rate / expected return EPA (target domain: 2024–2025; source: 2018–2023). Semi-synthetic validation first: simulate a known ACE in the target domain with a sparse nuisance shift, verify ℓ₁-TCL recovers it with lower absolute error than target-only and merged estimators. Then the real estimate with bootstrap CIs. Success: semi-synthetic absolute error ≤ 0.7× target-only error; real estimate with a defensible sign.

## 13. Acceptance / rejection gate
ADAPT the framework and the "never naively merge domains" rule immediately. ADOPT ℓ₁-TCL for a GSE causal question only if the pre-flight support-overlap diagnostic shows a sparse difference AND the semi-synthetic test shows ≤0.7× target-only error; otherwise REJECT transfer and report target-only estimates with honest uncertainty.

## 14. Improvement experiment
Replace the fixed Lasso penalty on Δβ with an adaptive, data-driven sparsity pattern: use the source-domain fitted support overlap as a prior (empirical-Bayes ℓ₁ weights) so the bias-correction step shrinks harder on coefficients where source and target already agree. Test on the IHDP semi-synthetic split whether adaptive ℓ₁-TCL beats uniform ℓ₁-TCL on out-of-sample absolute ACE error; success would tighten the s√(log d/n) term where the sparse-difference assumption holds most strongly.
