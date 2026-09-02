---
description: Systematic root-cause debugging
argument-hint: [describe the bug]
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Debug: $ARGUMENTS
Work systematically: restate the symptom, list ranked hypotheses, gather evidence from code/logs for each, identify the root cause, then propose the smallest fix. Confirm the cause before changing anything.
For production symptoms, first fetch /api/ops/public-surface-truth and compare deployment.sha to origin/main (docs/ops/DEPLOY_LAG.md). docs/ops/AGENT_LEDGER.md and docs/data/FLEET_DISPATCH.md are the task ground truths.
