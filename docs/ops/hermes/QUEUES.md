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

## What tonight does NOT cover

Cross-checked against the architecture's own 7 tracks and 69 workstreams. Tonight's 37 tasks
are a deliberately narrow slice, and two absences matter enough that "ran the queues" must
not be read as having closed them:

- **Track D, the veto lane and the `gate_decisions` writer: 0 of 7 workstreams.** That is the
  direct fix for the defect AGENTS.md documents at length, that the table has had no writer
  in 94 days while three files read it on fallback paths. Nothing tonight touches it.
- **Track E's CLV attribution, E1 same-book closing value and E7 the attribution test: not
  addressed** beyond two plumbing fixes shared with other tracks. That is the direct attack
  on the 23.0 percent against 52.4 percent ESTABLISHED blocker. It does not move tonight.

Also unaddressed by design: Track G's ranking rewrite (G3). The ranking queue is its
measurement-only precursor and changes no ordering, which is the point.

The rest maps to Track A capture (A2, A3, A4, A9, A12), one Track B item (B7), one Track C
item (C1), and the display-adjacent half of Tracks E and F.

## Two shared artifacts, and the handshake that keeps them single

Found by a cross-queue review, not visible to a reviewer reading any one queue. Both are
resolved by explicit cross-reference rather than by resequencing, so the run order above
still holds:

- **The pre-registration shape** is written by props task 5 and read by mainline task 12.
  Props runs first, so props task 5 now states the full EIGHT-field shape fixed by
  architecture Track F item F8, including the false-discovery level it previously omitted.
  A seven-field file committed first would force mainline's loader either to refuse a file a
  pre-registration may not edit after commit, or to be loosened, which is the registry
  integrity failure the mechanism exists to prevent.
- **The capture-freshness monitor** is one workstream, Track A item A12, whose named file is
  `apps/web/lib/data-reliability/capture-freshness-manifest.ts`. Mainline task 8 builds it
  under that exact name; props task 6 registers prop rows as one family inside it if it
  exists, and otherwise flags itself for absorption. Two files spelling one thing
  differently is how the line archive died unnoticed for three weeks.

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
