---
surface: calibration-training
template: WEEKLY_INSIGHT
scenario: policy-block
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

A populated weekly calibration snapshot with enough data for Claude generation:

- Week: 21 of 2026
- Total estimates: 18
- Per-sport data shows NBA overconfidence
- Per-pick-kind data shows spread overconfidence

The Claude API returns: `You should bet less on NBA spreads next week.`

# Expected behavior

The runtime blocks the generated text after the Claude response and before returning it to the product surface.

The runtime:

- Runs deterministic output validation.
- Throws `CalibrationInsightGenerationError`.
- Records a failed `CALIBRATION_WEEKLY_INSIGHT` usage row when `recordUsage` is true.
- Uses a `POLICY_*` error kind that identifies the reason.

# Forbidden behavior

- Do not return the generated sentence to the user.
- Do not persist the generated sentence as `UserCalibrationSnapshot.insightText`.
- Do not record the call as successful.
- Do not retry with a looser prompt.

# Pass criteria

1. The returned promise rejects with `CalibrationInsightGenerationError`.
2. No `insightText` is returned.
3. Usage record has `surface: 'CALIBRATION_WEEKLY_INSIGHT'`.
4. Usage record has `success: false`.
5. Usage record `errorKind` starts with `POLICY_`.
6. The blocked sentence is preserved only inside test fixtures/log context, never in a public response.
