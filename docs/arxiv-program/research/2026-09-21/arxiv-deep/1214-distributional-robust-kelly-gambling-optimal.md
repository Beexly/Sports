# [1214] Distributional Robust Kelly Gambling: Optimal Strategy under Uncertainty in the Long-Run (arXiv:1812.10371)

**Citation:** Qingyun Sun, Stephen Boyd (2018). *Distributional Robust Kelly Gambling: Optimal Strategy under Uncertainty in the Long-Run*. arXiv:1812.10371. URL: https://arxiv.org/abs/1812.10371
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — implement the robust-Kelly convex program (maximize worst-case expected log growth over a probability uncertainty set) as GSE's sizing layer under calibration error, building the uncertainty sets from GSE's own calibration residuals rather than the paper's horse-race sets.

## 1. Research question
The paper asks how to gamble optimally in the Kelly (log-growth) sense when the true outcome distribution is not known but belongs to a known uncertainty set Π: what allocation b maximizes the worst-case expected log growth, and can this distributionally robust problem be solved tractably for practical uncertainty sets?

## 2. Dataset / schema
Illustrative horse-race numerical example (nominal win probabilities and pari-mutuel-style returns; the paper's example is synthetic/pedagogical rather than a real historical dataset — no rows, dates, or schema given for real data).

## 3. Method / model
Solve maximize_{b ∈ B} inf_{π ∈ Π} E_π[log(rᵀb)], where b is the allocation vector, r the return vector, and Π an uncertainty set over outcome distributions. Show the problem is a disciplined convex program (DCP) for: polyhedral sets, box sets, ellipsoidal sets, f-divergence balls, Wasserstein balls, and sets defined by estimated mean/covariance. Implement in CVXPY. Demonstrate on the horse-race example, comparing nominal Kelly (point-estimate distribution) against robust strategies under worst-case distributions.

## 4. Equations & assumptions
- Robust objective: maximize_{b ∈ B} inf_{π ∈ Π} E_π[log(rᵀb)]
- Uncertainty sets handled: polyhedral, box, ellipsoidal, f-divergence, Wasserstein, mean/covariance-estimated
Assumptions: the true distribution lies in Π (the entire guarantee collapses otherwise); log utility; the allocation set B is convex. The choice of set type and radius is exogenous — the paper gives no data-driven selection rule.

## 5. Features / target
Inputs: nominal outcome distribution (or moments), choice of uncertainty set Π and its size parameters. Target: robust allocation vector b* maximizing worst-case expected log growth.

## 6. Validation design
Numerical demonstration on the horse-race example: compute nominal Kelly growth under the nominal distribution and under worst-case distributions, vs. robust strategies. No train/test split, no real-data backtest, no statistical significance claims. Comparison is worst-case growth across methods.

## 7. Numerical results / baselines
Quoted exactly from the paper's horse-race example:
- Nominal Kelly growth (under nominal distribution): 4.3%
- Nominal growth of the robust strategies: 2.2%
- Worst-case growth of nominal Kelly: −2.2%
- Worst-case growth of robust Kelly: 0.7% (box set, η = 0.26) and 0.4% (ball set, c = 0.016)
Interpretation (mine): robustness costs ~half the nominal growth but converts a −2.2% worst case into a positive worst case.

## 8. Code / data availability
Formulation is CVXPY/DCP-compatible; no repository link stated in the paper.

## 9. Leakage & limitations
No real data, so no leakage — but the uncertainty-set radii (η = 0.26, c = 0.016) are chosen for illustration, with no procedure for calibrating them to real miscalibration. If the set is too large, the strategy over-protects and leaves growth on the table; too small and the "robust" guarantee is fiction. The worst case is over the chosen set, not over true model misspecification (e.g., nonstationary edges). Computational cost for large outcome spaces (many simultaneous props) is not benchmarked.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, "Kelly criterion / optimal bet sizing under uncertainty" and "estimation error" are identified gaps with zero deep reads. GSE's `apps/web/lib/staking/kelly-investigation.ts` takes a point win probability as input and explicitly "does not claim calibrated/PROVEN edge" — it has no uncertainty-set machinery. This paper is the direct upgrade path for that module: a new capability, not a duplicate. It also complements GSE's calibration work (isotonic/Platt in `apps/web/lib/calibration/`), whose residuals can parameterize Π.

## 11. GSE implementation spec
1. Build uncertainty sets from GSE's calibration residuals: for each market type, estimate the distribution of (realized − predicted) probability errors on backtest data; use these to size a box/ellipsoidal set Π around the nominal outcome distribution. Effort: M.
2. Implement the robust sizer: maximize_{b} inf_{π∈Π} E_π[log(1 + bᵀr)] as a convex program (CVXPY-equivalent in the GSE stack), with the existing fractional cap (≤ 0.25 default) as an additional constraint. Effort: M.
3. Add a "robustness dial" (set radius) to the staking config with a default chosen by the acceptance test below; log the nominal vs. robust stake for every pick for audit. Effort: S.

## 12. Reproducible test
Dataset: GSE 2025–2026 backtest picks with calibrated probabilities and realized outcomes. Metric: realized log-bankroll growth under (a) current point-estimate Kelly sizing vs. (b) robust sizing, plus worst-decile-of-weeks growth (empirical worst case). Baseline: (a). Window fixed in advance; Π calibrated only on data before the test window.

## 13. Acceptance / rejection gate
ADOPT robust sizing if it improves worst-decile-of-weeks realized growth by ≥ 20% relative to baseline while keeping total realized log growth ≥ 0.9× baseline. REJECT otherwise.

## 14. Improvement experiment
Beyond the paper: make Π adaptive — shrink the uncertainty set as a function of GSE's live calibration-in-the-small diagnostics (recent reliability by probability bin), so well-calibrated regimes get near-nominal Kelly and poorly-calibrated regimes get protection. Hypothesis: adaptive-Π beats any fixed-radius set on realized growth.
