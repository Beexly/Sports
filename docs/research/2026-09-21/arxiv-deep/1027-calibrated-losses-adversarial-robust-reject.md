# 1027 Towards Calibrated Losses for Adversarial Robust Reject Option Classification (arXiv:2410.10736v1)

**Citation:** Vrund Shah, Tejas Chaudhari, Naresh Manwani (2024). *Towards Calibrated Losses for Adversarial Robust Reject Option Classification*. arXiv:2410.10736v1 (ACML 2024 workshop). URL: https://arxiv.org/abs/2410.10736
**Full-text source:** local cache `/tmp/arxiv750-cache/fulltext/2410.10736.txt` (complete paper incl. appendix proofs).
**Ledger completed:** 2026-09-21. **Read:** full text (not abstract).
**Lane (assignment):** abstention.

## 1. Research question
In binary classification with a reject option where inputs may be adversarially perturbed (ℓ₂-norm ball of radius γ), which surrogate losses are *calibrated* — i.e., pointwise minimization of the surrogate's conditional risk implies minimization of the target risk? The paper defines the adversarial-robust reject-option target loss ℓ_d^γ and (a) completely characterizes which margin surrogates are calibrated to it for linear classifiers, (b) proves convex surrogates and quasi-concave-conditional-risk surrogates are NOT calibrated, and (c) proposes shifted double-sigmoid and shifted double-ramp losses as candidate calibrated surrogates.

## 2. Dataset / schema
Purely synthetic 2-D data, generated for the experiments (Section 6.1): linearly separable with decision boundary x=0, all points in the unit ball B₂(0,1); **rejection width 0.5**; **100 points per class in the reject region, 200 points per class in the non-reject region**; **5% of labels flipped in the reject region** per class. Test set generated identically at half the train count. No real-world dataset, no sports data, no public release of the generator beyond the described procedure.

## 3. Method / model
- Confidence-based binary reject classifier: h(f(x), ρ) = +1 if f(x) > ρ, ⊥ (abstain) if |f(x)| ≤ ρ, −1 if f(x) < −ρ, with reject cost d ∈ (0, 0.5).
- Target loss ℓ_d^γ (Definition 7, Eq. 7): (1−d)·sup_{x'∈B₂(x,γ)} 1{yf(x') < −ρ} + d·sup_{x'∈B₂(x,γ)} 1{yf(x') ≤ ρ}. Proposition 8: for linear classifiers H_lin = {x → w·x : ‖w‖=1} this is a **γ-right-shift** of the standard reject loss ℓ_d (Eq. 8): ℓ_d^γ(yf(x),ρ) = (1−d)·1{yf(x) < −ρ+γ} + d·1{yf(x) ≤ ρ+γ}.
- Candidate surrogates: **shifted double sigmoid** ℓ_ds^{μ,β}(yf(x),ρ) = 2d·σ(yf(x)−β−ρ) + 2(1−d)·σ(yf(x)−β+ρ) with σ(a)=1/(1+e^{μa}) (Eqs. 13-14), and **shifted double ramp** ℓ_dr^{μ,β} (Definition 14), both requiring shift β ≥ γ.
- Adversarial training (Sec. 5.4): Step 1 — train linear reject classifier on clean data by SGD on unshifted DSL/DRL; Step 2 — generate adversarial examples x_i^γ = argmax_{x'∈B₂(x_i,γ)} ℓ_ds^μ(y_i f*(x'), ρ*) via projected gradient ascent on a subset of indices; Step 3 — retrain on the adversarial dataset with the shifted loss.
- Hyperparameters: DSL μ=2.65; DRL μ=0.95; β ∈ {0, 0.1, 0.15, 0.25}; d ∈ {0.2, 0.3, 0.4}; γ_train, γ_test ∈ {0.0, 0.1, 0.2}; results averaged over 10 runs.

## 4. Equations & assumptions
- Calibration definitions (Steinwart 2007; Bao et al. 2020): uniform H-calibration (Def. 2), uniform pseudo-H-calibration (Def. 3), calibration function δ(ε) and pseudo-calibration function δ̂(ε) (Def. 4); Prop. 5: calibrated iff δ(ε)>0 (resp. δ̂(ε)>0) for all ε>0.
- Conditional risk: C_{ℓ,H}(f(x),η) = η·ℓ(f(x)) + (1−η)·ℓ(−f(x)) (Eq. 2); excess conditional risk ΔC (Eq. 4).
- Reject loss rewrite (Eq. 6): ℓ_d(yf(x),ρ) = (1−d)·1{yf(x) < −ρ} + d·1{yf(x) ≤ ρ}.
- Target inner risk piecewise form (Eq. 10) and excess inner risk (Lemma 9) — five α-regions with case splits at η_left = (1−d)/(2−d), η_right = 1/(2−d); the two coincide at d = (3−√5)/2 ≈ 0.38.
- **Theorem 10 (complete characterization):** a margin surrogate ℓ is (ℓ_d^γ, H)-calibrated iff (Eq. 11) inf_{ρ−γ<α≤‖x‖} C_{ℓ,H}(α,1/2) > inf_{0≤α≤‖x‖} C_{ℓ,H}(α,1/2) and (Eq. 12) inf_{−‖x‖≤α≤ρ+γ} C_{ℓ,H}(α,η) > inf_{−‖x‖≤α≤‖x‖} C_{ℓ,H}(α,η) for η∈(1/2,1] — the "minima jump" requirement: minimizer in [0, ρ−γ] at η=0.5, jumping beyond ρ+γ for η>0.5.
- **Theorem 11:** any differentiable convex margin surrogate is NOT (ℓ_d^γ, H)-calibrated.
- **Theorem 12:** no margin surrogate with quasi-concave conditional risk in α (∀η) is (ℓ_d^γ, H)-calibrated — directly contradicting the Bao et al. 2020 positive result for the no-reject adversarial setting.
- Assumptions: X = B₂(0,1); H = H_lin only; ℓ₂ perturbations only; proofs of Props/Lemmas/Theorems in supplementary appendix.

## 5. Features / target
Synthetic 2-D features (x₁, x₂); binary label y ∈ {+1, −1} with 5% label noise in the reject band. No real feature engineering; the paper is about loss-function theory, not features.

## 6. Validation design
No real validation protocol — 3×3 grid of (γ_train × γ_test) × 3 values of d × 4 values of β, 10-run averages of (error, rejection rate, accuracy-on-predicted) on the synthetic test set. Baselines: unshifted DSL/DRL (β=0) as "non-robust" controls. ATRO (Kato et al. 2020) deliberately excluded (it handles ℓ_∞ perturbations, this paper ℓ₂). No statistical tests, no real datasets.

## 7. Numerical results / baselines
Exact values (averaged over 10 runs; columns = Err / Acc / RR at γ_test ∈ {0, 0.1, 0.2}):
- Shifted DRL (Table 2, μ=0.95), d=0.2, γ_train=0.2, β=0.1: **0.229 / 0.904 / 0.895** identically across all γ_test (flat robustness). Same config with β=0 (non-robust): 0.359 / 0.508 / 0.453.
- Shifted DRL, d=0.2, γ_train=0.2, β=0.25: 0.229 / 0.904 / 0.895 (same).
- Shifted DSL (Table 1, μ=2.65), d=0.2, γ_train=0.2, β=0.1: **0.2 / 0 / 1** across all γ_test — degenerate: rejects everything (RR=1), error = reject cost d.
- Shifted DSL, d=0.4, γ_train=0.2, β=0.25: 0.409/0.09/0.904 at γ_test=0 → 0.418/0.08/0.904 at γ_test=0.2.
- Non-robust DSL, d=0.2, γ_train=0: 0.338/0.458/0.53 (γ_test=0) → 0.484/0.306/0.41 (γ_test=0.2): error rises with test-time attack, as expected.
- Qualitative claims: for fixed γ_train, error rises with γ_test; increasing d raises error and lowers rejection rate; at γ_train=0.2 with high d the classifier rejects nearly everything; shifted DRL's error is flat for γ_test ≤ γ_train.

## 8. Code / data availability
None stated. No code link, no dataset release.

## 9. Leakage
- Synthetic-only validation: the "robustness" results are properties of the 2-D toy distribution, not evidence of real-world value.
- The calibration conditions (Theorem 10) are empirically "argued" for shifted DSL/DRL via plots (Figs. 2-5) — the authors explicitly *conjecture* calibration; no proof is given (listed as future work).
- Degenerate solutions appear in the headline results (DSL β=0.1 rejecting 100% of points at d=0.2), which the text does not flag as a failure mode.
- γ_train=0 makes β irrelevant for DRL (noted) — i.e., the shift only matters when training attacks are actually used.

## Limitations
- Theory is restricted to **linear classifiers** (H_lin); GSE's models are tree ensembles — none of the theorems apply.
- **Adversarial-perturbation framing has no sports analogue**: nobody perturbs NFL feature vectors with ℓ₂ noise to fool the pick engine. The entire problem setup is irrelevant to GSE's threat model.
- All "experiments" are on one synthetic 2-D dataset; zero external validity.
- Calibration of the proposed surrogates is conjectured, not proven.
- Reject cost d and the γ-right-shift are tuned per grid cell; no procedure for choosing them on real data.

## 10. GSE overlap
Existing-research map check: GSE's calibration stack (temperature/Platt/isotonic/Venn-Abers, grouping loss 2210.16315, CQR, conformal WP 2208.08598) is about *probability calibration of predictions*, and the abstention gap (#4) is about learning-to-abstain. This paper is about *surrogate-loss consistency under adversarial attack for linear classifiers* — a different "calibration" (statistical learning theory sense) with no overlap and no transfer path: GSE does not train reject-option classifiers via custom surrogate losses, does not use linear hypothesis classes as its primary model, and faces no adversarial input perturbations. The confidence-based reject classifier h(f(x),ρ) with a learned threshold ρ is conceptually adjacent to pick-confidence gating, but GSE gates on calibrated probabilities post-hoc, which needs no surrogate-loss theory.

## 11. GSE implementation spec
None — no implementable artifact transfers (see Verdict).

## 12. Reproducible test
Not applicable — REJECT verdict; no test proposed.

## 13. Acceptance / rejection gate
Rejected: the paper's threat model (adversarial ℓ₂ perturbations) does not exist in sports prediction, its theory is confined to linear classifiers, and its experiments are synthetic-only with partially degenerate results.

## 14. Improvement experiment
If one wanted to salvage anything: the "minima jump" characterization (Theorem 10) could in principle be adapted to design a *non-adversarial* calibrated reject surrogate for gradient-boosted pick classifiers — but that would be a new research project, not an application of this paper, and GSE's post-hoc probability gating already achieves the reject option more simply.

**Verdict: REJECT** — adversarial-robustness theory for linear reject classifiers; no usable artifact for a sports prediction engine. Replacement read below (reserve 1907.11180v2).
