# [1464] ACL landing simulation thesis (arXiv:2202.13749v1)

**Citation:** (Master's thesis) *ACL injury-risk simulation during landing* — musculoskeletal what-if simulation of ACL landing mechanics. arXiv:2202.13749v1 [physics.med-ph] (25 Feb 2022). URL: https://arxiv.org/abs/2202.13749
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 123 pages; methods, results, discussion, conclusion, quantitative tables, and table-of-contents completeness check).
**Verdict:** REJECT — pure musculoskeletal what-if simulation with no injury-labeled cohort and no validated prediction of actual injury incidence; simulation outputs are violently sensitive to modeling choices (Moco effort weight 0→1 changes vGRF 1.967→11.479 BW), so nothing transfers to NFL player-availability modeling. Replaced by ledger 1498 (arXiv:2608.06635v1, RACE athletic ageing).

## 1. Research question
How do landing height, hip/trunk angles, muscle force (±35%), and effort-goal weighting change simulated knee loading (vGRF, anterior tibial force) in an OpenSim/SCONE/Moco musculoskeletal model — and can these what-if variations stand in for ACL injury-risk factors?

## 2. Dataset / schema
No injury-labeled dataset. Inputs are a generic musculoskeletal model (OpenSim) plus literature biomechanics values used to set simulation parameters. No cohort of athletes, no recorded injuries, no ground-truth injury labels.

## 3. Method / model
OpenSim + SCONE + Moco trajectory optimization. Simulation sweeps: landing height 30→55 cm; hip and trunk angle variations; muscle force scaled ±35%; effort-goal weight swept 0→1. Outputs: vertical ground reaction force (vGRF), anterior tibial force, knee moments.

## 4. Equations & assumptions
Musculoskeletal dynamics as implemented in OpenSim/Moco (trajectory optimization with an effort-minimization objective). Key stated example: height 30→55 cm changed vGRF 1.436→1.797 BW and anterior force 6.300→6.699 (units as reported). Critical sensitivity: Moco effort weight 0→1 changed vGRF 1.967→11.479 BW — a ~6× swing from one free modeling parameter. Assumptions: no femoral-tibial contact model, no ligament/cartilage modeling, no population variation, generic (non-athlete-specific) geometry.

## 5. Features / target
Inputs: landing height, joint angles, muscle-force scale, effort weight. Target: simulated knee loads — NOT actual injury occurrence.

## 6. Validation design
None against injury data. "Validation" is internal consistency of the simulation; there is no held-out cohort, no injury labels, no ROC/AUC, no comparison to epidemiological ACL rates.

## 7. Numerical results / baselines
Height 30→55 cm: vGRF 1.436→1.797 BW; anterior force 6.300→6.699. Effort weight 0→1: vGRF 1.967→11.479 BW. No injury-prediction metrics exist because no injuries were predicted.

## 8. Code / data availability
Uses OpenSim, SCONE, Moco (all public tools). No new code link stated; thesis only.

## 9. Leakage & limitations
Fatal for GSE purposes: (1) no injury labels — the paper never tests whether simulated loads predict real ACL tears; (2) extreme sensitivity to the arbitrary effort-goal weight undermines any quantitative claim; (3) missing contact/ligament mechanics; (4) generic model, no athlete-specific or NFL-population calibration; (5) wrong species of evidence for an availability model — GSE needs P(injury | player, workload, history), not a physics sandbox.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, the injury lane is thin: ledger 1491 (ACWR children paper) was already REJECTed for wrong population, and its replacement (1510) covers the lane. GSE has no training-load data (no NFL practice GPS/session counts), so even a validated biomechanical model would have no inputs to run on. No overlap to exploit — nothing to build on.

## 11. GSE implementation spec
Not applicable — REJECT. No implementable component transfers.

## 12. Reproducible test
Not applicable — REJECT. A valid test would require an injury-labeled athlete cohort the thesis never had.

## 13. Acceptance / rejection gate
REJECT: fails the lane test — simulation-only, no injury labels, no predictive validation, extreme parameter sensitivity, no NFL data path. Replaced in the same causal/injury lane by 1498.

## 14. Improvement experiment
Not applicable — REJECT. (Replacement read in the same lane under ledger 1498.)
