# [1483] Projective geometry for human motion, with an application to injury risk (arXiv:q-bio/0406024v1)

**Citation:** H. Laurie, R. Penne (2004). *Projective geometry for human motion, with an application to injury risk*. arXiv:q-bio/0406024v1 [q-bio.QM]. URL: https://arxiv.org/abs/q-bio/0406024
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf).
**Verdict:** ADAPT

## 1. Research question
Can projective geometry (Plücker coordinates) characterize when a linked-joint system loses kinematic redundancy, and does that "reduced redundancy" mark elevated overuse-injury risk? Applied to a two-joint (waist + shoulder) model of cricket bowling.

## 2. Dataset / schema
Experimental: two 17-year-old medium-fast bowlers (A: never injured; B: long injury history incl. lumbar stress injury), 120 Hz stroboscopic video, surface reflectors (2 wrist, 1 shoulder/acromion, 3 waist). Waist center w from trapezium circumrectangle; shoulder center s via acromion correction; wrist r from reflector midpoint. Direction cosines of the waist–shoulder line L in shoulder axes (S1,S2,S3) plotted vs time (~0.4 s, ~2 m of motion). n=2 — a case study, not a trial.

## 3. Method / model
- Plücker coordinates in P3: joint axes as 2-tensors in R6, L = (L12,L13,L14,L23,L24,L34); translations = rotations about lines at infinity (L14=L24=L34=0); composite motions = sums of centers (C1+C2)∧p; screw-motion decomposition via Poinsot's Central Axis Theorem.
- Dependency catalogue for lines in P3 (§2.3); **Theorem 2.1**: two triples of concurrent non-coplanar lines through distinct points w, s always span rank exactly 5.
- Bowling model: waist (W1,W2,W3) at origin, shoulder (S1,S2,S3) at (0,−1,1), rigid torso, no elbow/wrist; 6×6 motion matrix M in Plücker coordinates; motion space MS = hyperplane p12 = −p13, dim 5.
- **Support of a body position** supp(p) ⊂ {X,Y,Z,S1,S2,S3}: axes with nonzero coefficient in the (unique, 1-dim) dependency. **Theorem 3.2**: X ∉ supp(p) always — sideways spinal bending is an uncompensatable "necessary" axis. **Theorem 3.3**: for L = sw: (1) generic → supp = {S1,S2,S3,Y,Z}; (2) L in the plane of two shoulder axes → supp = {Si,Sj,Y,Z}; (3) L = Si → supp = {Si,Y,Z}. Cases (2)–(3) are **critical positions: reduced redundancy**.
- Forbidden motions identified algebraically: pure translation along Z (spine) or Y impossible; translation along X realizable (rotation about Y ⊕ rotation about L).

## 4. Equations & assumptions
- Grassmann–Plücker relation: L14L23 − L24L13 + L34L12 = 0 (GP).
- Motion of point p under center PA: M(p) = PA ∧ p; velocity vp = (M234, −M134, M124).
- Dependency example: supp(p)={Y,Z,S3} with λY+μZ+νS3=0 ⇒ efforts tradeable as (β+kλ)Y + (γ+kμ)Z + (σ3+kν)S3; axes outside the support have fixed, uncompensatable coefficients.
- Assumptions: rigid torso; coincident joint axes; no elbow/wrist/finger motion; release state prescribed at wrist; s1 intrinsic via rotator cuff, s2 intrinsic via planar arm motion near release.

## 5. Features / target
Features: joint-axis direction cosines over time. Target (hypothesis): overuse-injury risk via reduced redundancy at ball release.

## 6. Validation design
Case study: compute L's direction cosines in (S1,S2,S3) for each bowler; reduced redundancy = a cosine → 0 near release. Compared against known injury histories.

## 7. Numerical results / baselines
- Bowler A: all three direction cosines stay well away from zero through release → full support maintained.
- Bowler B: S3 cosine → 0 about 15 ms before release and stays ~30 ms → reduced redundancy around release; B had the worse injury history.
- No statistics possible (n=2); authors note the workload confound (B bowled since early boyhood, A a recent recruit) and propose tracking both subjects.

## 8. Code / data availability
None stated; data from the Sports Science Institute of South Africa (Janine Gray).

## 9. Leakage & limitations
No predictive modeling → no leakage. Limitations: n=2 case study; workload confound unaddressed; axis-choice dependence (S3's role hinges on the anatomically-motivated frame); ignores elbow/wrist/muscle dynamics; the redundancy→injury link is a hypothesis, not an established causal effect.

## 10. GSE overlap
Causal/injury lane (a designated thin lane). Existing-research-map check: no prior ledger uses projective geometry, Plücker coordinates, or kinematic-redundancy formalism; injury work in the corpus is workload/statistics-based. No duplication — the redundancy-as-risk concept is new to the corpus.

## 11. GSE implementation spec
Adapt the redundancy formalism to NGS tracking data (`gse_redundancy.py`):
1. Per player-game, build a movement repertoire matrix from tracking: per-play displacement vectors binned by direction/speed/change-of-direction (the observable analog of the joint-axis set).
2. Compute the effective rank / participation ratio of the repertoire covariance — the analog of dim(MS) = 5 vs the number of "axes". A player whose game-to-game movement collapses onto fewer principal movement modes (reduced redundancy) has fewer compensatory movement options.
3. Flag: rolling 4-week drop in movement-redundancy index concurrent with maintained snap share/workload → elevated soft-tissue injury risk (mirrors the paper's "same intensity, no compensation" mechanism).
4. Validate against GSE's injury logs: does pre-injury redundancy drop precede hamstring/groin/calf injuries?

## 12. Reproducible test
On 2+ NFL seasons of NGS tracking + injury reports: compute the redundancy index weekly per skill-position player; test whether players in the bottom decile of redundancy change have elevated injury incidence the following 1–3 weeks (odds ratio vs rest of sample, with workload controls).

## 13. Acceptance / rejection gate
ADAPT bar: bottom-decile redundancy drops must associate with elevated subsequent injury incidence (OR > 1 with 95% CI excluding 1, workload-adjusted) on a hold-out season; if no signal, keep the metric as descriptive only and record the negative.

## 14. Improvement experiment
(a) Replace the paper's binary support with a continuous redundancy score (participation ratio) and learn the injury-risk mapping with a survival model; (b) decompose redundancy by movement type (linear vs lateral vs contact) to localize which losses matter; (c) combine with workload spikes (acute:chronic) — the paper's fatigue mechanism predicts redundancy × workload interaction, not either alone.
