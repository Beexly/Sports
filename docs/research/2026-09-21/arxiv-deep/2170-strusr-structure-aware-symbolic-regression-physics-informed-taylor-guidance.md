# [2170] StruSR: Structure-Aware Symbolic Regression with Physics-Informed Taylor Guidance (arXiv:2510.06635)

**Citation:** Yunpeng Gong, Sihan Lan, Can Yang, Kunpeng Xu, Min Jiang (2025). *StruSR: Structure-Aware Symbolic Regression with Physics-Informed Taylor Guidance*. arXiv:2510.06635. URL: https://arxiv.org/abs/2510.06635
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — extracts local Taylor expansions from a trained PINN via autodiff and uses them as structural priors to guide GP symbolic regression, with a masking-based subtree attribution that protects important subexpressions during crossover/mutation. Directly upgrades how GSE distills its neural models into equations.

## 1. Research question
Most SR optimizes data fit and ignores whether the discovered expression has the right *structure* (correct derivative behavior, correct subexpression roles). PINNs encode global physical structure in smooth, differentiable form but are black boxes. Can the local Taylor expansions of a trained PINN serve as "structural ground truth" to guide GP symbolic regression — both as a loss term and as fine-grained, subtree-level evolution guidance?

## 2. Dataset / schema
8 PDE benchmarks with known closed-form solutions (Table 1): Advection (φ_t + u·φ_x = 0), Diffusion, Poisson2D/3D, Heat2D/3D, Wave2D/3D (nonlinear: −u³ and u² source terms), each with initial/boundary conditions; plus general SR benchmarks (Strogatz dynamical systems, Feynman equations), 75/25 train/test splits, 10 independent runs. All synthetic with analytic ground truth. Code availability not stated in text (no repo link found in full text).

## 3. Method / model
**StruSR pipeline:** (1) Train PINN u(x) on the PDE. (2) Extract K-th order Taylor expansions T_(u)(x;x₀) = Σ_{k=0}^K u^(k)(x₀)/k!·(x−x₀)^k at anchor points via autodiff (default K=5). (3) GP evolution with **hybrid fitness** F(f) = L_phys(f) + λ·L_Taylor(f): L_phys = (1/N)Σ(N[f](x_i))² (PDE residual), L_Taylor = Σ_k (f^(k)(x_i)/k! − u^(k)(x_i)/k!)² (Taylor-coefficient mismatch). (4) **Masking attribution**: for each subtree s_j, mask it with constant 1 → f_{−s_j}; compute Δ^struct_j = L_Taylor(f_{−s_j}) − L_Taylor(f), Δ^res_j = MSE(N[f_{−s_j}]) − MSE(N[f]), Δ^total_j = β·Δ^res_j + (1−β)·Δ^struct_j. (5) **Sensitivity-guided evolution**: softmax over Δ^total biases crossover/mutation toward *low*-sensitivity subtrees, preserving structurally/physically important ones; small probability of hitting sensitive regions maintains diversity.

## 4. Equations & assumptions
- PINN Taylor prior: T_PINN(x;x₀) = Σ_{k=0}^K u^(k)(x₀)/k!·(x−x₀)^k (Eq. 1).
- Candidate expansion: same form for f (Eq. 2); structure loss L_Taylor(f;x₀) = Σ_{k=0}^K (f^(k)(x₀)/k! − u^(k)(x₀)/k!)² (Eqs. 3, 5).
- Sensitivities: Δ^struct_j (Eq. 4), Δ^res_j (Eq. 6), Δ^total_j = β·Δ^res_j + (1−β)·Δ^struct_j (Eq. 7).
- Hybrid fitness: F(f) = L_phys(f) + L_Taylor(f) (Eq. 8); L_phys = (1/N)Σ(N[f](x_i))² (Eq. 9).
- Assumptions: PINN is well-trained (smooth, globally consistent); K=5 balances expressiveness vs derivative noise; masking with constant 1 is a neutral ablation; tree-edit simplification via sympy for evaluation.

## 5. Features / target
Inputs: collocation points (x, t) in PDE domains; targets: analytic PDE solutions. For Strogatz/Feynman: standard regression features → targets.

## 6. Validation design
PDE suite: 10 independent runs, test MAE vs RAG-SR, NetGP, HD-TLGP, PhySO (Table 2); structural fidelity by comparing recovered symbolic forms to ground truth (Table 3). Strogatz/Feynman: test R², normalized structural complexity, inference time (Figure 2). Ablations: structure-loss dynamics vs vanilla GP and physics-informed GP; Taylor order K sensitivity (Figure 3).

## 7. Numerical results / baselines
- **PDE recovery (test MAE, 10 runs):** StruSR best or second-best on most — Advection 1.21×10⁻¹³, Diffusion 6.38×10⁻⁶, Poisson2D 7.32×10⁻⁵, Poisson3D 5.62×10⁻³, Heat2D 1.53×10⁻⁶, Heat3D 1.09×10⁻⁴ (RAG-SR slightly better: 9.27×10⁻⁵), Wave2D 4.33×10⁻⁵, Wave3D 7.09×10⁻⁶. Baselines (NetGP, HD-TLGP, PhySO) often orders of magnitude worse (e.g. Poisson2D: NetGP 5.69×10⁻¹, HD-TLGP 1.87×10⁻², PhySO 7.13).
- **Structural fidelity:** recovered forms match ground truth up to coefficient/algebraic variants, e.g. Wave3D: exp(−0.5001t + 1.000x₁² + 0.999x₃²)·sin(x₂) vs exp(x₁²+x₃²)sin(x₂)e^{−0.5t} (Table 3).
- **Strogatz/Feynman:** competitive/leading R², consistently lowest normalized structural complexity, low inference latency (Figure 2).
- **Ablations:** StruSR shows stable monotonic structure-loss decrease; vanilla GP barely improves structurally; physics-informed GP improves early then stalls (Figure 3a). K=5 optimal.

## 8. Code / data availability
No repository link found in the paper text. PDEs are standard manufactured solutions (Table 1 gives full equations + conditions); Strogatz/Feynman are public benchmarks. Reimplementation required.

## 9. Leakage & limitations
Adversarial notes: (a) No public code — the most complex ledger-2162–2170 method is the only one requiring reimplementation. (b) Requires a well-trained PINN first; garbage PINN → garbage structural prior (no PINN-quality gate reported). (c) K=5 Taylor of a neural net accumulates autodiff noise; the paper's own ablation shows higher orders overfit. (d) Masking attribution costs one extra fitness evaluation per subtree per generation — expensive for large populations; no complexity analysis given. (e) PDE benchmarks are manufactured smooth solutions; real noisy sports data has no governing differential operator N[·] to anchor L_phys. (f) Table 3 shows the method sometimes returns algebraically equivalent but ugly forms (Diffusion: (1.022−0.482t+0.124t²)sin(3.145x−0.005t)) — structural fidelity is real but not elegance.

## 10. GSE overlap
GSE's neural components (win-probability heads, forecasters) are black boxes; ledger 2162 distills them post-hoc with pure-fit PySR, and ledger 2168 adds an LLM judge. StruSR offers the *derivative-consistent* distillation path GSE lacks: extract the neural model's local Taylor structure (how win probability changes w.r.t. each input feature, to 2nd–3rd order) via autodiff, then guide GP so the distilled equation matches not just the network's outputs but its *local sensitivities* — the equation inherits the network's learned feature interactions. The masking-attribution mechanism also gives GSE a principled "which subexpression matters" diagnostic for any GP run. No GSE work uses derivative-structure guidance for symbolic distillation.

## 11. GSE implementation spec
1. Train GSE's neural win-probability model with a domain-constraint loss term (the sports analog of the PINN physics loss: monotonicity in EPA margin, bounded [0,1], calibration penalty) — this is the "PINN."
2. At ~200 anchor game-states, extract K=3 Taylor expansions of the network output w.r.t. the top-8 input features via autodiff (torch.autograd).
3. Run GP (PySR or DEAP) with hybrid fitness: validation Brier + λ·Taylor-coefficient mismatch vs the network; add masking attribution (mask subtree → ΔBrier + ΔTaylor) with β=0.5 to protect high-sensitivity subexpressions during evolution.
4. Output: symbolic win-probability equation that matches the neural net's predictions AND its feature sensitivities.
Effort: ~2–3 weeks (no public code; reimplement attribution + Taylor extraction; PySR custom loss needed). Needs the trained neural model as input.

## 12. Reproducible test
2025 NFL: StruSR-style guided GP vs vanilla PySR vs ledger-2168 LLM-judge PySR, distilling the same neural win-prob model. Metrics: (a) validation Brier of distilled equation; (b) sensitivity fidelity — correlation between equation's and network's feature gradients at 500 held-out game states (the new metric this paper enables); (c) generations to convergence; (d) normalized structural complexity.

## 13. Acceptance / rejection gate
**ADAPT if:** the guided-GP equation reaches sensitivity-fidelity correlation ≥ 0.9 with the network (vs ≤ 0.7 for vanilla PySR) at validation Brier within 2% of the network's, AND converges in ≤ 50% of the generations vanilla PySR needs. **REJECT if:** sensitivity fidelity < 0.8, or autodiff Taylor extraction is numerically unstable on the sports features (coefficient variance > 100% across seeds), or masking attribution overhead makes runs > 5× slower than vanilla PySR (cost exceeds value). Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **cross-model Taylor consensus**. The paper guides GP from a single PINN — if that PINN has a structural flaw, the prior is flawed (limitation (b)). For GSE, extract Taylor expansions from *three* diverse neural models (the engine's win-prob net, an XGBoost-surrogate net, and a shallow MLP) and define L_Taylor against the *consensus* coefficient vector, down-weighting anchor points where the models disagree (disagreement = epistemic uncertainty). This converts single-prior fragility into an uncertainty-aware structural prior, and the disagreement map itself tells GSE which game-state regions need more data — a diagnostic the paper's single-PINN design cannot produce.
