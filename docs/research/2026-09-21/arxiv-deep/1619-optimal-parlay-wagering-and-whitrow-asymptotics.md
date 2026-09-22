# [1619] Optimal Parlay Wagering and Whitrow Asymptotics: A State-Price and Implicit-Cash Treatment (arXiv:2603.26620)

**Citation:** Christopher D. Long (2026). *Optimal Parlay Wagering and Whitrow Asymptotics: A State-Price and Implicit-Cash Treatment*. arXiv:2603.26620. URL: https://arxiv.org/abs/2603.26620
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, ~6,800 words).
**Verdict:** ADAPT — the exact parlay-Kelly factorization and the Whitrow asymptotics give GSE a rigorous simultaneous-bet sizing framework: solve each event's Kelly in isolation, then apply the event-specific cubic shrinkage (1 − Λ_jε²) for simultaneous singles. The O(ε⁴) value-loss result is the quantitative backbone of GSE's standing "play singles, not whalelays" editorial stance — parlays add essentially nothing to log-growth at small edges.

## 1. Research question
For independent multi-outcome events under multiplicative parlay pricing: (i) what is the exact optimal Kelly strategy over the full menu of singles, doubles, triples, and higher parlays? (ii) What exactly is lost — in growth rate and in stake levels — when parlays are forbidden and only simultaneous singles are allowed (Whitrow's 2007 numerical near-proportionality phenomenon)?

## 2. Dataset / schema
No empirical data — pure theory with a closed-form binary check against Thorp's two-bet formula. The "low-edge regime" is a perturbation parameter ε, not a dataset.

## 3. Method / model
Implicit-cash viewpoint: cash is an implicit claim on every outcome; explicit bets top up outcomes whose edge ratio p_i/π_i exceeds the cash floor. Single-event Kelly: max Σ p_i log W_i s.t. c + Σs_i = 1, W_i = c + s_i/π_i. Multi-event: tickets γ over subsets T of events with multiplicative prices π_γ = ∏π_{ℓ,γ_ℓ}; terminal wealth W_x(I) = Σ_{γ≼I} x_γ/π_γ; simultaneous Kelly sup_x E[log W_x(I)]. Singles-only restriction analyzed as first-order truncation of the exact product wealth via perturbation in ε (μ_j(ε) = a_jε + O(ε²), M_j(ε) = C_j + O(ε), C_j ≻ 0, fixed active support, independent blocks).

## 4. Equations & assumptions
- Single-event: s_i^* = (p_i − c^*π_i)_+, W_i^* = max(c^*, p_i/π_i) (Eq. 2.4); E[1/W^*(I)] = 1; p_i/(π_iW_i^*) = 1 iff s_i^*>0, <1 iff inactive (Eq. 2.5); active set is a prefix after sorting by p_i/π_i ↓; c^* = (1−P_A)/(1−Q_A); overround Σπ_i > 1 guarantees positive cash and ≥1 inactive outcome.
- Exact parlay: x_γ^* = ∏_{ℓ:γ_ℓ=0} c_ℓ^* ∏_{ℓ:γ_ℓ≠0} s_{ℓ,γ_ℓ}^* (Eq. 3.5); W_{x^*}(I) = ∏_{ℓ=1}^m F_ℓ(I_ℓ) (Eq. 3.6); V_par = Σ_{ℓ=1}^m E[log F_ℓ(I_ℓ)] (Eq. 3.7). Full m-leg parlay stake: x_{i_1,…,i_m}^* = ∏_ℓ s_{ℓ,i_ℓ}^* (Eq. 3.11).
- Active-ticket criterion (Cor. 3.2): a ticket is active iff every selected leg is active in its one-event Kelly problem — no optimal parlay contains a singly inactive leg.
- Whitrow asymptotics (Thm. 4.2): x_j^sim(ε) = x_j^ind(ε) − Λ_jα_jε³ + O(ε⁴) = (1 − Λ_jε²)x_j^ind(ε) + O(ε⁴) (Eq. 4.8), where Λ_j = Σ_{k≠j} a_k^T C_k^{−1} a_k (Eq. 4.7), α_j = C_j^{−1}a_j.
- Quartic value loss (Prop. 5.1): 0 ≤ V_par(ε) − V_sing(ε) = O(ε⁴) (Eq. 5.1); the x^sim vs. x^ind objective gap is O(ε⁶).
- Binary check: f_1 = m_1(1−m_2²)/(1−m_1²m_2²), f_2 = m_2(1−m_1²)/(1−m_1²m_2²) (Eq. 6.1, Thorp); expands to m_1 − m_1m_2² + O(ε⁵), matching the cubic law.
- Assumptions: independent events, multiplicative parlay pricing, log utility, fixed active support in the perturbative regime, small edges, positive one-event cash.

## 5. Features / target
Features: per-event probabilities p_{ℓi}, state prices π_{ℓi}, edge parameter ε. Target: (i) the exact optimal stake on every ticket in the full menu; (ii) the growth-rate gap V_par − V_sing and the stake deviation x^sim − x^ind as functions of ε.

## 6. Validation design
Proof-based: KKT verification of the outer-product candidate (λ=1); perturbation via implicit function theorem on the score map F_j(x,ε); the binary case solved exactly and matched to Thorp. No empirical validation; the low-edge asymptotics assume the active support doesn't change with ε.

## 7. Numerical results / baselines
- The full ticket book is exactly the outer product of one-event Kelly strategies — the m-event problem decouples completely under multiplicative pricing (recovers Grant–Johnstone–Kwon log-utility equivalence in transparent form).
- Singles-only vs. isolated Kelly agree through second order; first interaction is a cubic, event-specific, blockwise scalar shrinkage (1 − Λ_jε²).
- Forbidding parlays costs only O(ε⁴) in growth rate — the missing interaction terms (pairwise products and higher) are quartic-or-smaller.
- Two-soccer-match example: HH = h_1h_2, HD = h_1d_2, …, single on home in match 1 = h_1c_2, pure cash ticket = c_1c_2 (Remark 3.4).
- Binary exact solution confirms the cubic shrinkage with a fifth-order remainder in the symmetric case.

## 8. Code / data availability
None — theory note. All formulas are closed-form and directly implementable.

## 9. Leakage & limitations
- Independence is load-bearing: correlated legs (same-game parlays, correlated props) break the factorization — and those are precisely the parlays books misprice most.
- Multiplicative pricing assumed; real books shade parlay prices (often worse than multiplicative).
- Log utility / full Kelly — no fractional-Kelly or risk-constraint treatment.
- The perturbative results need small edges and a fixed active support; large-edge or support-changing regimes aren't covered.
- No consideration of limits, bonuses, or the fact that books restrict winning parlay bettors.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE has Kelly bet-sizing in its listed search territory and a standing editorial rule (2026-09-21) against "whalelays" — steering followers to singles. This is **new** for the corpus and unusually aligned: it supplies the rigorous justification for that stance (O(ε⁴) loss from skipping parlays) plus an exact sizing formula GSE didn't have (implicit-cash Kelly with the cubic simultaneous-slate correction). It complements 1614's Φ(p/13.588) (probability inputs) with the stake-sizing outputs.

## 11. GSE implementation spec
1. **GSE simultaneous-slate sizer:** for each pick, compute isolated implicit-cash Kelly s_i^* = (p_i − c^*π_i)_+ with c^* = (1−P_A)/(1−Q_A) on the active set; then apply the Whitrow shrinkage (1 − Λ_jε²) per event where Λ_j = Σ_{k≠j} a_k^T C_k^{−1}a_k estimated from GSE's edge/covariance estimates. This replaces any ad-hoc "divide Kelly by number of picks" rule with the exact cubic correction.
2. **Active-leg gate for any parlay content:** enforce Cor. 3.2 — no parlay/slate leg that isn't independently active (p_i/π_i > c^*) in its one-event problem. This is a hard filter for GSE's parlay-adjacent content.
3. **"Why singles" content engine:** the O(ε⁴) result is a citable, quantitative answer to "why doesn't GSE post parlays" — at realistic edges (ε ~ 0.02–0.05), the growth sacrificed by skipping parlays is ~ε⁴ ~ 10⁻⁶–10⁻⁵ per unit, i.e., nothing, while books' parlay shading and correlation risk are first-order costs.
4. **Parlay pricing (if ever needed):** the outer-product formula gives exact Kelly-optimal parlay stakes from one-event solutions — no joint optimization required.
5. **Effort:** ~2 days: implement implicit-cash Kelly + active-set prefix sort + Whitrow shrinkage; backtest on GSE's pick log.

## 12. Reproducible test
Dataset: GSE's 2022–2025 pick log with model probabilities and market prices. Metrics: (a) compute isolated Kelly stakes vs. Whitrow-shrunk simultaneous stakes per slate; verify the shrinkage is small and cubic in measured edge (regress log-shrinkage on log-edge, expect slope ≈ 2); (b) backtest bankroll growth: full-Kelly isolated vs. shrunk-simultaneous vs. naive equal-stake — compare log-growth and max drawdown. Baseline: Thorp's binary formula as a unit test (implement Eq. 6.1, check against the cubic expansion). Pass if the shrunk-simultaneous portfolio matches or beats isolated Kelly on risk-adjusted log-growth and the active-leg gate filters ≥1 historically -EV parlay leg per month from GSE's content pipeline.

## 13. Acceptance / rejection gate
**Adapt** the implicit-cash Kelly + Whitrow shrinkage as GSE's canonical simultaneous-slate sizer if the backtest shows risk-adjusted log-growth ≥ isolated Kelly (expectation: it wins on drawdown via the cubic drag). **Adopt** the O(ε⁴) result immediately as the quantitative justification for the no-whalelays stance — it needs no backtest, it's a theorem. **Reject** only the literal full-Kelly magnitudes: GSE should use fractional Kelly (e.g., half) on top, since the paper's log-utility maximizer assumes no model error and GSE's probabilities are estimates.

## 14. Improvement experiment
The paper assumes independence — GSE's edge: extend the perturbation to *correlated* legs. For same-game parlays / correlated props, the interaction terms are no longer O(ε⁴) but first-order in the correlation. Derive (or numerically estimate) the correlation-adjusted shrinkage by replacing the independence assumption with GSE's empirical leg-correlation matrix, and test whether correlation-aware simultaneous Kelly beats the independence-assuming version on same-game-parlay backtests. If the gap is large, GSE gets a genuinely novel result: a Kelly sizer for correlated parlays, which is exactly the product books don't want bettors to have — and a natural premium-content tier ("the math of why your SGP is worse than you think, and the stakes that fix it").
