# ryurko/nflscrapR-models — Dossier

**Stars:** 42 (verified 2026-10-02) · **Language:** R · **Pushed:** 2018-09-18 (archival) · **Created:** 2017-08-07

## 1. Vision
The research-code repository behind the canonical nflscrapR EP (expected points), field-goal, and win-probability models — Ronald Yurko's code for the nflWAR paper (arXiv:1802.00998). Exists so the models that underpin modern public NFL analytics are auditable, not magic.

## 2. The Ask
R. Reads nflscrapR-era play-by-play. Includes the leave-one-season-out cross-validation calibration code and calibration plots — the part most people skip.

## 3. Constraints
- **License: NONE declared** — study-only, not for verbatim reuse.
- Frozen 2018 methodology (multinomial logistic EP). The field has moved to nflfastR's XGBoost-era models; treat this as history, not a target.

## 4. GSE lens
This repo's sharpest section is `loso_cv_calibration`: they tried an ordinal-logistic EP variant and **published that it calibrated dramatically worse**. That is the honesty standard GSE's model development currently lacks. GSE built a tau table (+6.77pp held-out) with no consumer — the equivalent of training a model and never asking whether it survives a calibration plot on unseen seasons. The specific, blunt lesson: **every GSE model/component should ship with a leave-one-season-out calibration result before it gets a consumer, and components that fail get documented as dead, not left un-consumed in the tree.** GSE's calibration just started (2022–2025 + 2026 W1–4) — LOSO-CV is the exact frame to run it in.

## 5. Verdict
**REBUILD** — The LOSO calibration discipline and "publish the failed variant" norm. No code to copy; the methodology pattern is the prize.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/ryurko/nflscrapR-models
- Gitdiagram: https://gitdiagram.com/ryurko/nflscrapR-models
- Star history (42 stars): https://star-history.com/#ryurko/nflscrapR-models
- github.dev: https://github.dev/ryurko/nflscrapR-models
