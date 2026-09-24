# [1973] DAGs with No Curl: Learning DAGs via Hodge Decomposition (arXiv:2106.07197)

**Citation:** Yue Yu (Lehigh), Tian Gao (IBM Research), Naiyu Yin, Qiang Ji (RPI) (2021). *DAGs with No Curl: Learning DAGs via Hodge Decomposition*. ICML 2021. arXiv:2106.07197. URL: https://arxiv.org/abs/2106.07197
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; abstract, §§1–4 theory, §5 experiments, supplement tables referenced).
**Verdict:** ADAPT

## 1. Research question
NOTEARS-style continuous DAG learning solves constrained optimization with iterative subproblems (augmented Lagrangian) — slow. Can we learn in the DAG space *directly*, without acyclicity constraints, by exploiting the equivalence between DAG weighted-adjacency matrices and gradients of graph potential functions?

## 2. Dataset / schema
- Linear SEM: ER/SF random graphs (k expected edges), uniform random edge weights, n=1000 i.i.d. samples, X = (A⁰)ᵀX + Z, Z Gaussian or Gumbel. 100 trials per graph-noise combo.
- Nonlinear SEM: three cases with identifiable additive-noise models (Peters et al. 2014 — no Markov equivalence), neural base models (DAG-GNN backbone for NoCurl; vs NOTEARS-MLP, GraN-DAG).
- Real: Sachs et al. 2005 protein-signaling network (expression levels of proteins/phospholipids).
- Metrics: SHD (accuracy), ΔF = F(Ã,X) − F(A⁰,X) (optimization quality), CPU seconds.

## 3. Method / model
DAG-NoCurl, two steps:
1. Find an initial *cyclic* solution: unconstrained optimization with the same loss as NOTEARS (least squares; L-BFGS) — no acyclicity constraint at all.
2. Hodge decomposition: project the cyclic graph onto the gradient of a potential function. Theorem: the set of DAG weighted-adjacency matrices ≡ the set of weighted gradients of graph potential functions, so this projection lands in DAG space directly. Threshold small edges (for false-discovery removal only — unlike NOTEARS, the solution is already a DAG, no rounding-to-acyclicity needed).
- Key theoretical point: with the same loss and the equivalence of the DAG space, the global minimizer of full DAG-NoCurl is the *same* as NOTEARS' — it's a faster route to the same optimum, not a different objective.

## 4. Equations & assumptions
- A = {relu(Y)} (weighted adjacency from skew-symmetric flow Y); Hodge decomposition Y = gradient + curl + harmonic components; DAG ⟺ curl-free (gradient of potential).
- Loss: F(A,X) = (1/2n)||X − AᵀX||_F² (+ optional smooth L1; paper finds L1 adds little — thresholding suffices, mirroring NOTEARS).
- ΔF metric; SHD. Assumptions: linear SEM or identifiable additive-noise nonlinear SEM; i.i.d. samples; faithfulness.

## 5. Features / target
Same as NOTEARS: raw observational matrix X in, weighted DAG adjacency out.

## 6. Validation design
- Linear: SHD + CPU time vs FGS, MMPC, NOTEARS across ER/SF × Gaussian/Gumbel, 100 trials each, log-scale plots with standard errors.
- Nonlinear: NoCurl+DAG-GNN vs DAG-GNN, NOTEARS-MLP, GraN-DAG across three nonlinear cases and variable sizes.
- Real: Sachs protein network recovery. No time-ordered splits (i.i.d. benchmarks).

## 7. Numerical results / baselines
- Linear: "NoCurl requires a similar runtime as FGS and MMPC, which is faster than NOTEARS by more than one or two orders of magnitude"; accuracy comparable — NoCurl-2 lowest SHD on ER-Gaussian, NoCurl-1 lowest on SF4-Gumbel.
- Nonlinear: NoCurl ≈ DAG-GNN accuracy but 3–4× faster; >1 order of magnitude faster than NOTEARS-MLP and GraN-DAG. Best overall in Nonlinear Case 2; beats NOTEARS-MLP in Case 1 (loses to GraN-DAG); loses to NOTEARS-MLP in Case 3 but "much better than GraN-DAG."
- Caveat stated: "NoCurl's performance is limited by the base model" (inherits DAG-GNN's accuracy ceiling).

## 8. Code / data availability
Code: https://github.com/fishmoon1234/DAG-NoCurl ("will be publicly released" — verify live before depending on it). Sachs data public.

## 9. Leakage & limitations
Adversarial notes: (1) Same statistical assumptions as NOTEARS — speed doesn't fix identifiability, nonconvexity, or the linear-SEM faithfulness requirements; the global-minimizer equivalence cuts both ways (same optimum, same failure modes). (2) Nonlinear accuracy capped by the base model (DAG-GNN); Case 3 loses to NOTEARS-MLP. (3) i.i.d. only — no time-series/native lag handling; for GSE panels it inherits ledger 1962's static-snapshot limitation. (4) Threshold choice still heuristic. (5) Code release was pending at publication — confirm the repo exists before building on it.

## 10. GSE overlap
Direct upgrade of ledger 1962 (NOTEARS), not a new lane — and that's exactly its value: if GSE prototypes the continuous-optimization lane on NOTEARS, DAG-NoCurl is the drop-in production replacement (same optimum, 10–100× faster), which matters because the refresh cadence (weekly team panels) makes NOTEARS' augmented-Lagrangian cost the binding constraint. The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has nothing on Hodge-decomposition DAG learning. Extension of 1962, not duplicate.

## 11. GSE implementation spec
- Mirror ledger 1962's spec exactly (team-season static snapshot, ~35 indicators, least-squares loss), but swap the NOTEARS solver for the two-step NoCurl procedure: unconstrained L-BFGS → Hodge projection → threshold.
- Nonlinear variant: NoCurl + DAG-GNN backbone for the nonlinear driver set (complements ledger 1970's DeepAR-Knockoffs as a second nonlinear method).
- First verify https://github.com/fishmoon1234/DAG-NoCurl is live; if not, implement from §4 (the two steps are fully specified).
- Effort: ~2 engineer-days given 1962's scaffolding (solver swap only).

## 12. Reproducible test
Dataset: same as ledger 1962's test (synthetic football-like linear SEM with known DAG + team-season snapshot). Protocol: NOTEARS (1962) vs DAG-NoCurl on identical data. Metrics: (a) SHD parity — NoCurl SHD within 10% of NOTEARS SHD (replicating "comparable accuracy"); (b) wall-clock speedup ≥10× (replicating "one or two orders of magnitude"); (c) ΔF gap — NoCurl's optimization score within noise of NOTEARS'. 

## 13. Acceptance / rejection gate
ADOPT DAG-NoCurl as the production continuous-optimization solver if: (a) SHD within 10% of NOTEARS on synthetic; (b) ≥10× wall-clock speedup on the 35-indicator panel; (c) Sachs-style sanity check (or football equivalent: recovers known edges like EPA→win) passes. Reject if speedup <5× (not worth the solver swap) or SHD degrades >15% (the projection step is lossy on our data geometry) — in which case keep NOTEARS for accuracy and eat the cost.

## 14. Improvement experiment
Beyond the paper: *time-series* NoCurl — apply the Hodge projection to a lag-augmented cyclic solution (VAR-style, as in DYNOTEARS). The paper only does i.i.d.; nothing in the theory forbids a lagged design matrix. Hypothesis: lag-augmented NoCurl gives DYNOTEARS-quality time-series DAGs at NoCurl speed, which would obsolete the slowest part of ledger 1963's pipeline (GPDC) for the linear case. Testable on synthetic VAR data with known lagged ground truth: compare lag-NoCurl vs DYNOTEARS vs PCMCI+ParCorr on SHD and runtime.
