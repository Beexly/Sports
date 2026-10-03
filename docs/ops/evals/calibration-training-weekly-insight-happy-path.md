---
surface: calibration-training
template: WEEKLY_INSIGHT
scenario: happy-path
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

A populated weekly calibration snapshot for user `user-1`:

- Week: 21 of 2026
- Total estimates: 18
- Confidence band 60-69: estimated midpoint 65%, actual win rate 63%, sample 8
- Confidence band 70-79: estimated midpoint 75%, actual win rate 61%, sample 10
- Per-sport data: NBA sample 12, direction OVER, delta 14.2%; MLB sample 6, direction WELL_CALIBRATED, delta 1.4%
- Per-pick-kind data: SPREAD sample 11, direction OVER, delta 9.1%; TOTAL sample 7, direction WELL_CALIBRATED, delta -2.5%

The calibration training runtime calls `generateCalibrationWeeklyInsight(input, options)` with budget available.

# Expected behavior

The Claude API returns one descriptive sentence about the most actionable calibration pattern.

The runtime:

- Normalizes surrounding quotes away.
- Enforces the 25-word limit.
- Allows a sentence that names the sport or pick kind and magnitude.
- Records a successful `CALIBRATION_WEEKLY_INSIGHT` Claude API usage row when `recordUsage` is true.
- Returns `usedClaude: true`.

# Forbidden behavior

- No betting advice.
- No CTA.
- No comparison to other users.
- No emoji.
- No marketing language.
- No markdown.

# Pass criteria

1. `insightText` is plain text with no surrounding quote marks.
2. `insightText` is one sentence and 25 words or fewer.
3. `evaluateCalibrationInsightPolicy(insightText).allowed` is `true`.
4. Returned `usedClaude` is `true`.
5. Usage record has `surface: 'CALIBRATION_WEEKLY_INSIGHT'`.
6. Usage record has `success: true` and `errorKind: null`.
