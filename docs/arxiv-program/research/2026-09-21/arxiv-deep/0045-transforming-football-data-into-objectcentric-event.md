# [0045] Transforming Football Data into Object-centric Event Logs with Spatial Context Information (arXiv:2507.12504v1)

**Citation:** Vito Chan, Lennart Ebert, Paul-Julius Hillmann, Christoffer Rubensson, Stephan A. Fahrenkrog-Petersen, Jan Mendling (2025). *Transforming Football Data into Object-centric Event Logs with Spatial Context Information*. arXiv:2507.12504v1 [cs.DB]. URL: https://arxiv.org/abs/2507.12504v1. Humboldt-Universität zu Berlin / Weizenbaum Institute / WU Wien, 6 Jul 2025 (v1; only version as of read date). Accepted for the 3rd Workshop on Object-centric processes from A to Z (OBJECTS 2025), co-located with BPM 2025 — a process-mining workshop paper, not a sports-modeling venue.
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF v1) on 2026-09-21 (666 lines, §§1–5).
**Verdict:** REJECT — a soccer data-representation framework paper with no predictive model, no quantitative results, and no path to betting-relevant quantities; the possession/zone object modeling is a distant conceptual curiosity at best.

## 1. Research question
Conventional football event logs use a single case notion (e.g., a team's ball possession), which ignores off-ball behavior (idle players) and suffers divergence/convergence problems when one event relates to multiple entities. The paper presents a **framework** for transforming soccer tracking + event data into an **object-centric event log (OCEL)** with an explicit **spatial dimension**, demonstrated on real data. It is a representation/methodology paper: no predictive models, no equations to fit, no quantitative benchmarks.

## 2. Dataset / schema
- **Source data:** Metrica Sports sample data — 3 matches of automated visual tracking at 25 Hz with (x, y) positions in a vertically flipped Cartesian system ((0,0) top-left, (1,1) bottom-right) plus game-based events. Only **two** of the three matches are used for the generated log.
- **Framework components (§3):**
  - **Three event classes:** (a) *game-based events* — referee events (yellow cards), tackles; (b) *ball events* — ball-involved game events: passes, shots, free kicks; (c) *position-based events* — player movements ("Player changes position").
  - **Six object types:** *match*, *team*, *possession*, *player*, *grid position*, *ball*. A possession starts when a team gains the ball, ends when the opponent gains it. Field divided into a **6×4 grid = 24 grid positions numbered A1 (bottom-left) to F4 (top-right)**; every event tagged with its grid position. Grid positions modeled as objects (not attributes) enable queries like "how many goal shots occurred from a specific grid position."
- **Generation pipeline (§4.1):** (1) reproject movement traces onto the grid, detect cross-grid movements (Pandas); (2) *event engineering* — decompose aggregated events for interpretability/cleaner object–event associations; (3) merge movement and game-based logs in temporal order, propagate context; (4) enrich with derived attributes (travel distance, durations, current score); (5) convert to OCEL with PM4Py. Result: **37,358 events, 813 objects, 747 possessions**.
- Access: code released at https://github.com/VitoChan01/Soccer; built on Metrica Sports public sample data (https://github.com/metricasports/sampledata).

## 3. Method / model
No mathematical models or equations are presented; the contribution is a data-transformation framework (Fig. 1: object types ↔ event classes with cardinalities). Analysis techniques applied are qualitative: directly-follows graphs discovered per object type, and process instances drawn as directed graphs on a spatial field map.

## 4. Equations & assumptions
Not stated in paper — no equations. The representation is defined by the object-type/event-class schema and cardinalities in Fig. 1. Assumptions (implicit): the 6×4 grid adequately captures spatial context; possessions cleanly segment by ball-gain/loss; decomposed events preserve the original semantics.

## 5. Features / target
Not applicable — no ML features or prediction target. The "output" is the OCEL log itself (37,358 events across 813 objects / 747 possessions) with derived attributes (travel distance, durations, current score, grid position tags).

## 6. Validation design
No quantitative validation design. The evaluation is entirely qualitative — the paper reports zero quantitative metrics (no precision/recall, no fitness scores, no predictive accuracy, no baseline comparison). Findings come from two hand-picked visualizations (§4.2–4.3).

## 7. Numerical results / baselines
Quoted exactly as in the paper — all qualitative:
- **Perspective 1 — directly-follows graphs (§4.2, Fig. 3):** graphs filtered to the four home-team possessions that led to a goal. Single-object (ball) graph: "set piece activities (e.g., kickoffs, free-kicks, and throw-ins) are always followed by playing a pass. After one or multiple passes, there is a shot. For the possessions in this scenario, all shots led to a goal." Authors flag a suspicious pattern — "a recovery activity leading to an out ball and, subsequently, a goal… likely caused by erroneous data" — and note goals followed by recovery occur "since the ball remains the same throughout the entire game." Multi-object graph (ball + possession + player) adds new directly-follows relations and "Player changes position," which "shows a high count of self-loops, as many players might move one or multiple positions between other activities."
- **Perspective 2 — spatial instance map (§4.3, Fig. 4):** one possession (id **AA156**) ending in a shot. Recovery starts at cell **B3**, passes B3↔B4, out to the right side and E1, moving to **F2** where the shot occurs; the receiving player moved E1 → F2 before the shot. "Player15 moved only from grid cell C3 to D3 during the entire possession and therefore stayed relatively stable in the center of the field. In contrast, Player18 moved all the way from grid cell C4 in the left midfield to grid cell F2 where the shot on the opponent's goal was taken."

## 8. Code / data availability
Code released: https://github.com/VitoChan01/Soccer. Data: Metrica Sports public sample (https://github.com/metricasports/sampledata). No trained models (none exist). The paper's most practically useful artifact is arguably Table 1's dataset survey (public options: StatsBomb open data >1000 games, Wyscout >1000 games, DFL 7 games with 25 Hz tracking, Metrica 3 games with 25 Hz tracking).

## 9. Leakage & limitations
- Paper's own (§5): only two matches from a single sample dataset; football games are "complex and highly variable," needing "variant analysis and filtering techniques to better handle variability"; demonstrated on soccer only.
- Reviewer: (a) no quantitative evaluation whatsoever — "effectiveness" asserted from two hand-picked visualizations; (b) the log contains evident data errors the authors themselves flag; (c) no baseline comparison; (d) evidence is qualitative, so no effect size can be quoted.

## 10. GSE overlap
No overlap — no duplication. GSE's corpus has no process-mining thread, so this would be a novel direction, but one with no demonstrated betting value. The paper produces a *representation* of soccer possessions; it predicts nothing and contains no transferable statistical model. Distant speculative thought: the object-centric possession representation (possession as object, field zones as objects, plays as events) could inspire a sequence-mining representation of NFL drives from nflverse play-by-play — but the paper gives no method for extracting predictive signal from such logs, no NFL application, and no evidence of edge. Classification: **not duplicate, not extension — irrelevant.**

## 11. GSE implementation spec
Not recommended — rejected. Nothing to implement: no model, no parameters, no prediction target. Do not build.

## 12. Reproducible test
N/A (rejected). A test would require a quantitative claim to reproduce — the paper makes none. Gate closed.

## 13. Acceptance / rejection gate
Reject unconditionally: no predictive model, no quantitative results, no path to betting-relevant quantities. No test window could resurrect it.

## 14. Improvement experiment
None from this paper. If a process-mining direction were ever pursued, the natural first step would be reproducing the pipeline on a large public event dataset (StatsBomb open data) and testing whether possession-pattern features carry any predictive signal — the paper itself does not attempt this.
