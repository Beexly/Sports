---
description: Run one full GSN engineering cycle (audit → prioritize → plan → implement → verify → ship → log)
argument-hint: Optional feature focus (e.g., "picks engine")
---

You are running a single GSN cycle. Follow CLAUDE.md §9 exactly. Argument focus (if any): $ARGUMENTS

Phases — execute in order, do not skip:

1. AUDIT — `git status`, scan TODOs, check pick queue + ingestion health, summarize to `_logs/audit-{n}.md`
2. PRIORITIZE — Impact × Blockers × 1/Cost. Pick one. Don't fan out.
3. PLAN — write `_logs/plan-{n}-{slug}.md` with goal, files, schema, test plan, rollback, cookbook ref
4. IMPLEMENT — dispatch `feature-dev` if appropriate; otherwise direct edits with tests in same commit
5. VERIFY — typecheck + test + smoke + (if AI) sample to `_logs/samples/{n}.json` + (if paid) 4-tier gate test
6. SHIP — atomic commit (Conventional Commits), CHANGELOG line, DECISIONS entry if non-obvious

Don't ask permission. If you hit a STOP condition (CLAUDE.md §14), surface it and wait. Otherwise begin the next cycle.
