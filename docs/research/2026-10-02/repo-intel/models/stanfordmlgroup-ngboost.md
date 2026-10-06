# stanfordmlgroup/ngboost

- Stars: 1,891 (Apache-2.0) — pushed 2026-09-02, maintained
- Repo: https://github.com/stanfordmlgroup/ngboost (pip/conda: `ngboost`)
- Paper: Duan et al. 2019, "NGBoost: Natural Gradient Boosting for Probabilistic Prediction" (Stanford ML Group).

## 1. Vision

Gradient boosting that outputs a **full probability distribution per prediction**, not a point. Built on sklearn, modular over scoring rule × distribution × base learner: `NGBRegressor().fit(X, y)` then `pred_dist(X)` gives you a distribution object with `.logpdf`, `.ppf`, etc. The natural-gradient machinery makes the probabilistic fit stable.

## 2. The Ask

Tabular features + targets; choice of output distribution (Normal, LogNormal, etc.) and scoring rule. Trains on one machine; slower than plain GBM (fits a distribution, not a mean).

## 3. Constraints

- License: Apache-2.0 — commercial-safe.
- You must **choose the parametric family** — if the true conditional distribution isn't Normal-ish, the "probabilities" are misshapen. NGBoost distributions are frequently miscalibrated out of the box and need post-hoc recalibration (which is exactly this group's job).
- Notebook-heavy repo; the library itself is pip-packaged and solid.

## 4. GSE lens

NGBoost is the **probabilistic head** the calibration group has been missing: for every point projection (player yards, game totals), GSE currently has a number; NGBoost gives a distribution — which is what props pricing and interval outputs actually need. But:

- **Wire it with a calibration row, not as gospel.** Its raw distributions go straight into the per-signal calibration pipeline: fit NGBoost on 2022-24, check distribution calibration (PIT uniformity) on 2025, recalibrate via uncertainty-toolbox's isotonic recalibration or conformal-tights, live-check on 2026 W1-4.
- **Do not trust the parametric shape blindly.** The IDR dossier's warning applies: parametric-looking calibration can hide artifacts. Prefer NGBoost's distribution as the *starting* uncertainty, then conformalize it (MAPIE/crepes) for the published intervals.
- **Walk-forward**: refit per season — the distribution family that fit 2022-24 offenses may not fit 2026.

## 5. Verdict

**ADOPT** — as the probabilistic prediction head for tabular signals, always paired with a post-hoc calibration row. Apache-2.0.

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/stanfordmlgroup/ngboost
- Diagram: https://gitdiagram.com/stanfordmlgroup/ngboost
- Star history: https://star-history.com/#stanfordmlgroup/ngboost (1,891 stars)
- Open in browser IDE: https://github.dev/stanfordmlgroup/ngboost
