# [1894] Facilitating Bayesian Continual Learning by Natural Gradients and Stein Gradients (arXiv:1904.10644)

**Citation:** Yu Chen, Tom Diethe, Neil Lawrence (2019). *Facilitating Bayesian Continual Learning by Natural Gradients and Stein Gradients*. arXiv:1904.10644v1. URL: https://arxiv.org/abs/1904.10644
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the principled capstone of the lane: Bayesian CL unifies the whole block (the posterior *is* the memory; the KL term *is* EWC's anchor; coresets *are* the replay buffer), and it contributes two ideas the other papers lack: (1) the natural-gradient update rule ĝ_μ = σ²·g_μ — move certain parameters *less*, uncertain ones *more* — the theoretical justification for certainty-weighted weekly updates; (2) Stein-gradient coresets — an O(M²) method to compress history into a small representative game set that approximates the full posterior, a better replay buffer than reservoir sampling.

## 1. Research question
In Bayesian continual learning (VCL), knowledge persists via (i) parameter posteriors q_{t−1} as priors, and (ii) coresets summarizing old data distributions. Can both be improved — (i) with natural gradients (steepest descent in distribution space, not parameter space), and (ii) with Stein gradients for coreset construction (cheaper than O(MN) Bayesian coresets)? Tested on permuted/split MNIST and split Fashion-MNIST with a mean-field BNN.

## 2. Dataset / schema
Permuted MNIST, split MNIST, split Fashion-MNIST. Model: Bayesian neural net, 2 hidden layers × 100 units, mean-field Gaussian posteriors, multi-head outputs for split tasks. 5 seeds. Coreset sizes: 200/task (permuted), 40/task (split) — same as VCL.

## 3. Method / model
- **VCL baseline (Eq. 1):** ℒ_VCL = E_{q_t}[log p(D_t|θ)] − KL(q_t‖q_{t−1}) — prior = previous posterior.
- **Gaussian natural gradients (GNG):** for exponential-family posteriors, F_β = ∇²_β a(η(β)) (Eq. 4); mean-field Gaussian gives F_{μ_i} = 1/σ_i², F_{v_i} = 2 (Eq. 5), so the natural gradient of the posterior mean is ĝ_{μ_i} = σ_i²·g_{μ_i} (Eq. 6) — *certain* parameters (small σ) move less. Adam's second-moment normalization compensates GNG's scale issues (Eqs. 7–8); the paper notes EWC-style Fisher penalties work *worse* with Adam than SGD because the natural-gradient/Adam combination duplicates fourth moments (Eq. 9) — a practical warning.
- **Stein coresets (§3):** iteratively transport M empirical samples toward the posterior via the SVGD update φ*(x) = (1/M)Σ_j [k(x^{(j)},x^{(l)})∇log p(x^{(j)}|θ) + ∇k] (Eqs. 10–11, RBF kernel) — O(M²), far cheaper than O(MN) Bayesian coreset methods.
- **Regret loss (Eq. 12):** ℒ_t = E[log p(D_t|θ)] + E[log p(C_{t−1}|θ)] − KL(q_t‖q_{t−1}) — coresets as a likelihood term, no separate predictive model needed.

## 4. Equations & assumptions
- ℒ_VCL(θ) = E_{q_t(θ)}[log p(D_t|θ)] − KL(q_t(θ)‖q_{t−1}(θ)). (Eq. 1)
- ∇̂ℒ(β) = ∇ℒ(β)·F_β^{−1}. (Eq. 3)
- ĝ_{μ_i} = σ_i²·g_{μ_i}; F_{μ_i} = 1/σ_i². (Eqs. 5–6)
- φ*(x_k^{(l)}) = (1/M)Σ_j [k(x_k^{(j)},x_k^{(l)})∇log p + ∇k]. (Eq. 11)
- ℒ_t = E_{q_t}[log p(D_t|θ)] + E_{q_t}[log p(C_{t−1}|θ)] − KL(q_t‖q_{t−1}). (Eq. 12)
Assumptions: mean-field Gaussian posteriors; KL(q_t‖q_{t−1}) tractable; coreset + current data jointly informative; RBF kernel suitable for Stein transport.

## 5. Features / target
28×28 grayscale images. Targets: digit/fashion class labels in permuted or split task sequences.

## 6. Validation design
VCL framework; optimizer comparison (SGD vs Adam vs SGD+GNG vs Adam+GNG) on a 1-D Bayesian linear-regression CL toy (Figure 2, parameter trajectories vs true task parameters); BNN benchmarks on the three MNIST variants (Figure 1, 5 seeds); coreset comparison (random vs K-center vs Stein) × usage (separate predictive model Eq. 2 vs regret loss Eq. 12).

## 7. Numerical results / baselines
- Permuted MNIST: GNG+Adam outperforms standalone Adam (Figure 1, left); no significant difference on split tasks — natural gradients help most when tasks *conflict* (permutations), less when they merely partition (splits).
- Coresets: the regret-loss usage (Eq. 12) beats the separate-predictive-model usage (Eq. 2) in general; **Stein coresets beat random and K-center coresets in most cases** (Figure 1, right).
- Optimizer interaction: EWC-type penalties + Adam < EWC + SGD in the authors' experience (Eq. 9 analysis) — a concrete caution for combining 1891's anchoring with adaptive optimizers.

## 8. Code / data availability
None stated. Benchmarks: MNIST / Fashion-MNIST (public).

## 9. Leakage & limitations
- Mean-field BNNs on MNIST are toy-scale; nothing validates GNG or Stein coresets on tabular GBMs or at NFL data scale.
- GNG's edge appears only on permuted (conflicting) tasks, not split tasks — NFL weeks are more "split" than "permuted," so the natural-gradient gain may not materialize.
- Stein coresets need a posterior to transport toward — in GSE's GBM world there's no posterior; the method needs a surrogate (e.g., bootstrap distribution).
- The Adam+EWC warning cuts both ways: if GSE's refit uses adaptive tree boosting, naive importance-anchoring may interact badly — test, don't assume.
- No calibration/uncertainty metrics reported — accuracy only.

## 10. GSE overlap
Per the existing-research map, online/continuous learning was commissioned-but-unfilled — no duplication. This is the lane's theoretical keystone: it *explains* 1891 (EWC ≈ VCL with point posteriors), *justifies* 1893's hierarchical shrinkage (ĝ = σ²g is exactly "shrink certain parameters less"... precisely, move them less), and *upgrades* 1888's buffer (Stein coresets ≈ optimal replay buffer). The regret-loss objective (Eq. 12) unifies the block into one weekly-refit loss: new-week likelihood + coreset likelihood + KL anchor.

## 11. GSE implementation spec
- **Certainty-weighted weekly updates (Eq. 6 analog):** maintain a per-team (or per-feature-effect) uncertainty estimate — e.g., posterior variance from a small Bayesian linear layer on top of the GBM, or bootstrap spread of team adjustments (1893's overlay). Weekly update rule: Δ_i ∝ σ_i²·gradient_i — teams/effects we're *certain* about move little; uncertain ones adapt fast. This replaces 1893's flat gating with the paper's principled rule and explains *why* 1891's importance anchoring works.
- **Stein coreset replay buffer:** replace reservoir sampling with a Stein-style coreset: maintain ~200 historical games selected to approximate the full-history gradient field — greedy forward selection maximizing kernelized gradient coverage (the computable cousin of Eq. 11 without a BNN posterior: use GBM leaf-gradient embeddings + RBF kernel). Refresh quarterly. This is the "optimal small buffer" for the 1888/1890 refit objectives.
- **Unified weekly objective (Eq. 12 analog):** ℒ_week = logloss(new week) + logloss(Stein coreset) + λ·KL-ish anchor on team adjustments (1891's per-feature penalty). One loss, three terms, each from a different ledger in this block.
- **Optimizer caution:** if the refit uses Adam-style adaptive methods anywhere, test anchoring under both SGD-like and adaptive optimizers — the paper's Eq. 9 warning says the combination can silently degrade.

## 12. Reproducible test
Dataset: nflverse 2015–2025, game-level features, home-win target; walk-forward 2020–2025. Arms: (A) weekly refit + reservoir buffer (1888 P2), (B) A with certainty-weighted updates (per-team bootstrap σ² scaling), (C) B with Stein coreset buffer (200 games) replacing the reservoir, (D) C + unified objective (Eq. 12 analog). Metrics: 1887's 4-metric suite. Gate: each successive arm must beat its predecessor on ≥2 of 4 metrics with no metric worse by >0.001; (C) specifically must beat (A)'s buffer on worst-week Brier by ≥0.002 (the coreset's claim is stability).

## 13. Acceptance / rejection gate
ADOPT certainty-weighted updates if (B) beats (A) on ≥2 of 1887's 4 metrics with worst-week Brier improving ≥0.001 — the mechanism is cheap (one bootstrap per week) so the bar is low. ADOPT the Stein coreset buffer if (C) beats the reservoir buffer on worst-week Brier by ≥0.002 *and* on anytime Brier (a better small buffer should win everywhere, per the paper's "most cases"). ADOPT the unified objective (D) only if it beats (C) on ≥3 of 4 metrics — three-term losses invite tuning pathologies. REJECT GNG-style natural gradients proper (no BNN, no gain on split-like tasks); REJECT Stein coresets if greedy kernel selection shows no edge over stratified reservoir after one quarterly refresh (then 1888's E-BRS stands).

## 14. Improvement experiment
Close the Bayesian loop: replace the bootstrap-σ² surrogate with a *real* (approximate) posterior — fit a small Bayesian logistic layer (Laplace approximation, diagonal Hessian) on the GBM's top features each week, giving genuine σ_i per effect, and run the update with true natural gradients ĝ = σ²g. Hypothesis: the Laplace-natural-gradient update beats the bootstrap surrogate specifically in early-season weeks (1–4), where uncertainty is highest and the σ² scaling matters most — test on weeks 1–4 Brier, 2020–2025. If confirmed, GSE's weekly update becomes genuinely Bayesian, and this paper's full machinery — not just its analogies — is in production.
