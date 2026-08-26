# Retraining Pipeline Design — Sports (2026-08, orchestrator)

Trigger conditions (when to retrain):
1. New season starts (2015→2025 sequence — already running continuously on harness)
2. Line-drift flag from drift_detector_line.py (KS/PSI crosses)
3. FalsifyBind SURVIVOR result from a bind (retrain with new feature weights)
4. Quarterly manual (until automated)

Pipeline steps (not yet run — design only):
- Feature extraction: pbp + NGS + weather + tracking → covariate rows
- Model: XGBoost with calibration layer (Platt/isotonic — aware of 2026-08 caveat)
- Validation: rolling_origin_cv.py (blocked by season)
- Stability: if same result on rolling block → no change; if different → flag
- Deployment: only after falsifyBind passes on new block

Status: NOT BUILT — needs first SURVIVOR to have a pipeline to deploy.
