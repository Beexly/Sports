# [1990] Model-based Asynchronous Hyperparameter and Neural Architecture Search (arXiv:2003.10865)

**Citation:** Aaron Klein, Louis Tiao, Thibaut Lienart, Cedric Archambeau, Matthias Seeger (2020). *Model-based Asynchronous Hyperparameter and Neural Architecture Search*. arXiv:2003.10865. URL: https://arxiv.org/abs/2003.10865
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADAPT — joint GP over (configuration × fidelity) with asynchronous scheduling and free fantasizing of pending evaluations is the right HPO scheduler for GSE's parallel offseason search; the synchronous alternatives it beats are what most teams actually run.

## 1. Research question
Hyperband/BOHB are synchronous (stop/promote decisions wait for all jobs at a rung), which wastes wall-clock when configs have heterogeneous runtimes — typical in joint hyperparameter + architecture search. Can a model-based asynchronous multi-fidelity method combine async Hyperband's scheduling with GP-based BO's sample efficiency?

## 2. Dataset / schema
Benchmarks: tabular data tasks, image classification, NAS-Bench-101. No sports data. Metric: immediate regret r_t = y_t − y* (y* = best observed validation error across all methods/runs/timesteps) vs wall-clock time; mean ± SEM across runs.

## 3. Method / model
- **Joint GP surrogate** over (x, r): models correlations ACROSS fidelities (vs BOHB's independent TPE per fidelity). Exponential-decay kernel across resource levels (following prior async-BO work).
- **Asynchronous scheduling:** workers never wait at sync points; when a worker frees, a bracket s is sampled from P(s) ∝ (K+1)/(K−s+1) · η^(K−s), and the next (config, rung) is chosen by the acquisition function.
- **Pending evaluations via fantasizing** (Snoek et al.): marginalize the acquisition over the GP posterior predictive of in-flight configs; nearly free because the GP posterior covariance doesn't depend on observed values (only inputs) while kernel hyperparameters are fixed.
- Halving rate η = 3 in experiments.

## 4. Equations & assumptions
- Objective: x* ∈ argmin f(x), observed y_i = f(x_i) + ε_i, ε_i ~ N(0, σ²).
- Bracket sampling: P(s) ∝ (K+1)/(K−s+1) · η^(K−s).
- Immediate regret: r_t = y_t − y*.
- Assumptions: GP with exponential-decay fidelity kernel captures cross-fidelity correlation; fantasized acquisitions approximate the true marginalized acquisition.

## 5. Features / target
Inputs: hyperparameter vectors + neural architectures (NAS-Bench-101 cells) + fidelity rung. Target: validation error.

## 6. Validation design
Wall-clock regret curves vs: random search, standard BO, ASHA, Hyperband, BOHB, and async-HB variants. Tabular + image + NAS-Bench-101 tasks. Multiple runs, SEM reported.

## 7. Numerical results / baselines
No exact numbers extracted from converted text (regret curves in figures). Reported findings: the method shows strong anytime performance across tabular, image, and NAS benchmarks; ASHA is "slower at promoting any configuration to higher resources" and "may initially promote suboptimal ones"; ranking correlations between architectures at <100 epochs vs full 200 epochs are small (citing Dong et al.), and random NAS configs are often decent — both observations temper how much early-fidelity promotion should be trusted.

## 8. Code / data availability
"Framework which will be open sourced along with this publication" (stated). NAS-Bench-101 public. Exact repo URL not extracted — verify.

## 9. Leakage & limitations
- Adversarial notes: (1) No numeric tables in this read — effect sizes unverified. (2) GP surrogate scales cubically; at GSE's config counts (hundreds) it's fine, but thousands of configs need sparse approximations. (3) The small early-vs-full fidelity rank correlation (Dong et al.) is a double-edged sword: it justifies the paper's model-based promotion, but also warns that ANY fidelity-based early decision is noisy — connects to ledger 1988's 1-epoch finding. (4) Exponential-decay fidelity kernel is a strong parametric assumption about how performance improves with resources.

## 10. GSE overlap
New scheduler capability — GSE's HPO has no async multi-fidelity scheduler. Natural composition with ledgers 1986 (FastBO's per-config efficient points could define the rungs), 1987 (CQR could replace the GP surrogate inside this async framework), and 1988 (the 1-epoch baseline this must beat). The joint (config × seasons) model is the formal version of ledger 1984's lookback-window fidelity.

## 11. GSE implementation spec
- **Async offseason HPO service:** N workers (VM cores / GPUs) pull (config, fidelity) tasks from a queue; fidelity r = training seasons (2 → 4 → 8 → full). Joint GP (or CQR-surrogate, per ledger 1987) over (config, seasons); bracket sampling per the paper's P(s); fantasize pending evaluations.
- **Why async matters for GSE:** model families have heterogeneous runtimes (CatBoost fast, FT-Transformer slow) — synchronous halving would idle workers waiting for the slowest family.
- **Effort:** ~1-2 weeks (scheduler + queue + surrogate); reuses the HPO loop.

## 12. Reproducible test
Dataset: nflverse game-level tabular, ATS cover, 2015–2025; mixed config space (LightGBM/CatBoost/MLP, 150 configs); 8 workers. Compare wall-clock regret: (a) this async joint-GP method, (b) synchronous BOHB, (c) ASHA, (d) ledger-1988's 1-epoch+top-3 baseline. Metric: best log-loss on 2024–2025 vs wall-clock hours.

## 13. Acceptance / rejection gate
**ADOPT if:** the async method reaches the synchronous-BOHB final log-loss in ≤60% of the wall-clock time with 8 workers, AND beats the 1-epoch baseline's final log-loss by ≥0.001 (otherwise the complexity isn't justified — per ledger 1988's discipline). **REJECT if:** worker idle time is already low (homogeneous runtimes make async pointless), or the joint GP's cross-fidelity correlation is miscalibrated (check: predicted vs actual full-fidelity performance of promoted configs, R² < 0.5).

## 14. Improvement experiment
Replace the GP with the CQR surrogate from ledger 1987 inside the async scheduler, keeping the bracket-sampling and fantasizing machinery (fantasizing needs a posterior predictive — use the CQR conformal intervals as the fantasized distribution). Hypothesis: heteroskedastic-aware surrogate + async scheduling beats either alone. Test on the same 8-worker reproducible test; success = reaches target regret faster than both parents.
