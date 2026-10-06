# [1824] Deep symbolic regression: Recovering mathematical expressions from data via risk-seeking policy gradients (arXiv:1912.04871)

**Citation:** Brenden K. Petersen, Mikel Landajuela, T. Nathan Mundhenk, Claudio P. Santiago, Soo K. Kim, Joanne T. Kim (2021, arXiv v4). *Deep symbolic regression: Recovering mathematical expressions from data via risk-seeking policy gradients*. arXiv:1912.04871. URL: https://arxiv.org/abs/1912.04871
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

Risk-seeking RL over expression trees plus in-situ constraints is a genuinely different search philosophy from PySR's GA; value for GSE is the best-of-batch optimization framing and the constraint mechanism (enforce sports-domain structure during search), but needs adaptation to noisy tabular sports data and constant optimization.

## 1. Research question
Can an autoregressive RNN that emits distributions over expression trees, trained by reinforcement learning with a novel risk-seeking policy gradient (optimize for best-case rather than average-case performance), recover exact symbolic expressions better than genetic programming and commercial SR tools — and does the "optimize best case, not average case" framing fix the mismatch between RL training objectives and final SR success metrics?

## 2. Dataset / schema
Nguyen symbolic regression benchmark suite (Uy et al. 2011): 12 community-vetted benchmark expressions with defined train/test datasets and allowed operators (Table 2, Appendix D). Additional comparisons vs literature-reported values from Neat-GP, GrammarVAE, BSR, Eureqa on their own setups. Bonus experiment: partial sums of the harmonic series H_n ≈ γ + log(n) + 1/(2n) − 1/(12n²) (Euler 1755) — DSR rediscovered a variant with γ≈0.57721 (Euler–Mascheroni) emerging naturally. Noise experiments: independent Gaussian noise added to the dependent variable with σ proportional to RMS of y in training data, proportionality constant swept from 0 (noiseless) to 0.1.

## 3. Method / model
Deep Symbolic Regression (DSR): an RNN defines an autoregressive distribution over expression trees — each token conditioned on previously sampled tokens, with the hierarchical tree structure exploited by feeding parent and sibling embeddings as RNN inputs, and arity constraints enforced by node type (cosine = unary → one child). Tokens form expression trees; fitness = reward signal for RL.
- **Risk-seeking policy gradient**: J_risk(θ;ε) = E_{τ∼p(τ|θ)}[R(τ) | R(τ) ≥ R_ε(θ)], where R_ε(θ) is the (1−ε)-quantile of rewards under the current policy — i.e., the conditional expectation of rewards in the top-ε fraction of the batch. Gradient: ∇_θ J_risk = E[(R(τ) − R_ε(θ))·∇_θ log p(τ|θ) | R(τ) ≥ R_ε(θ)]. Monte-Carlo estimate: (1/εN)Σ_i [R(τ⁽ⁱ⁾) − R̃_ε(θ)]·1_{R(τ⁽ⁱ⁾)≥R̃_ε(θ)} ∇_θ log p(τ⁽ⁱ⁾|θ). Two differences from REINFORCE: (a) a theoretically-prescribed baseline (the quantile), (b) only the top-ε fraction of each batch contributes to the gradient. Mirrors CVaR (Tamar et al.) but flipped: CVaR is risk-averse (bottom ε quantile); DSR is risk-seeking (top ε quantile) — best-case performance at the expense of average/worst case.
- **In-situ constraints**: token sampling masked during generation to enforce domain constraints (arity, no nested trig, length limits, constant placement, avoid redundant subtrees) — constraints applied at generation time, not as post-hoc penalties.
- Baselines ablated: PQT (priority queue training), VPG (vanilla policy gradient), GP (tournament), Eureqa, Wolfram.

## 4. Equations & assumptions
J_risk(θ;ε) ≜ E_{τ∼p(τ|θ)}[R(τ) | R(τ) ≥ R_ε(θ)] (Eq. 1)
∇_θ J_risk(θ;ε) = E_{τ∼p(τ|θ)}[(R(τ)−R_ε(θ))·∇_θ log p(τ|θ) | R(τ) ≥ R_ε(θ)] (Proposition 1)
MC estimate: (1/εN) Σ_i [R(τ⁽ⁱ⁾) − R̃_ε(θ)] · 1_{R(τ⁽ⁱ⁾) ≥ R̃_ε(θ)} ∇_θ log p(τ⁽ⁱ⁾|θ)
Assumptions: (1) reward = normalized RMSE-based fitness, computationally cheap per expression; (2) truth is a compact expression in the token library; (3) batch quantile is a good proxy for the true (1−ε)-quantile; (4) constraints specified a priori capture valid structure; (5) exact symbolic equivalence is the right success criterion (for benchmarks); (6) CVaR-style derivations carry over with the inequality flipped.

## 5. Features / target
Nguyen suite: 1–2 continuous input variables x (sometimes x,y), target = expression output; GSE analog: play/team-level features → efficiency metrics.

## 6. Validation design
Nguyen 12 benchmarks; recovery = exact symbolic equivalence (noiseless) or exact equivalence anywhere on the reward–complexity Pareto front (noisy runs, to avoid rewarding overfit). Hyperparameters tuned on Nguyen-7 and Nguyen-10 only (grid search: 800 combos GP, 81 each for DSR/PQT/VPG) — the other 10 benchmarks are effectively held out. Table 1 compares recovery rates of DSR vs PQT/VPG/GP/Eureqa/Wolfram with bold = p<1e−3 significance across all benchmarks. Noise sweep 0→0.1×RMS σ with 10× larger datasets (dashed lines in Fig. 4) to test whether more data offsets noise. Appendix E recapitulates four published studies' setups (GrammarVAE, BSR, EQL, Neat-GP) for apples-to-apples comparison.

## 7. Numerical results / baselines
- DSR **significantly outperforms all five baselines** (PQT, VPG, GP, Eureqa, Wolfram) in exact recovery rate across the Nguyen suite, p<10⁻³ (Table 1; per-benchmark fractions in Table 1 of the paper — bold across all benchmarks).
- Noise: Wolfram "catastrophically fails for even the smallest noise level"; DSR outperforms all baselines at every noise level and dataset size; with 10× data, recovery improves across noise levels (Fig. 4).
- Literature comparisons: DSR "greatly outperforms each study's published results" (vs GrammarVAE top-3, BSR average test RMSE, EQL, Neat-GP — Tables 6–8; e.g. Table 8: DSR median RMSE 0 on Neat-1, Neat-2 vs Neat-GP's 0.0779, 0.0579).
- Ablation: risk-seeking objective beats standard policy gradient; in-situ constraints improve recovery.
- Harmonic series experiment: recovered H_n ≈ γ + log(n) + 1/(2n) + 1/(11.3776n + 15.725) + 0.327981 with γ≈0.57721 — a novel variant of Euler's 1755 formula.

## 8. Code / data availability
None stated in the extracted text (LLNL paper; reference implementation exists as the open-source `deep-symbolic-regression` package by the authors — not confirmed in text; recorded as unverified).

## 9. Leakage & limitations
- Benchmark suite is tiny (12 expressions, 1–2 variables) — far from sports-scale dimensionality; hyperparameter tuning on Nguyen-7/10 then testing on the rest is good practice but the "held-out" set shares the same synthetic character.
- Exact-recovery metric is the wrong objective for GSE (we want predictive metrics, not rediscovery of a known truth); the paper acknowledges recovery as stringent.
- Constants are harder for DSR than for PySR's BFGS loop (RNN must emit constant tokens); the H_n result is impressive but constants like 11.3776 are awkward.
- RNN training is sequential and sample-hungry; GP/simulated-annealing (PySR) is embarrassingly parallel — DSR scales worse on clusters.
- "Greatly outperforms" literature comparisons recapitulate others' setups from papers — reproduction fidelity is a risk.
- Real sports data has correlated features, regime breaks, and measurement error — none tested here.

## 10. GSE overlap
New capability; no DSR-style RL search exists at GSE. Key transfer is the RISK-SEEKING framing: in metric invention we care about the single best equation on the Pareto front, not average batch quality — exactly the "expectation problem" the paper names. The in-situ constraint mechanism is the missing piece for sports: we can forbid degenerate forms (single-variable, constant-only) and enforce shape priors (monotone in EPA) during generation. PySR (1822) remains the production engine; DSR's ideas port as (a) a best-of-batch selection doctrine, (b) constraint masks in generation.

## 11. GSE implementation spec
- Implement risk-seeking fine-tuning as a PySR post-pass: take PySR's hall-of-fame expressions, embed them as starting programs, and run a small RL loop (REINFORCE with top-ε quantile baseline, ε≈0.2) that mutates expressions, rewarding held-out-season predictive r with a hard constraint mask (forbid: >1 nested trig, single-input expressions, >15 nodes).
- Alternatively implement DSR-lite directly in PyTorch: LSTM over token sequences, prefix-notation expressions, reward = −NMSE on train + complexity penalty; constraint mask at sampling.
- Data: same nflverse team-season pipeline as 1822. Effort: ~2 engineer-days for the post-pass; ~1 week for a from-scratch DSR.

## 12. Reproducible test
Dataset: nflverse QB-game rows 2015–2023 train, 2024–2025 test; target = EPA/dropback; features = 12 box-score + charting stats. Baseline: PySR-only search (5 seeds). Challenger: PySR + risk-seeking RL post-pass (same budget of expression evaluations). Metric: best test-set Pearson r among expressions with ≤15 nodes.

## 13. Acceptance / rejection gate
ADOPT the risk-seeking post-pass if its best ≤15-node expression beats the best PySR-only ≤15-node expression by ≥0.03 test r on 2024–2025, with the constraint mask preventing degenerate solutions; REJECT if the RL loop collapses to PySR's own hall-of-fame (no novelty) or underperforms.

## 14. Improvement experiment
Risk-seeking CVaR scheduling: anneal ε from 0.5→0.05 over training (broad exploration early, elite exploitation late) instead of fixed ε. Hypothesis: scheduled risk-seeking escapes the early "mediocre but safe" expressions that fixed-ε runs lock onto, mirroring simulated annealing's temperature schedule in PySR — test whether the combination beats both fixed-ε DSR and PySR on the noisy Nguyen subset as a sandbox before sports data.

---
Lane: symreg_equation_discovery · Block 1822–1841
