# 1634 Optimal Parlay Wagering and Whitrow Asymptotics (arXiv:2603.26620)

**Citation:** Long, C. D. (2026). *Optimal Parlay Wagering and Whitrow Asymptotics: A State-Price and Implicit-Cash Treatment*. arXiv:2603.26620v1 [math.OC], 27 Mar 2026. URL: https://arxiv.org/abs/2603.26620
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 7 pages).
**Verdict:** ADAPT — exact outer-product construction of the simultaneous Kelly ticket book plus a rigorous justification that GSE's singles-only policy costs only quartic growth; the active-leg criterion directly prunes parlay menus.

## 1. Research question
For independent multi-outcome events with multiplicative parlay pricing, what is the exact optimal Kelly ticket book over the full menu (singles, doubles, triples, …), and — since GSE's policy is singles-only — how much growth is actually lost by forbidding parlays, and how should simultaneous singles stakes be corrected?

## 2. Dataset / schema
No external dataset. Pure theory (10-page note, 7 content pages) with a worked two-1X2-soccer-match example and an exact binary check against Thorp's two-bet formula.

## 3. Method / model
Implicit-cash viewpoint: cash is an implicit claim on every outcome; explicit bets top up outcomes whose edge ratio p_i/π_i exceeds the cash floor. Solve each event's Kelly problem in isolation (closed form), then form the full ticket book as the outer product of the one-event strategies. For the singles-only restriction, treat singles wealth as the first-order truncation of the exact product wealth and do a perturbative expansion in the low-edge regime on a fixed active support.

## 4. Equations & assumptions
- Single-event (Prop. 2.1): s*_i = (p_i − c*π_i)_+; W*_i = max(c*, p_i/π_i); KKT: E[1/W*(I)]=1 with p_i/(π_i W*_i)=1 on active outcomes, <1 on inactive; cash c* = (1−P_A)/(1−Q_A) for the active prefix.
- Exact parlay formula (Theorem 3.1): x*_γ = ∏_{ℓ:γℓ=0} c*_ℓ · ∏_{ℓ:γℓ≠0} s*_{ℓ,γℓ}; terminal wealth factorizes W_x*(I) = ∏_{ℓ=1}^m F_ℓ(I_ℓ); V_par = Σ_{ℓ=1}^m E[log F_ℓ(I_ℓ)].
- Active-ticket criterion (Cor. 3.2): a ticket is active iff every selected leg is active in its one-event problem — no optimal parlay contains a singly inactive leg. Full m-leg parlay stake: x*_{i1…im} = ∏ s*_{ℓ,iℓ}; single on leg i of event ℓ gets s*_{ℓ,i}·∏_{r≠ℓ}c*_r.
- Whitrow asymptotics (Theorem 4.2): x^sim_j(ε) = x^ind_j(ε) − Λ_j α_j ε³ + O(ε⁴) = (1 − Λ_j ε²) x^ind_j(ε) + O(ε⁴), with Λ_j := Σ_{k≠j} a_k^T C_k^{−1} a_k — the simultaneous singles optimizer equals the isolated Kelly stakes through second order, with only an event-specific cubic shrinkage.
- Quartic value loss (Prop. 5.1): 0 ≤ V_par(ε) − V_sing(ε) = O(ε⁴).
- Binary check vs Thorp: f_1 = m_1(1−m_2²)/(1−m_1²m_2²), f_2 = m_2(1−m_2²)/(1−m_1²m_2²) expanding to f_1 = m_1 − m_1 m_2² + O(ε⁵).
- Assumptions: independent events; multiplicative parlay pricing; positive cash in each one-event problem (guaranteed by overround in fixed-odds settings); low-edge regime and fixed active support for the perturbative results.

## 5. Features / target
Input: per-event probabilities p_ℓ, state prices π_ℓ. Target: optimal stakes over the full ticket menu (or the corrected simultaneous singles book). A sizing rule, not a predictor.

## 6. Validation design
Exact proofs (KKT verification of the outer-product candidate); the perturbative theorems; the binary special case checked against Thorp's known exact two-bet formula. No empirical data.

## 7. Numerical results / baselines
- Two-1X2-match illustration: with isolated strategies (c_1; h_1,d_1,a_1), (c_2; h_2,d_2,a_2), full parlays are HH=h_1h_2, HD=h_1d_2, …; the single on home in match 1 gets h_1c_2; pure cash ticket gets c_1c_2.
- Paper's claims: exact factorization; quartic growth loss from the singles-only restriction; cubic event-specific shrinkage as the only second-order correction.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Independence across events is load-bearing — correlated legs (same-game parlays, correlated props) break the factorization. Multiplicative parlay pricing assumed; real books shade parlay prices. The Whitrow asymptotics need the low-edge regime and fixed support; GSE's biggest edges are exactly where the approximation is weakest. No empirical test.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): Kelly sizing is a known GSE topic with zero prior reads — new capability. Directly relevant to GSE's parlay stance (GSE steers followers to singles): the paper rigorously quantifies what singles-only costs (quartic — essentially nothing at small edges) and gives the exact correction for simultaneous singles slates. Same implicit-cash school as 1623/1624.

## 11. GSE implementation spec
(1) Implement the one-event implicit-cash Kelly solver (closed form via the (p_i−c*π_i)_+ rule); (2) for each slate, compute isolated stakes, then apply the cubic shrinkage x^sim_j ≈ (1−Λ_jε²)x^ind_j with Λ_j estimated from the slate's edge/covariance structure; (3) use the active-leg criterion as a parlay-menu filter for any parlay product: only legs active in their one-event problem may appear; (4) document the quartic-loss result as the quantitative backing for GSE's singles-first stance. Effort: 2–3 days.

## 12. Reproducible test
Dataset: GSE 2025–2026 season slates. Test: replay simultaneous singles with the cubic-shrinkage correction vs naive isolated-Kelly summed stakes vs a fixed 0.9 global shrinkage. Metrics: final bankroll, max drawdown. Baseline to beat: naive isolated-Kelly on max drawdown.

## 13. Acceptance / rejection gate
ADOPT if the Λ_j-shrinkage replay cuts max drawdown ≥10% versus naive isolated-Kelly stakes with final bankroll within 2% on the 2025–2026 replay; otherwise REJECT.

## 14. Improvement experiment
Extend the perturbation to the first correlated case: derive the shrinkage correction for a block-diagonal correlation structure (correlated props within a game, independent across games) and test whether it beats the independence-assumed correction on same-game-heavy slates.
