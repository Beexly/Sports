# Handoff — Cursor cloud agent (2026-09-22)

You're working in **Beexly/Sports** (Galaxy Sports Edge). Main branch is current.
Read `AGENTS.md` first — it's the repo law.

## Where things stand
An autonomous wiring program has been running all day: **1,081 of 1,251**
arXiv-paper improvements wired into the engine as additive modules. All on main.

- `docs/research/2026-09-21/wiring/WIRING-PLAN.md` — reconciled plan, open items, NEEDS HUMAN CALL list
- `docs/research/2026-09-21/wiring/IMPLEMENTED.md` — every item already wired. **Never re-implement an ID listed here.**
- `docs/research/2026-09-21/arxiv-program/index/IMPROVEMENT-LEDGER.jsonl` — 1,251 concrete improvements with numeric acceptance gates. Your backlog: the 172 not in IMPLEMENTED.md (121 large-effort, 47 deferred, 4 skips).

## Your work
Implement the remaining ledger items, same pattern as the 1,081 before them:
- New files/modules/functions only. **Zero deletions, zero edits to existing logic, signatures, or behavior.**
- Every module: JSDoc citing its arXiv ID + verbatim `ACCEPTANCE GATE` comment. Disabled-by-default flags where gates need data not yet available.
- Tests for every new module; run the touched package's suite; never push red.
- Training-program items (transformers, GFlowNets, Mamba, LLM fine-tunes): implement architecture + training harness + evaluation scaffold as additive modules, disabled-by-default, gate documented. Do not run training jobs.
- If an item requires changing existing behavior: don't implement it — append it to WIRING-PLAN.md under NEEDS HUMAN CALL.

## Never touch
`gse-grok-build-sandbox` · `schema.prisma` / `migrations/**` · credentials/secrets.

## Coordination
Push to main in small batches. On push races: pull/rebase and retry, **never force-push**.
Update IMPLEMENTED.md as you go so parallel agents never duplicate work.
