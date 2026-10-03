# [0954] Players Movements and Team Shooting Performance (arXiv:1805.02501)

## Citation / full-text source

- arXiv:1805.02501 — full text: https://arxiv.org/pdf/1805.02501
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Rodolfo Metulini (2018). *Players Movements and Team Shooting Performance: a Data Mining approach for Basketball*. arXiv:1805.02501. URL: https://arxiv.org/abs/1805.02501
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv conversion).
**Verdict:** ADAPT — clustering time-instants by player-spacing dyads to discover game phases and link positioning configurations to shooting performance; portable to NFL/NBA tracking as an unsupervised phase/formation discovery method.

## 1. Research question
Can we segment a basketball game into homogeneous phases by clustering time instants based on player-spacing structure (distances between player dyads), characterize each phase (offense/defense/transition) with multidimensional scaling, and relate the resulting positioning patterns to team shooting performance?

## 2. Dataset / schema
- Three games (case studies CS1, CS2, CS3) from the Italian Basketball Cup Final Eight, professional teams. Data collected by MYagonism via accelerometer microchips worn by players, machine-triangulated around the court, Kalman-filtered, millisecond resolution; positions in x (court length), y (width), z (height) in pixels of 1 cm², plus velocity and acceleration.
- After dropping pre-match, quarter/half-time breaks, post-match, timeouts, and free-throw moments (filtering algorithm from Metulini [10]): CS1 = 206,332 rows, CS2 = 232,544 rows, CS3 = 201,651 rows. Each row = a millisecond in which the system captured at least one player.
- Analysis restricted to lineups on court ≥ 5 minutes: CS1 two lineups (p1,p3,p6,p7,p8 and p1,p4,p5,p7,p10), CS2 two (p1,p2,p4,p5,p6 and p1,p2,p5,p6,p8), CS3 one (p2,p5,p6,p9,p10).
- Shooting events: no play-by-play available for the tournament; shots collected by watching game video (court shots only, no free throws). For the analyzed CS1 lineup: 15 shots (7 made).
- Access: proprietary (MYagonism); not publicly released.

## 3. Method / model
1. For each lineup, run **k-means on time instants**, where the "objects" are milliseconds and similarity is the vector of pairwise player-dyad distances. k chosen by the between-deviance/total-deviance (BD/TD) ratio: BD/TD ≈ 45% at k = 6 with increment from 5→6 ≈ 11–12% and from 6→7 ≈ 6–7% — k = 6 consistently across almost all five lineups.
2. Characterize clusters with profile plots (average dyad distances per cluster) and 2-D **multidimensional scaling (MDS)** of average between-player distances to visualize spacing patterns.
3. Label each moment offense/defense/transition by the mean x-position of the five players (transition when average x in [-4, +4] around half court); assign each cluster to the phase it mostly contains.
4. Compute a **cluster transition matrix** (relative frequency of switches between clusters in consecutive moments; main diagonal zeroed, columns sum to 100%).
5. Associate each shot (from video coding) to the cluster active at the moment of the shot; compute FG% per cluster.

## 4. Equations & assumptions
No equations stated beyond standard k-means and MDS references; the paper does not write out formulas. Transition matrix definition: relative frequencies of switches between clusters at consecutive time instants, diagonal set to zero. Assumptions: (a) dyad-distance similarity fully captures "positioning pattern"; (b) average x-position is a valid offense/defense/transition proxy; (c) k = 6 chosen by the BD/TD elbow rule; (d) lineups with <5 minutes of shared court time are excluded.

## 5. Features / target
- Features: millisecond time instants described by pairwise distances among the five on-court players (dyads), average x-position.
- Target (descriptive, no supervised target): cluster labels of game phases; secondary analysis relates clusters to shooting success (FG%).

## 6. Validation design
No train/test split — unsupervised descriptive study. Consistency is assessed by repeating the pipeline across five lineups in three games: k = 6 selected independently each time, and the large-cluster/defense, small-cluster/transition mapping replicated in all five lineups. Baselines: none (no comparison to competing segmentation methods). No statistical tests reported for the shooting-percentage differences.

## 7. Numerical results / baselines
- k = 6: BD/TD ≈ 45%; 5→6 increment ≈ 11–12%; 6→7 increment ≈ 6–7% (all five lineups).
- CS1 lineup 1 cluster sizes: C1 13.31%, C2 19.76%, C3 3.40%, C4 29.80%, C5 6.41%, C6 27.31%. Consistently: a couple of small clusters (<10% of observations) with large average distances, 2–3 larger clusters (≥20%) with below-average distances.
- Table 1 (CS1 lineup 1, % of time instants per phase per cluster): C1 (TR 8.41, D 22.74, O 68.85), C2 (TR 21.76, D 10.28, O 67.97), C3 (TR 82.11, D 6.60, O 11.29), C4 (TR 7.08, D 70.48, O 22.45), C5 (TR 54.49, D 23.98, O 21.53), C6 (TR 10.53, D 17.95, O 71.52). So C1/C2/C6 = offense, C4/C3 = defense, C3 + C5 = transition-heavy. (Paper text labels C3 and C5 as transition/defensive mixed; CS1 lineup 2: small cluster C6 (3.2%) = 80.76% transition; large cluster C5 (40.4%) = 72.99% defense.)
- Transitions: 309 switches in 8 min 21 s → a switch every ~2 s. C1 switches to C4 34.48%, to C2 31.03%, to C6 31.03%; C3 (transition) → C6 (offense) 80%; C2 → C6 61.97%. Offensive clusters frequently switch to other offensive clusters (same-action reconfiguration).
- Shooting (CS1 lineup 1): 15 attempts, 7 made = 46.67%. C6: 8 attempts, 5 made = 62.5%; C1: 4 attempts, 2 made; C2: 2 attempts, 0 made; C5: 1 attempt, 0 made. 14 of 15 shots occurred in offensive clusters. MDS shows player 3 isolated on the weak side in C6 — the "good shooting configuration."

## 8. Code / data availability
None stated. Data are proprietary MYagonism captures; filtering algorithm referenced to Metulini (2017) "Filtering procedures for sensor data in basketball."

## 9. Leakage
- No leakage concept applies (unsupervised), but: shooting analysis rests on **15 shots from 8:21 of game time** — a single lineup, single game. The 62.5% vs 46.7% comparison has no confidence interval or test; Wilson interval on 5/8 is roughly (30%, 87%) — the "best configuration" claim is anecdotal.

## Limitations
- Clusters switch every ~2 s, so clusters are micro-configurations, not tactics; the paper acknowledges this.
- k = 6 is an elbow heuristic; no stability analysis (bootstrap/replication within a lineup).
- Offense/defense/transition labeling by average x-position is crude (e.g., fast breaks, half-court sets with unusual spacing mislabel).
- Shots coded by watching video with no reliability measure; proprietary data make replication impossible.
- Three games, one tournament — external validity to NBA/NFL untested.

## 10. GSE overlap
Existing-research-map: NGS 27-family taxonomy inventoried (2026-09-21) and the @NextGenStats profile deep-dive — but those are the NFL's *published metrics*, not unsupervised phase-discovery methods. Repo has clustering-adjacent work (ML brief topic list, hierarchical pooling) but no paper read on clustering tracking time-instants into phases. This is a **new capability, not duplication**: an unsupervised game-phase discovery pipeline for tracking data.

## 11. GSE implementation spec
- Data: NFL Big Data Bowl tracking (or nflverse where applicable) for offense pre-snap/snap frames; NBA tracking if expanding to basketball.
- Steps: (a) for each game, compute pairwise dyad distances among the 22 (NFL) players per frame; (b) k-means over frames (try k = 4–10, BD/TD elbow per game); (c) MDS for visualization; (d) label frames by derived phase (pre-snap/motion/play/dead-ball) or down-and-distance context; (e) build cluster transition matrices per team; (f) associate EPA/play with cluster at snap to find high-value alignment configurations.
- Deliverable: per-team "formation-phase fingerprint" — which spacing configurations they live in and the EPA distribution within each.
- Effort: ~1–2 days on a single NFL game sample; scales with compute.

## 12. Reproducible test
Dataset: 2024 NFL Big Data Bowl tracking (or one 2024 season week of nflverse tracking sample if Kaggle data unavailable — record which). Baseline: naive phase split (pre-snap vs post-snap). Test: (a) cluster frames with k=6 using 22-player dyad distances, compute EPA/snap per cluster; (b) check whether at least one cluster has mean EPA/snap ≥ 0.15 higher than the game mean with n ≥ 30 plays, replicating the "best configuration" finding.

## 13. Acceptance / rejection gate (numeric gate)
ADAPT if: on ≥3 NFL games, at least one discovered cluster shows mean EPA/snap ≥ 0.15 above the game mean on ≥30 plays AND the cluster-membership pattern replicates (BD/TD elbow at same k ±1) across games. Otherwise REJECT the method for NFL.

## 14. Improvement experiment
Replace k-means on raw dyad distances with a Gaussian mixture model on PCA-compressed dyad features plus a hidden Markov model over cluster sequence (the paper's own transition matrix suggests Markov structure), then test whether HMM-smoothed phases predict EPA better than hard k-means assignments on a holdout game.

## Verdict

**ADAPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).
