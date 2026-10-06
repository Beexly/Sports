# [1195] Playing Fast Not Loose: Evaluating team-level pace of play in ice hockey using spatio-temporal possession data (arXiv:1902.02020v1)

**Citation:** David Yu, Christopher Boucher, Luke Bornn, Mehrsan Javan (2019). *Playing Fast Not Loose: Evaluating team-level pace of play in ice hockey using spatio-temporal possession data*. arXiv:1902.02020v1. URL: https://arxiv.org/abs/1902.02020v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 889-line extraction; all sections read).
**Verdict:** REJECT

A descriptive ice-hockey tracking study on proprietary SPORTLOGiQ data with no predictive model, no out-of-sample forecast, no calibration, and no market application; pace-of-play metrics from hockey puck possession do not transfer to GSE's NFL spreads/totals/fantasy/calibration lanes. Replacement ledger number beyond the 1348–1353 allocation had not been assigned at the time of this ledger — flagged in the reader report.

## 1. Research question
How does pace of play in ice hockey vary across rink zones, periods, manpower situations, leagues, and seasons — and how does pace relate to outcomes of hockey events (zone entries, shot quality, pass completion) — when measured from high-resolution spatio-temporal possession data?

## 2. Dataset / schema
- **SPORTLOGiQ proprietary** spatio-temporal event dataset: **~3,650 events per game**, 21 primary event types, 89 subtypes, with X/Y coordinates, timestamps, and possession state.
- Coverage: NHL, AHL, SHL 2016/17–2017/18; NHL 2018/19 through November 24, 2018.
- Pass analysis subset: **0.50 million** 5v5 passes.
- **Proprietary and unreplicable**: SPORTLOGiQ data is commercial; no public URL, no data release, no code release. GSE cannot reproduce or extend any result.

## 3. Method / model
Pace is defined from the distance traveled by the puck between successive possession events by the same team, divided by elapsed time, decomposed into components: **φT** (total speed), **φEW** (east-west), **φNS** (north-south), **φN** (north-only; backward movement counted as zero). Analysis is zonal (offensive/defensive/neutral zone) and spatial via a **polygrid**: the rink divided into **668 cells of 5×5 feet**, with 2D Gaussian smoothing (**σ = 0.5**) producing team-vs-league-average differential pace maps. Player-level pace with WOWY (with-or-without-you) on/off splits (minimum 200 minutes 5v5). No predictive model is trained; all analysis is descriptive/correlational.

## 4. Equations & assumptions
No formal equations stated in the extracted text; pace components are defined arithmetically (distance/time between consecutive same-team possession events, projected onto rink axes). Assumptions: puck movement between recorded events is the right proxy for team pace; smoothing (σ = 0.5) preserves real spatial structure; WOWY splits isolate player pace effects; correlations between pace quintiles and event outcomes reflect pace effects rather than selection (which players/teams play fast in which situations).

## 5. Features / target
No supervised features/target. Descriptive targets: zonal pace values, entry pace by entry type, pre-shot pace quintiles vs true shooting percentage, pass speed vs reception success.

## 6. Validation design
No train/validation/test split, no out-of-sample prediction, no backtest. "Validation" is season-over-season repeatability of team pace profiles (reported qualitatively) and large-sample correlational analysis.

## 7. Numerical results / baselines
- **φT highest in the neutral zone**; offensive/defensive zones **~10–13% slower**.
- **OZ forward pace (φN) 35% slower than DZ** and **43% slower than NZ** — explains the previously reported negative correlation between forward pace and offense.
- Second period ("long change"): DZ forward pace up **~7%**, odd-man rushes up **~35%**.
- Zone entries: high-danger entries **24.3 ft/s** vs dump-ins **21.6 ft/s** (~**13% faster**).
- Pre-shot pace quintiles **10 → 42 ft/s**: true shooting **2.9% → 4.1%** (**+38%**), with shot distance constant at ~37–40 ft.
- Passes: failed receptions occur at significantly higher speeds than successful ones (exception: slot passes); 0.50M passes analyzed.
- Leagues: AHL φT **1–2% slower** than NHL; SHL slower in DZ/OZ but faster in NZ (rink-dimension effects).
- Players: McDavid fastest in OZ (driven by φNS); Jagr slowest (**−13.7%** OZ WOWY).

## 8. Code / data availability
None stated; data proprietary (SPORTLOGiQ).

## 9. Leakage & limitations
- **Hockey-only, and a continuous-flow invasion sport**: pace-from-possession-event-distances has no NFL analog (football is discrete plays, not continuous possession flow). GSE's "situation-neutral pace" metric (per the map) already covers the football-relevant notion.
- **No predictive model**: nothing is forecast out of sample; the one directly predictive-adjacent finding (pre-shot pace → shooting %) is a binned correlation, not a model.
- **Proprietary data**: no replication or extension possible.
- Correlational throughout: pace quintiles vs outcomes cannot separate pace effects from team/player/situation selection.

## 10. GSE overlap
GSE's metric catalog already includes situation-neutral pace for football; the map shows no hockey lane and none is planned (content focus: NFL/NCAA). The paper's methods (polygrid smoothing, WOWY pace splits) are hockey-tracking-specific. No duplicate of existing work, but also no transferable method: nothing here builds a forecast, calibrates a probability, or prices a market.

## 11. GSE implementation spec
Not applicable — rejection is at the problem/sport level. The conceivable NFL analog (play-tempo features from tracking data for totals modeling) is already covered by GSE's existing pace work and would not use this paper's methods.

## 12. Reproducible test
Not applicable — proprietary data, no code, no predictive claim to reproduce.

## 13. Acceptance / rejection gate
Reject: wrong sport, proprietary unreplicable data, purely descriptive, no forecast, no calibration, no market test. No numeric gate satisfiable.

## 14. Improvement experiment
None proposed — the paper's questions are hockey-operations questions (coaching, player evaluation), not prediction questions. A GSE-relevant version would need to predict game outcomes or totals from pace features out of sample against market baselines; the authors do not attempt this.

**Verdict:** REJECT
