# Model Card Template — Sports (2026-08, orchestrator, from 538 model-card discipline)

Fields (all required before any model claims SURVIVOR):
- Model name / version / date / branch
- Inputs (features used from our harness: spreadLineHome, avgSeparation, targets...
  — cite exact file paths)
- Outputs (prob_est / risk_set / recommended_action)
- Assumptions (devigged close, market efficiency, no open-vs-close dynamics)
- Limitations (no GPS/load/injury model; single-book consensus; no teaser/pricing)
- Calibration reference (Brier score, reliability/resolution/uncertainty)
- FalsifyBind results (leakage/shuffle/split/multiplicity verdicts with logM)
- Holdout evidence (rolling-origin CV scores by season)
- Owner / review date / next review

Status: TEMPLATE ONLY — filled when first SURVIVOR passes falsify.
