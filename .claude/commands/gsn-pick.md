---
description: Run pick-generator for a single game and print the output. Does not write to the DB — testing/inspection only.
argument-hint: Game ID (required)
---

You are running `/gsn-pick`. Game ID: $ARGUMENTS

If no game ID is supplied, abort with: `usage: /gsn-pick <game-id>`.

Steps:

1. **Load game.** Read the game row from the DB (or the research store if DB is offline) and the latest `stat-researcher` record.
2. **Dispatch.** Invoke the `pick-generator` agent (`.claude/agents/pick-generator.md`) with the game payload. Model: `sonnet` by default; if the agent returns confidence ≥75, re-invoke with model `opus` + extended thinking per the agent's Lock-tier rule.
3. **Print the strict-JSON output** exactly as the agent returned it — do not reformat, do not paraphrase.
4. **Persist a sample.** Write the request + response to `_logs/samples/gsn-pick-{ts}-{game-id}.json` so it's auditable.
5. **Do not write to the `picks` table.** This command is for inspection. If Garrett wants it shipped, that goes through the normal draft → reviewed → published flow.

Pattern references:
- `claude-cookbooks-main/misc/using_citations.ipynb`
- `claude-cookbooks-main/tool_use/extracting_structured_json.ipynb`
