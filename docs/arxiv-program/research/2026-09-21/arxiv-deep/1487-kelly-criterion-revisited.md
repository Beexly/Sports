# [1487] Kelly Criterion revisited: optimal bets (arXiv:physics/0607166v1)

**Citation:** Edward W. Piotrowski, Malgorzata Schroeder (2006). *Kelly Criterion revisited: optimal bets*. arXiv:physics/0607166v1. URL: https://arxiv.org/abs/physics/0607166
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 9 pages; p. 8 is a projective-geometry figure that did not extract as text — the diagram of lines u, w, m, n and profit flow; all equations and prose sections I–VI plus appendix Mathematica code were read).
**Verdict:** ADAPT
the parimutuel/projective-geometry machinery is overkill for fixed-odds books, but the paper's closed-form optimal stakes, entropy decomposition of Kelly profit, and the "profit only vs irrational money" result belong in GSE's bankroll layer as fractional-Kelly sizing on engine edges vs de-vigged lines.

## 1. Research question
Why does the Kelly criterion (maximize expected log-wealth) beat other staking strategies for bookmaker bets, and what does the optimal strategy look like when (a) odds are set parimutuel-style from the betting pool, and (b) the bettor is large enough to move the pool? The authors derive optimal stakes via projective-geometry symmetries, give a financial (entropic) interpretation of Kelly's formula, and argue a "no-go" hypothesis: no closed-form optimal strategy exists for big investors.

## 2. Dataset / schema
No dataset. Pure theory paper (mathematical finance / econophysics). All results are analytic derivations from the bet model; the only "empirical" content is citations (Thorp on blackjack Kelly application; Poundstone's *Fortune's Formula*).

## 3. Method / model
Two-outcome bookmaker bet model: pools IN₁, IN₂ (sums of all gamblers' wagers on each side), "fair" parimutuel odds outₖ = αₖ·inₖ with αₖ = (IN₁+IN₂)/INₖ (pool shared among winners, no bookmaker cut, no fees/taxes). Gambler stakes fractions lₖ = inₖ/all₀ of current capital. Profit is modeled as the unique additive invariant (log of cross-ratio) of projective homographies, giving zₖ = ln(allₖ) − ln(all₀). Maximize E[z] = p₁z₁ + p₂z₂ over (l₁, l₂):
E(z)(l₁,l₂) = p₁·ln(1 + (IN₂/IN₁)·l₁ − l₂) + p₂·ln(1 + (IN₁/IN₂)·l₂ − l₁). (Eq. 5)
Two regimes analyzed: (i) short positions allowed (unconstrained) → a line of optimal solutions; (ii) no shorts (l₁,l₂ ≥ 0, the realistic case) → a unique minimal-stake optimum. Big-gambler extension: pool grows by factor (1+δ) from the gambler's own money; first-order correction to E[z] in δ computed (Eq. 8); extremal conditions (Eq. 9) reduce to roots of quintic polynomials → no analytic solution (Galois-theory argument).

## 4. Equations & assumptions
- Stake fractions: lₖ := inₖ/all₀; Σₘ inₖᵐ = INₖ (pool sums). (Eq. 1)
- Parimutuel odds: outₖᵐ = αₖ·inₖᵐ; αₖ = (IN₁+IN₂)/INₖ ∀k. (Eqs. 2–4)
- Capital after outcome k: allₖ = all₀ − in₁ − in₂ + outₖ. (Eq. 4)
- Profit invariant: zₖ := ln|[n,u,w,m]| = ln(allₖ) − ln(all₀) (cross-ratio of projective points n,u,w,m).
- Expected log-growth: E(z)(l₁,l₂) = p₁·ln(1 + (IN₂/IN₁)l₁ − l₂) + p₂·ln(1 + (IN₁/IN₂)l₂ − l₁). (Eq. 5)
- Optimal-stake family (shorts allowed): (l̄₁ − p₁)·IN₂ = (l̄₂ − p₂)·IN₁. (Eq. 6)
- Maximal expected growth: E(z)(l̄₁,l̄₂) = −Σₖ₌₁,₂ pₖ·ln(INₖ/(IN₁+IN₂)) − S, where S = −Σₖ pₖ·ln pₖ is Boltzmann/Shannon entropy. (Eq. 7)
- Consequence: E(z) ≥ 0 always; E(z) = 0 iff p₁·IN₂ = p₂·IN₁ (pool-implied probabilities match true probabilities).
- No-short optimum: if p₁·IN₂ > p₂·IN₁ (side 1 mispriced in gambler's favor): l₁* = p₁ − (IN₁/IN₂)·p₂, l₂* = 0. Under Laplace indifference (IN₁ = IN₂, p₁ > p₂): l₁* = p₁ − p₂, l₂* = 0.
- Big-player correction: ∂E_δ/∂δ|₀ term (Eq. 8, table in text); extremal system (Eq. 9) → quintics (Appendix Mathematica code generates them); "an analytic form of the conditions for the optimal big player's strategy is not [attainable]" by Galois theory.
- Assumptions: (1) binary outcome; (2) parimutuel odds with zero bookmaker margin and no fees/taxes; (3) gambler knows true probabilities pₖ; (4) small gambler doesn't move the pool (δ→0 baseline); (5) log-utility (growth-rate maximization) is the objective; (6) single-period, one bet at a time.

## 5. Features / target
Not applicable — theory paper, no features. The "target" is the optimal stake vector (l₁*, l₂*) given (p₁, p₂, IN₁, IN₂).

## 6. Validation design
No empirical validation; proof-based. The only external grounding cited: Thorp's successful Kelly application to blackjack [7] and horse-race/financial-market adoption mentioned in the introduction. No backtest, no baseline comparison, no dataset.

## 7. Numerical results / baselines
No numerical results reported (no experiments). The paper's quantitative claims are the closed forms above: the entropy decomposition (Eq. 7), the no-short optimum l₁* = p₁ − (IN₁/IN₂)p₂, and the degree-5 polynomial characterization of the big-player optimum. The substantive qualitative result: "one can make profit in the bookie bet only when somebody bets irrationally in the same game" — i.e., Kelly profit = profit-on-unpopularity (seer's profit) minus entropy.

## 8. Code / data availability
Appendix gives Mathematica 5.2 code that generates the quintic polynomials characterizing big-player optimal stakes (symbolic Collect/Numerator/Together/Factor pipeline). No data, no repo link.

## 9. Leakage & limitations
- Parimutuel assumption (odds = pool share, zero margin) does not describe US sportsbooks: fixed odds with ~4.5–5% vig. The exact formulas need re-derivation for fixed-odds; only the no-short optimum's *structure* (bet only the mispriced side, stake proportional to probability-minus-implied-probability gap) transfers.
- Assumes the gambler knows true pₖ — in practice p̂ comes from GSE's engine with estimation error; raw Kelly on noisy p̂ is known to overbet (the paper ignores this; fractional Kelly is the standard patch, not discussed).
- Single binary bet, one period; no portfolio of simultaneous correlated bets (NFL Sunday slates are exactly that — correlated via game script/total).
- The "no-go hypothesis" (Galois-theory unknowability for big players) is philosophy-of-math speculation built on the parimutuel model; market-impact modeling for fixed-odds books is a different, tractable problem (limit-order/line-move response).
- No empirical test of any kind; entropy interpretation is elegant but adds no predictive content beyond standard Kelly.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: "Bet sizing / decision: Kelly criterion (mentioned 12×, no paper read), Wang Transform (oracle3, prediction-market lane), fourth-down WP models (nfl4th…)". So Kelly is referenced repeatedly in GSE's corpus but has never been read in depth — this paper fills that exact gap. It is an extension/foundation: GSE's engine produces win probabilities (v5.2.7, `picks` table) and the X-posting lane publishes picks, but there is no documented bankroll/stake-sizing layer. New capability: principled stake sizing. Note the paper's parimutuel framing does NOT match US books, so the standard fixed-odds Kelly formula must be used instead.

## 11. GSE implementation spec
1. Add a `staking` module to the Sports repo (or gse-lab): inputs = GSE engine win prob p̂ per pick + de-vigged market-implied probability q (from Odds API consensus, existing lane) + decimal odds b.
2. Fixed-odds Kelly (the standard form this paper's no-short optimum generalizes): f* = (b·p̂ − (1−p̂))/b = (p̂ − q)/(1 − q) for decimal odds b; bet only when p̂ > q (the paper's "bet only the mispriced side" result, l₂* = 0).
3. Apply fractional Kelly (½ or ¼) to absorb p̂ estimation error — the paper's exact-knowledge assumption is the known failure mode; log the full-Kelly vs fractional-Kelly growth paths on the historical `picks` table (3,411 engine picks) as the offline test.
4. Correlated-slate handling (beyond the paper): cap total simultaneous exposure per slate at a fixed bankroll fraction; down-weight correlated legs (same-game spread+total).
5. Publish only the *unit* sizes on X (the copy doctrine already avoids "whalelays"; Kelly sizing reinforces the singles-only stance, 2026-09-21 parlay rule).
6. Effort: ~1–2 days for the module + backtest on the existing picks table.

## 12. Reproducible test
Dataset: GSE engine `picks` table (3,411 SPREAD/MONEYLINE/TOTAL picks, model v5.2.7) joined to historical closing lines (Odds API / existing odds captures). Metric: bankroll growth (log-wealth) and max drawdown over the sample, Kelly-sized (½-Kelly) vs flat 1-unit staking. Baseline to beat: flat staking — accept if ½-Kelly log-wealth ≥ flat + 0.05 with max drawdown ≤ flat's. Time window: full picks history (2026 season to date). This tests the paper's core claim (log-growth maximization beats naive staking) on GSE's own edge distribution.

## 13. Acceptance / rejection gate
ADAPT if the ½-Kelly backtest on the engine's historical picks shows log-wealth ≥ flat staking with no worse max drawdown — then wire fractional-Kelly units into the posted-pick pipeline. Reject the sizing layer (keep flat units) if Kelly underperforms flat on the backtest or if realized edge (p̂ − q calibration) is too noisy for stable stakes (stake variance > 3× flat). The paper's parimutuel formulas themselves are NOT adopted (wrong market structure for US books).

## 14. Improvement experiment
Beyond the paper: Kelly-with-shrinkage. The paper assumes known p; GSE's p̂ has error. Run a follow-up experiment comparing ½-Kelly against "calibrated Kelly" where p̂ is first shrunk toward the de-vigged market q by an empirical-Bayes factor estimated from the engine's historical calibration curve (reliability diagram slope), i.e., stake on p̃ = λp̂ + (1−λ)q. Hypothesis: calibrated-Kelly beats both raw ½-Kelly and flat staking on log-wealth because it only bets the *reliably estimated* portion of edge — directly operationalizing the paper's "profit only when somebody bets irrationally" (here: only when the market, not the engine, is the irrational one).
