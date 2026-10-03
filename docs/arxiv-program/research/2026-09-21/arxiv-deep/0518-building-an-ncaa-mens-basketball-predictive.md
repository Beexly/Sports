# [0518] Building an NCAA mens basketball predictive model and quantifying its success (arXiv:1412.0248v1)

**Citation:** (authors not shown in text extract; the winning team of Kaggle "March Machine Learning Mania" 2014). *Building an NCAA men's basketball predictive model and quantifying its success*. arXiv:1412.0248v1. URL: https://arxiv.org/abs/1412.0248v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5 sections / ~17,000 chars).
**Verdict:** ADAPT — NCAA basketball, so no model is directly portable, but three methodological transfers are high-value for GSE: (1) spread-calibrated logistic regression logit(P)=β₀+β₁·spread as a market-prior component; (2) ensembling a market model with an efficiency model via weights tuned on past seasons' log-loss; (3) the skill-vs-luck simulation quantifying that even perfect probabilities win a 433-entry contest only ~1 in 8 times.

## 1. Research question
Can a probability-prediction model for the NCAA men's basketball tournament — built by merging Las Vegas point-spread information with possession-based team efficiency metrics via logistic regression, chosen because its MLE matches the contest's log-loss scoring — win Kaggle's 2014 "March Machine Learning Mania" (433 entries, $15,000 prize), and how much of such a win is skill vs. luck?

## 2. Dataset / schema
- Las Vegas point spreads for every Division 1 men's game since 2002–2003 (covers.com), linked to game results; M₁ trained on 65,043 games over 12 seasons.
- Ken Pomeroy efficiency metrics (kenpom.com, seasons since 2001–2002): team rating, offensive/defensive efficiency (points per 100 possessions), adjusted versions (opponent/venue/recency-adjusted), tempo and adjusted tempo, neutral-site indicator.
- M₂ training: all regular-season games before March 1, 2002–2003 through 2012–2013; model selection on post-March-1 games (regular + conference tournaments) each season; ensemble weights tuned on 2008–2013 NCAA tournaments (the Kaggle "pre-test").
- Contest: 2,278 possible team-pair matchups for the 2014 tournament; only 63 played games scored; 433 entries from 248 teams.

## 3. Method / model
- M₁ (spread model): logistic regression logit(Pr(y_g=1)) = β₀ + β₁·spread_g on all 65,043 games. For tournament games beyond round 1, the spread itself was predicted by a linear regression on 2013–2014 results (proprietary, undisclosed).
- M₂ (efficiency model): logistic regression on game outcome with X₇–X₁₀ (adjusted offensive/defensive efficiencies, both teams) + X₁₅ (neutral-site indicator); selected from 11 candidate fits (Table 2) — adjusted metrics beat unadjusted (0.487 vs 0.538), interactions and higher-order terms hurt (0.488–0.493), neutral-site indicator automatic (+0.013 gain).
- Ensemble: S₁ = 0.75·M₁ + 0.25·M₂; S₂ = 0.25·M₁ + 0.75·M₂. Weight direction came from 2008–2013 tournament log-loss (optimum 0.69 on M₂ / 0.31 on M₁); the two orderings were the authors' two allowed entries (hedge against post-tournament bias in efficiency metrics, which were computed after postseason games).
- Luck quantification: 10,000 simulated 2014 tournaments under 5 "true" probability scenarios (S₁, S₂, median of all 433 entries, median of top-10 entries, all-coin-flip); each entry scored by log-loss; recorded median rank, P(win), P(top-10), unique winners.

## 4. Equations & assumptions
Stated equations (copied faithfully):
- Eq. 1–3 (contest scoring): LogLoss_ij = −(y_i log(ŷ_ij) + (1−y_i)log(1−ŷ_ij))·I(Z_i=1); LogLoss_j = (1/63)Σ_i LogLoss_ij.
- Eq. 4–5: logit(Pr(y_g=1)) = β₀ + β₁·spread_g; ŷ_{i,m₁} = exp(β̂₀+β̂₁·spread_i)/(1+exp(β̂₀+β̂₁·spread_i)).
- Ensembles: S₁ = 0.75·ŷ_m₁ + 0.25·ŷ_m₂; S₂ = 0.25·ŷ_m₁ + 0.75·ŷ_m₂.
Stated assumptions: (a) logistic MLE is the right optimizer because it exactly minimizes the contest's log-loss; (b) betting markets are near-efficient, so the spread is the best single prior (citing Harville 1980, Stern 1991); (c) postseason-inclusive efficiency metrics ≈ regular-season-end metrics (many more regular-season games; Kvam & Sokol 2006); (d) conference-tournament (post-March-1) games proxy NCAA-tournament games for model selection; (e) ensemble members err in different regions so averaging helps (Hansen & Salamon 1990).

## 5. Features / target
- Inputs: point spread (M₁); adjusted per-100-possession offensive/defensive efficiencies for both teams + neutral-site flag (M₂). Target: P(Team 1 beats Team 2) for each of 2,278 possible pairings.

## 6. Validation design
- M₂: time-split model selection (train pre-March-1, select on post-March-1) across 11 seasons; ensemble weights tuned on 6 past tournaments (2008–2013).
- Contest: single 2014 tournament, 63 scored games, log-loss vs 432 other entries.
- Simulations: 10,000 tournament replays × 5 truth scenarios; all 433 actual entries re-scored each replay.

## 7. Numerical results / baselines
- S₂ won Kaggle 2014: log-loss 0.52951 (1st of 433); S₁ would have placed 4th (0.54107). Correlation between entries 0.94; 78% of game predictions within 0.10.
- Model selection (Table 2, test log-loss): best 0.487 (adjusted efficiencies + neutral); unadjusted 0.538; interactions 0.488–0.493.
- Simulations (Table 3): if S₂ were the true probabilities, S₂'s median rank = 14, P(win) = 11.65%, P(top-10) = 44.47%; if S₁ true, S₁ P(win) = 15.57%, P(top-10) = 48.79%. Vs random-winner baseline (1/433 ≈ 0.23%), skill multiplies win odds ~50–60×. Under median-of-top-10 as truth, P(win) ≈ 2% for both; under all-coin-flip, neither ever won. 332–348 unique winners of 433 across simulations (~20% of entries never winnable).
- Context: UConn (7-seed) won 2014 — only the 5th champion seeded worse than 3 since 1979 — making the winning log-loss (0.529) higher than typical simulated winning scores.

## 8. Code / data availability
None — no code released; the spread-prediction regression for later rounds is explicitly proprietary/undisclosed. Data from covers.com and kenpom.com (public at the time). The contest organizer supplied all 433 entries for the simulation study.

## 9. Leakage & limitations
- Efficiency metrics included postseason games (lookahead bias in M₂'s inputs, acknowledged; hedged via the two-weighting scheme but not eliminated).
- Later-round spreads were predicted by an undisclosed proprietary model — a black box inside a reproducibility claim.
- Single-tournament test (n=63 games); the win itself is one draw from the luck distribution the paper quantifies.
- Basketball-specific: 35-second clock, 351 teams, single-elimination bracket — none of the fitted coefficients transfer to football.
- The 50–60× skill multiplier is an upper bound computed under the generous assumption that the entry *is* the truth.

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. The map covers ensemble methods and market-implied probabilities (de-vigged consensus, CLV, market tiers) as GSE inputs, and log-loss calibration as an evaluation standard. No covered paper combines them the way this one does: spread→logistic-calibrated market prior ensembled with an efficiency model, weights tuned on past seasons' log-loss, plus a formal skill-vs-luck simulation. The transfer is methodological, not a duplicate model. Directly relevant to GSE's pick-confidence communication: the paper's headline numbers (even perfect probabilities → ~12% win rate in a 433-entry field) calibrate expectations for any GSE contest/pick product.

## 11. GSE implementation spec
- Transfer 1 — market-prior component: fit logit(P(home win)) = β₀ + β₁·(de-vigged spread-implied probability or raw spread) on 2010–2024 NFL games; use as the market leg of the GSE ensemble alongside the efficiency/model leg. This is cleaner than ad-hoc market blending.
- Transfer 2 — ensemble weight tuning: grid-search the market-vs-model weight on past seasons' log-loss (walk-forward by season, exactly the paper's 2008–2013 protocol), rather than fixed or heuristic weights; re-tune annually.
- Transfer 3 — luck communication: replicate the simulation for GSE's pick product — simulate seasons under the engine's own probabilities, compute distribution of ROI/record outcomes, and publish the "even perfect probabilities only win X% of the time" figure to set user expectations honestly.
- Estimated effort: ~2–3 days (logistic calibration + weight grid + simulation harness on existing data).

## 12. Reproducible test
Dataset: NFL 2010–2024, closing spreads (de-vigged) + GSE model probabilities + outcomes. Protocol: walk-forward by season — fit spread-logistic and ensemble weights on seasons ≤Y, evaluate log-loss and ROI on Y+1, Y = 2015..2023. Baselines: (a) market-implied probability alone; (b) GSE model alone; (c) fixed 50/50 ensemble. Metric: log-loss and Brier score on held-out seasons; plus the luck simulation (10k season replays under engine probabilities → distribution of season ROI).

## 13. Acceptance / rejection gate
ADOPT the spread-calibrated market leg + tuned ensemble weights if the walk-forward shows the tuned ensemble beats both standalone legs on log-loss in ≥6 of 9 held-out seasons with no season worse by >0.01; REJECT the weight-tuning if optimal weights are unstable across seasons (sign-flipping or >0.3 swings year to year — indicating the paper's protocol overfits in football). The luck-simulation communication piece is adopted unconditionally as it requires no predictive claim.

## 14. Improvement experiment
Go beyond the paper's static weights: make the ensemble weight *state-dependent* — weight the market leg more heavily late in the season (when lines are sharper and efficiency metrics have converged) and the model leg more early (when priors dominate and the market has less information). Fit w(t) = logistic(α₀ + α₁·week) on past seasons' log-loss. Hypothesis: the paper's constant 0.31/0.69 split is a crude average over a weight that should rationally shift as information accrues — and testing this in the NFL, where early-season uncertainty is extreme, is a sharper test of the ensembling principle than the paper's basketball setting allowed.
