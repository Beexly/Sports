---
description: Recompute Brier score + reliability diagram and update the public /calibration route
argument-hint: Optional window (e.g., "7d", "30d", "season"); default "7d"
---

You are running `/gsn-calibration`. Window: $ARGUMENTS (default 7d).

This is Pillar 3 — calibration is the marketing. Don't ship a number you can't defend.

Steps:

1. **Load graded picks** in the window. Status must be `graded` (settler + grader both ran). Discard `Void` picks from calibration math.
2. **Bucket** by confidence band: 50-59, 60-69, 70-79, 80-89, 90-100.
3. **Per band**: realized hit rate, sample size, confidence midpoint, Brier component.
4. **Overall Brier score** across all buckets.
5. **Reliability diagram data.** Emit a JSON payload the `/calibration` page consumes: `[{band, n, stated_mid, realized_rate, brier_component}]`.
6. **Write the artifact** to `_logs/calibration-{window}-{ts}.md` (human-readable) and to the DB/cache the `/calibration` route reads from.
7. **Drift check.** If any band drifts >10% from stated midpoint, dispatch the `grader` to draft a prompt-version bump (per §7 evaluator-optimizer loop). Do NOT auto-activate — Garrett approves new prompt versions in the operator UI.

Pattern references:
- `claude-cookbooks-main/patterns/agents/evaluator_optimizer.ipynb`
- `claude-cookbooks-main/managed_agents/CMA_verify_with_outcome_grader.ipynb`
- `claude-cookbooks-main/managed_agents/CMA_prompt_versioning_and_rollback.ipynb`
