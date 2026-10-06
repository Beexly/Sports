# [0425] OpenSkill: A faster asymmetric multi-team, multiplayer rating system (arXiv:2401.05451v1)

**Citation:** Vivek Joshy (2023). *OpenSkill: A faster asymmetric multi-team, multiplayer rating system*. arXiv:2401.05451v1. URL: https://arxiv.org/abs/2401.05451v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 464 lines).
**Verdict:** ADAPT — adopt the OpenSkill library (Plackett-Luce model) as the implementation vehicle for team/player ratings where TrueSkill is too slow, keeping the existing GSE rating research as the methodological base.

## 1. Research question
Can the Weng-Lin Bayesian approximation to TrueSkill be packaged as a fast, open-source rating system that handles asymmetric, multi-team, multiplayer games (free-for-all, unequal team sizes, partial play) with accuracy comparable to TrueSkill at a fraction of the computational cost?

## 2. Dataset / schema
Benchmarks on Overwatch team matches and PUBG free-for-all matches (player counts and match counts not fully specified in the extracted text; Overwatch evaluation uses thresholds of ≥2 matches/player and ≥1 match/player). Schema: match participants, team assignment, ordinal finish/rank, per-player rating state (μ, σ). Data access: game datasets via the package's benchmark suite; not the paper's focus.

## 3. Method / model
Implements the Weng-Lin Bayesian rating approximation (the math behind TrueSkill) as the Python package `openskill.py`. Five rating models are provided; the Plackett-Luce model is recommended as the default. Each player/team carries a rating of μ (skill estimate) and σ (uncertainty). Updates are Bayesian: after each match, μ and σ update from the outcome (win/loss/rank), with σ shrinking as more matches are observed. Supports asymmetric teams, multi-team (free-for-all) ranking, partial play, and time decay via σ inflation. No weighting of individual player contributions within a team is implemented (stated limitation).

## 4. Equations & assumptions
No equations stated in the paper text — the paper is a software paper; it references the Weng-Lin approximation and points to the package documentation for formulas. Per the template rule, no equations are invented here. Assumptions (from the design): (a) skill is Gaussian-distributed (μ, σ); (b) performance is skill plus Gaussian noise; (c) the Plackett-Luce ranking likelihood correctly models multi-team finishes; (d) time decay can be modeled by inflating σ.

## 5. Features / target
Inputs: match participant lists, team assignments, ordinal outcomes (win/loss or full ranking). Target: updated (μ, σ) per player/team. Prediction horizon: next-match win probability derived from rating differentials.

## 6. Validation design
Benchmarks against a TrueSkill implementation on Overwatch (two player-history thresholds) and PUBG (free-for-all). Metrics: prediction accuracy (fraction of matches where the higher-rated side won / rank prediction) and wall-clock runtime. No cross-validation described — these are benchmark comparisons, not a research evaluation.

## 7. Numerical results / baselines
Overwatch, players with ≥ 2 matches (exact):
- OpenSkill: 556 correct, 79 incorrect, 87.56% accuracy, 0.97s
- TrueSkill: 587 correct, 48 incorrect, 92.44% accuracy, 3.41s
Overwatch, players with ≥ 1 match (exact):
- OpenSkill: 799 correct, 334 incorrect, 70.52% accuracy, 17.64s
- TrueSkill: 830 correct, 303 incorrect, 73.26% accuracy, 58.35s
PUBG (exact): Rank-Biased Overlap 64.11, accuracy 92.03% (OpenSkill; the extracted text does not give the TrueSkill PUBG comparator clearly — treat the PUBG numbers as OpenSkill-only).
My interpretation: OpenSkill trades ~2–5 points of accuracy for ~3.5× speedup. The accuracy gap is real but the speed gap dominates for large-scale use. The benchmarks may be implementation-dependent (the TrueSkill baseline's configuration is not detailed).

## 8. Code / data availability
Code: the `openskill.py` open-source Python package (pip-installable; GitHub repository). Data: benchmark game datasets via the package.

## 9. Leakage & limitations
Adversarial: (a) No player contribution weighting — in team games every member gets the full team update, so a carried player gains rating he did not earn; the paper flags this as unverified. (b) Partial-play handling is claimed but not validated. (c) Benchmarks are possibly implementation-dependent; the TrueSkill baseline may not be optimally configured. (d) Accuracy is reported without calibration or log-loss — a rating system used for probabilities needs more than hit rate. (e) The 87.56% vs 92.44% gap at ≥2 matches is not trivial; "comparable accuracy" is the paper's framing, not the numbers'. External validity to NFL: team-level NFL ratings need margin-of-victory and home-field handling that the paper does not discuss; the package is a starting component, not a finished NFL rating system.

## 10. GSE overlap
Extension (implementation), not new method. The existing-research-map's metric catalog already mentions TrueSkill, Glicko, Bradley-Terry, and Plackett-Luce — the rating-system theory is covered in GSE's research. What the map does NOT contain is a fast, production-ready implementation choice: the map has no library recommendation and no runtime-accuracy tradeoff analysis. This paper fills exactly that slot: OpenSkill's Plackett-Luce as the production rating engine behind GSE's team-strength features, where TrueSkill-class updates would be too slow for large backtests (e.g., re-rating all teams weekly over 20 seasons of simulations).

## 11. GSE implementation spec
(1) pip-install openskill.py into the GSE research environment. (2) Prototype: Plackett-Luce team ratings for the NFL 2000–2025, updating weekly, with score-differential-aware extensions if needed (the package supports custom models; start with vanilla). (3) Benchmark against GSE's existing Elo/nfelo implementation on backtest log-loss for spread/ML picks — same evaluation harness, both systems. (4) If within 0.002 log-loss of the house Elo at materially lower runtime, promote OpenSkill to the production team-strength feature; use its σ as an uncertainty feature for Kelly sizing (high-σ teams → smaller edges trusted less). (5) Player-level: do NOT use the unweighted team update for individual props (see §9a) until a contribution-weighting scheme is built. Effort: 1 day to prototype and benchmark; 2–3 days to productionize if adopted.

## 12. Reproducible test
Dataset: NFL games 2015–2024 (nflverse schedules + scores). Two systems, identical harness: house Elo vs. OpenSkill Plackett-Luce, both updated weekly, predicting next week's games. Metric: log loss on moneyline-implied probabilities and MAE on margin vs. spread. Baseline to beat: the house Elo (the incumbent — OpenSkill must displace it, not beat a strawman). Time window: 2020–2024 seasons, walk-forward weekly.

## 13. Acceptance / rejection gate
ADOPT OpenSkill as the production rating engine if it matches house Elo within 0.002 log-loss on the 2020–2024 walk-forward AND runs the full 2000–2025 weekly backtest in under 50% of the Elo pipeline's wall-clock time. REJECT (keep Elo) if the log-loss gap exceeds 0.002, if the σ-uncertainty feature adds no Kelly-sizing value in a backtest, or if margin-of-victory handling proves load-bearing and the package cannot accommodate it cleanly.

## 14. Improvement experiment
Go beyond the paper: implement score-differential-aware Plackett-Luce updates (weight the Bayesian update by margin of victory relative to expectation — the thing the paper omits and the NFL needs), plus a lightweight player-contribution weighting using snap shares (starters get full update, rotational players get fractional updates). Test the augmented system against vanilla OpenSkill and house Elo on the §12 harness. If margin-aware updates close the 2–5 point accuracy gap the paper concedes to TrueSkill, GSE gets a faster AND more accurate system than either baseline — the experiment the software paper did not run.
