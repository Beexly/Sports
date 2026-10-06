# [1750] Optimal portfolios of a long-term investor with floor or drawdown constraints (arXiv:1305.6831)

## 1. Citation and full-text-read statement
**Citation:** Vladimir Cherny, Jan Obłój (Oxford) (2013). *Optimal portfolios of a long-term investor with floor or drawdown constraints*. arXiv:1305.6831. URL: https://arxiv.org/abs/1305.6831
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; Theorem 2.2 and Remark 2.4 read in full, proofs skimmed).
**Verdict:** ADAPT — one sentence: the floor-constraint irrelevance theorem plus the explicit ε-mixture construction gives GSE a bankroll-floor guarantee that costs zero asymptotic growth, complementing 1749's drawdown governor, but the continuous-time turnpike machinery needs discrete-time translation for weekly betting.

## 2. Research question
For a long-run investor maximizing the asymptotic growth rate of expected utility, does imposing a floor constraint (wealth must dominate a benchmark at all times) or a drawdown constraint change the optimal long-run growth rate — and what do the constrained optimizers look like?

## 3. Method / model
Criterion: R_U(V) := limsup_{T→∞} (1/T) log E[U(V_T)] (1) — growth rate of expected utility; the optimal rate is the Certainty Equivalent Rate (CER), interpretable as the critical incentive rate at which the investor would abandon the market. Proves: (a) Theorem 2.2 — a floor constraint V_t ≥ G_t (for a floor process G dominated by some admissible wealth) leaves the optimal CER unchanged, with explicit optimizer V̂_t = ε ξ̂_t + X_t (ε weight on the unconstrained optimizer ξ̂, rest on a floor-dominating process X); (b) long-run optimality characterized via convergence of finite-horizon value functions to the CER (turnpike-style, Guasoni–Robertson sense) under floor and drawdown constraints; (c) Remark 2.4 — the three problems connect explicitly: the drawdown-constrained solution is the Azéma–Yor transform of the floor-constrained solution, which itself solves the unconstrained problem.

## 4. Mathematics / equations / assumptions
- R_U(V) := limsup_{T→∞} (1/T) log E[U(V_T)] (1); CER = sup_V R_U(V).
- Theorem 2.2: sup_{V∈A(v_0)} R_U(V) = sup_{V∈A_G(v_0)} R_U(V) (4) for floor G_t ≤ X_t ∈ A(v_0(1−ε)); optimizer V̂_t := ε ξ̂_t + X_t.
- Proof device: ξ̂_t := δv_0 + (1−δ)η̂_t ≥ δv_0; utility growth bound U(x) ≤ U(λx) ≤ λ^γ U(x) for λ>1, x≥x_0 (Lemma A.3 of [4]); the ε-cost vanishes at rate (1/T)(−γ log ε) → 0 — the floor costs nothing asymptotically because it is a fixed additive term under the log.
- Risk-sensitive link: for U(x)=x^p/p, F_T=log V_T: (1/p)log E[e^{pF_T}] = E[F_T] + (p/2)Var(F_T) + O(p²) — CER criterion = mean–variance on log wealth to first order.
- Remark 2.4: drawdown solution = Azéma–Yor(floor solution) = Azéma–Yor(unconstrained solution).
- Assumptions: continuous asset processes (extends to max-continuous); utility satisfies polynomial growth Assumption; floor dominated by an admissible wealth (G_t ≤ X_t); finite CER.

## 5. Dataset / schema
None — theory paper (continuous asset processes). No empirical data.
## 6. Features and target
Not applicable (theory).

## 7. Validation design
None empirical.

## 8. Exact results and baselines with numbers
No numerical results. Theoretical: floor-irrelevance equality (4); explicit ε-mixture optimizer; long-run optimality characterizations; the three-problem chain in Remark 2.4.

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
Continuous-time/continuous-path setup; the floor must be dominated by an admissible wealth process (for a constant cash floor this is trivially satisfied, but the paper's generality isn't needed); the ε in V̂ = ε ξ̂ + X is arbitrary — the paper gives no finite-horizon guidance on choosing it (asymptotically anything works, practically it controls the floor tightness); no estimation error; no discrete-time rates (turnpike convergence speed unquantified).

## 11. GSE overlap
Direct companion to 1749 (same co-author Obłój; the Azéma–Yor chain). Where 1749 gives the drawdown governor (wealth ≥ α × running max), this gives the floor guarantee (wealth ≥ fixed benchmark, e.g., never below starting bankroll) with the surprising result that the floor is asymptotically FREE — GSE can hard-guarantee "never lose the initial bankroll" via the ε-mixture without sacrificing long-run growth rate. Per the existing-research map, GSE has no capital-guarantee machinery at all. New capability: a provably costless (asymptotically) bankroll floor.

## 12. Implementation specification
Build the "floor guarantee" alongside the 1749 α-governor: (a) pick floor G (e.g., initial bankroll B_0, or B_0 × 1.0); (b) each week allocate ε of capital to the growth-optimal sizer (1744/1746) and (1−ε) to cash reserved against the floor — by Theorem 2.2 any ε ∈ (0,1) preserves the asymptotic CER, so choose ε by finite-horizon backtest (start ε = 0.8); (c) verify V_t ≥ G each week by construction (cash buffer covers the floor); (d) combine with 1749: the ε-sleeve itself runs under the α-drawdown governor. Effort: ~0.5 day (wrapper around the sizer).

## 13. Reproducible test
Dataset: 2023–2025 NFL backtest of the 1744/1746 sizer. Compare: unconstrained sizer vs ε-mixture floor (ε ∈ {0.5, 0.8, 0.9}, floor = initial bankroll). Metrics: terminal log growth, min bankroll / initial (must stay ≥ 1.0 for the floored version), max drawdown. Verify the theorem's prediction: growth gap between floored and unfloored shrinks as the window lengthens (test on 1-season vs 3-season windows).

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the ε-mixture floor if the floored sizer keeps min(B_t/B_0) ≥ 0.99 always and its 3-season terminal log growth is within 90% of the unfloored sizer's; REJECT if the cash drag is material (>15% growth cost) on finite NFL horizons. Improvement experiment: make ε adaptive — ε_t = 1 when far above the floor, shrinking toward ε_min as B_t approaches G (a "cushion multiplier" rule in the spirit of CPPI); test whether adaptive-ε dominates fixed-ε on growth subject to the hard floor. This connects the paper's asymptotic result to the finite-horizon CPPI literature it doesn't discuss.

**Verdict:** ADAPT — the asymptotically-free bankroll floor (ε-mixture) is a genuinely surprising, directly implementable capital guarantee, but finite-horizon ε choice must be calibrated empirically.
