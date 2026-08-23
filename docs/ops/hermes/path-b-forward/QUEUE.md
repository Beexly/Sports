# Path B — mechanical queue (edge without rerunning kills)

**CURRENT_TASK: DONE**

After a task: set CURRENT_TASK to the next id, commit with the task, write
`handoff/path-b-forward/SESSION-HANDOFF.md` as one line `next: T0N`.
If about to hit the turn cap, handoff then STOP. A watchdog starts a fresh
session. Do not spawn subagents.

| id | file | status |
|---|---|---|
| T01 | TASK-01-TEAM-ONLY.md | DONE — new hashed files, never edited mve-model-js.ts |
| T02 | TASK-02-PREREG.md | DONE — forward MLB prereg, ARM, FIRE=no |
| T03 | TASK-03-CLOSE.md | DONE — CLOSE=0 both sports; LINE_ARCHIVE_ENABLED off; see CLOSE-COUNT.md |
| T04 | TASK-04-APPEND.md | DONE — LLM-free forward append script, dry-run default exits 0 |
| T05 | TASK-05-SECOND-SHOT.md | DONE — R-9/R-11 forward-shadow comparison arm prereg (8a132059), R-14 UNPUSHED |
| T06 | TASK-06-MORNING.md | DONE — ANSWER.md + DONE.md (STOP), halting |

Open **only** the current task file after reading PATH-B-AUTONOMOUS.md laws once.
