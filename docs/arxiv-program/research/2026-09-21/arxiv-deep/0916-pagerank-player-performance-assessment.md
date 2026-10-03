# [0916] A PageRank Model for Player Performance Assessment in Basketball, Soccer and Hockey (arXiv:1704.00583v1)

## Citation / full-text source

- arXiv:1704.00583v1 — full text: https://arxiv.org/pdf/1704.00583
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Shael Brown (2017). *A PageRank Model for Player Performance Assessment in Basketball, Soccer and Hockey*. arXiv:1704.00583v1 [stat.AP]. URL: https://arxiv.org/abs/1704.00583v1
**Ledger completed:** 2026-09-21. **Read:** full text (cached corpus copy, 349 wrapped lines incl. model, 9-game analysis, appendices).
## Verdict

**ADAPT** — reversed-arc passing networks with PageRank credit playmaking over box scores; ports to NFL target networks for WR/TE involvement metrics (props) and team-aggregated flow differentials (team strength feature).

## 1. Research question
Can a PageRank model on a per-game event graph (passes drawn in reverse, scores as goal-node arcs, turnovers as arcs) quantify playmaking contributions that traditional offensive/defensive stats miss?

## 2. Dataset / schema
Nine NBA games (2014–2016), manually transcribed play-by-play: passes, dispossessions, scores, missed shots, fouls, turnovers, stoppages.

## 3. Method / model
- Directed graph: n player nodes + 1 goal node. Pass i→j drawn as arc j→i (rank flows to the playmaker); score = n arcs from goal node to scorer; dispossession = arc victim→dispossessor; contested miss = arc shooter→defender.
- Initialization arcs (player↔goal both directions + goal self-loop) guarantee primitivity → unique PageRank vector.
- Integrated Playmaking Metric: IPM_i = 50n·r_i/(1−r_g); mean 50, scale 0–1000, comparable across games.

## 4. Equations & assumptions
- Markov chain stationary vector Tᵀv = v (primitivity → uniqueness).
- IPM_i = 50n·r_i/(1−r_g) (goal-node rank factored out).
- Propositions 2.1–2.2: spacing guarantees (some bench player always non-negligible; some pair always close).
- Assumptions: reversed arcs = playmaking credit; all passes equal weight; primitivity scaffolding arcs don't distort ordering.

## 5. Features / target
Event counts as arc multiplicities. Target: IPM ranking vs traditional stat lines (no predictive target — descriptive).

## 6. Validation design
Qualitative: compare IPM ordering against P/A/R/S/FG% stat lines across 9 games; aggregate trends (87% of IPM<30 players had P+A+R+S ≤ 10; 64% of IPM>70 had P+A+R+S ≥ 25).

## 7. Numerical results / baselines
- Playmaking rewarded: Klay Thompson 41 pts → IPM 50.27 (average); Curry 122.91–132.74, Westbrook 125.96, Lowry 123.55 topped games.
- 93% of players with ≥5 assists had IPM ≥ 50; 40% of top-10 IPMs had ≤20 P+A+R+S — the model surfaces "invisible" contributors (e.g., Dellavedova, Ronnie Price).
- Team signal: winning team's starters had higher average IPM in **8/9** games (full-team average only 6/9); top-ranked player was on the losing team 4/9.

## 8. Code / data availability
No code or data; transcription manual.

## 9. Leakage
N/A — descriptive, single-game graphs.

## Limitations
- Only 9 games, manually transcribed — no automation path demonstrated (author flags this).
- Purely descriptive: no prediction experiment (author suggests starter-IPM averages for game prediction as future work).
- Equal arc weights: a 2-yard dump-off pass = a 40-yard dime; no leverage weighting.
- Goal-node scaffolding arcs are arbitrary; sensitivity untested.
- Turnovers drawn as victim→dispossessor can double-punish QBs on tipped balls.

## 10. GSE overlap
No passing/target-network centrality metrics in the corpus. **Zero duplication.**

## 11. GSE implementation spec
1. **NFL target network per game:** nodes = QB + skill players; arc target→QB on every target (even incompletions — separation/trust credit), arc goal-node→scorer on TDs (6 arcs), arc victim→defender on INTs. Compute IPM-style centrality weekly from nflverse.
2. **Props edge:** players whose target-network centrality exceeds what their box-score production implies (high-centrality, low recent yards) are buy candidates on receptions/yards props — involvement leads box scores.
3. **Team-strength feature:** aggregate starter (or top-11 offensive) centrality differential as a team rating input — the paper's 8/9 starter signal is the seed of a team metric, fitting this assignment's team_ratings lane.

## 12. Reproducible test
Dataset: nflverse 2022–2025. Protocol: weekly target-network centrality for all WR/TE; regress next-week receiving yards on (centrality residual vs box-score-implied centrality) + baseline features; team-level: test whether offensive centrality differential predicts next-week offensive EPA.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT the centrality metric iff the centrality residual has a significant positive coefficient (p < 0.05) for next-week receiving yards beyond a targets+air-yards baseline on 2023–2025, OR the team centrality differential improves week-ahead offensive EPA prediction MAE by ≥ 3%. Otherwise REJECT.

## 14. Improvement experiment
Weight arcs by air yards and leverage (WPA of the play): arc multiplicity = 1 + log(1+air yards) + |WPA| — testing whether leverage-weighted flow credit beats the paper's unit-weight version at predicting next-week production.

**Verdict: ADAPT** — target-network PageRank for WR/TE involvement (props) plus a team-aggregated flow feature (ratings), with a hard next-week-prediction gate.
