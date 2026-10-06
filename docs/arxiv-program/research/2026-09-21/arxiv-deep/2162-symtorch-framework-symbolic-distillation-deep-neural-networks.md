# [2162] SymTorch: A Framework for Symbolic Distillation of Deep Neural Networks (arXiv:2602.21307v2)

**Citation:** Elizabeth S.Z. Tan, Adil Soubki, Miles Cranmer (2026). *SymTorch: A Framework for Symbolic Distillation of Deep Neural Networks*. arXiv:2602.21307v2. URL: https://arxiv.org/abs/2602.21307
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADOPT — distills any trained neural component (including GSE's win-probability / pick-confidence models) into closed-form symbolic equations with a drop-in PyTorch API built on PySR, proven on GNNs, PINNs and LLMs.

## 1. Research question
Can symbolic distillation — replacing neural network components with human-readable closed-form equations via symbolic regression — be turned from a bespoke, hand-rolled analysis into an automated, library-level workflow, and is it practically useful (a) for interpreting what function a trained component actually computes, and (b) for accelerating inference by replacing dense MLP layers with symbolic surrogates?

## 2. Dataset / schema
Four case-study datasets, all synthetic or benchmark-derived:
- **LLM inference speedup:** Qwen2.5-1.5B-Instruct evaluated on Wikitext-2-v1 (Merity et al. 2016), train/test split each 178k tokens; inference-throughput benchmark on an Nvidia A100-SXM4-80GB (5 warmup passes, 100 forward passes averaged, KV caching disabled).
- **GNN force-law recovery:** simulated 2-D particle systems (reproduction of Cranmer et al. 2020): node features [x, y, vx, vy, charge, mass]; targets = per-particle accelerations; four pairwise force laws tested: gravity, spring, 1/r, 1/r².
- **PINN case study:** 1-D heat equation ∂u/∂t = α ∂²u/∂x² (α = 0.2), x∈(0,1), t∈(0,1]; trained on only 10 data points.
- **LLM arithmetic analysis:** Llama-3.2-1B-Instruct on four numeric tasks (3-digit addition, 3-digit multiplication, counting 1s in binary strings, Celsius→Fahrenheit).
Access: all reproducible via provided code repos (Section 8); datasets are standard/public.

## 3. Method / model
**SymTorch** (`SymbolicModel`, a `nn.Module` wrapper) automates symbolic distillation of arbitrary PyTorch components: (1) registers forward hooks to record the block's inputs/outputs on user-supplied data; (2) runs PySR (Cranmer 2023) — multi-population evolutionary search with mutation, crossover, simplification, constant optimization, Pareto front over (complexity = expression-tree node count) vs fit; (3) `switch_to_symbolic` replaces the block with a Pareto-front equation in subsequent forward passes (restorable via `switch_to_block`); (4) handles GPU–CPU transfer, I/O caching (SR rerunnable without new forward passes), native PyTorch serialization, and `torch.compile` compatibility. Fits one expression per output dimension. Supports user `variable_transforms` (e.g. r = √(Δx²+Δy²)) to structure the search space, and continued training with fixed equations while other weights update.
**SLIME implementation:** native support for Fong & Motani (2025) — fit symbolic surrogate s to black-box f in a neighborhood of point x*: training set = J nearest neighbors from the data distribution + N_synthetic Gaussian points around x* (variance = half the neighbors' variance); minimize weighted squared error with proximity kernel πₓ(z)=exp(−‖x₀−x‖²/σ²) and weight M on real-distribution points.
**LLM speedup framework:** PCA-compress MLP activations (32 input PCs, 8 output PCs), distill the reduced mapping with SymTorch, then invert PCA. Intervened on layers 7, 14, 21 of Qwen2.5-1.5B (SwiGLU, 1536→8960 dim).
**GNN study:** edge model φᵉ(vᵢ,vⱼ) + node model φᵛ(vᵢ, ēᵢ′) MLPs trained with MAE on accelerations; five variants (Standard/100 messages, Bottleneck/2 messages, L1, KL, Pruning).

## 4. Equations & assumptions
- SR objective: g* = argmin_{g∈S} Σᵢ ℒ(yᵢ, g(xᵢ)) (Eq. 1), ℒ = MSE, S = closed-form analytic expressions.
- Pareto-front equation selection: score_j = −log(loss_j/loss_{j−1}) / (complexity_j − complexity_{j−1}) (Eq. 2).
- Multi-output wrap: f: xᵢ → yᵢ (Eq. 3), one expression per output dimension.
- Perplexity: exp(−(1/N) Σᵢ log p(xᵢ|x_{<i})) (Eq. 4).
- GNN edge/node updates (Eqs. 5–8): eₖ′ = φᵉ(v_rₖ, v_sₖ); ēᵢ′ = Σ_{j≠i} φᵉ(vᵢ, vⱼ); v̂ᵢ′ = φᵛ(vᵢ, ēᵢ′).
- SLIME objective: s = argmin_{s∈S} Σ_{z∈synthetic} πₓ(z)[f(z)−s(z)]² + M Σ_{z∈neighbors}[f(z)−s(z)]².
- Heat equation recovered (Eq. 9): ∂u/∂t = α ∂²u/∂x², α = 0.2.
- Assumption: edge messages are linear combinations of the true pairwise forces provided message dim = system dim (derived in Appendix E.1); SR scales exponentially in #inputs, linearly in #outputs.
- Key structural claim: applying SR directly to the raw dataset fails (N² search over composite a(Σ_j b(xᵢ,xⱼ))), while the GNN decomposition needs only 2N candidates.

## 5. Features / target
Task-dependent: (a) LLM speedup — inputs = 32-dim PCA-compressed MLP activations, targets = 8-dim compressed MLP outputs; (b) GNN — inputs = concatenated node features of particle pairs [x, y, vx, vy, q, m], targets = edge messages (force-law recovery) and node accelerations; (c) PINN — inputs = (x, t), target = temperature u; (d) LLM arithmetic — inputs = prompt numerals (x₀, x₁, …), target = model's emitted numeric answer.

## 6. Validation design
- LLM speedup: baseline vs PCA+MLP vs PCA+SymTorch vs Control (MLP→identity) perplexity on held-out Wikitext-2 test split; throughput benchmark repeated identically in all conditions on one A100; compared against similarly-sized open-source LLMs on a throughput–perplexity Pareto plot.
- GNN: all five variants trained on the same simulated systems; success criterion = recovery of the true analytic force law from distilled edge messages (qualitative match to ground truth, per Cranmer et al. 2020).
- PINN: trained on only 10 data points, distilled equation compared to the analytic heat-equation solution; baseline = standard NN of identical architecture trained on the same data.
- LLM arithmetic: "best" equation (Eq. 2 score) vs expected equation; correctness of Pareto-front membership (was the true equation present in the front even if not selected?).

## 7. Numerical results / baselines
- **LLM speedup:** baseline perplexity 10.62. Δ-perplexity: PCA+MLP +3.11; PCA+SymTorch +3.14; Control +6.97 (Table 1). Distilling 3 of 28 MLP layers delivered an **8.3% increase in token throughput** over baseline, roughly matching the control condition's speed; the symbolic approximation itself contributed only ~1% of the perplexity increase — the PCA dimensionality reduction was the dominant degradation source. Modified Qwen2.5-1.5B sits on the perplexity–throughput Pareto front vs similarly-sized open LLMs (Figure 5).
- **GNN:** reproduced Cranmer et al. 2020 — SymTorch recovered the true interaction laws for all four force systems (gravity, spring, 1/r, 1/r²); the new Pruning variant matched the best Bottleneck variant. Distilling SR directly on the raw dataset (not the GNN edge MLP) failed to recover the laws.
- **PINN:** distilled the trained PINN into a closed-form expression that recovered the 1-D heat-equation solution; the PINN substantially outperformed the standard NN given only 10 training points (Figure 6).
- **LLM arithmetic (Table 2):** the correct equation was present in the SR Pareto front for addition, multiplication, and temperature conversion but was NOT selected as "best" (the LLM's learned operation ≈ true equation + small ε systematic-error terms); for counting, the true equation was absent from the front entirely. Example distilled addition: x₁·((inv(x₀−70.16)+1.07) + (inv(sin(x₁)+0.80)+x₁)·(−ε))·x₀.

## 8. Code / data availability
Open source: `pip install torch-symbolic`; docs at https://symtorch.readthedocs.io/en/latest/; LLM-speedup code https://github.com/astroautomata/LLM_PCA; GNN-distillation code https://github.com/astroautomata/SymTorch_symbolic_distillation_GNNs; Jupyter notebooks reproducing each case study. Miles Cranmer is the PySR author.

## 9. Leakage & limitations
Adversarial notes: (a) SR runtime grows exponentially with input variables/operator-set/dataset size, and SymTorch fits one expression per output dimension — wide model components get expensive fast. (b) PySR's node-count complexity measure can prefer mathematically-equivalent-but-less-readable forms (sin(sin x) = x+2 in "complexity"). (c) LLM speedup evaluated only on WikiText-2 — matches the surrogate's training distribution; distribution shift/downstream tasks untested, and the authors admit it "may not be competitive with established methods". (d) The PCA compression (not the symbolic step) caused nearly all of the perplexity damage — the 8.3% speedup is real but bought with +3.14 perplexity. (e) SLIME's "half the neighbors' variance" default and M weighting are heuristic, no sensitivity analysis shown. (f) GNN force-law recovery depends on message-dim = system-dim and the Appendix E.1 derivation — inductive bias doing heavy lifting. External validity to NFL: the method is domain-agnostic; the gap is sports data, not method.

## 10. GSE overlap
Wave-5a covered core SR methods (PySR, AI Feynman, LLM-SR, DSR) — SymTorch is the *application-layer* wrapper that makes those methods usable against production models, which wave-5a did not cover. GSE's engine (v5.2.7) emits neural predictions (`picks` table) that are audited by hand; there is no closed-form audit trail for edge cases (e.g. a win-prob model spiking to 0.99 on a 4th-down call). This fills the interpretability gap: distill the model block into a ≤10-term equation to expose the exact input-output law. Distinct from the GSE discovery lane (DeepSeek theorist / Motif lab) which invents new equations — SymTorch *explains* the ones the engine already learned.

## 11. GSE implementation spec
1. `pip install torch-symbolic pysr` on the Motif VM; wrap the engine's neural win-probability head (or pick-confidence head) with `SymbolicModel`.
2. Forward passes over the 2024–2025 nflverse play-by-play feature set (down, distance, yardline, score differential, time remaining, EPA features) to cache block I/O; supply `variable_transforms` for sports-natural quantities (e.g. `wp_margin = score_diff / exp(time_remaining)`).
3. Run PySR distillation (operators: +, −, ×, ÷, exp, log, sqrt, min, max) with a 10-term node budget; pick the Eq. 2 score-maximizing Pareto equation.
4. Publish the distilled equation as the model's "glass box" audit artifact: every public pick links the closed-form law used; flag any game state where neural vs symbolic disagree > 0.02 as a model-risk case.
5. Optional SLIME module for per-game explanations: "why did the model give KC 72%?" → a 3–5-term local symbolic explanation around that game state.
Effort: ~1–2 engineer-days for the distillation pipeline; ~1 day to wire into the daily pick workflow. No new data spend (uses existing nflverse + engine features).

## 12. Reproducible test
Dataset: 2024 NFL regular season, nflverse `pbp`, engine's neural win-probability head, held-out 2025 Weeks 1–4. Metric: MAE between distilled equation and neural head on the held-out weeks; baseline to beat: linear logistic-regression fit on the same features (must be beaten by ≥20% MAE). Time window: run once on 2025 Weeks 1–4, then extend if gate passes.

## 13. Acceptance / rejection gate
**ADOPT if:** the distilled equation uses ≤10 terms AND matches the neural head within 0.01 MAE on the held-out 2025 Weeks 1–4 window AND beats the linear baseline by ≥20% MAE. **REJECT if:** MAE > 0.01, or any term uses a feature not available at bet time (lookahead), or the equation is unreadable (nested transcendental garbage) per human review. Gate pre-registered before the run.

## 14. Improvement experiment
Beyond the paper: **pairwise-decomposition distillation for team ratings** — mimic the GNN force-law trick by training a small team-interaction network (edge MLP = team-vs-team matchup function, node MLP = roster state) and distilling the *edge* MLP into a closed-form "matchup law" (e.g. win-prob = σ(a·ΔELO + b·pace·Δrest + c…)). Direct SR on game outcomes would fail (N² composite search); the interaction decomposition makes the matchup law tractable. Compare the distilled matchup law's Brier score vs the raw engine on 2023–2025 seasons; publish the law as GSE's signature transparent rating equation.
