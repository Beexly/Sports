# [0048] Simultaneous All-Pay Auctions with Budget Constraints (arXiv:2505.03291v2)

**Citation:** Yan Liu, Ying Qin, Zihe Wang (2025). *Simultaneous All-Pay Auctions with Budget Constraints*. arXiv:2505.03291v2 [econ.TH]. URL: https://arxiv.org/abs/2505.03291v2. Submitted 6 May 2025, revised 23 Jul 2025.
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF v2) — main text §§1–6 (pp. 1–8) line by line plus the appendix theorem statements (Theorem 7) on 2026-09-21.
**Verdict:** REJECT — a pure game-theory paper on all-pay auction equilibria with zero empirical content and no mapping to outcome prediction or betting markets; nothing for GSE to adopt or adapt.

## 1. Research question
Characterize the Nash equilibrium of two-player simultaneous all-pay auctions where players have **hard (asymmetric) budget constraints** and compete over **multiple heterogeneous items** with asymmetric valuations, under complete information. Unlike the unconstrained all-pay auction (which always has a Nash equilibrium), with budget constraints a Nash equilibrium may not exist, and bids across items become correlated (joint distributions rather than independent marginals). Paper's headline findings: (1) with budget constraints a Nash equilibrium does not always exist; (2) for a single item the equilibrium may not be unique; (3) for multiple items the equilibrium strategies are joint distributions across items whose marginals need not be equilibria of the standalone single-item games.

## 2. Dataset / schema
Not applicable — no empirical data. This is a pure game-theory paper: no experiments, no datasets, no simulations, no code. The "data" is the model specification in §2: two players i ∈ {1,2}, n items, budget B_i ≥ 0, valuation v_{ij} > 0. A pure strategy is a bid vector x_i with Σ_j x_{ij} ≤ B_i, x_{ij} ≥ 0.

## 3. Method / model
Analytic Nash-equilibrium characterization (existence + constructive proofs), complete information:
- **§3 — Single item, full characterization.** Lemma 1: a pure-strategy NE exists iff B_1 = B_2 and B_2 ≤ ½·min{v_1, v_2}; then (B_1, B_2) is the *unique* pure-strategy NE, and otherwise no pure-strategy NE exists. Lemma 2: in any NE both players' support suprema coincide, x̄_1 = x̄_2 = L where L = min{B_1, B_2, v_1, v_2}. Proposition 1: when B_1 = B_2 there exist instances with **no Nash equilibrium at all**. Theorem 1 (single-item NE): (1) B_1 = B_2 < ½·min{v_1,v_2} → unique NE is the pure profile (B_1, B_2); (2) B_1 = B_2 = ½·min{v_1,v_2} → Supp(F_i) = {0, L} with F_i(0) ≤ 1 − 2L/v_{−i}, Supp(F_{−i}) = {L} (i = lower-valuation player); (3) B_1 ≠ B_2, with s = larger-budget player, w = other: if v_s > L, F_s(x) = x/v_w on [0,L) and 1 at L, F_w(x) = (v_s−L)/v_s at 0 and (v_s−L+x)/v_s on (0,L] (utilities: s gets v_s − L, w gets 0); if v_s = L, F_s(x) = (v_w−L)/v_w at 0 and (v_w−L+x)/v_w on (0,L], F_w(x) = x/v_s on [0,L] (utilities: s gets 0, w gets v_w − L).
- **§4 — Two items: joint-distribution NE constructions.** Theorem 2 (full symmetry: B_1 = B_2, all v_{ij} equal): f_i(x_{i1}, x_{i2}) = 1/√(2c) uniform on the segment x_{i1} + x_{i2} = c with c = min{v_{11}, B_1}. Corollary 1 (key insight): the marginal distributions induced on each single item do *not* necessarily constitute a NE of that item's standalone game — e.g., B_1 = B_2 = 1, all v = 3 gives marginal F_{ij} = x on [0,1], while the single-item NE is the pure profile (1,1). Theorems 3, 4, 5, 7 (B_1 ≠ B_2; L_j = min{B_1,B_2,v_{1j},v_{2j}}, L_1 ≥ L_2): piecewise-uniform joint densities supported on line segments with mass points, covering the four sub-cases of (v_{s1} vs L_1) × (v_{s2} vs L_2). Example (Theorem 3, v_{sj} > L_j both items): f_s has density 1/v_{w1} on x_{s1} ∈ [0,T_1], x_{s2} = L_2; density 1/v_{w2} on x_{s1} = L_1, x_{s2} ∈ [0,T_2]; plus a connecting segment, with T_1 = v_{w1} − (v_{w1}/v_{w2})L_2, T_2 = v_{w2} − (v_{w2}/v_{w1})L_1. (Theorem 7, Case 4, is in the appendix.)
- **§5 — Three items, symmetric valuations only (v_{1j} = v_{2j} = v_j).** Theorem 6: if B_i ≥ max{(v_1+v_2+v_3)/2, v_1} for both players (wlog v_1 ≥ v_2 ≥ v_3): with z = (v_1+v_2+v_3)/2, if z > v_1 the NE is a mixture over triangle segments L_{AB}, L_{BC}, L_{CA} with A = (v_1,0,z−v_1), B = (z−v_2,v_2,0), C = (0,z−v_3,v_3) and weights P_{AB}, P_{BC}, P_{CA} ∝ (z−v_3)/(z−v_2), 1, (z−v_3)/(z−v_1); if z ≤ v_1, uniform on segment AB with A = (v_1,0,0), B = (0,v_2,v_3). Marginals are uniform on each item, so per-item NE holds here.
- **§6 — Open problems:** NE existence for ≥ 4 items is open; the general asymmetric three-item case is open.

## 4. Equations & assumptions
- Strategy space: X_i = {(x_{ij}) : Σ_j x_{ij} ≤ B_i, x_{ij} ≥ 0}.
- Win rule: higher bid wins item j. Tie-breaking (critical — paper shows with plain ½–½ tie-breaking no best response can exist, Example p. 3): if x_{1j} = x_{2j} = min{B_1, B_2, v_{1j}, v_{2j}} and min{B_i, v_{ij}} > min{B_{−i}, v_{−ij}} then player i wins; all other ties split ½–½.
- Utility: u_{ij} = v_{ij} − x_{ij} if i wins item j, −x_{ij} if i loses; total utility = Σ_j u_{ij}.
- Key formulas: L = min{B_1, B_2, v_1, v_2} (support supremum); single-item mixed CDFs in §3 above (F_s, F_w piecewise); Theorem 2 joint density f_i = 1/√(2c) on x_{i1}+x_{i2} = c; Theorem 3 thresholds T_1 = v_{w1} − (v_{w1}/v_{w2})L_2, T_2 = v_{w2} − (v_{w2}/v_{w1})L_1; Theorem 6 weights P_{AB} = [(z−v_3)/(z−v_2)]/[(z−v_3)/(z−v_2)+1+(z−v_3)/(z−v_1)], P_{BC} = 1/[(z−v_3)/(z−v_2)+1+(z−v_3)/(z−v_1)], P_{CA} = [(z−v_3)/(z−v_1)]/[(z−v_3)/(z−v_2)+1+(z−v_3)/(z−v_1)].
- Assumptions (stated): complete information; exactly two players; all-pay (losers pay too); hard budget constraints; risk-neutral expected-utility maximization; valuations strictly positive.

## 5. Features / target
Not applicable — no ML features or prediction target. The game-theoretic analogues are: "inputs" = budgets (B_1, B_2) and valuations (v_{ij}); "outputs" = equilibrium bidding strategies (pure bid vectors or mixed CDFs / joint densities over items).

## 6. Validation design
Not applicable — no empirical validation of any kind. The paper's validation is mathematical proof (existence/non-existence arguments and best-response verification in the appendix, §§A–C). No simulations, no backtests, no baselines, no calibration.

## 7. Numerical results / baselines
No numerical results exist in the paper. The "results" are the theorems summarized in §3 above. Headline qualitative findings (paper's claims): (1) with budget constraints a Nash equilibrium does not always exist, unlike the unconstrained case; (2) for a single item the equilibrium may not be unique; (3) joint (correlated) bid distributions across items are essential — marginals need not be equilibria item-by-item (Corollary 1).

## 8. Code / data availability
None stated. No code, no data, no simulations in the paper.

## 9. Leakage & limitations
- No empirical component means no leakage in the ML sense — but also zero evidence the equilibria describe any real bidding behavior.
- Paper's own limitations (§6): constructions stop at three items (and only symmetric valuations there); NE existence for ≥ 4 items is open; the general asymmetric three-item case is open; some cases (Theorem 7) relegated to the appendix.
- Structural assumptions with no sports-betting counterpart: complete information (real opponents' budgets/valuations are unknown), exactly two players (betting markets are N-player), all-pay structure (bettors don't pay their stake win-or-lose against one opponent).
- The motivating applications named in §1.2 (elections, LLM development races, R&D competition) do not include sports betting markets.

## 10. GSE overlap
No overlap — and no duplication. Per the existing-research map (read 2026-09-21), GSE's corpus has no game-theory/auction thread, and nothing in the map calls for one. This is **new capability with zero demand**: GSE's engine predicts game/player outcomes against market prices; it does not bid budgets against a single fully-informed opponent in an all-pay contest. The superficially adjacent idea — DFS lineup construction under a salary cap as "budget-constrained allocation across multiple items" — fails on inspection: DFS is not an all-pay auction (you don't pay your bid win-or-lose to beat one opponent; you buy projected points against a field under fixed salaries), and the paper's complete-information two-player equilibrium has no mapping to GSE's prediction task. The Colonel Blotto connection discussed in §1.2 is the same story.

## 11. GSE implementation spec
Not recommended — rejected. There is nothing to implement: no data source maps to the model (no GSE opponent bids against known budgets), no product surface (GSE posts picks, props, DFS — not bidding strategies), and the equilibrium concept answers a question GSE never asks. Do not build.

## 12. Reproducible test
N/A (rejected). A test would require a real two-player all-pay bidding setting with known asymmetric budgets — none exists in GSE's data. Gate closed.

## 13. Acceptance / rejection gate
Reject: zero empirical content, no mapping to outcome prediction or betting markets. The rejection is unconditional — no test window or baseline could resurrect it, because the paper's question (equilibrium bidding under complete information) is not a question GSE's engine asks.

## 14. Improvement experiment
None from this paper. If contest-theoretic lineup construction is ever explored, the relevant starting point would be Colonel Blotto / DFS portfolio literature, not all-pay auction theory.
