# [1891] Overcoming Catastrophic Forgetting in Neural Networks (EWC) (arXiv:1612.00796)

**Citation:** James Kirkpatrick, Razvan Pascanu, Neil Rabinowitz, Joel Veness, Guillaume Desjardins, Andrei A. Rusu, Kieran Milan, John Quan, Tiago Ramalho, Agnieszka Grabska-Barwinska, Demis Hassabis, Claudia Clopath, Dharshan Kumaran, Raia Hadsell (2017). *Overcoming Catastrophic Forgetting in Neural Networks*. arXiv:1612.00796v2. URL: https://arxiv.org/abs/1612.00796
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the founding regularization method for continual learning, and its two ideas that survive the jump to GSE's tabular world are (1) the Bayesian framing: past data's influence = posterior, approximated by anchoring each parameter to its old value with stiffness ∝ importance (Fisher diagonal), and (2) the Fisher-overlap analysis (Figure 2C): measure which weights are *shared* across tasks vs *task-specific*, and protect only the shared ones. Translated to GBMs, that becomes per-feature importance-weighted anchoring across regime refits — a principled version of the drift penalty sketched in 1890.

## 1. Research question
Can a fixed-capacity neural network learn tasks sequentially without catastrophic forgetting — without growing the network or storing old data? The paper's answer is Elastic Weight Consolidation (EWC): slow down learning on the weights that matter most for old tasks, where "matter most" is quantified by the diagonal of the Fisher information matrix. Demonstrated on permuted-MNIST (supervised) and sequential Atari 2600 games (RL).

## 2. Dataset / schema
(a) Permuted MNIST: each task = fixed random pixel permutation of MNIST (equal difficulty, different solution); trained sequentially, no revisiting. (b) Atari 2600: sets of 10 games at/above human DQN level, presented in randomized segments with revisits; EWC activated per game after 20M frames; task context inferred via a Forget-Me-Not HMM (control: true task labels, modest gain). Small per-game replay buffers + game-specific biases/gains per layer.

## 3. Method / model
Bayesian derivation: log p(θ|D) = log p(D_B|θ) + log p(θ|D_A) − log p(D_B) (Eqs. 1–2) — all knowledge of task A lives in the posterior p(θ|D_A). Laplace approximation: posterior ≈ Gaussian, mean θ*_A, diagonal precision = Fisher diagonal F. EWC loss: ℒ(θ) = ℒ_B(θ) + Σ_i (λ/2)·F_i·(θ_i − θ*_{A,i})² (Eq. 3) — a "spring" anchoring each weight to its task-A value with stiffness ∝ importance. Third task: sum of quadratics = one quadratic. Fisher's three properties: equals loss curvature near minimum; computable from first-order gradients; PSD.

## 4. Equations & assumptions
- ℒ(θ) = ℒ_B(θ) + Σ_i (λ/2) F_i (θ_i − θ*_{A,i})². (Eq. 3)
- log p(θ|𝒟) = log p(𝒟_B|θ) + log p(θ|𝒟_A) − log p(𝒟_B). (Eq. 2)
- Fisher ≈ −E[∇² log p] ≈ E[∇log p ∇log pᵀ]; diagonal used.
Assumptions: over-parameterization ⇒ task-B solution exists near θ*_A; posterior factorizes (diagonal Gaussian); point-estimate Fisher at θ*_A is adequate; task boundaries known (or inferred by the FMN module).

## 5. Features / target
MNIST: 784 permuted pixels → digit class. Atari: 84×84×4 frame stacks → Q-values over the full action set.

## 6. Validation design
Permuted MNIST: EWC vs plain SGD vs per-weight L2 (uniform stiffness) vs SGD+dropout, training curves on tasks A/B/C and average accuracy over many sequential permutations (Figure 2A–B). Atari: total human-normalized clipped score over 10 games, EWC vs no-EWC, averaged over seeds and game sets (Figure 3B); Fisher-quality check by weight perturbation (Figure 3C). Ten-separate-DQNs as upper bound.

## 7. Numerical results / baselines
- Permuted MNIST (Figure 2A): plain SGD catastrophically forgets task A at the switch; uniform L2 preserves A but can't learn B; EWC learns B while holding A. Figure 2B: dropout-SGD degrades after ~2 permutations; EWC scales to many tasks with only modest error growth (dashed = single-task reference).
- Fisher overlap (Figure 2C): similar tasks (8×8 permuted patch) share weights at all depths; dissimilar tasks (26×26 patch) subdivide early layers but still share layers near the output (shared label space reuses the head).
- Atari (Figure 3B): plain DQN total clipped human-normalized score stays < 1 (learns ≤1 game); EWC agent learns multiple games (red curve, FMN task inference; brown = true labels, only modestly better). Still below 10 separate DQNs.
- Fisher validation (Figure 3C): inverse-Fisher-shaped perturbations (blue) least harmful — the diagonal Fisher is a meaningful importance measure. But nullspace perturbations (orange) hurt as much as inverse-Fisher: the method is *overconfident* about which parameters are unimportant — "the chief limitation… under-estimates parameter uncertainty."
- Complexity: linear in parameters and examples (vs ELLA, which inverts parameter-dim matrices).

## 8. Code / data availability
None stated in the paper (DeepMind, 2016/17 era). Benchmarks: MNIST, Arcade Learning Environment — both public.

## 9. Leakage & limitations
- No Fisher information in GBMs — the exact mechanism doesn't port; only the principle (importance-weighted anchoring) ports, and the importance measure must be reinvented (gain/SHAP-based).
- Diagonal approximation underestimates uncertainty (paper's own Figure 3C): protecting "important" weights is sound, but trusting "unimportant" weights to move freely is overconfident — in NFL terms, a feature that looks unimportant in September may matter in December.
- Needs task boundaries (or a task-inference module); NFL regimes are unlabeled and gradual — the 1882–1885 detectors would have to supply the boundaries.
- λ is a hyperparameter needing search; the Atari result required per-game tuning and 20M-frame warmup.
- Fixed capacity is a virtue here but the paper shows EWC still underperforms separate models — the 1889 frozen-expert alternative may dominate when capacity is cheap (it is, for GSE).

## 10. GSE overlap
Per the existing-research map, online/continuous learning was commissioned-but-unfilled — no duplication. This is the *theoretical foundation* for the drift-penalty idea sketched in 1890's §11 (RWalk): RWalk is literally EWC's descendant (Fisher + parameter-distance). This ledger grounds that sketch in the original paper's equations and — more usefully — imports the Fisher-overlap analysis as a diagnostic GSE doesn't have: which features are regime-shared vs regime-specific.

## 11. GSE implementation spec
- **Importance-weighted anchoring for weekly GBM refits:** when refitting the win-prob GBM each week, add a penalty term Σ_i (λ/2)·w_i·(s_i − s*_i)² where s_i is the current model's per-feature contribution (e.g., mean |SHAP| or split gain) and s*_i its value in the reference (full-history) model, w_i = normalized importance in the reference model. This is EWC's Eq. 3 with the Fisher diagonal replaced by GBM importance — implementable as a custom objective penalty or, more simply, as feature-wise learning-rate/regularization scaling in the refit.
- **Fisher-overlap diagnostic (Figure 2C analog):** quarterly, compute per-feature importance vectors for models trained on each regime stratum (early/mid/late/playoff) and measure pairwise overlap (cosine similarity of importance vectors). Features with high overlap across all regimes = "shared representation" (anchor hard — these are the model's core physics, e.g., EPA-based features); features with low overlap = regime-specific (let them move freely each week). This turns λ from one global hyperparameter into a per-feature schedule derived from data.
- **Overconfidence guard (from Figure 3C):** never set any feature's anchor weight to exactly zero — floor all w_i at a small ε so "unimportant" features can still be protected from violent swings; the paper's own limitation says the importance estimate underestimates uncertainty.

## 12. Reproducible test
Dataset: nflverse 2015–2025, game-level features, home-win target; walk-forward 2020–2025. Arms: (A) plain weekly refit, (B) weekly refit + global drift penalty (single λ, 1890's version), (C) weekly refit + per-feature importance-weighted anchoring with the overlap diagnostic setting per-feature λ (this paper's version). Metrics: 1887's 4-metric suite. Gate: (C) must beat (B) on ≥2 metrics and beat (A) on ≥3, with worst-week Brier improving ≥0.002 over (A); the overlap diagnostic must additionally show a stable shared-feature core (top-10 features by mean overlap consistent across ≥3 seasons) for the method's premise to hold.

## 13. Acceptance / rejection gate
ADOPT per-feature importance-weighted anchoring if on 2020–2025 walk-forward: (i) (C) beats (B) on ≥2 of 1887's 4 metrics (the per-feature refinement must earn its complexity over a global penalty), (ii) worst-week Brier improves ≥0.002 vs plain refit (A), (iii) the shared-feature core is stable across seasons (else the "importance" being anchored is noise). REJECT if (C) ≈ (B) — then use the simpler global penalty from 1890. REJECT the whole anchoring approach if λ tuning is knife-edge (performance collapses outside a narrow λ band) — EWC's known sensitivity, unacceptable for a production weekly pipeline.

## 14. Improvement experiment
Replace the point-estimate importance (single reference model) with a *posterior* over importances: bootstrap the reference model 20×, compute per-feature importance distributions, and set the anchor stiffness ∝ precision (inverse variance) of each feature's importance — features whose importance is *certain* get stiff anchors, features whose importance is *uncertain* get loose ones. This directly attacks the paper's stated chief limitation (Figure 3C overconfidence). Test: (C) vs (C-bootstrap-precision) on 2023–2025 walk-forward, scored on worst-week Brier — hypothesis: precision-weighted anchoring wins specifically in regime-transition weeks (weeks 1–2, 13–14), where importance uncertainty is highest.
