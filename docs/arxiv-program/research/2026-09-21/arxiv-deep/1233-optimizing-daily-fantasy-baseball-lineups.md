# Deep-Research Ledger 1233 — arXiv:2411.11012v1 [PRIORITY / AUDIT-MANDATED REPLACEMENT]

**Title:** Optimizing Daily Fantasy Baseball Lineups: A Linear Programming Approach for Enhanced Accuracy
**Authors:** Max Grody, Sandeep Bansal, Huthaifa I. Ashqar
**Version read:** v1. Full read verified on 2026-09-21: all sections (SaberSim data description, projection accuracy analysis, PuLP integer-program formulation, portfolio generation, 30-day analysis, proposed improvements, conclusion). Text source: `2411.11012.pdf` → `pdftotext -layout`.
**Note:** this paper is the audit-mandated replacement for the bogus slot 2603.04864v1 and receives priority treatment.

## 1. Question asked

Can a binary integer (linear) program built on SaberSim projections generate profitable FanDuel MLB lineups, and how accurate are the underlying projections?

## 2. Dataset / schema

**SaberSim data, June 1–11, 2019; 408 players.** Fields per player-slate: projection, actual fantasy points, salary, projection-minus-actual. Summary stats reported: mean projection **8.41**, mean actual **9.55**, mean salary **~$3,903**, minimum actual **−15**.

## 3. Method

1. **Projection audit:** compare SaberSim projections to actuals over the sample; report error statistics.
2. **Optimizer:** nine-player FanDuel MLB binary integer program, **$35,000** salary cap, implemented in **Python/PuLP with the default COIN-OR solver** — maximize summed projection subject to positional and salary constraints.
3. **Portfolio generation:** solve iteratively with exposure caps (worked example: cap each player at 25 of 100 lineups) to produce a diversified multi-lineup portfolio.
4. **Evaluation:** 30-day analysis comparing the highest-projected lineup's average score vs the hindsight-optimal lineup's average score.

## 4. Equations / assumptions

- Standard binary IP: max Σ p_i x_i s.t. Σ s_i x_i ≤ 35,000, positional constraints, x_i ∈ {0,1} (9 players).
- Exposure constraint: Σ_{lineups} x_{i,l} ≤ 25 for 100 lineups (example).
- **Assumptions:** projections are unbiased point estimates worth maximizing; maximizing expected points is the right objective for tournaments (no ownership/variance modeling — see §9); the 11-day sample generalizes.

## 5. Features / target

Features = (projection, salary, position) per player per slate. Target = the 9-man roster maximizing projected points under the cap.

## 6. Validation

- **30-day analysis:** highest-projected lineup averaged **144.6** actual points; hindsight-optimal lineup averaged **251.9**; discrepancy **107.3** points — i.e., the optimizer's best pick captured ~57% of the ex-post optimum on average.
- **No historical contest validation:** the authors state they lacked contest access, so there is no entry-fee/payout/ROI result of any kind.

## 7. Exact results

- Projection stats: mean projection 8.41 vs mean actual 9.55 (projections biased low on average), mean salary ~$3,903, min actual −15.
- The paper reports **10.510** as "mean squared error" and **0.19** as "R-mean-squared." This terminology is nonstandard and likely wrong (an R² of 0.19 alongside an MSE of 10.51 on a mean of ~9 is at best sloppily labeled); the ledger does not repair it — treat both numbers as unreliable.
- Lineup results: 144.6 (model's best) vs 251.9 (hindsight) vs 107.3 gap, over the 30-day window.
- Proposed but **untested**: lineup stacking and upper-tail/90th-percentile projections for tournaments.

## 8. Code / data availability

Method described (Python/PuLP/COIN); no code or data released. SaberSim is a commercial product.

## 9. Leakage / limitations

- **Methodology is weak:** 11 days of data, no contest validation, no train/test split, no payout modeling — the 144.6-vs-251.9 comparison is descriptive, not a profitability claim.
- Maximizing mean projection is a cash-game objective misapplied to tournaments; no variance, ownership, or correlation (stacking) modeling — though the authors propose stacking as future work.
- Projection error statistics are mislabeled ("R-mean-squared" 0.19); cannot be trusted or reused numerically.
- MLB/FanDuel-specific (9-man, $35k); transfer to NFL DraftKings needs re-derivation of constraints.
- Sample period (June 2019) is a single seasonal slice.

## 10. GSE overlap

Directly in the DFS lane (thin lane this wave is correcting):

- `docs/research/2026-09-13-dfs/deep/winning-lineups-2026-09-13.md` — winning-lineup archetypes; this paper's 107.3-point projection-vs-hindsight gap quantifies how far a pure projection-maximizer sits from tournament-winning scores.
- `docs/research/2026-09-13-dfs/verify/papers-scoring-strategy-2026-09-13.md` — scoring-strategy verification; the exposure-cap portfolio method (25/100) is a concrete diversification baseline to compare against GSE's current approach.
- `docs/research/2026-09-13-dfs/fanduel-week1-2026-dfs-research.md` — FanDuel optimizer research; PuLP/COIN integer programming is the same solver family — results here transfer directly.

## 11. Implementation spec (GSE)

**PuLP portfolio generator for NFL DFS.** Per slate:
1. Ingest GSE projections + salaries + positions; formulate the binary IP (max projected points, salary cap, positional constraints) in PuLP/COIN-OR — mirroring the paper.
2. Generate N lineups iteratively with per-player exposure caps (start at 25%) and a minimum-projected-points floor.
3. Add the paper's *untested* proposals as first-class features: correlation/stacking constraints (e.g., force QB+pass-catcher pairs) and 90th-percentile (upper-tail) projections as an alternate objective for tournaments.
4. Log the projection-vs-actual gap per slate (the paper's 107.3 analogue) as a standing optimizer diagnostic.

## 12. Reproducible test

Rebuild the 9-man FanDuel MLB IP in PuLP on any 11-day public projection/salary sample; verify the solver returns the projection-maximal feasible roster (check KKT/integrality trivially — binary IP with 408 variables solves in seconds) and that iterative exposure-capped generation yields 100 distinct lineups.

## 13. Numeric gate

On a held-out MLB slate sample: the optimizer's top lineup must outscore the mean of 100 random feasible lineups by ≥ 30 points (proving the IP is doing work, the paper's implicit claim), and the 25%-exposure portfolio must contain no duplicate lineups.

## 14. Improvement experiment

A/B the paper's plain projection-maximization against the upper-tail-projection + stacking variant (§11.3) on historical NFL DFS slates with archived contest payouts: measure simulated ROI at low/mid/high stakes. Expectation from the paper's own 107.3-point gap: plain maximization underperforms in tournaments; the tail+stacking variant should close part of the gap — quantify how much.

**Verdict:** ADAPT
