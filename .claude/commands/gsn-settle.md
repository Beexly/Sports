---
description: Sweep settled-eligible picks and grade them (W/L/Push)
argument-hint: Optional sport filter (e.g., "nba")
---

You are running `/gsn-settle`. Optional sport filter: $ARGUMENTS

Steps:

1. **Select eligible picks.** Read all rows where `status = 'live'` and `start_time + expected_duration < now()`. Apply sport filter if provided.
2. **Dispatch the settler.** Invoke the `settler` agent (`.claude/agents/settler.md`) with the eligible set. The agent will fetch final scores from the configured authoritative source.
3. **Apply outcomes.** For each pick the settler returns: update `status = 'settled'`, `outcome ∈ {W, L, Push, Void}`, `settled_at = now()`. Skip and re-queue any pick whose source flagged `final: false` or `under_review: true`.
4. **Log every settlement.** One structured log line per row: `{pick_id, outcome, final_score, source, ts}`. Append to `_logs/tool-trace-{date}.jsonl`.
5. **Trigger downstream.** For each newly-settled pick, enqueue the `grader` (per §7 lifecycle). Do not run grading inline — it's its own cycle.

Pattern references:
- `claude-cookbooks-main/managed_agents/CMA_verify_with_outcome_grader.ipynb`
- `claude-cookbooks-main/claude_agent_sdk/03_The_site_reliability_agent.ipynb`
