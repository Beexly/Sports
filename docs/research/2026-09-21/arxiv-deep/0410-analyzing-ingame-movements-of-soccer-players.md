# [0410] Analyzing In-Game Movements of Soccer Players at Scale (arXiv:1603.05583v1)

**Citation:** László Gyarmati and Mohamed Hefeeda (2016). *Analyzing In-Game Movements of Soccer Players at Scale*. arXiv:1603.05583v1. URL: https://arxiv.org/abs/1603.05583v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 759 lines).
**Verdict:** ADAPT — port the movement-vector clustering + uniqueness/consistency framework to derive NFL player role archetypes from sparse play-by-play/charting data when NGS coordinates are unavailable, but do NOT treat the outputs as true physical trajectories.

## 1. Research question
Can large-scale mining of soccer players' in-game movement patterns — extracted from sparse event data rather than continuous tracking — characterize what makes players unique, how consistent their movement profiles are, and identify cheaper "similar players" (e.g., for scouting replacements)?

## 2. Dataset / schema
- Opta event data for the 2012/13 La Liga season: more than 300,000 passes and nearly 10,000 shots.
- Derived: 660,848 movement vectors for 542 players. Mean movements per player: 1,219 (max 4,998). Mean movement length: 19.4 meters (max 100 meters).
- Schema per movement vector: (x1, y1, x2, y2, T, s, b) — starts at time T at (x1,y1), ends at (x2,y2), with speed s, and b indicating ball possession (whether the player had the ball).
- Access: Opta data is proprietary. The paper explicitly notes the event-based dataset is "sparse in terms of the position of the players" — positions are only known when a player participates in a ball-related event.

## 3. Method / model
- Movement extraction: connect consecutive ball events involving the same player into movement vectors; infer speed as distance over the inter-event interval.
- Mini-batch K-means clustering of all movement vectors with K=200.
- Player profile: normalized histogram of cluster assignments (cluster-frequency vector) per player.
- Similarity: cosine distance between player profile vectors; nearest neighbors = most similar players.
- Uniqueness: U_i = sum of distances to the M=5 nearest neighbors.
- Consistency: split a player's season into time periods; C_i^k = (1/N) Σ_t D(c_i^k, c_i^t), the average distance between period k's profile and all other periods' profiles.
- High-speed filter: movements at ≥14 km/h analyzed separately (inline with soccer-industry speed categories).

## 4. Equations & assumptions
- Movement vector: (x1, y1, x2, y2, T, s, b).
- Uniqueness: U_i = Σ_{j=1}^{M} d_{ij}, with M=5 (d_{ij} = cosine distance between player i's profile and its j-th nearest neighbor's profile).
- Consistency: C_i^k = (1/N) Σ_{t} D(c_i^k, c_i^t) (D = distance between cluster-frequency profiles of periods k and t; the paper's notation for N/the period index is as extracted).
- Assumptions: (a) straight-line movement between consecutive ball events approximates the player's true path; (b) speed = displacement / inter-event time is meaningful despite intervals ranging from seconds to minutes; (c) K=200 clusters adequately resolve movement types; (d) cosine distance on normalized cluster histograms captures stylistic similarity.

## 5. Features / target
- Descriptive/unsupervised: no prediction target. Inputs are the 660,848 movement vectors; outputs are cluster assignments, per-player profiles, uniqueness scores, consistency scores, and nearest-neighbor similar-player lists.

## 6. Validation design
- No formal validation, holdout, or baseline comparison. Evaluation is illustrative: case studies of Messi, Cristiano Ronaldo, Xavi; a similar-player example (Ronaldo → Rubén Castro); top-10 uniqueness table.

## 7. Numerical results / baselines
- 660,848 movement vectors, 542 players, K=200 clusters (paper's numbers).
- Similar-player example: distance between Cristiano Ronaldo and Rubén Castro (Real Betis) = 0.079; market values €100M vs €4.5M (Table 1) — the paper's headline scouting claim.
- Table 2 (ten most unique players): Lionel Messi uniqueness 0.860 with 3,809 movements; paper text reports Messi uniqueness 0.86 and consistency 0.30 ("high uniqueness and high consistency"), versus Cristiano Ronaldo at 0.55 uniqueness and 0.51 consistency ("just an average player" in these terms).
- Mean movements/player 1,219 (max 4,998); mean movement length 19.4 m (max 100 m).

## 8. Code / data availability
None stated in the paper. Data: proprietary Opta event feed.

## 9. Leakage & limitations
- The core validity threat is severe: player positions are observed only at ball events, with gaps of seconds to minutes. Speed = displacement/time over such gaps is not a physical speed — a "100-meter movement" is an artifact of sparse sampling, not a sprint. Any downstream claim about "high-speed movements" rests on this coarse inference.
- K=200 is arbitrary; no sensitivity analysis or cluster-stability check.
- No validation of any kind: no holdout players, no test of whether "similar players" actually substitute for each other, no human-expert agreement study.
- Cosine distance on 200-dim histograms is dominated by common clusters; rare-but-distinctive movements are downweighted.
- Uniqueness conflates versatility with distinctiveness (the paper itself notes unique players are often those playing multiple positions/sides).
- External validity to NFL: the method is directly portable as a *sparse-data role-mining* technique, but outputs must never be presented as measured athletic movement.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE has a 27-family NGS/tracking taxonomy, the NGS replacement spec (docs/research/2026-09-18-ngs-replacement-spec.md), and STRAIN tracking work (arXiv:2305.10262) — all predicated on having real tracking coordinates. This paper is an **extension** for the no-tracking case: the map's gap list includes public tracking replacements, and this gives a principled way to mine *role archetypes from sparse event/charting data* (college, historical NFL) where NGS does not exist. It does not duplicate anything in the corpus.

## 11. GSE implementation spec
- Data: nflverse play-by-play + FTN charting (or equivalent), 2019–2025: per-play records of ball-carrier/receiver positions at snap, target, catch, tackle — the NFL analog of "event-based" sparse positions.
- Feature engineering: build per-player "action vectors" (start/end field zones, time between events, ball-possession flag, play type) for WR/RB/TE; cluster with mini-batch K-means (K≈50, scaled to smaller NFL rosters); player profile = normalized cluster histogram.
- Model: cosine-distance similarity, uniqueness (M=5), consistency across season halves — direct port of the paper.
- Use case: draft-prospect and free-agent comp finding where NGS college tracking is absent; role-archetype labels as features for target-share and yards-after-catch models.
- Estimated effort: 1 week for a single engineer.

## 12. Reproducible test
- Dataset: 2023 NFL season — all WRs with ≥300 routes (nflverse + charting).
- Procedure: split each player's season into first/second halves; cluster on first-half action vectors (K=50); compute consistency C and half-to-half profile stability.
- Metric: adjusted Rand index (ARI) of cluster assignments across halves, and correlation of uniqueness scores across halves.
- Baseline to beat: random assignment (ARI≈0) and a naive baseline of clustering on raw per-game totals.

## 13. Acceptance / rejection gate
ADOPT the archetype pipeline as a GSE feature source IF half-to-half profile stability reaches ARI ≥ 0.5 AND adding archetype-cluster indicators to a target-share regression lifts out-of-sample R² by ≥ 0.02 on the 2024 season; otherwise REJECT as unstable sparse-data artifact. Gate fixed before running.

## 14. Improvement experiment
Replace hard K-means with a Gaussian mixture model (soft assignment) and learn the number of components via BIC instead of fixing K — the paper's hard assignments and arbitrary K=200 discard uncertainty about ambiguous movements. Test whether soft profiles improve half-to-half stability (ARI) and the target-share R² lift versus the hard K-means port.
