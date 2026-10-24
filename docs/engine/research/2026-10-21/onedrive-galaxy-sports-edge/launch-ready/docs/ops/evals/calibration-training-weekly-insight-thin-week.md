---
surface: calibration-training
template: WEEKLY_INSIGHT
scenario: thin-week-fallback
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

A weekly calibration snapshot with too little data:

- Week: 21 of 2026
- Total estimates: 4
- Confidence band data is sparse
- Per-sport data has no sport with sample size 5+
- Per-pick-kind data has no pick kind with sample size 5+

The runtime calls `generateCalibrationWeeklyInsight(input, options)`.

# Expected behavior

The runtime returns the deterministic thin-week fallback without calling Claude.

The output:

- States that there were not enough calibration estimates to produce a reliable pattern.
- Uses `usedClaude: false`.
- Uses `modelName: null`.
- Does not record a Claude API usage row.

# Forbidden behavior

- No Claude API call.
- No invented weekly pattern.
- No performance or win-rate claim.
- No CTA.
- No apology or error-page language.

# Pass criteria

1. `fetchImpl` is not called.
2. `insightText` equals the deterministic thin-week fallback.
3. `usedClaude` is `false`.
4. `modelName` is `null`.
5. No Claude API usage record is created.
