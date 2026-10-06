# [2004] Bayesian Batch Active Learning as Sparse Subset Approximation (arXiv:1908.02144)

**Citation:** Pinsler, R., Gordon, J., Nalisnick, E., Hernández-Lobato, J. M. (2019). *Bayesian Batch Active Learning as Sparse Subset Approximation*. arXiv:1908.02144. URL: https://arxiv.org/abs/1908.02144
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** a principled, scalable, model-agnostic Bayesian batch AL rule (sparse posterior approximation via Frank-Wolfe, with regression-native closed forms linked to leverage scores); the most GSE-shaped of the batch-AL papers, but needs cost-aware adaptation and a fix for its weight-projection step.

## 1. Research question
How to build a principled AND scalable Bayesian batch active learning algorithm: sequential greedy methods (BALD, MaxEnt) are near-optimal per-point but infeasible at scale (retraining a ResNet thousands of times; single points cause negligible posterior change, so queries correlate), while naive top-b batch construction acquires highly correlated near-duplicate queries. Can batch construction be re-cast as a sparse subset approximation to the complete-data log posterior, solved with Frank-Wolfe?

## 2. Dataset / schema
- UCI regression: yacht (N=308, d=6), boston (506, 13), energy (768, 8), power (9568, 4), year / Million Song Dataset (515,345, 90).
- Classification: CIFAR-10, SVHN, Fashion-MNIST (standard splits; test sets 10,000; Fashion-MNIST test 26,032).
- Model for all experiments: neural linear model = Bayesian linear/probit regression on a deterministic NN feature extractor (closed-form posterior, Riquelme et al. 2018; deep kernel learning Wilson et al. 2016); classification uses ResNet-18 extractor trained from scratch 250 epochs + mean-field Gaussian variational inference.
- All public. 80/20 randomized train-test splits; 40 seeds (year: 5; classification: 5).

## 3. Method / model
ACS-FW (Active Bayesian CoreSets with Frank-Wolfe):
1. Target: choose batch D′ so that log p(θ|D₀∪D′) best approximates the expected complete-data log posterior E_{Y_p}[log p(θ|D₀∪(X_p,Y_p))] (labels imputed via current predictive posterior). Decompose: E[log posterior] = log p(θ|D₀) + Σₘ ℒₘ(θ), ℒₘ(θ) = E_{y_m}[log p(y_m|x_m,θ)] + H[y_m|x_m,D₀] (Eq. 4; conditional independence of outputs assumed).
2. Sparse approximation: w* = argmin_w ‖ℒ − ℒ(w)‖² s.t. wₘ ∈ {0,1}, Σ𝟙ₘ ≤ b (Eq. 5), ℒ(w) = Σₘ wₘℒₘ, in a Hilbert space with inner product ⟨ℒₙ,ℒₘ⟩. Relax binary → non-negative weights + polytope constraint Σₘ wₘσₘ = σ (σₘ = ‖ℒₘ‖): minimize (1−w)ᵀK(1−w), Kₘₙ = ⟨ℒₘ,ℒₙ⟩ (Eq. 6). Vertices {σ/σₘ 1ₘ}; contains w=1.
3. Frank-Wolfe: each iteration selects the vector most aligned with the residual ℒ−ℒ(w) (Eq. 7, depends only on inner products), closed-form line search update; ≤ b non-zero weights after b iterations (re-selection allowed → variable/smaller batches in practice). Final step: project weights back to binary (w̃*=1 if w*>0) — increases approximation error (paper's own admission).
4. Inner products: weighted Fisher ⟨ℒₙ,ℒₘ⟩_{π̂,F} = E_{π̂}[∇ℒₙᵀ∇ℒₘ] (Eq. 8; π̂ = current posterior; entropy term vanishes under gradient); weighted Euclidean ⟨ℒₙ,ℒₘ⟩_{π̂,2} = E_{π̂}[ℒₙ(θ)ℒₘ(θ)] (Eq. 9, likelihood-only).
5. Random projections for arbitrary models: ℒ̂ₙ = (1/√J)[ℒₙ(θ₁),…,ℒₙ(θ_J)]ᵀ, θⱼ∼π̂ (Eq. 16); ⟨ℒₙ,ℒₘ⟩ ≈ ℒ̂ₙᵀℒ̂ₘ (unbiased MC estimator, Eq. 17). Any model with tractable likelihood; batch construction O(|P|J) instead of O(|P|²).

## 4. Equations & assumptions
- (1)–(3): complete-data posterior; expected posterior entropy objective; BALD greedy acquisition.
- (4)–(9): as in §3. Key closed forms:
  - Linear regression (Eq. 11): ⟨ℒₙ,ℒₘ⟩_{π̂,F} = (xₙᵀxₘ/σ₀⁴)(xₙᵀΣ_θxₘ), Gaussian prior unit variance, Σ_θ = σ₀²(XᵀX+σ₀²I)⁻¹.
  - Single-point acquisition (Eq. 12): α_ACS(xₙ;D₀) = (xₙᵀxₙ/σ₀⁴)(xₙᵀΣ_θxₙ) vs α_BALD = ½log(1 + xₙᵀΣ_θxₙ/σ₀²) — proportional (exp(2α_BALD) ∝ α_ACS ignoring xₙᵀxₙ) hence equivalent under greedy maximization. xₙᵀΣ_θxₙ ≈ leverage score xₙᵀ(XᵀX)⁻¹xₙ: the xₙᵀxₙ factor "allows for more contribution from the current instance than BALD or leverage scores would."
  - Probit (Eq. 14–15): ⟨ℒₙ,ℒₘ⟩ = xₙᵀxₘ(BvN(ζₙ,ζₘ,ρₙₘ) − Φ(ζₙ)Φ(ζₘ)); α_ACS = xₙᵀxₙ(Φ(ζₙ)(1−Φ(ζₙ)) − 2T(ζₙ, 1/√(1+2xₙᵀΣ_θxₙ))), T = Owen's T, BvN = bivariate normal CDF.
- (16)–(17): random-projection estimator.
- Assumptions: factorized predictive posterior (conditional independence of outputs); tractable likelihood (or tractable E_{y|x}[·]); Gaussian prior/posterior for closed forms; binary projection step heuristic.

## 5. Features / target
UCI features (standard); year: 90 audio features; images: raw pixels → ResNet-18 features. Targets: regression (RMSE) and classification accuracy. Acquisition features are function-space vectors ℒₘ — model-agnostic, no dependence on structured feature geometry (contrast with Sener & Savarese coreset, which needs ConvNet representations).

## 6. Validation design
- Small-scale UCI: 20 initial random labels, batches b=10, budget 100; model retrained 1000 epochs Adam after each AL iteration; held-out RMSE; 40 seeds (year: 5). Baselines: Random, MaxEnt (naive top-b), MaxEnt-SG (sequential greedy b=1), MaxEnt-I (sequential with label imputation + model update). Note: MaxEnt-SG/MaxEnt-I take order(s) of magnitude more model updates — "not directly comparable" on cost.
- Large-scale: year (200 initial, b=1000, budget 10,000, projections used — "yield improved performance and are faster" than closed form); CIFAR-10 (5000 initial, b=5000, budget 20,000), SVHN & Fashion-MNIST (1000 initial, b=3000, budget 12,000); baselines Random, MaxEnt, BALD, K-Medoids, K-Center.
- Visualization: t-SNE batch plots (Fig. 1: MaxEnt/BALD cluster; ACS-FW covers manifold); probit toy showing α_ACS "rotates after each selected data point" while BALD's scores are static (Fig. 2).
- No time-ordered splits; i.i.d. benchmarks.

## 7. Numerical results / baselines
- Table 1 final test RMSE (mean ± 2 SE): yacht — Random 1.272±0.0593, MaxEnt 0.923±0.0319, ACS-FW 1.031±0.0438, MaxEnt-I 0.865±0.0276, MaxEnt-SG 0.971±0.0350. boston — Random 4.068±0.0852, MaxEnt 3.640±0.0652, ACS-FW 3.799±0.0858, MaxEnt-I 3.467±0.0676, MaxEnt-SG 3.458±0.0682. energy — Random 0.959±0.0337, MaxEnt 1.443±0.0857, ACS-FW 0.855±0.0259, MaxEnt-I 0.927±0.0461, MaxEnt-SG 1.055±0.0740. power — Random 5.108±0.0468, MaxEnt 5.022±0.0428, ACS-FW 4.984±0.0366, MaxEnt-I 4.834±0.0313, MaxEnt-SG 4.855±0.0339. year — Random 13.165±0.0307, MaxEnt 13.030±0.0975, ACS-FW 12.194±0.0596.
  → ACS-FW consistently beats Random by a large margin (MaxEnt does not, on energy/yacht); mostly on par with MaxEnt on small data; greedy sequential methods still often win in the small-data regime (single points move the posterior a lot there). ACS-FW's advantage grows with dataset size (Fig. 3c: dominates on year throughout).
- Classification (Fig. 4): ACS-FW ≥ all competitors (Random, MaxEnt, BALD, K-Medoids, K-Center) on CIFAR-10, SVHN, Fashion-MNIST; probabilistic methods are strong baselines.
- Runtime (Table 2, seconds): ACS-FW batch construction negligible vs. training per iteration; totals — yacht: MaxEnt-I 1057.4 vs ACS-FW 101.7 (10×); year: Random 3811.6, MaxEnt 37,464.6, ACS-FW 28,475.2. "Total cumulative runtimes are on par with MaxEnt" despite more AL iterations.

## 8. Code / data availability
Code: https://github.com/rpinsler/active-bayesian-coresets (stated). Data: public benchmarks.

## 9. Leakage & limitations
- Small-data regime: sequential greedy (MaxEnt-SG/MaxEnt-I) often beats ACS-FW; the method shines at scale — fine for GSE's large pool, but weekly batches are modest (b≈40–300), where the advantage is unproven.
- Final binarization of FW weights is unprincipled and increases approximation error (paper's admission; "alternative optimization procedures" left to future work).
- Closed forms need Gaussian posteriors / linear-probit structure; the random-projection fallback needs J posterior samples and a tractable likelihood — GSE's engine is deterministic; needs a Bayesian wrapper or bootstrap ensemble.
- No cost-awareness: polytope constraint is on count b, not dollars/minutes.
- No semi-supervised use of pool structure; i.i.d. benchmarks only; classification at scale uses variational inference whose quality bounds the method.

## 10. GSE overlap
None in the existing map — no Bayesian coreset / posterior-approximation acquisition exists in the corpus. This is the only paper in the lane with regression-native closed forms (leverage-score connection) directly suited to GSE's tabular EPA/spread/total models, plus an O(|P|J) black-box extension for "any model with a tractable likelihood." Complements ledgers 2002/2003 (heuristic/Bayesian classification batch rules); this one is the regression counterpart with a coreset interpretation: the selected batch is a sparse weighted approximation of the full-season log posterior — i.e., "which games, if charted, would make our posterior look as if we'd charted the whole season."

## 11. GSE implementation spec
- Setting: pool = season's uncharted games; likelihood = engine's pick model (binary cover/over heads → probit-style closed form Eq. 14–15 applies nearly directly; regression heads → linear closed form Eq. 11 on engine features).
- Fast path: compute leverage-like scores α_ACS(x) = (xᵀx/σ₀⁴)(xᵀΣ_θx) with Σ_θ from a Bayesian linear head on engine embeddings — no sampling, closed form, O(d²) per candidate. Batch via Frank-Wolfe with Fisher inner products (Eq. 11).
- Cost-aware extension: modify polytope to Σₘ wₘσₘcₘ = σ·c̄ (cₘ = charting cost per game) so FW selects under a dollar budget, not a count budget — the natural adaptation the paper leaves open.
- Serving: weekly; recompute Σ_θ from the current posterior (or Laplace approximation of the engine head); select batch; push to charting queue. Scales to full-season pools (O(|P|J)).
- Effort: ~2–3 weeks (Bayesian head or Laplace wrapper, FW solver, cost-weighted polytope, queue integration).

## 12. Reproducible test
Dataset: nflverse 2023–2024; simulate charting acquisition with the engine's binary cover head. Start 2023 weeks 1–4 labeled; acquire charting-labels in batches b=40 via ACS-FW (probit closed form) vs. random vs. BALD-top-40; retrain per round; evaluate 2024 held-out log-loss on spread picks. Baseline to beat: random at 2× budget.

## 13. Acceptance / rejection gate
ADOPT iff ACS-FW at 20% charting budget matches or beats random at 40% budget on 2024 held-out log-loss (within 0.003), AND beats BALD-top-b at equal budget by ≥ 0.004, replicated on the 2025 holdout when complete. REJECT if the FW binarization step makes batches unstable (Jaccard overlap < 0.5 across 3 seeds at fixed budget) or if no leverage-score signal exists in engine features (α_ACS uncorrelated with actual posterior movement on a pilot batch, |ρ| < 0.3).

## 14. Improvement experiment
Weighted-posterior coreset: skip the binarization and use the continuous FW weights w* directly as importance weights in the retraining loss (weighted log-likelihood), so the "batch" is a true Bayesian coreset rather than a projected subset. Test whether weighted retraining on the ACS-FW batch beats unweighted retraining on the binarized batch at equal labeling budget — hypothesis: the weights carry the approximation-quality information the projection destroys, recovering the small-data performance gap vs. sequential greedy methods.
