# [1777] Conformal Selective Prediction with General Risk Control (arXiv:2603.24704)

**Citation:** Tian Bai et al. *Conformal Selective Prediction with General Risk Control* (SCoRE). arXiv:2603.24704. Code: https://github.com/Tian-Bai/SCoRE. URL: https://arxiv.org/abs/2603.24704
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, SCoRE method with risk-adjusted e-values, MDR/SDR definitions, core e-value condition, finite-sample guarantee, weighted covariate-shift extension, simulation study n=1000/m=100/100 runs, drug-task/MIMIC-IV/MIMIC-CXR applications, conclusion).
**Verdict:** ADOPT — SCoRE's risk-adjusted e-value screening gives GSE a finite-sample, distribution-free guarantee on *continuous betting loss* (not just 0/1 error) for the posted card, with a covariate-shift extension for regime change; adopt the screening mechanism essentially as-is on top of GSE's existing CQR calibration.

## 1. Research question
How can selective prediction control a *general, bounded, continuous* risk — not just the binary misclassification rate — with finite-sample, distribution-free guarantees, and can the same machinery handle covariate shift between the calibration data and the deployment population?

## 2. Dataset / schema
- Simulation: n = 1000 calibration points, m = 100 test points, 100 independent runs; nominal risk levels 0.05–0.5; compares SCoRE against Hoeffding- and Rademacher-complexity baselines.
- Real applications: four drug-discovery tasks, MIMIC-IV ICU length-of-stay prediction error, MIMIC-CXR radiology report selection.
- Schema pattern: calibration set with (features, realized loss) pairs + a selection (gating) score; the method screens which test points to predict on.

## 3. Method / model
SCoRE (Selective Conformal Risk control with E-values): for each candidate test point, construct a *risk-adjusted e-value* E from the calibration data; select the point iff the e-value passes a threshold derived from the target risk level. Two risk notions: MDR (mean deviation risk, E[L_ψ] — average loss over selected points including abstention cost) and SDR (selected deviation risk — average loss conditional on selection). Selection is by e-value thresholding, which is what makes the guarantee hold for any bounded continuous loss, not just 0/1.

## 4. Equations & assumptions
- Core condition: the screening statistic must be a nonnegative e-value with E[L·E] ≤ 1, where L is the (bounded) loss — this single condition buys the finite-sample guarantee.
- MDR: E[L_ψ] (mean risk over the selection policy ψ); SDR: expected average risk over selected points.
- Finite-sample, distribution-free validity under exchangeability of calibration and test points.
- Weighted extension: under covariate shift, reweight the e-values by the likelihood ratio (density ratio between deployment and calibration covariates); validity carries over if the weights are correct.
- Nominal levels tested: 0.05 to 0.5.
- Assumptions: exchangeable (or weighted-exchangeable) calibration/test; loss bounded; the selection score may be any function of the features.

## 5. Features / target
Task-dependent (molecular features → activity; ICU features → length of stay; report features → selection quality). For GSE the analog: pick features → realized betting loss (units, bounded by stake size). Target controlled: the average loss over the *selected* (posted) picks.

## 6. Validation design
Simulation with known ground truth (100 runs, tight control check: SCoRE's realized risk hugs the nominal level while Hoeffding/Rademacher baselines are valid but much less powerful — they select far fewer points). Real-data applications demonstrate the method doesn't collapse on messy, high-dimensional data.

## 7. Numerical results / baselines
- Simulation (n=1000, m=100, 100 runs, levels 0.05–0.5): SCoRE controls the selective risk tightly at the nominal level across all levels; the Hoeffding and Rademacher baselines are valid but dramatically less powerful (select little at strict levels).
- Real tasks: SCoRE maintains control on all four drug tasks, MIMIC-IV ICU stay error, and MIMIC-CXR report selection — the guarantee survives real data, not just simulation.

## 8. Code / data availability
Code: https://github.com/Tian-Bai/SCoRE. Data: MIMIC-IV / MIMIC-CXR (credentialed access); drug tasks as described in the paper.

## 9. Leakage & limitations
- Exchangeability is the load-bearing assumption: NFL seasons drift (rule changes, roster turnover), so the unweighted guarantee is approximate week to week; the weighted extension helps only if the density ratio is well estimated, which is its own hard problem.
- Bounded loss required: units lost per pick are bounded by stake, which fits, but parlays/combos would need re-bounding.
- Power depends on calibration-set size (n=1000 in simulation); GSE's per-season pick counts are smaller, so the selection may be conservative early in a season.
- The method controls *average* selected risk, not the tail — a bad week can still happen; it bounds the mean, not the variance.

## 10. GSE overlap
Direct extension of ledger 1639 (CQR): GSE has conformal *intervals* (cqr.ts, currently under repair per the 2026-09-21 audit) but no conformal *selection* — nothing in the corpus gives a finite-sample guarantee on the posted card's average loss. SCoRE is the selection-layer complement to CQR's interval layer, not a duplicate. The existing-research map's abstention gap is exactly this.

## 11. GSE implementation spec
Adopt **GSE-SCoRE** with minimal changes: (a) calibration set = trailing graded picks with realized unit loss (bounded by max stake); (b) selection score = GSE's existing gate score (model edge / learned SELE score from ledger 1775); (c) each week, compute risk-adjusted e-values for the slate's candidate picks and post only those passing the threshold for the target average loss (e.g., nominal −0.02 units/pick, i.e., controlled small loss / breakeven-plus); (d) covariate-shift weights from a simple season-phase/drift classifier (early vs late season) as the paper's weighted extension; (e) reuse the authors' code (https://github.com/Tian-Bai/SCoRE) as the reference implementation. Effort: ~1 week (calibration table + e-value screening + monitoring).

## 12. Reproducible test
Dataset: GSE graded picks 2022–2025 with unit outcomes. Baseline: current fixed-threshold gating. Candidate: SCoRE screening at nominal average-loss levels {−0.05, −0.02, 0.0}. Metrics: realized average units per posted pick vs nominal (control check), number of posted picks (power check), walk-forward by season.

## 13. Acceptance / rejection gate
ADOPT accepted if walk-forward realized average loss stays within ±0.03 units of nominal across all four test seasons AND posts ≥ 70% as many picks as the baseline gate at matched realized loss; else REJECT (fall back to ADAPT: keep the e-value idea but re-derive the screen for GSE's loss structure).

## 14. Improvement experiment
Replace the single global nominal level with *per-market-type* nominal levels (spread/total/moneyline each get their own risk budget, connecting to ledger 1776's class-conditional view): test whether per-class SCoRE screening posts more picks at the same portfolio-level realized loss than the global screen. The paper treats one risk target; sports has a natural multi-class structure to exploit.

**Verdict:** ADOPT — finite-sample control of continuous betting loss on the posted card, with code available and a clean fit onto GSE's existing conformal stack; adopt the e-value screening mechanism as the card-selection gate.
