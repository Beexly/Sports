# PROCESSES.md — Frontier Process Census (2026-08)
**Path:** `handoff/research/frontier-processes-2026-08/`  
**Status:** DRAFT — no git commit; not verified in CI.  
**Scope:** Processes/workflows this repo does NOT yet run (explicit exclusions: basic Kelly, flat CLV doctrine, falsifyBind e-gates — already covered).

**CITATION DISCIPLINE:** Every section names a source; UNVERIFIED claims are tagged `[UNVERIFIED]`. No synthetic citations.

---
## Priority by leverage (read top → bottom)
1. **Forecast evaluation discipline** — highest leverage (without it, no credible improvement loop).
2. **Adversarial validation / pick-logging schemas** — enables attribution; pairs with falsifyBind gap.
3. **Bet selection as portfolio (simultaneous Kelly, correlations)** — capital-efficiency lever.
4. **Research workflow / model-card discipline** — organizational durability.
5. **Automation / MLOps patterns** — infrastructure; valuable only after 1–4 are real.

---
## 1. Forecast evaluation as discipline
**Current best practice:** Murphy's Brier-score decomposition (reliability — resolution — uncertainty) is the standard proper-scoring rule framework for binary/probabilistic forecasts (Murphy, 1973; modern restatement in RMets 2022, https://rmets.onlinelibrary.wiley.com/doi/abs/10.1002/qj.2985). Skill score vs climatology (SS = (BS_clim - BS_model) / BS_clim) lets you claim improvement over a baseline, not just over zero. Time-series CV for sports must use **rolling origin / blocked CV** (not random k-fold) to avoid data leakage from temporal ordering — see Hyndman `fpp3` ch 5.10, https://otexts.com/fpp3/tscv.html and Rob Hyndman's notes.
**Pre-registration (psychology):** Pre-register model spec + evaluation protocol before observing holdout; publish the protocol before the season starts (see Open Science Framework practices). [UNVERIFIED: exact OSF citation — verify before claiming as authoritative.]
**Gap in our repo:** No Murphy decomposition script; no rolling-origin CV wrapper; no pre-registration template; no skill-score tracker.
**Concrete artifact built next:** `scoring/murphy_decompose.py` (computes reliability/resolution/uncertainty + skill score); `scoring/rolling_origin_cv.py`; `templates/pre_reg_protocol.md`.
**Citation:** Murphy (1973) — via RMets 2022 review; Hyndman, `Forecasting: Principles and Practice` 3rd ed §5.10 (UNVERIFIED direct access — confirm URL live before publishing). [UNVERIFIED: pre-registration source link — needs real OSF/APA citation.]

---
## 2. Bet selection as portfolio
**Current best practice:** Treat bets as a portfolio with correlated outcomes. Whitrow (2007) "Algorithms for optimal allocation of bets on many simultaneous events", JRSS C 56(5):607–623 (https://ideas.repec.org/a/bla/jorssc/v56y2007i5p607-623.html) gives the simultaneous-Kelly formulation (maximize expected log wealth subject to covariance matrix Σ). Correlation matrices between bet types (spread vs quarter-spread; over/under vs player props) are required inputs; pairs/cointegration ideas exist (e.g., line drift between related markets) but are [UNVERIFIED] as production-ready in sports.
**Gap in our repo:** No correlation matrix builder; no simultaneous-Kelly solver; no pairs/cointegration detector; no portfolio-level sizing beyond single-bet Kelly.
**Concrete artifact built next:** `portfolio/correlation_matrix.py` (bet-type correlation from historical logs); `portfolio/whitrow_solver.py` (simultaneous Kelly given Σ); `portfolio/pairs_detector.md` (design doc — [UNVERIFIED] — needs empirical validation before code).
**Citation:** Whitrow 2007 JRSS C (ideas.repec.org link above — verified accessible 2026-08-26). [UNVERIFIED: cointegration pairs for sports — no verified source; mark speculative.]

---
## 3. Automation / MLOps for sports models
**Current best practice:** Production sports models retrain daily (or per game-day); feature stores (Feast, Tecton) snapshot odds at fixed intervals; drift detection monitors line movement distributions (KS test / PSI) rather than model error alone (line behavior drifts faster than outcome distributions). MLOps literature: Sculley et al. "Hidden Technical Debt in Machine Learning Systems" (2015, NIPS); for sports-specific, [UNVERIFIED] — verify with domain sources.
**Gap in our repo:** No retraining pipeline spec; no feature-store schema; no drift-detection script; no production model registry.
**Concrete artifact built next:** `mlops/feature_store_schema.json` (Feast-style feature spec for odds snapshots); `mlops/drift_detector_line.py` (KS on line-change distributions); `mlops/retraining_pipeline.md` (design spec — [UNVERIFIED] until run once).
**Citation:** Sculley et al. 2015 (verified reference); sports-specific MLOps references [UNVERIFIED] — need primary source before publication.

---
## 4. Research workflows / forecasting team discipline
**Current best practice:** Metaculus question lifecycle (open → resolve → post-mortem) supports continuous calibration tracking; FiveThirtyEight model-card discipline requires public documentation of model inputs, outputs, assumptions, and limitations before release (see 538 "How Our NBA Forecasts Work" and similar). Model cards survive handoffs; undocumented models don't.
**Gap in our repo:** No model-card template; no forecasting lifecycle doc; no post-mortem schema; no handoff protocol for forecasting models.
**Concrete artifact built next:** `workflows/model_card_template.md` (inputs / outputs / assumptions / limits / calibration history / pre-registration link); `workflows/forecast_lifecycle.md` (open → pre-register → evaluate → resolve → post-mortem); `workflows/postmortem_template.md`.
**Citation:** Metaculus platform (https://www.metaculus.com/ — verified 2026-08-26); 538 model-card practice (UNVERIFIED direct URL — verify 538 forecast-methodology page before claiming exact citation).

---
## 5. Adversarial validation / pick-logging schemas
**Current best practice:** Holdout regimes against your OWN past picks (not just train/test splits) expose overfitting to selection bias; falsifyBind gives e-gates but misses pick-level attribution. A bet-log schema must capture: pick timestamp, model version, pre-registration reference, probability estimate, line taken, outcome, P&L, and — critically — attribution fields that allow later analysis: which feature group contributed, whether the pick survived adversarial holdout, and whether it was a portfolio-level or single-bet decision. Without this schema, adversarial validation is unrepeatable.
**Gap in our repo:** No pick-level schema; falsifyBind operates at gate-level only; no attribution fields; no holdout-against-own-picks script.
**Concrete artifact built next:** `schemas/bet_log_v1.json` (full schema); `schemas/pick_attribution.md` (field-level semantics); `adversarial/holdout_own_picks.py` (script — [UNVERIFIED] until run); `adversarial/attribution_analysis_template.md`.
**Citation:** Our repo's falsifyBind references (verified in existing docs); Whitrow 2007 (portfolio-level context); pre-registration discipline from psychology (see §1). No external adversarial-pick source verified — [UNVERIFIED].

---
## Cross-section: how artifacts connect
- `scoring/rolling_origin_cv.py` feeds evaluation data to `workflows/postmortem_template.md`.
- `schemas/bet_log_v1.json` is the input to `adversarial/holdout_own_picks.py` and `portfolio/correlation_matrix.py`.
- `workflows/model_card_template.md` references `scoring/murphy_decompose.py` (calibration evidence) and `schemas/bet_log_v1.json` (attribution).
- `mlops/drift_detector_line.py` consumes feature-store snapshots defined in `mlops/feature_store_schema.json`.

---
## Verification rules before promotion out of this folder
For each artifact: (a) file exists at named path; (b) syntax valid; (c) cited URL reachable OR marked UNVERIFIED; (d) no fabricated output. No artifact moves to main repo without passing (a)–(d). Do NOT commit to main until all artifacts pass.
