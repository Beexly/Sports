# PHASE 1 SUMMARY

Sprint executor exit for Phase 1 (GSE A++ hardening).
Generated: 2026-08-14T23:25:00Z
Branch: `claude/fable-5-ultracode-plan-ptru4e`
Workdir: `C:/Users/Garrett/Sports`

This file is the P1-04 deliverable. Evidence is `handoff/SPRINT_JOURNAL.md`
(P1-01, P1-02, P1-03) and `handoff/PHASE1_NOTES.md`. No new product code
was written in P1-04.

## What was graded

Allow-list only (`handoff/SPRINT_QUEUE.md` Phase 1):

- `tools/model-advisor/**` (T1)
- `apps/web/app/cockpit/api-costs/**` (T2 + existing budget override UI)
- `eval/promptfoo/**` (T3 eval:prompts harness + scorer tests)
- `reports/**` (dated writer exists; not re-authored this sprint)
- `handoff/**` (notes + this summary)

P1-03 A++ rubric applied to those files:

| Rubric | Result |
|---|---|
| Types strict (no `any`, no `!` abuse) | Allow-list cleaned further this sprint (dropped `surfaces[0]!` in scorer test). Remaining spec-shape `readonly` extras are T1-D3, not `any`. |
| Tests assert real behavior | model-advisor tests now fail if `pick()` ignores the passed catalog; complexity 1, long-context role, NaN clamp, empty catalog. Scorer cost test looks up vendored MODELS snapshot. |
| No fabricated data / pricing | T2 card still uses models.dev blended $/Mtok (rate card), not reported spend — documented as T2-D2, not invented numbers. Cache-hit stays "not recorded". |
| Errors not swallowed | budget-override JSON parse now names the route and HTTP status. Empty catalog throws a fixable error. |
| No console noise / dead code | No new noise added. `void catalog` removed from recommend.ts. |
| Naming / comments | Unchanged beyond the four P1-03 files. |

P1-02 graded the same surfaces against `docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md`
and recorded 16 divergences in `handoff/PHASE1_NOTES.md` (T1-D1..D10, T2-D1..D3, T3-D1..D3).

## What you changed (this sprint) — no commit hashes

P1-01 / P1-02 / P1-04 made no product-code commits.

P1-03 edited four allow-list files and **did not commit**.
`§COMMIT DISCIPLINE` forbids committing while `npm test` is red.
Those edits are still in the working tree:

```
 M apps/web/app/cockpit/api-costs/budget-override-control.tsx
 M eval/promptfoo/scorer.test.ts
 M tools/model-advisor/recommend.test.ts
 M tools/model-advisor/recommend.ts
```

`git diff --stat` (this sprint, uncommitted): 4 files, +86 / -12.

What those uncommitted edits do (from P1-03 journal):

1. `recommend.ts` — `pick()` / `bestLocal()` resolve ids from the passed
   `catalog` (fixes T1-D5 in the working tree only). Empty catalog throws.
2. `recommend.test.ts` — complexity 1, long-context role, NaN clamp,
   empty-catalog throw, substituted-catalog label.
3. `scorer.test.ts` — cost lookup against vendored MODELS.haiku/sonnet/opus;
   dropped non-null assertion.
4. `budget-override-control.tsx` — JSON parse failure is no longer swallowed.

`handoff/` is gitignored. PHASE1_NOTES.md and this summary are not in git.

## Pre-existing commits that *are* the Phase 1 artifacts

These hashes already existed on the branch. They are not this sprint's
commits. Listed so a human can `git show` the graded implementations.

### T1 — tools/model-advisor

- `6a8f695f25d2906d7072452e2cba40669d5f4d7e`
  feat(intelligence): grounded next-level master plan + verified model-advisor tool
- `472ebe55776d409e81d03ab43f20295e84d11803`
  feat(model-advisor): add NVIDIA Nemotron 3.5 Lightning as the local agentic-executor tier

### T2 — cockpit routing-legibility card

- `41801e6b997d7e9979f2e4c12130710584828624`
  feat(cockpit): routing legibility card — active lane, model, blended cost per surface [overnight-T2]
- `7cdc004483b7ddea28d2f1f0bd6c80f00b71257d`
  Add cockpit Claude budget override controls
  (P1-03 later patched this file in the working tree; that patch has no hash)

### T3 — eval:prompts

- `de4288d9b8ebf9ff080d290d18fcdfaa048a4684`
  feat(eval): offline per-surface cost/quality report for eval:prompts [overnight-T3]
- `c5271d8325bc67499a2d2fe14f1e8f0c5ece79d3`
  refactor(eval): A++ hardening — drop non-null assertions, explicit types [A++-hardening]
- `675fcd4ccd2da1d8a183d7d7e4ca3689e9acce8f`
  fix(auth,eval,hygiene): fail-closed ASCII gate on admin allow-list; drop duplicated surface list; ignore scratch dumps [A++-hardening]

## What still fails and why

### Full-suite gate (P1-01 / P1-03)

- `npm run typecheck` EXIT 0
- `npm run lint` EXIT 0
- `npx vitest run tools/model-advisor` EXIT 0 (11 tests at P1-01; 15 after P1-03)
- `npx vitest run eval/promptfoo/scorer.test.ts` EXIT 0 (13 tests after P1-03)
- `npx vitest run __tests__/cockpit-api-costs-routing.test.tsx` (cwd apps/web) EXIT 0 (7 tests)
- `npm test` EXIT 1 — **21 failures, all outside the Phase 1 allow-list**
  (apps/web api-v1 / guard / nav / scripts-path tests + genesis-kernel
  structural). Same set recorded in P1-01. Not P1-EXTRA tasks.

Because `npm test` is red, Phase 1 made **zero commits**. That is why this
summary has no "sprint change" hashes — only pre-existing implementation hashes.

### Spec divergences still open (PHASE1_NOTES.md)

T1-D1 VerificationStatus missing `"unverified"`.
T1-D2 extra role `"agentic-executor"`.
T1-D3 `readonly` on arrays the spec leaves mutable.
T1-D4 catalog incomplete vs landscape §A (Qwen3-Coder-Next, Codestral missing).
T1-D5 catalog argument ignored — **fixed in working tree, not committed**.
T1-D6 unspec'd agentic → Nemotron branch.
T1-D7 rule 4 never considers a long-context local.
T1-D8 extra `budget === "free"` downgrade.
T1-D9 README examples are paraphrased, not captured CLI stdout.
T1-D10 long-context test asserts window size, not the `long-context` role
  (P1-03 added a role assertion in the working tree; original required test
  shape may still differ).
T2-D1 card does not read budget-store / event ledger.
T2-D2 missing request count, cache-hit rate, reported $ per surface.
T2-D3 extra recommended-tier / savings / free-lane columns.
T3-D1 `npm run eval:prompts` still only runs promptfoo; report is `tsx eval/promptfoo/report.ts`.
T3-D2 quality rubric scores harness prompt text, not model outputs.
T3-D3 report `generatedAt` is wall-clock, not deterministic.

P1-03 did not close those spec items except T1-D5 (working tree only).
Closing the rest would be new scope or owner-gated (package.json script
for T3-D1 is forbidden to edit).

### Phase 0 leftover (not Phase 1)

P0-01 remains BLOCKED: two live alias systems (`model.aliases` + `model_aliases`).

## Verify commands for a human

```
test -f handoff/PHASE1_SUMMARY.md
git show 6a8f695f25d2906d7072452e2cba40669d5f4d7e --stat
git show 472ebe55776d409e81d03ab43f20295e84d11803 --stat
git show 41801e6b997d7e9979f2e4c12130710584828624 --stat
git show 7cdc004483b7ddea28d2f1f0bd6c80f00b71257d --stat
git show de4288d9b8ebf9ff080d290d18fcdfaa048a4684 --stat
git show c5271d8325bc67499a2d2fe14f1e8f0c5ece79d3 --stat
git show 675fcd4ccd2da1d8a183d7d7e4ca3689e9acce8f --stat
git status --short -- tools/model-advisor eval/promptfoo apps/web/app/cockpit/api-costs
```
