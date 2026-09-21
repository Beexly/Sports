# 0963 — Player Pressure Map: pressure quantification in soccer via pitch control + 3D body pose + GNN (2401.16235v2)

## Citation / full-text source
- Gu, Na, Pei, De Silva. "Player Pressure Map — A Novel Representation of Pressure in Soccer for Evaluating Player Performance in Different Game Contexts." arXiv:2401.16235v2 [cs.LG] (v2: 7 Mar 2024; v1: 29 Jan 2024).
- Full text read: https://export.arxiv.org/pdf/2401.16235 (PDF, 490 text lines via fetch; complete: abstract through references).
- Note: this paper was assigned to reader 15 and initially marked BLOCKED (ar5iv conversion failure, no cache copy); recovered and fully read via direct PDF fetch. Replacement-for: 2401.16235v2 BLOCKED record → this ledger (no reserve consumed).

## Research question
How to accurately quantify the pressure experienced by a soccer team and each individual player in a game scene — going beyond distance-based pressure proxies by fusing tracking data, event data, and 3D body-motion context from broadcast footage.

## Dataset / schema
- Tracking + event data + corresponding broadcast videos of **9 Premier League matches (2019/20 season)**.
- Only active plays kept; penalties, set pieces, stoppages removed.
- Train: 8 matches (6 used for passer body-orientation extraction; all for PPM/GNN). Test: **1 independent PL match from the same season, never used in training — 750+ possessions**.
- Elite-level data is confidential; authors had access to only 9 games.

## Method
1. **Pitch-control matrix**: for timestep t and pitch location (m,n), compute probability the defending team controls the ball there.
2. **Vanilla individual pressure matrix**: locate player, draw 1 m-diameter pressure circle, sample pitch-control pressure from 8 directions → 8-dim pressure vector.
3. **3D body-orientation extraction** (top-down from broadcast footage): detect player bounding boxes → 3D pose estimation per player. Passer identified by **human-expert annotation** (soccer-detection and homography approaches tried and rejected as unreliable); frames within 0.25 s tracked with same IDs to smooth pose under occlusion.
4. **Pressure amplifier**: from observed passing data, failed passes show higher average pressure from all directions than successful passes; passer experiences higher pressure in front and to the right of body orientation (defender presses opposite to body orientation). Amplifier computed from Fig. 5 data → finetuned pressure matrix.
5. **Player Pressure Map (PPM)**: graph with 12 nodes (11 attacking players + ball); node features = pressure vector + position (+ velocity); edges = pairwise distances and angles. Defending context embedded via pressure vectors (lower dimension than prior graph representations).
6. **Team pressure (POP model)**: possessions > 5 s converted to sequences of 50 PPMs (every 2 s); GNN with **3 graph-convolution layers + ReLU + global mean pooling each, dropout 0.5, final FC layer, 2-class output** predicts possession outcome 4 s ahead. Predicted P(lose possession) = team pressure (e.g., pop = 0.64 → 64% keep, 36% lose).

## Equations / assumptions
- Pressure circle: center = player position, diameter 1 m; pressure sampled from 8 compass directions from pitch-control surface.
- Additive finetune: pressure_matrix_finetuned = pressure_amplifier(body_orientation) ⊙ vanilla_matrix (amplifier from empirical Fig. 5 distribution).
- POP: pop(t) = P_GNN(lose possession in [t, t+4 s] | PPM sequence); label 1 = keep, 0 = lose.
- Pressure levels: level_1: pressure ≤ 1/3; level_2: 1/3 < pressure ≤ 2/3; level_3: pressure > 2/3.
- Assumption: predicted possession-loss probability is a valid proxy for "pressure"; body orientation from broadcast 3D pose transfers to pitch coordinates without rotation/scaling correction (stated as not impacting accuracy).

## Features / target
- Node features: per-player pressure vector (8-dir), x/y position, velocity; edges: inter-player distance + angle; ball node.
- Target: binary possession outcome 4 s after the PPM sequence.

## Validation
- Test: 1 fully independent PL match (>750 possessions), never used to train any component.
- Baselines: (a) tracking-data-only model (prior standard), (b) 2D PPM (no 3D body features).

## Exact results / baselines
- Possession-outcome prediction accuracy: **tracking-only 55.8% | 2D PPM 75.2% | 3D PPM 78.7%** (Table 1). 2D PPM adds ~20 pp over tracking-only; 3D body features add ~3 pp more.
- Individual: midfielders face the highest pressure and are most consistent across levels; attackers have lowest passing accuracy at all pressure levels (compact defensive blocks).
- Two 300+-pass players, both ~80% raw passing accuracy: player **184341** (top PL attacking midfielder that season) handles pressure consistently; player **225796** (average stay-back CDM) collapses at pressure level 3 — the metric separates them where raw accuracy cannot.
- Team: player **41328** most effective dribbler (~0.4 team-pressure relief per dribble); player **38533** most efficient passer; 41328 had the 2nd-highest match rating — matches model evaluation.
- Chart-read (labeled): Fig. 5 amplifier shape; Fig. 9 passing-accuracy-by-level curves; Fig. 10 per-event pressure deltas — exact bin values not tabulated in text.

## Code / data
- No public code or data link in the paper. Data: confidential PL tracking/event/video (9 games).

## Leakage
- Test match fully independent of all training components — clean. One caveat: the pressure amplifier (Fig. 5) was estimated on 6 of the training games' passing data and applied within the same pipeline; no leakage into the test match.

## Limitations
- Only **9 games** — small by tracking-data standards; elite data confidential, so no replication possible.
- **Human expert required to annotate the passer** in broadcast footage — the pipeline is not fully automated (soccer-detection and homography ID approaches failed).
- 3D features from broadcast video are only partially exploited ("not all included"); single-frame PPM — authors propose LSTM/multi-frame extension as future work.
- pop-as-pressure is a modeling choice: a team can lose possession for reasons unrelated to opponent pressure (unforced errors); the paper does not decompose.

## GSE overlap
- Checked against `arxiv-program/state/existing-research-map.md`: no existing pressure-quantification-via-pitch-control + body-pose method in the corpus; tracking lane has trajectory/passing models but nothing combining pitch control, 3D pose, and graph representation. No duplication.

## Implementation (GSE adaptation)
- Port the **pressure-circle + pitch-control** construction to NFL: for each frame, compute defensive control probability surface from NGS tracking (defender positions/velocities/speed), then per-skill-player pressure vectors from 8 directions. No broadcast pose needed — NGS gives orientation directly.
- Train the POP analog: P(drive/play fails | pressure-graph sequence) with a small GCN; output = **QB pressure index** per dropback, and per-rusher contribution via node-ablation (pressure delta when removing a rusher node).
- Use for: (a) prop edges — QB performance under pressure splits (the 184341/225796 separation is the template: two QBs with equal raw EPA, different pressure-conditioned EPA); (b) OL/DL matchup grading for spread/total models; (c) pre-snap pressure forecast from formation graph.

## Reproducible test
- Rebuild pitch-control surface on one NGS game (2024 season, public Big Data Bowl sample); compute per-dropback pressure vectors; correlate pressure index with observed pressure events (sacks/hits/hurries) — expect AUC > 0.75 vs distance-only baseline ~0.60.

## Numeric gate
- **78.7% vs 55.8%**: the graph + 3D-context representation adds 23 pp of possession-outcome accuracy over tracking-only. Gate for GSE port: pressure index must beat distance-only proxy by ≥ 10 pp AUC on NGS pressure labels.

## Improvement experiment
- Replace single-frame PPM with temporal graph (LSTM over PPM sequences — the authors' own proposed extension); add defender nodes with pass-rush-move labels; test whether pressure index predicts next-play EPA beyond down/distance/yardline baseline.

## Verdict
**ADAPT** — the pitch-control → 8-direction pressure vector → graph + GNN pipeline is directly portable to NFL pass-rush pressure, and the individual-vs-team pressure separation (raw accuracy vs pressure-conditioned accuracy) is a template for QB/OL prop edges. The 20 pp jump from representation alone is the signal.
