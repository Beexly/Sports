# [1141] Optimizing for Rotisserie Fantasy Basketball (arXiv:2501.00933)

**Citation:** Rosenof, Z. (2025). *Optimizing for Rotisserie Fantasy Basketball*. arXiv:2501.00933. URL: https://arxiv.org/abs/2501.00933
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2501.00933v1 [stat.ME]; main text, appendices A–B derivations, and Appendix C lemmas fully read).
**Verdict:** ADAPT

The tractable win-probability objective V = Φ(µD/σD) and its "prefer balanced 50-50 matchups / variance-is-upside" logic port directly to NFL DFS tournament (GPP) lineup optimization and season-long fantasy roster construction; the basketball-rotisserie specifics do not.

## 1. Research question
Rotisserie (rank-per-category, most-total-fantasy-points-wins) has no tractable objective function: the natural objective, P(win the league), requires enumerating ~(|T|!)^|C|/|T| scenarios (for 12 teams × 9 categories, "above 10" — text truncated, on the order of 10^82 orderings). Can a differentiable approximation of the win probability be derived so the author's existing H₀ draft-optimization algorithm (built for head-to-head) can be applied to Rotisserie?

## 2. Dataset / schema
Simulated NBA fantasy seasons 2004-05 through 2023-24. Seasons simulated by sampling weekly results from real seasons (as in Rosenof 2024a/b), with Rotisserie scoring applied to full-season weekly averages (equivalent to full-season totals) and Gaussian noise added to categorical performances. Noise std: τM·|N| for counting stats, τR/|N| for percentage stats (|N| = players per team), scaled by χ² with χ ∈ {0.25, 0.5, 0.75} encoding confidence in pre-season projections relative to week-to-week variance. Category correlation ρ = average player-level correlation matrix in the draft pool Q, volume-adjusted for percentage stats. No real user/draft data; purely simulated validation.

## 3. Method / model
Derives a closed-form Normal-approximation objective: V = Φ(µD/σD), where D = (team t's fantasy-point total) − (highest opponent total), decomposed as D = ((|O|+1)/|O|)Zt − |C|(|O|+1)/2 − L, with L = max-opponent-minus-average-opponent. Key machinery: µT = ΣcΣo Φ(µc,o) (expected fantasy points as summed matchup-win probabilities); σT² = Bernoulli variances Φ(1−Φ) plus pairwise covariance terms via Lemma 1 (bivariate Normal CDF ≈ Φ(x)Φ(y) + ρφ(x)φ(y) for small ρ); MEV/MVAR tables (expected value/variance of max of N iid standard Normals, N ≤ 20); Owen's integrals for closed-form expectations under Assumption 4. Full gradient ∇c,o(V) derived (Eqs. 13–15, Appendix B) so the objective is differentiable for H-scoring gradient descent. Four stated assumptions: (1) fantasy point totals are Normal; (2) opponent distributions identical and independent; (3) (max − average) opponent difference is Normal; (4) expected point differentials vs opponents are iid Normal(0, empirical SD).

## 4. Equations & assumptions
- V = Φ(µD/σD) (1); µD = ((|O|+1)/|O|)µT − |C|(|O|+1)/2 − µL (2); σD² = ((|O|+1)/|O|)²σT² + σL² (3).
- µT = Σc∈C Σo∈O Φ(µc,o) (4); µL = MEV(|O|)·E(σM²)^½ (5); σT² = ΣcΣo Φ(µc,o)(1−Φ(µc,o)) + ½ΣaΣb ρa,b HT(a,b) (6); σL² = E(σM²)·MVAR(|O|) (7).
- Helper functions: FT(c) = Σo φ(µc,o) (9); GT(a,b) = Σo φ(µa,o)φ(µb,o) (10); HT, HM piecewise definitions (11–12); gradient equations (13–15) as stated in §5.3.3.
- Lemmas: (1) Φ(x)Φ(y)+ρφ(x)φ(y) ≈ bivariate Normal CDF for small ρ; (2) MEV/MVAR tabulated to N=20; (3) √(large positive Normal) ≈ Normal.
- Assumptions: Normality of point totals (CLT with weak dependence, Bradley 1981); identical independent opponents; Normal max-minus-average; Normal opponent differential distribution. Limitations §7.3 honestly enumerates violations: opponents aren't identical (draft-seat advantages), aren't independent (zero-sum points), max-of-Normals is Gumbel not Normal, inattentive managers distort counting stats.

## 5. Features / target
Inputs: per-category matchup win probabilities µc,o (X-scores normalized so point differentials have unit variance), cross-category correlation ρa,b, opponent count |O|, category count |C|. Target: V, the approximated probability of winning the league — used as the draft objective inside H₀.

## 6. Validation design
Simulation only: H₀-with-Rotisserie-objective drafters vs a field of G-score (static heuristic) drafters, across simulated seasons 2004-05–2023-24, at three χ levels. Metric: fraction of simulated seasons won. Baseline: 1/12 ≈ 8.3% (random among 12 teams). No real-money or real-league validation; no human drafters in the field.

## 7. Numerical results / baselines
H₀ Rotisserie win rates vs G-score field: χ=0.25 → 37.5%; χ=0.5 → 17.2%; χ=0.75 → 12.1%. All above the 8.3% baseline. Effect shrinks as projection uncertainty (χ) grows — at χ=0.75 the edge is 12.1% vs 8.3%.
Behavioral finding: H₀ punted (abandoned) categories far less than head-to-head versions — consistent with Rotisserie conventional wisdom — except occasional Free Throw % punts at low χ (every punting team at χ=0.25 drafted ≥1 of four notoriously poor-FT% players; Table 2).
Core theoretical insight (§7.2.1): because µD is generally negative, increasing σD raises V; per-matchup variance Φ(1−Φ) is maximized at Φ=½, so the objective implicitly rewards balanced teams (50-50 matchups) and penalizes punting, which narrows outcome spread. Punting only pays when it raises expected value enough to offset the variance loss.
No confidence intervals reported; number of simulated seasons per setting not stated in extracted text.

## 8. Code / data availability
None stated (no code link; prior H-scoring work referenced as Rosenof 2024a/b).

## 9. Leakage & limitations
- **Simulation-only**: the "opponents" are G-score heuristic drafters, not humans; real drafts include behavioral inefficiencies the model doesn't face.
- **χ is a guess**: no empirical survey of pre-season projection accuracy exists (author admits); the headline 37.5% win rate is at the lowest uncertainty setting.
- **Assumption 2 routinely violated**: draft-seat advantages make some opponents systematically stronger; points are zero-sum so opponents are negatively correlated.
- **Gumbel vs Normal** for the max (author argues practical similarity, citing flood-engineering literature — plausible but unquantified).
- **External validity**: basketball Rotisserie; NFL season-long fantasy is usually head-to-head or best-ball, not Rotisserie; the exact objective doesn't transfer, but the Φ(µ/σ) structure does.

## 10. GSE overlap
GSE's DFS lane (ledger 0010, MILP optimizer) maximizes expected lineup points — the cash-game objective. The GPP (tournament) objective — maximize P(finish above the pay line / win) — is NOT in the existing-research map. This paper's V = Φ(µD/σD) is exactly the mathematical form of a tournament objective: you need upside variance, not just expectation. Direct extension, not duplicate. Also relevant to season-long best-ball: "don't punt, prefer balanced 50-50 exposures" maps to best-ball roster construction (avoid over-concentration).

## 11. GSE implementation spec
Build a GPP (tournament) DFS objective for the existing MILP optimizer:
1. Keep the projection means µi and build a lineup covariance model: per-player score distributions (Normal or empirical from 2024 nflverse weekly fantasy points), with correlations from game-stack structure (QB–WR same-team positive, QB vs opposing-DST negative, etc.) — analogous to the paper's ρa,b.
2. Replace the MILP's maximize-expected-points objective with maximize Φ((µ_lineup − payline)/σ_lineup), where payline = estimated cash-line score for the contest (from historical contest data or field simulation). This is exactly V = Φ(µD/σD) with D = lineup − payline.
3. Solve via the paper's gradient approach or via scenario-based MILP (sample K lineup-score scenarios, maximize fraction above payline — a tractable MILP formulation of the same idea).
4. For season-long best-ball: use the same objective at draft time with µ = projected season points, σ from projection uncertainty — formalizing "balanced roster beats stars-and-scrubs when you need to beat 11 opponents."
Effort: ~2 weeks (covariance model from nflverse + MILP objective swap + backtest harness).

## 12. Reproducible test
Dataset: 2024 NFL DraftKings DFS slates, weeks 1–17, GPP contests. Baseline: GSE's existing max-expected-points MILP lineups (20 per week). Treatment: max-Φ((µ−payline)/σ) lineups (20 per week). Metric: fraction of lineups cashing + mean percentile vs field (simulate field from historical score distributions or use actual contest results if available). Success: treatment beats baseline cash rate by ≥ 5 percentage points over the 17-week window.

## 13. Acceptance / rejection gate
ADOPT the GPP objective into the weekly DFS pipeline only if, on the 2024 17-week backtest, tournament-objective lineups beat max-expectation lineups by ≥ 5 pp in cash rate AND the top-1% hit rate (lineups finishing in the top 1%) is not worse. If it only helps in theory but not in the backtest, keep max-expectation for cash games and mark GPP as research.

## 14. Improvement experiment
Make the payline adaptive: instead of a fixed historical payline, model the payline distribution conditional on slate features (total, pace, chalk ownership) and maximize E_payline[Φ((µ−payline)/σ)] by quadrature. Hypothesis: on high-total shootout slates the payline shifts right and the fixed-payline version under-builds variance; the adaptive version should add another 2–3 pp of cash rate on the top-quintile-total slates.
