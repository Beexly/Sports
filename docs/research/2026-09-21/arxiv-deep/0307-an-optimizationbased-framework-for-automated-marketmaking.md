# [0307] An Optimization-Based Framework for Automated Market-Making (arXiv:1011.1941)

**Citation:** Jacob Abernethy, Yiling Chen, Jennifer Wortman Vaughan (2010). *An Optimization-Based Framework for Automated Market-Making*. arXiv:1011.1941v1. URL: https://arxiv.org/abs/1011.1941
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 763 lines).
**Verdict:** REJECT — the axiomatic foundation of cost-based prediction-market makers; intellectually central to mechanism design but GSE runs no market-making surface, so none of the machinery transfers.

## 1. Research question
Can an automated market maker be designed for an *arbitrary* space of securities (bounded payoffs, complex outcome spaces) — rather than restricting the security space to fit an existing mechanism like LMSR — by deriving, from intuitive axioms, a convex-potential pricing rule whose reachable prices are exactly the convex hull of the security payoffs? (Abstract; Sec. 1)

## 2. Dataset / schema
Theory paper — no dataset. Two worked instantiations: (a) predicting the landing location of an object on a sphere (3 securities = the 3 coordinates of the unit-vector location, payoff u_i + 1); (b) pair betting on n competitors ("$1 if i beats j", known #P-hard to price under LMSR).

## 3. Method / model
- **Five axioms (Sec. 2.1):** Path Independence (Condition 1) → cost function C with Cost(r_t|r_1..r_{t−1}) = C(q+r_t)−C(q) (Theorem 1); Existence of Instantaneous Prices (differentiable C); Information Incorporation (C(q+2r)−C(q+r) ≥ C(q+r)−C(q)); No Arbitrage (∀q,r ∃o: C(q+r)−C(q) ≥ r·ρ(o)); Expressiveness (any belief distribution's expected payoff reachable as ∇C(q)).
- **Theorem 2:** under Conditions 2–5, C is convex with {∇C(q)} = H(ρ(O)) (the convex hull of payoff vectors).
- **Design rule via conjugate duality:** `C(q) = sup_{x∈Π} x·q − R(x)` (1) for strictly convex R with domain Π = H(ρ(O)); prices `∇C(q) = argmax_{x∈Π} x·q − R(x)`. LMSR and Quad-SCPM are special cases.
- **Loss bounds:** Theorem 3 — worst-case monetary loss ≤ sup_{x∈ρ(O)} R(x) − min_{x∈H(ρ(O))} R(x), refined by −D_R(ρ(o), ∇C(q)) (market maker profits when final prices are accurate).
- **Information loss / depth:** Lemma 1 + Theorem 4 — bid-ask spread ≤ 2‖r‖²/β; worst-case loss ≥ β·diam²(H(ρ(O)))/8. Direct trade-off: deeper market (larger β) ⇔ larger worst-case loss, tunable by scaling R (analog of LMSR liquidity parameter b).
- **Sphere example (Sec. 2.4):** R(x)=λ‖x−1‖² → closed-form C(q) piecewise: C(q) = (1/4λ)‖q‖² + q·1 (‖q‖≤2λ), = ‖q‖+q·1−λ (‖q‖>2λ); depth β=2λ; worst-case loss = λ (tight).
- **Relaxations (Sec. 3):** Proposition 1 — expressiveness cannot be relaxed (unbounded loss otherwise); Proposition 2 — no-arbitrage CAN be relaxed: expanding Π ⊇ H(ρ(O)) never worsens worst-case loss (arbitrage outside the hull is "paid for" by the traders who create it; Prop. 3 quantifies the guaranteed corrective profit min_{x∈H(ρ(O))} D_R(x,x₀)).
- **Pair betting (Sec. 3.1):** relax Π to Megiddo's generalized-order-matrix constraints: X(i,j)≥0, X(i,j)=1−X(j,i), X(i,j)+X(j,k)+X(k,i)≥1 — prices any quadratic-conjugate market despite the #P-hardness of exact pricing (exact hull = NP-hard minimum-feedback-arcset).
- **Transaction costs (Sec. 3.2):** Π = {x≥0: 1≤Σx_i≤1+c}, positive-only bundles; R flat on the simplex but increasingly curved near the 1+c boundary → bounded loss AND depth that grows with trade count (generalizes Othman et al. 2009).

## 4. Equations & assumptions
- `C(q) = sup_{x∈Π} x·q − R(x)` (1); `∇C(q) = argmax_{x∈Π} x·q − R(x)`
- Theorem 2: {∇C(q)} = H(ρ(O)); ρ(O) = {ρ(o) | o ∈ O}, payoff bundle payoff = ρ(o)·r
- Loss bound: `R(ρ(o)) − min_{x∈H(ρ(O))} R(x) − D_R(ρ(o), ∇C(q))` (Theorem 3)
- `β(q) = 1/V_c(q)` (largest Hessian eigenvalue inverse); bid-ask spread ≤ 2‖r‖²/β; loss ≥ β·diam²/8 (Theorem 4)
- `D_f(x,y) := f(x) − f(y) − ∇f(y)(x−y)`; `∇C(q) = x ⟺ x = argmax`
- Prop. 2/3 profit terms: `min_{x∈H(ρ(O))} D_R(x, x₀)` guaranteed corrective profit
- Pair-bet payoff matrix: `M_π(i,j) = 1 if π(i)>π(j); 1/2 if i=j; 0 otherwise`
- Sphere C(q): piecewise `(1/4λ)‖q‖² + q·1` / `‖q‖ + q·1 − λ`
- Assumptions: differentiable C; bounded payoffs; efficiently computable ρ; risk-neutral traders revealing beliefs via trades; Π compact convex.

## 5. Features / target
- **Inputs:** security space ρ: O → ℝ₊^K; trade sequence (bundles r_t).
- **Target:** arbitrage-free (or relaxation-controlled) prices; bounded-loss market operation.

## 6. Validation design
Theory paper — no empirical validation; two constructive instantiations (sphere, pair betting) as existence proofs of the design method.

## 7. Numerical results / baselines
No numerical results (theorems only). Stated quantitative facts: sphere example β=2λ, loss bound λ (tight); pair-betting relaxation is exact for n≤4 (Megiddo 1977) and strictly larger for n=13; Othman et al.'s modified-LMSR region {x≥0: 1≤Σx≤1+αn log n} is a special case of the transaction-cost construction.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Pure theory; no empirical claim to leak from. The pair-betting and transaction-cost markets are constructions, not evaluated.
- Relaxed price regions allow arbitrage the operator cannot remove — fine for play-money prediction markets, problematic for real-money operators who need the no-arbitrage guarantee the paper relaxes away.
- The framework assumes the operator can solve `argmax_{x∈Π} x·q − R(x)` efficiently — Π must be tractably described, which fails for most realistic combinatorial NFL security spaces (parlays across games: 2^n outcomes; correlated prop markets).

## 10. GSE overlap
Existing-research map: prediction-market tooling (Polymarket/Kalshi/Octagon/Probalytics) and oracle3 (Wang Transform + Kelly) are inventoried — all **consume** external market prices. **GSE operates no market-making surface and has no plan to.** Companion ledger [0305] (FWMM, arXiv:1606.02825) already covers the implementable side of this lineage and was itself REJECTed for the same reason. Out-of-scope by design: no consumer in GSE's architecture.

## 11. GSE implementation spec
Not recommended (REJECT). If a GSE-operated prediction surface were ever commissioned, this paper would supply the axioms + design rule (convex conjugate cost function, Π-relaxation for tractability, transaction-cost depth scheduling) and [0305] the implementation. Effort: 4–8 engineer-weeks for a prototype contest market. No current lane justifies it.

## 12. Reproducible test
No runnable reproduction prescribed (REJECT). The paper proves theorems; a "test" would be re-deriving the constructions, not validating a portable empirical result.

## 13. Acceptance / rejection gate
**Reject for the current program.** Adopt only if Garrett commissions a GSE-operated combinatorial prediction surface; the gate would then be: instantiate the pair-betting construction on NFL playoff-structure markets (14-outcome bracket space) and verify empirically in a counterfactual replay that realized worst-case loss stays within 10% of the Theorem-3 bound and bid-ask spread stays within 15% of the 2‖r‖²/β cap across 5 seeded order-flow replays, before any live deployment.

## 14. Improvement experiment
For a hypothetical GSE prediction surface, the paper's open engineering problem is automatic Π-tightening: use the FWMM machinery of [0305] to dynamically add cutting planes to the relaxed price region as arbitrage opportunities are detected — converting the static Megiddo-style relaxation into an adaptive one. That closes the loop between this paper's axioms and [0305]'s algorithm, and is a genuine advance over both.
