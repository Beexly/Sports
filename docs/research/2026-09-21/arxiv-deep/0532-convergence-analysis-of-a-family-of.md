# [0532] Convergence analysis of a family of Zermelo-type iterations for the Bradley–Terry model (arXiv:2607.22221v1)

**Citation:** Ruijian Han, Ding Lu, Yiming Xu (2026). *Convergence analysis of a family of Zermelo-type iterations for the Bradley–Terry model*. arXiv:2607.22221v1. URL: https://arxiv.org/abs/2607.22221v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 242143 chars; abstract, §1–2, all theorem statements in §3–5, §6 experiments, appendix summaries read; proof details skimmed).
**Verdict:** ADAPT — drop-in numerical upgrade for GSE's BT rating fitter: Newman's α=0 scheme with ASYNCHRONOUS updates converges substantially faster than Zermelo; the same fitted-BT convergence-factor analysis gives a principled stopping rule.

## 1. Research question
Newman (2023, ref [32]) introduced a one-parameter family of Zermelo-type fixed-point iterations for the Bradley–Terry MLE (α=1 recovers Zermelo's algorithm); empirically α=0 converges much faster, but the mechanism was unknown. The paper gives a systematic local-convergence analysis via spectral analysis of the iteration Jacobians, asking how the convergence factor ρ(α) depends on α — and critically, on whether updates are synchronous vs asynchronous.

## 2. Dataset / schema
No predictive datasets — this is a numerical-analysis paper. Experiments use: (a) synthetic comparison data from BT models over two-community SBM graphs — homogeneous (p=q=0.05), clustered (p=0.1, q=0.01), near-bipartite (p=0.01, q=0.1); pathological cases: cyclic comparison graph (n=20, w_ij uniform integers in [10,…]), bipartite graphs; (b) real-world comparison data — vervet monkey dominance hierarchy (n=64 objects, N=11,632 comparisons, after pruning to largest strongly connected component), ATP tennis match outcomes (Jeff Sackmann data), ASSISTments. MLE ground truth computed with asynchronous Newman iteration to tolerance ‖π⁽ᵏ⁾−π⁽ᵏ⁻¹⁾‖₂/‖π⁽ᵏ⁾‖₂ ≤ 1e-15. Code: https://github.com/Yiminithere/newman-algorithm-for-BT; runs in Python on a MacBook Air (M4, 10 cores).

## 3. Method / model
Newman's α-scheme (Eq. 2.1): π_i ← Σ_j w_ij(α π_i + π_j)/(π_i+π_j) / Σ_j (α w_ij + w_ji)/(π_i+π_j), α ≥ 0. Two implementations: synchronous (all π updated simultaneously, Eq. 2.4, with unit-product normalization π ← π/∏π_i^{1/n} after each pass) and asynchronous (cyclic/sequential per-coordinate updates, Eq. 2.7 — Gauss-Seidel style, using fresh values immediately). Convergence analysis: linearize at the MLE π̂, spectral analysis of Jacobian J_{F_α} / J_{A_α}; closed-form convergence factors ρ_sync(α), ρ_async(α) (Theorems 3.1, 4.2); population-level analysis with expected BT outcomes (Theorems 3.2, 4.3, Proposition 4.1); asymptotic approximation results linking observed ρ to population ρ̄ (Theorems 5.1–5.7, incl. MLE uniform consistency from Chen et al.).

## 4. Equations & assumptions
- BT model: P(i≻j) = π_i/(π_i+π_j) (Eq. 1.1); strength vector normalized ∏π_i=1.
- Log-likelihood: l(π) = Σ_{i,j} w_ij log(π_i/(π_i+π_j)) (Eq. 1.2); MLE π̂ = argmax over R₊ⁿ with ∏π_i=1 (Eq. 1.3).
- Zermelo fixed point (Eq. 1.4): π_i = Σ_j w_ij / Σ_j (w_ji+w_ij)/(π_i+π_j).
- Newman α fixed point (Eq. 1.5/2.1): π_i = [Σ_j w_ij(α π_i+π_j)/(π_i+π_j)] / [Σ_j (α w_ij+w_ji)/(π_i+π_j)].
- Sync iteration (Eq. 2.4): π⁽ᵏ⁾ = S∘F_α(π⁽ᵏ⁻¹⁾); async (Eq. 2.7): π⁽ᵏ⁾ = S∘A_α(π⁽ᵏ⁻¹⁾), A_α = F_α^{(n)}∘…∘F_α^{(1)}.
- Theorem 3.1: ρ_sync(α) ≔ max{|λ| : λ ∈ Λ(J_{F_α}(π̂)), λ<1} ≡ max{λ_2(J_{F_α}(π̂)), −λ_n(J_{F_α}(π̂))} — all eigenvalues real.
- Theorem 3.2: under population BT, ρ̄_sync(α) quasi-convex in α with explicit optimal α_opt and bounds; can exceed 1 when α<1 (non-convergence).
- Theorem 4.2: ρ_async(α) ≔ max{|λ| : λ ∈ Λ(J_{A_α}(π̂)), |λ|<1} < 1 for all α>0 — always locally convergent.
- Theorem 4.3: under population BT with consistently ordered bipartite graphs, ρ̄_async(α) monotonically increasing in α≥0 (optimal α=0); at α=0, ρ̄_async(0) ≡ max{|λ|² : |λ|<1} < 1 — the squaring is the acceleration mechanism; sync ρ̄_sync(0) need not be <1.
- Proposition 4.1: quantitative bounds on ρ_async for general expected BT outcomes.
- Assumptions: comparison graph strongly connected (MLE exists, finite, unique); for population results, expected outcomes from a BT model (stochastic transitivity); normalization ∏π_i=1 removes scale invariance.

## 5. Features / target
Inputs: pairwise comparison counts W = {w_ij} (wins of i over j). Target: BT strength vector π̂ (MLE). No features, no prediction horizon — pure optimization-method paper.

## 6. Validation design
Verifies theory numerically, not a predictive benchmark: computes local convergence factors (spectral radii of the Jacobians at the exact MLE) and observed convergence histories for α∈[0,1], comparing sync vs async, consistent vs random update orderings. Synthetic: three SBM topologies, plus non-convergent bipartite case and pathological cyclic graph (where BT-model assumptions fail and population analysis breaks). Real data: fitted-BT model (MLE-strengths, same comparison counts m_ij=w_ij+w_ji) used to predict observed convergence factors. Stopping criterion for reference MLE: relative iterate change ≤1e-15.

## 7. Numerical results / baselines
- Example 1 (SBM graphs): async local convergence factor substantially smaller than sync — by roughly a factor of 7 in the near-bipartite setting; async monotonic in α under consistent ordering (Theorem 4.3 confirmed); monotonicity lost under random ordering but curves stay close for larger α.
- Example 2 (bipartite): ρ̄_sync(0)=1 (to 3 decimals) → synchronous α=0 FAILS to converge; asynchronous α=0 converges with speedup ≈17.33× over Zermelo (α=1) under consistent ordering, ≈6.95× under random ordering.
- Cyclic graph (n=20): preference loop makes BT ranking uninformative; population convergence analysis does not reflect actual behavior (ρ̄_sync and ρ_sync differ significantly) — expected, since cyclic outcomes are vanishingly unlikely under BT.
- Real data (vervet n=64/N=11,632, ATP, ASSISTments): population convergence factors from the fitted BT model predict observed ρ_sync and ρ_async "surprisingly accurately."
- Bottom line (paper's conclusion): the α=0 acceleration arises not only from the parameter choice but, more importantly, from ASYNCHRONOUS updates; sync α=0 is provably non-convergent in some cases.

## 8. Code / data availability
Code: https://github.com/Yiminithere/newman-algorithm-for-BT (stated). Real datasets: vervet monkeys (github.com/tbonne/rankReliability), ATP (github.com/PinjunD/Statistical-ranking-with-dynamic-covariate, Jeff Sackmann source), ASSISTments. Synthetic: generated from SBM + BT.

## 9. Leakage & limitations
Adversarial reading: pure optimization theory — no prediction content; the convergence guarantees are LOCAL (near the MLE); global convergence of the sync scheme for α<1 is explicitly not covered, and the paper gives a non-convergent sync-α=0 example. Population analysis requires data consistent with BT (stochastic transitivity); cyclic/non-transitive outcomes (rock-paper-scissors dynamics, which appear in NFL divisional cycles over short samples) break the approximation. For GSE: the practical gain is bounded by the fact that BT-MLE on 32 NFL teams with ≤ 272 games/season already converges in a handful of iterations by ANY reasonable method (MM, Zermelo, Newton) — the 17× speedup applies to large sparse comparison graphs (ATP-like, n=457+), not to dense 32-node problems where each iteration is O(n²) and cheap. The stopping-criterion story (predicting ρ from a fitted model) is neat but overkill for a 32-team fit that converges to 1e-15 tolerance in milliseconds. Also NFL games need home-field and time-weighting, which this paper's plain BT formulation lacks.

## 10. GSE overlap
Extension, orthogonal to prediction. Garrett's corpus: BT ratings inventoried (Massey/Sagarin/Colley family, 26-metric catalog), Elo/Glicko/TrueSkill mentioned, reverse-engineering of analyst sources — but the NUMERICAL fitting of BT MLE is presumably done via standard MM/Zermelo or library calls, and convergence acceleration is unexamined anywhere in the corpus. This paper supplies exactly that missing piece: a provably faster, always-convergent fitting iteration. It complements 0530 (Boltzmann-rational EM with worker reliabilities — whose M-step solves a related linear system) and 0531 (isotonic link — whose rate step is a sub-gradient, so this paper's fixed-point machinery doesn't directly apply there, but BT-rate fitting under a logistic link does benefit). No duplication.

## 11. GSE implementation spec
1. In GSE's team-rating layer (or any BT-MLE fitting: opponent-adjusted EPA → BT, analyst-source fusion, CFB rankings with 134 teams), replace the sync BT fitter with Newman's α=0 scheme with ASYNCHRONOUS (sequential per-team) updates + unit-product normalization each pass.
2. Iteration (Eq. 2.1, α=0): π_i ← [Σ_j w_ij π_j/(π_i+π_j)] / [Σ_j w_ji/(π_i+π_j)] — note the numerator/denominator simplify since α=0; update each team sequentially using fresh values; renormalize ∏π_i=1 after each full pass.
3. Convergence criterion: stop when relative change ≤1e-10 (paper used 1e-15, overkill); optionally log per-iteration likelihood to assert monotonicity under async updates (paper proves monotonic likelihood increase for the async scheme per Newman [32]).
4. CFB lane (134 teams, sparse cross-conference play) is where the ~7–17× speedup vs Zermelo actually matters; NFL (32 teams) gains are negligible but the code path is shared.
Estimated effort: <1 engineer-day (a ~20-line loop replacing the existing fitter); zero risk — same MLE, just faster; keep Zermelo α=1 as fallback behind a flag.

## 12. Reproducible test
Dataset: 2020–2024 NFL + CFB (FBS) game results → comparison counts w_ij. Baseline: standard Zermelo (α=1, sync) to 1e-10 tolerance. Candidate: async α=0 Newman to same tolerance, same init (π⁽⁰⁾=1). Metric: number of full passes to reach tolerance; verify identical fitted π̂ (max |log ratio| < 1e-9). Run on both leagues; report pass-count ratio. Expect ≥2× fewer passes on CFB (paper reports up to 17× on bipartite/sparse graphs; NFL dense graphs will show less).

## 13. Acceptance / rejection gate
ADOPT if the async α=0 fitter reaches tolerance in strictly fewer full passes than Zermelo on the CFB dataset (≥1.5× fewer) AND produces identical MLEs to 1e-9 log-ratio; REJECT if no pass-count reduction on either league — Zermelo stays. Hard rejection if the async α=0 variant ever fails to increase likelihood monotonically across passes (violates the paper's guarantee → implementation bug).

## 14. Improvement experiment
Go beyond the paper: HOME-FIELD-WEIGHTED α-scheme — generalize the fixed point to separate home/away strength contributions (the paper's future-work-adjacent extension via David 1963 is only conceptual; derive the α-family for the Davidson/home-advantage BT variant and test whether the async α=0 acceleration survives the extra parameters). If it does, GSE gets a single fast fitter for the home-conditional BT ratings that 0531's home-conditional isotonic link test will need.
