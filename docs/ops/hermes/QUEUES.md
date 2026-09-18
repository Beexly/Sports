# Hermes queues, 2026-09-18

Five queues, 37 tasks. Run them in this order. Each is self-contained and each carries the
same acceptance test.

| Order | Queue | Tasks | What it does |
|---|---|---|---|
| 1 | `BUILD-QUEUE-2026-09-18-ranking.md` | 4 | Builds the measurement that shows what reordering the board would do. Changes no ordering. Founder named this the highest-value item, 2026-09-18. |
| 2 | `BUILD-QUEUE-2026-09-18-props.md` | 6 | Props went live and credits are being spent. Makes a silent join failure observable. |
| 3 | `BUILD-QUEUE-2026-09-18-mainline.md` | 15 | Three diagnosed defects, five capture tasks, four loop-closing tasks, three enumerating guards. |
| 4 | `BUILD-QUEUE-2026-09-18-head-serve.md` | 6 | Somewhere for a fitted head to go, and a gate with something to gate. Registry ships empty. |
| 5 | `BUILD-QUEUE-2026-09-18-tenancy.md` | 6 | The multi-tenancy foundation, while every row still belongs to one tenant by definition. |

## The acceptance test every queue shares

**Merged and deployed with no founder action, nothing behaves differently.**

Every switch defaults to current behaviour. Every registry ships empty. Every SQL proposal
waits for the founder to apply it. If a task's work would change a rendered value, a
published number, an ordering or a gate result on merge, that task is wrong.

## Why this order

Ranking first by founder direction on 2026-09-18: it is four tasks, it produces the
evidence for the single highest-value decision open, and its section 0 now prices both
levers the founder named. It shares no file with the props queue, so the order between the
first two is about attention rather than dependency and a parallel runner can take both.
Props second because credits are being spent right now with no proof anything lands.
Mainline third because its wave 1 fixes defects every later queue reports through, and its
wave 2 capture accrues sample in wall-clock time, so every day deferred is sample that
never exists. Head-serve fourth because it is the largest build and depends on mainline
task 10's offset capability. Tenancy last because it is the only one
whose value depends on a product decision not yet made, and it costs nothing sitting on the
shelf.

## What binds every queue

No database. No env flag. No gate. No schema, ever; proposal SQL goes under
`docs/ops/proposals/` and the founder applies it. No new guardrail script, because
`scripts/guardrails/**` is frozen by law 2 and a test runs in CI through the existing job.
No `MODEL_VERSION` change. No fabricated value: an absent source is closed by acquiring the
data or by staying absent, never by a constant.

Two structural traps that bite silently, restated in each queue: a new cross-package import
into `apps/web/lib/board/state.ts` or the picks route resolves to `undefined` under 22
partial mocks and collapses the board, and `packages/*` must never import `apps/web`.
`@sports/types` is the boundary both sides cross intact.

Row M-1 in the ledger fails the guard, is owned by another agent, is red on `main` too, and
is founder-only under ledger rule 2. Leave it.
