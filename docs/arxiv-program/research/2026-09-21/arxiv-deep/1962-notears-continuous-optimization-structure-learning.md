# [1962] DAGs with NO TEARS: Continuous Optimization for Structure Learning (arXiv:1803.01422)

**Citation:** Xun Zheng, Bryon Aragam, Pradeep Ravikumar, Eric P. Xing (2018). *DAGs with NO TEARS: Continuous Optimization for Structure Learning*. arXiv:1803.01422. URL: https://arxiv.org/abs/1803.01422
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, stripped to plain text; all 6 sections + appendices referenced).
**Verdict:** ADAPT

## 1. Research question
Can score-based DAG structure learning — traditionally a combinatorial, NP-hard search over the superexponential space of DAGs — be reformulated as a purely continuous optimization problem over real matrices, so that standard smooth numerical solvers (L-BFGS, proximal quasi-Newton) can be applied without any combinatorial acyclicity-enforcement machinery?

## 2. Dataset / schema
All experiments on synthetic data plus one real benchmark:
- Synthetic: random DAGs from Erdös-Rényi (ER-k) and scale-free (SF-k, k·d expected edges) generators; d ∈ {10, 20, 50, 100}; n ∈ {20, 1000} i.i.d. rows. SEM: X = W^T X + z with uniform random edge weights; noise z from three models — Gaussian, Exponential, Gumbel. Schema: n×d numeric data matrix X.
- Real: Sachs et al. (2005) protein-signaling flow-cytometry data — n = 7466, d = 11, 20-edge consensus "gold standard" network; public benchmark.
Access: synthetic (self-generated, described in Appendix D); Sachs data is public.

## 3. Method / model
NOTEARS (Non-combinatorial Optimization via Trace Exponential and Augmented lagRangian for Structure learning):
1. Replaces combinatorial constraint G(W) ∈ DAGs with smooth equality constraint h(W) = tr(e^{W∘W}) − d = 0 (Theorem 1; W∘W = Hadamard product, e^A = matrix exponential).
2. Solves the equality-constrained program (ECP): min_W F(W) = (1/2n)||X − XW||_F^2 + λ||W||_1 s.t. h(W) = 0, via the **augmented Lagrangian** method: iterate (a) solve unconstrained primal W_{t+1} ← argmin_W L^ρ(W, α_t) with L^ρ = F + (ρ/2)|h|^2 + αh, choosing ρ so h(W_{t+1}) < c·h(W_t) (c ∈ (0,1)); (b) dual ascent α_{t+1} ← α_t + ρ·h(W_{t+1}); (c) stop when h < ε (e.g. 1e-8); typically < 10 outer iterations.
3. Unconstrained subproblems solved with L-BFGS (λ=0) or proximal quasi-Newton with closed-form coordinate updates via soft-thresholding S(c − b/a, λ/a) (λ>0); active-set shrinking keeps cost O(m²|S| + m³ + m|S|T) with L-BFGS memory m ≪ p, T ≈ 10 inner iterations.
4. Final hard threshold ω: zero all |w| < ω ("rounds" the numeric solution to a strict DAG).
Key properties: global updates of the full W each step (no bounded in-degree/treewidth assumption), model-agnostic score (extends to logistic GLMs for binary variables), ~50 lines of Python. Code: https://github.com/xunzheng/notears.

## 4. Equations & assumptions
- Least-squares score: ℓ(W; X) = (1/2n)||X − XW||_F² (eq. 2 with ℓ1); claimed (citing van de Geer & Bühlmann 2013; Aragam et al. 2016; Loh & Bühlmann 2014) that the LS minimizer provably recovers the true DAG w.h.p. in finite samples and high dimensions (d ≫ n), Gaussian and non-Gaussian, implying faithfulness is NOT required.
- Acyclicity characterization (Theorem 1): h(W) = tr(e^{W∘W}) − d = 0 ⟺ W is a DAG. Gradient: ∇h(W) = (e^{W∘W})^T ∘ 2W (eq. 8). Proof via counting closed walks: tr B^k counts length-k closed walks; matrix exponential re-weights by 1/k!; h(W) ≥ 0 always; h quantifies "DAG-ness" (cycle count/severity).
- Assumptions: data i.i.d. from a linear SEM (or GLM); acyclic ground truth; nonconvexity accepted (stationary points only, not global optima). Matrix-exponential evaluation is O(d³) per iteration.

## 5. Features / target
Inputs: raw n×d data matrix X (each column a variable). Target: the weighted adjacency matrix W (d×d) encoding both causal structure (nonzero pattern) and parameters (weights). No explicit feature/target split — unsupervised structure learning; binary variant via logistic regression.

## 6. Validation design
No train/test splits on held-out data — validation is against ground-truth graphs: structural Hamming distance (SHD) and false discovery rate (FDR) to the true graph (lower better); FGS outputs a CPDAG so conversion details in Appendix D.1. Baselines: fast greedy search / GES (FGS, Ramsey et al. 2016), PC algorithm (Spirtes et al. 2000), LiNGAM (Shimizu et al. 2006). PC and LiNGAM dropped from plots — "accuracy significantly lower". Splits are not time-ordered (i.i.d. simulation).

## 7. Numerical results / baselines
- SHD (Figure 3): NOTEARS beats FGS uniformly; gap widest on denser scale-free (SF-4) graphs and larger d; ℓ1 helps at n=20. Exact SHD numbers only in figures (not quoted in text) — paper states FGS competitive at ER-2, "rapidly deteriorates" at SF-4, NOTEARS shows "significant improvements", consistent across all three noise models.
- Global-optimum comparison (Table 1, d=10, GOBNILP exact minimizer; Δ = F(W_G) − F(Ŵ), i.e. NOTEARS minus global): e.g. n=20, λ=0, ER2: F(Ŵ)=5.36 vs F(W_G)=3.85 (Δ=−1.52); n=1000, λ=0, ER2: 5.02 vs 4.97 (Δ=−0.05); n=1000, λ=0, SF4: 5.05 vs 4.94 (Δ=−0.11); ||Ŵ − W_G|| as small as 0.02–0.04 at n=1000. Paper's claim: stationary points "very close to the global minimizer in practice".
- Sachs real data: FGS estimated 17 edges with SHD=22; NOTEARS estimated 16 edges with SHD=22 (tie on SHD, fewer edges).

## 8. Code / data availability
Code: https://github.com/xunzheng/notears (stated, open-source). Synthetic generator parameters in Appendix D; Sachs data public. No downloadable datasets from the paper itself.

## 9. Leakage & limitations
Adversarial notes: (1) Validation is in-sample against simulation ground truth, not held-out prediction — standard for structure learning but offers no direct measure of downstream value. (2) Linear SEM with least squares; sports indicators are nonlinear (a follow-up paper — NOTEARS-MLP — exists, and 2104.05441 "Unsuitability of NOTEARS" warns the method fails when varsortability/noise-variance structure is adversarial: score-based linear DAG learners can just recover variance order, a known critique). (3) O(d³) per iteration via matrix exponential — fine at d≈30–100 sports indicators, not at play-level feature scale. (4) i.i.d. assumption — sports data is autocorrelated; NOTEARS on pooled team-weeks without time modeling will confuse lagged effects with contemporaneous ones. (5) Only stationary points; local minima risk unquantified on real data. (6) Threshold ω chosen fixed/suboptimal per the authors themselves. (7) Sachs tie at SHD=22 suggests limited real-world lift on noisy human data.

## 10. GSE overlap
New capability — the existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) covers "causal inference" only as a brief topic (player-level injury effect estimation is "thin"); FineCausal (2503.23911) is effect estimation, not structure learning. No NOTEARS / causal graph learning anywhere in Garrett's corpus. GSE currently engineers features by judgment (EPA components, pressure rates, market features); no principled causal graph over indicators exists. This is an extension (a principled pre-filter for the feature stack), not a duplicate.

## 11. GSE implementation spec
- Data: nflverse team-week panel, 2015–2026 regular seasons (≈32 teams × 18 weeks × 12 seasons ≈ 6900 team-weeks; subsample to one row per team-week per season for quasi-independence, or use DYNOTEARS extension for explicit lags — see ledger 1963 candidates).
- Nodes (~35): EPA/play, success rate, dropback EPA, rush EPA, pressure rate allowed/generated, sack rate, turnover rate, explosive-play rate, 3rd-down conv., red-zone TD%, pace, pass rate over expected, rest days, travel distance, QB EPA, injury counts (QB/OL/skill), market spread/total, DVOA-style priors.
- Model: NOTEARS (xunzheng/notears) with ℓ1 λ tuned by BIC; scale NOTEARS-MLP variant for nonlinearity once linear baseline works. Threshold ω via stability selection across bootstrap resamples (addresses the authors' ω limitation).
- Training: run per-season on team-weeks; compute edge-stability (fraction of bootstrap graphs containing each edge); keep edges with stability ≥ 0.6.
- Serving: the graph is an offline quarterly artifact, not a live service. Downstream: prediction stack uses only Markov-blanket-of-target features (parents/children/spouses of spread-cover indicator); confounded leaves pruned.
- Effort: ~2 engineer-days (open code, O(d³) at d=35 trivial).

## 12. Reproducible test
Dataset: nflverse team-week panel 2015–2023 (train graph), 2024–2025 (held-out prediction test). Baseline: GSE's current full feature set in the game-outcome logistic model. Treatment: same model restricted to features in the NOTEARS Markov blanket of the target (spread-cover indicator). Metrics: held-out Brier score and log-loss; feature count ratio. Protocol: 5-fold season-blocked CV on 2015–2023 for graph learning; test once on 2024–2025.

## 13. Acceptance / rejection gate
ADOPT the graph-pruned feature set if ALL hold: (a) held-out Brier on 2024–2025 with ≤60% of features is within 0.002 of the full-feature baseline (parity), or better; (b) learned-edge Jaccard similarity across season-blocked folds ≥ 0.5 (stability); (c) the graph's directed edges respect known football directionality on ≥80% of high-confidence edges (e.g. pressure rate → sack rate → defensive EPA, not reversed). Reject if Brier worsens by >0.003 or stability < 0.5.

## 14. Improvement experiment
Beyond the paper: DYNOTEARS-style dynamic extension (learn W (contemporaneous) + A (lagged) jointly from team-week sequences) plus NOTEARS-MLP for nonlinear edges; then compare linear vs nonlinear graph stability. Hypothesis: lag-aware graphs will flip several contemporaneous NOTEARS edges (e.g. "defensive EPA → offensive EPA" becoming "last-week defensive EPA → this-week offensive EPA" only), and the nonlinear variant will surface threshold effects (e.g. pressure rate only matters above ~30%) that linear NOTEARS misses — each checkable against the acceptance gate's stability metric.
