# [0548] Entrywise Error Bounds for Spectral Ranking with Semi-Random Adversaries (arXiv:2605.23854v1)

**Citation:** Lee, D., Makur, A., & Singh, J. (2026). *Entrywise Error Bounds for Spectral Ranking with Semi-Random Adversaries*. Purdue University. arXiv:2605.23854v1. URL: https://arxiv.org/abs/2605.23854v1
**Ledger completed:** 2026-09-21. **Read:** full text §§1–6 + references; appendices B–C (proofs) skimmed.
**Verdict:** ADAPT — entrywise (ℓ_∞) theory for spectral BTL ranking under non-uniform matchup graphs, plus a reweighting scheme that restores Erdős-Rényi-like guarantees. Directly relevant: the NFL schedule is exactly a "semi-random-like" non-uniform comparison graph (dense intra-division blocks, sparse inter-division edges), and the paper's MMWU edge reweighting ports to GSE's spectral power-rating components.

## 1. Research question
Spectral BTL estimation (rank centrality) is known to be ℓ_∞-optimal under *uniform* Erdős-Rényi comparison graphs (Chen et al. 2019), but real comparison data is clustered and non-uniform. The paper asks: can entrywise guarantees be extended to a **semi-random adversary** model (each edge sampled independently with probability q_ij ∈ [p, 1] — the adversary can *boost* edge density), which includes stochastic block models? And can edge reweighting undo the adversary's damage to the spectral gap and recover ER-like error bounds?

## 2. Dataset / schema
- **No empirical dataset — theory + synthetic simulations.** Simulations: (1) 3-block SBM with block edge-probability matrix P = [[1,1,0],[1,2log n/n,2log n/n],[0,2log n/n,2log n/n]], n ∈ {30,…,135}, 25 repetitions, median reported; (2) Erdős-Rényi with p = 2log(n)/n.
- **Schema (theory):** n items; latent scores α_i > 0 with dynamic range max α_i/min α_i ≤ h; BTL probabilities p_ij = α_j/(α_i+α_j); semi-random observation graph with base probability p; k comparisons per observed pair; empirical win rates p̂_ij; canonical Markov matrix S_ij = p_ij/d (d = d_max), empirical Ŝ; spectral estimate π̂ = stationary distribution of Ŝ.

## 3. Method / model
**Unweighted analysis.** Theorem 3.1: under a variation condition nΣ_j q_ij² ≤ s(Σ_j q_ij)² and a spectral-gap condition P(1−|λ_2(S)| ≤ γ) ≤ n^{−5}, rank centrality achieves ER-like entrywise error. Corollary 3.2 recovers Chen et al. 2019. Proposition 3.4: assortative SBMs with np ≥ c_0 log^5(n) and q_m ≤ r·p preserve the spectral gap (via Löwe & Terveer 2025 SBM spectra + a comparison theorem), hence attain ER-like bounds. Key phenomenon: adding edges can *reduce* the normalized Laplacian's spectral gap (Braess paradox; Eldan et al. 2017) — more data ≠ better spectral ranking.
**Weighted rank centrality (§4).** Assign symmetric edge weights w_ij ∈ [0,1]; weighted Markov matrix S_ij = p_ij w_ij/d. Theorem 4.1: generic ℓ_∞ bound depending only on the weighted Fiedler value λ_{n−1}(L^W). **Monotone coupling** (Def. 5.2, Lemma 5.3): a semi-random graph contains an ER-like subgraph w.h.p., so reweighting (continuous relaxation of subgraph selection) can restore spectral properties. Weights found by the **MMWU** SDP (Yang et al. 2024, Algorithm 2) — a 1/2-approximation in near-linear time. Theorem 4.2: MMWU-weighted spectral method on semi-random graphs achieves ≤ c_1√(log n/(npk)) + c_2√(n log n/((np)³k)); Corollary 4.3: for np ≥ c√n, the bound is ER-optimal, C√(log n/(npk)).
**Proof machinery:** leave-one-out error decomposition (Chen et al. 2019), with the leave-one-out matrix replacing node-m rows by their expectations p_ij q_ij (handling non-identical edge distributions); Hoeffding/Bernstein concentration; matrix concentration (Tropp 2015) for the weighted case.

## 4. Equations & assumptions
- Semi-random model: edge (i,j) sampled independently with q_ij ∈ [p, 1]; connectivity needs np ≥ c_0 log(n).
- Theorem 3.1: ‖π̂−π‖_∞/‖π‖_∞ ≤ (c_1/γ + c_2)√(log(n)/(npk)), w.p. ≥ 1−O(n^{−5}), for np ≥ c_0 log(n), k ≥ 5.
- Proposition 3.4 (SBM): same bound under np ≥ c_0 log^5(n), q_m ≤ r·p.
- Theorem 4.1 (generic weights): ‖π̂−π‖_∞/‖π‖_∞ ≤ c_1/λ_{n−1}(L^W)·√(n log(n) p/k) + c_2/λ_{n−1}(L^W)²·√(n² log(n) p²/k) + c_3/λ_{n−1}(L^W)³·√(n⁴ log(n) p³/k).
- Theorem 4.2 (MMWU): ‖π̂−π‖_∞/‖π‖_∞ ≤ c_1√(log n/(npk)) + c_2√(n log n/((np)³k)); Corollary 4.3 (np ≥ c√n): ≤ C√(log n/(npk)).
- Weighted Laplacian: L_w = Σ_{(i,j),i<j} w_ij(e_i−e_j)(e_i−e_j)^T; Fiedler value λ_{n−1}(L^W) = min_{v⊥1} v^TL^Wv/‖v‖²_2.
- **Stated assumptions:** (1) score dynamic range bounded by constant h; (2) uniform base probability p > 0 for every edge (adversary can only *boost*); (3) k comparisons per pair (uniform); (4) spectral gap lower bounded by constant γ w.h.p. (unweighted) — the paper's whole point is that this can fail; (5) for the weighted guarantee, degree constraints d_min ≥ 1, d_max ≤ 2np and the weighted graph must be connected; (6) Experiment 1's SBM deliberately violates the theory's assumptions (p = 0 allowed) yet reweighting still works empirically.

## 5. Features / target
- **Inputs:** observed pairwise comparison outcomes on a (possibly non-uniform) comparison graph.
- **Targets:** entrywise-accurate normalized BTL score vector π (ℓ_∞ error — the metric that matters for top-K ranking and per-team confidence).

## 6. Validation design
- Two simulation experiments (described above), 25 runs each, median metrics: spectral gap of unweighted vs MMWU-weighted canonical Markov matrix, and relative ℓ_∞ error, as functions of n. Experiment 1 (heterogeneous SBM): weighted keeps spectral gap ≈ 0.07 while unweighted decays 0.03 → 0.01; weighted ℓ_∞ error drops to ≈ 0.46 vs ≈ 0.48 at n = 135; weight heatmap shows dense block downweighted, sparse block upweighted — reweighting normalizes degrees. Experiment 2 (ER): reweighting helps spectral gap slightly but doesn't improve error — as expected, since the graph is already ER.

## 7. Numerical results / baselines
Baseline = unweighted rank centrality. On the heterogeneous 3-block SBM: weighted beats unweighted in both spectral gap (constant ≈ 0.07 vs decaying to ≈ 0.01) and ℓ_∞ error (≈ 0.46 vs ≈ 0.48 at n = 135). On ER graphs: no significant difference (error ≈ 0.4–0.415 for both) — reweighting is harmless but unnecessary. No real-world data; no MLE comparison beyond theory.

## 8. Code / data availability
Python implementation mentioned (MMWU via the greedy 1/2-approximation oracle of Yang et al. 2024, Theorem 5); **no public repo, code, or data released** — "primarily theoretical in nature" (authors' own framing).

## 9. Leakage & limitations
- **No real data experiment:** the SBM simulations are toy-scale (n ≤ 135) and deliberately violate the theory's own assumptions (p = 0); no sports/chess/LLM-arena validation.
- **Entrywise bounds need dense graphs:** the ER-optimal bound requires np ≥ c√n (Corollary 4.3) — for n = 32 NFL teams that means average degree ≳ 6 vs the actual 17-game schedule; the theory doesn't cover the NFL's sparse-but-fixed regime (though §6 suggests the method works beyond the assumptions).
- **Fixed, adversarial-free NFL schedule:** the semi-random model assumes *random* edge sampling with a base probability; the NFL schedule is deterministic and adversarial-free — the monotone-coupling justification doesn't literally apply, though the reweighting mechanics do.
- **Uniform k per pair assumed;** NFL teams play each opponent at most once per season (k = 1 or small) — the bound's k → small-sample behavior is fine asymptotically but constants will be loose.
- **Only connected weighted graphs** are covered; MMWU weights must be recomputed per season as the schedule changes.
- **SBM result needs np ≥ c_0 log^5(n)** (from the Löwe & Terveer 2025 black box) — likely not tight, authors admit.

## 10. GSE overlap
Per the existing-research map: ledgers 0542/0544/0546/0547 cover BT estimation, regularization, and Elo tracking, but **all assume either uniform/fixed comparison graphs or analyze per-pair MLE**. **No existing entry addresses non-uniform comparison-graph structure for spectral ranking** — the NFL's divisional block structure (dense intra-division, sparse inter-division = exactly an assortative SBM) is unaddressed. Ledger 0546's top-K certification and 0542's BT rankings would both inherit better per-team error from reweighted spectral estimates. Verdict: **extension** — first graph-structure-aware spectral ranking theory in the corpus, with a concrete reweighting algorithm.

## 11. GSE implementation spec
1. **MMWU-reweighted spectral power rating for NFL.** Port: build the season's comparison graph (nodes = 32 teams, edges = games played, k = games per pair); run the MMWU SDP (or a greedy degree-normalizing heuristic approximating it, since no code is released) to get edge weights w_ij maximizing λ_{n−1}(L^W); compute rank-centrality scores on the weighted graph. Expect the weights to downweight intra-division games (overrepresented block) and upweight inter-division/inter-conference games — directly counteracting the known "divisional echo chamber" bias in power ratings. Effort: ~3 days (SDP via cvxpy for n = 32 is trivial scale).
2. **Spectral-gap diagnostic for rating confidence.** Port the paper's central insight: report λ_{n−1}(L^W) (or 1−|λ_2(S)|) alongside GSE's weekly ratings as a "schedule connectivity" health metric — when it dips (early season, unbalanced schedules), widen per-team confidence intervals per Theorem 4.1's 1/λ dependence. Effort: ~1 day.

## 12. Reproducible test
- **Dataset:** nflverse 2015–2024; per season, build the comparison graph from games played through each week.
- **Baseline:** unweighted rank centrality (Negahban et al. 2017) and GSE's current power rating.
- **Protocol:** weekly from Week 5 onward, 2018–2024: compute (a) unweighted rank centrality, (b) MMWU-reweighted rank centrality; measure per-team ℓ_∞-style error against end-of-season batch-BTL scores, plus next-week SU log-loss. Expectation from the paper: reweighted wins on ℓ_∞ error vs end-of-season scores (especially for teams in weak divisions whose intra-division games dominate), with the gap largest mid-season when the graph is most imbalanced.

## 13. Acceptance / rejection gate
- **Adopt reweighted spectral ratings as a GSE model component** if MMWU-reweighted rank centrality beats unweighted on end-of-season ℓ_∞ error (vs batch-BTL) in ≥ 5 of 7 test seasons AND on next-week SU log-loss by ≥ 0.001/game averaged over 2018–2024. **Adopt the spectral-gap confidence diagnostic** if the realized correlation between 1/λ_{n−1}(L^W) and weekly per-team rating error is positive and significant (p < 0.05) over the test window. **Reject otherwise.** Gates stated before running; MMWU implementation choice (exact SDP vs greedy oracle) fixed in advance and reported.

## 14. Improvement experiment
The paper's reweighting is *score-agnostic* (weights depend only on the graph, not on outcomes) and its theory assumes k ≥ 10240h² comparisons per pair — absurd for sports. Improve on both: (1) make weights **outcome-adaptive** — weight edges by both graph structure (MMWU) and matchup informativeness (e.g., upweight games decided by ≤ 3 points between high-rated teams, which carry more Fisher information about the score vector); (2) extend the theory to **k = 1** (each pair plays once) by replacing the per-pair concentration with a leave-one-*game*-out argument over the fixed NFL schedule — the schedule's determinism actually helps, since the comparison graph is known exactly in advance and weights can be precomputed before Week 1. This yields a "schedule-aware spectral rating" with per-team entrywise confidence bands that tighten as the season's graph fills in — a genuine advance over the paper's random-graph, large-k setting and a publishable GSE methodology piece.
