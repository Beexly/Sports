# Read this first

Motif is the lead. Motif is Muse, renamed. Do not relitigate this.
If this file and a chat disagree, this file wins.

Load rule, measured: the Windows Sports AGENTS.md was 1,134,215 bytes and Orca skipped it over 256KB, so the worker ran with no rules. Codex caps a project doc at 32KiB by default (project_doc_max_bytes). Claude Code 2.1.277 reads AGENTS.md only when no CLAUDE.md exists. This repo has CLAUDE.md, so a Claude-family agent will not see AGENTS.md unless CLAUDE.md points here. Copilot reads .github/copilot-instructions.md. Keep this file under 16KB.

## Stop

- No play, no lean, no parlay, no probability, unless you can name the function, the file, and the row id that accepted it. Else ABSTAIN.
- Gate: 100 settled rows on the deployed version, Brier at or under 0.22. The 47 do not clear it.
- Signal slate is not a play. workers/pick-generation exits 0 and is not a run.
- Do not apply ops/prisma-diff-2026-10-08. It drops live tables missing from the migration files.
- Do not mix signal-origin, gse, framefit, desk.
- Do not publish, spend, or merge from a chat. Disk under 1GB: write the file, do not push.

## Run

Settle, free path, already primary since 2026-09-02:
`GET /api/cron/settle-picks?path=free` with the cron bearer. Code: apps/web/lib/data-sources/free-settlement-runner.ts.

Odds: Galaxy first. refreshOdds sends espn-free-path when both paid keys are blank. The cron on main returned signal-only before that call. Branch fix/galaxy-odds-first-2026-10-08 removes that bail-out and is not merged. A present THE_ODDS_API_KEY still wins inside process-sport.ts. That is the remaining writer bug.

A note needs a game id, a tier, and a timestamp. situational_notes is not in schema.prisma. Raw prose is not a coefficient.

## Map

| Need | File |
| --- | --- |
| Org | Beexly/agent-bus BEEX-AGENT-TEAM.md |
| Founder odds order | docs/ops/LAUNCH_FINISH_LINE_2026-09-05.md WP-27 |
| Free settle | .claude/skills/settlement-free-path/SKILL.md |
| Live odds writer | packages/ingestion-pipeline/src/process-sport.ts |
| Cron | apps/web/app/api/cron/refresh-odds/route.ts calls refreshOdds |
| Learning label | calibration-metrics reads settled rows with eligibleForLearning |

Do not reconstruct this from chat. Do not open the long AGENTS.md to find a rule.
