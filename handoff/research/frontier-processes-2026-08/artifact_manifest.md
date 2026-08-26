# Artifact build manifest (2026-08-26)
Each line = concrete artifact promised in PROCESSES.md. Status: `NOT BUILT` until file exists and is verified.

## §1 Forecast evaluation
- [NOT BUILT] `scoring/murphy_decompose.py` — script computing reliability/resolution/uncertainty + skill score.
- [NOT BUILT] `scoring/rolling_origin_cv.py` — rolling-origin blocked CV wrapper.
- [NOT BUILT] `templates/pre_reg_protocol.md` — pre-registration template (psychology-style).

## §2 Portfolio / simultaneous Kelly
- [NOT BUILT] `portfolio/correlation_matrix.py` — correlation from historical bet logs.
- [NOT BUILT] `portfolio/whitrow_solver.py` — simultaneous Kelly (Whitrow 2007).
- [NOT BUILT] `portfolio/pairs_detector.md` — design doc; [UNVERIFIED] until empirically validated.

## §3 MLOps / automation
- [NOT BUILT] `mlops/feature_store_schema.json` — Feast-style feature spec for odds snapshots.
- [NOT BUILT] `mlops/drift_detector_line.py` — KS/PSI on line-change distributions.
- [NOT BUILT] `mlops/retraining_pipeline.md` — design spec; [UNVERIFIED] until run once.

## §4 Research workflows
- [NOT BUILT] `workflows/model_card_template.md` — public model card.
- [NOT BUILT] `workflows/forecast_lifecycle.md` — forecasting lifecycle.
- [NOT BUILT] `workflows/postmortem_template.md` — post-mortem format.

## §5 Adversarial validation / pick logging
- [NOT BUILT] `schemas/bet_log_v1.json` — full bet-log schema (attribution fields included).
- [NOT BUILT] `schemas/pick_attribution.md` — field semantics doc.
- [NOT BUILT] `adversarial/holdout_own_picks.py` — script; [UNVERIFIED] until executed.
- [NOT BUILT] `adversarial/attribution_analysis_template.md` — analysis template.
