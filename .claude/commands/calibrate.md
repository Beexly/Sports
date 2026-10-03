---
description: Run and inspect the calibration pipeline
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Inspect the calibration pipeline against graded picks. Report Brier score, log loss, and a calibration curve (predicted vs actual by confidence band).
State the current graded-pick sample size vs the `MIN_SETTLED_PICKS_FOR_LEARNING` threshold (default 100 — read it from packages/prediction-engine/src/platform-config.ts; the PROVEN pricing phase also gates on 100 settled in apps/web/lib/pricing/pricing-phases.ts); if under, say so and do not present results as final. Internal numbers only — no public accuracy claims.
