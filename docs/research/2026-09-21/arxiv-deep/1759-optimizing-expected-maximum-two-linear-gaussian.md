# 1759 Optimizing the Expected Maximum of Two Linear Functions Defined on a Multivariate Gaussian Distribution (arXiv:2112.07002v2)

**Citation:** David Bergman, Carlos Cardonha, Jason Imbrogno, Leonardo Lozano (2022). *Optimizing the Expected Maximum of Two Linear Functions Defined on a Multivariate Gaussian Distribution*. arXiv:2112.07002v2. URL: https://arxiv.org/abs/2112.07002
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).

## 1. Research question

Can you jointly optimize TWO correlated lineups to maximize the expected value of the BETTER of the two — E[max(X₁, X₂)] where X₁, X₂ are the random scores of two lineups under a multivariate Gaussian player-score model — and does this beat the standard approach of just picking the two highest-EV lineups independently? The paper proves the problem NP-hard, derives a closed-form Gaussian objective, solves it exactly with a cutting-plane algorithm, and backtests it on real DraftKings NFL Showdown contests with real money results.

## 2. Dataset / schema

- **Training:** 2014–2017 NFL seasons (4 seasons) of player fantasy performances.
- **Means:** sourced from FantasyData projections.
- **Variances:** estimated from the 50 historical same-position player performances nearest in projected points to each player.
- **Correlations:** estimated from 50 historical player-pair performances (analogous pairs); correlations with p-value > 0.25 set to zero, then covariance repaired to PSD via `cov_nearest` (statsmodels).
- **Evaluation:** 16 DraftKings Showdown contests from the 2018 NFL season with actual contest results (entry fees, payouts, winner scores).
- **Showdown rules modeled:** 6 players (5 flex + 1 captain); captain costs 1.5× salary and scores 1.5× points; no duplicate player per entry; at least one player from each team; only players projected ≥ 5 points eligible.

## 3. Method / model

For two lineups with score vectors, the paper uses the closed-form expression for E[max] of two correlated Gaussians (from the literature): E[max(X₁,X₂)] = μ₁Φ(δ) + μ₂Φ(−δ) + θφ(δ), where δ = (μ₁−μ₂)/θ, θ = √(σ₁² + σ₂² − 2σ₁₂), Φ/φ are standard normal CDF/PDF. They formulate a mixed-integer nonlinear program (MINLP) maximizing this objective subject to Showdown lineup constraints, and solve it with a cutting-plane algorithm extending the integer L-shaped method — iteratively adding linear cuts that upper-bound the nonlinear objective. They also test a heuristic (solve two independent max-EV lineups). A second application (stochastic knapsack-style) is included but the DFS application is the substantive one.

## 4. Equations & assumptions

- Objective: max E[max(cᵀx₁·ξ, cᵀx₂·ξ)] where ξ ~ N(μ, Σ), x₁,x₂ are binary lineup vectors.
- Closed form: E[max] = μ₁Φ((μ₁−μ₂)/θ) + μ₂Φ((μ₂−μ₁)/θ) + θφ((μ₁−μ₂)/θ), θ = √(σ₁²+σ₂²−2ρσ₁σ₂).
- NP-hardness: proved even with unconstrained feasible region (reduction in the paper).
- Cutting planes: at incumbent (x̂₁,x̂₂), add cut η ≤ E[max](x̂) + gᵀ(x−x̂) using subgradients of the closed form.
- Assumptions: player scores jointly Gaussian; means from FantasyData are unbiased; 50-nearest-neighbor variance/correlation estimates are representative; correlations with p>0.25 are truly zero; `cov_nearest` repair preserves the correlation structure relevant to the optimum.

## 5. Features / target

Features: player projected points (FantasyData), salary, team, position; historical same-position performance distributions (for variance); historical pair co-performances (for correlation). Target: the two binary lineup vectors (x₁, x₂) maximizing E[max score]. The "label" is implicit — the objective is the closed-form expectation, not a learned predictor.

## 6. Validation design

Backtest on 16 real 2018 DraftKings Showdown contests. For each contest, the algorithm generated 2 entries; results compared against actual contest payouts. Two methods: exact (cutting-plane) vs heuristic (two independent max-EV lineups). Metrics: total entry fees, total winnings, profit; also reported per-contest EV, objective value, and actual best-entry score. Contest selection caveat: the 16 contests were those "available" — a selected sample (see §9).

## 7. Numerical results / baselines

Table 3 (exact method), totals across 16 contests:
- Entry fees: **$9,674**; Winnings: **$15,050**; **Profit: +$5,376 (+55.6% ROI)**.

Table 3 (heuristic), totals:
- Entry fees: $9,674; Winnings: $5,300; **Profit: −$4,374 (−45.2% ROI)**.

Table 4 (averages across contests):
- Exact: EV 94.65, objective 112.15, actual best entry 100.09.
- Heuristic: EV 95.84, objective 105.47, actual best entry 97.41.
- Key finding: the heuristic's average EV was **1.19 points HIGHER**, but the exact method's expected-max objective was **6.68 points higher** — and the exact method's actual best entry outscored the heuristic's by 2.68 points. Maximizing E[max] beats maximizing EV.

## 8. Code / data availability

No public code repo linked in the paper. Method fully specified (closed-form objective, cutting-plane pseudocode, covariance estimation procedure). Data: FantasyData projections (commercial), 2014–2017 historical performances, 2018 Showdown contest results — replicable with a FantasyData subscription and DK contest archives.

## 9. Leakage & limitations

- **Contest selection bias:** only 16 "available" 2018 Showdown contests were tested; the paper does not describe the selection rule. If contests were chosen ex post for availability, results may not generalize.
- **Payoff accounting:** evaluation assumes the algorithm's entries are ADDED to contests without displacing other entries; in filled contests, entry is zero-sum and the marginal ROI would differ.
- **Only two entries:** the method optimizes exactly 2 lineups; real GPPs allow up to 150. The E[max] objective for n>2 has no such clean closed form (this is where 2407.13438's EMS/SAA approach takes over — see ledger 1760).
- **Gaussian tails:** fantasy scores are skewed (especially captain 1.5×); the Gaussian assumption understates tail correlation and boom/bust asymmetry.
- **Hand-built covariance:** 50-nearest-neighbor estimation with p>0.25 zeroing is ad hoc; `cov_nearest` repair can distort the correlations that matter most (high-leverage stacks).
- **Small sample:** 16 contests is a small backtest; the +$5,376 profit has wide confidence intervals.

## 10. GSE overlap

The corpus has single-lineup MILP optimizers (1604.01455, 2309.15253, 2411.11012) and a multi-entry portfolio IP (1604.01455's follow-up work, 1091), but NO ledger does joint E[max] optimization of correlated lineups with a closed-form Gaussian objective. Ledger 1091 (multi-entry portfolio IP) maximizes expected payout via scenario IP; this paper maximizes E[max score] analytically. The Showdown/captain-mode treatment is also new to the corpus (no existing ledger covers captain mode). Directly complements 1760 (which handles n>2 via SAA/PROP+).

## 11. GSE implementation spec

1. **Two-entry Showdown optimizer:** implement the closed-form E[max] objective (μ₁, μ₂, σ₁, σ₂, ρ) in the GSE optimizer as a "duel mode": given player means (GSE projections), variances (from GSE's projection distributions), and correlations (from GSE's stacking model), solve the 2-lineup Showdown MILP via the paper's cutting-plane method (or via a commercial MINLP solver using the closed form directly — the objective is smooth and differentiable).
2. **Covariance upgrade:** replace the paper's 50-NN estimation with GSE's own: fit player score distributions from NGS/tracking data; estimate correlations from game-script-conditioned co-performance (QB-WR stacking correlations are the highest-leverage inputs).
3. **Captain-mode constraints:** encode DK Showdown rules (1.5× captain cost/score, ≥1 player per team, no duplicates) as linear constraints — the paper's formulation is directly portable.
4. **Extend to n entries:** for >2 entries, switch to the SAA/PROP+ approach of ledger 1760; use this paper's exact 2-entry solution as a warm start and as a benchmark for the heuristic's optimality gap.
5. Cost: ~1 week (closed form is 10 lines; cutting-plane loop ~200 lines; covariance from existing GSE distributions).

## 12. Reproducible test

Dataset: 2024 NFL season Showdown contests (DK). Build GSE projection means/variances/correlations. Baselines: (a) GSE's current single-lineup optimizer run twice (top-2 EV lineups); (b) the paper's exact E[max] method. Metrics: simulated E[max score] over 10,000 score draws; realized max score on actual 2024 contest data. Success gate below.

## 13. Acceptance / rejection gate

**Adopt the E[max] duel optimizer if** on 2024 Showdown backtests the exact 2-entry method's realized best-entry score beats the top-2-EV baseline by ≥2.0 points on average across ≥20 contests AND the simulated E[max] improvement is ≥4.0 points (matching the paper's 6.68-point objective gap direction); **reject** if the Gaussian assumption causes the optimizer to systematically miss (e.g., under-selecting high-variance captain plays that win Showdowns) — in which case keep the formulation but replace Gaussian with a skew-t or empirical copula and re-test. Kill if implementation exceeds 2 weeks (the MINLP should solve in minutes per contest; if cutting-plane stalls, use the closed form in a nonlinear solver).

## 14. Improvement experiment

**n-entry E[max] via sequential Gaussian conditioning:** extend the closed form beyond 2 entries by greedy sequential optimization — fix entry 1, then optimize entry 2's E[max(entry1, entry2)] via the paper's method, then entry 3 maximizing E[max(entry1, entry2, entry3)] approximated by moment-matching the max of the first two as a Gaussian (mean/variance of max via the same closed form, correlation via numerical integration). Compare against the SAA approach of 1760 on 20-entry Showdown portfolios: hypothesis is the sequential-Gaussian method is 10× faster than SAA with ≤1-point E[max] loss. Test on 2024 Showdown data; success = within 1.5 points of SAA's E[max] at <10% of compute.

**Verdict:** ADAPT — Joint E[max] optimization of correlated Showdown lineups with real-money validation (+55.6% ROI vs −45.2% for max-EV heuristic). Directly upgrades GSE's optimizer from single-lineup EV to multi-entry expected-maximum.
