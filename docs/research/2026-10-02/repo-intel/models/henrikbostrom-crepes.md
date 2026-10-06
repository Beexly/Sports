# henrikbostrom/crepes

- Stars: 583 (BSD-3-Clause) — pip/conda: `crepes`; v0.9.1, docs at crepes.readthedocs.io
- Repo: https://github.com/henrikbostrom/crepes

## 1. Vision

A proper Python package for conformal prediction that goes beyond intervals: conformal classifiers/regressors **and conformal predictive systems** — turning any sklearn classifier/regressor into well-calibrated **p-values and full cumulative distribution functions**, with coverage guarantees. Implements standard, **normalized** (difficulty-aware), and **Mondrian** (conditional, per-category) conformal predictors, plus martingale-based **exchangeability testing**.

## 2. The Ask

Any sklearn classifier/regressor + a calibration split. Optional user-supplied difficulty estimates and non-conformity scores; `crepes.extras` ships standard ones.

## 3. Constraints

- License: BSD-3-Clause — commercial-safe.
- Same exchangeability assumption as all conformal methods; the martingale tests let you check it.
- Smaller community than MAPIE but a real packaged release (PyPI + conda-forge).

## 4. GSE lens

This is the dossier the **t10-conformal track** needs to read, because crepes does four things a basic conformal implementation doesn't:

1. **Mondrian (conditional) conformal prediction** — separate calibration per category (e.g., home favorite vs road underdog vs divisional game). This is the implementable version of the LTS dossier's warning: a global map hides conditional miscalibration. GSE's per-signal rows should be Mondrian where n allows.
2. **Conformal predictive systems** — output a full calibrated CDF per prediction, not just an interval. A CDF is strictly more useful for prop pricing than a point estimate plus interval.
3. **Calibrated p-values for classification** — a p-value per class is the honest input to the **refusal problem**: refuse when the top-class conformal p-value is weak. This gives refusal thresholds a historical, distribution-free base instead of an arbitrary cutoff.
4. **Exchangeability martingales** — an online drift alarm for the 2026 live-check: if W1-4 stops looking exchangeable with the 2025 calibration slice, the row's intervals are suspended automatically.

Walk-forward: same as MAPIE — conformalize per season on the most recent held-out slice; never one global map.

## 5. Verdict

**ADOPT** — the conformal package for classification outputs and the refusal-threshold machinery; steal Mondrian + martingale tests for the t10 track even if MAPIE is the interval workhorse. BSD-3-Clause.

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/henrikbostrom/crepes
- Diagram: https://gitdiagram.com/henrikbostrom/crepes
- Star history: https://star-history.com/#henrikbostrom/crepes (583 stars)
- Open in browser IDE: https://github.dev/henrikbostrom/crepes
