# obra/superpowers — staged skill pilot (NOT installed)

**Status: staged here for review, not in `.claude/`.** AGENTS.md law 2 freezes `.claude/**`
for agent sessions — no autonomous session may add, remove, or modify anything under it.
This file exists so the founder can review the actual proposed skill content and, if
approved, install it via the real path (`/plugin install superpowers@claude-plugins-official`
or `/plugin marketplace add obra/superpowers-marketplace` then
`/plugin install superpowers@superpowers-marketplace`) — a founder action, not something
this session can do for itself.

## Why this framework specifically

Of 15 agent frameworks evaluated (github repos with 13k-286k stars), `obra/superpowers`
was the one clear-fit adoption candidate: it is Claude-Code-native (not a foreign runtime
GSE would need to integrate), and it solves the exact problem GSE's own AGENTS.md already
hand-rolls by convention — structuring how an autonomous coding agent plans, tests, and
dispatches parallel work — just with a maintained, MIT-licensed, purpose-built
implementation instead of prose rules re-derived per session.

## The 3 highest-value skills to pilot first

Selected by direct overlap with GSE's own already-documented pain points, not generically:

1. **`systematic-debugging`** (4-phase root cause analysis). GSE's AGENTS.md is full of
   incidents where the first fix attempt was a symptom patch, not a root cause (e.g. the
   line-archive outage: three separate root-cause layers — the bare-array-on-scalar-filter
   bug, the swallowed-catch, the test that certified the bug — took a dedicated audit pass
   to surface, per AGENTS.md's own "Three things let it survive three weeks" note). A
   structured 4-phase debugging skill is a direct fit for a codebase that already values
   "root cause, not the obvious fix" as an explicit, repeated lesson.

2. **`dispatching-parallel-agents`** (concurrent subagent workflows). GSE already runs a
   real multi-agent ledger system (`docs/ops/AGENT_LEDGER.md`, Hermes/Motif/Minis/browser-
   agent coordination) entirely by convention — claim-a-row, one-task-one-commit, no
   formal dispatch mechanism beyond markdown discipline. This skill formalizes exactly
   that pattern.

3. **`test-driven-development`** (RED-GREEN-REFACTOR with an anti-pattern reference).
   AGENTS.md's WORKING RULES already mandate a "Verify block before every code commit"
   (typecheck/lint/test) but describes it as a gate to pass, not a development discipline
   to follow WHILE writing code. This skill would shift that from after-the-fact
   verification to a build-time habit — directly reinforcing rule 6 (Tests required).

## What this pilot is NOT

- Not a runtime dependency of the product — these are IDE/CLI-side agent skills, never
  imported by `apps/web` or any package.
- Not a replacement for anything in `.claude/skills/` today — GSE's existing skills
  (`audit`, `debug`, `investigate`, `commit`, etc.) are domain-specific runbooks for THIS
  codebase; superpowers' skills are process/methodology, a different, complementary layer.
- Not installed. Zero effect on this session or the product until the founder runs the
  `/plugin install` command above.

## Recommended next step

Founder reviews this file, then runs the marketplace install for just these 3 (or all 14,
per taste — the framework ships as one plugin, not individually installable skills, so
"pilot 3" in practice means "install the plugin, and this session's next few tasks lean on
these 3 skills by name to see if they measurably help before treating adoption as settled").
