# Hermes queues, 2026-09-18

Six queues, 42 tasks. Run them in this order. Each is self-contained and each carries the
same acceptance test, with one disclosed exception named in the ruler queue's task 3.

| Order | Queue | Tasks | What it does |
|---|---|---|---|
| 1 | `BUILD-QUEUE-2026-09-18-rulers.md` | 5 | The three rulers every other queue is graded by, plus conformal refusal and fold independence. Runs first because nothing else can be trusted until it lands. |
| 2 | `BUILD-QUEUE-2026-09-18-ranking.md` | 4 | Builds the measurement that shows what reordering the board would do. Changes no ordering. Founder named this the highest-value item, 2026-09-18. |
| 3 | `BUILD-QUEUE-2026-09-18-props.md` | 6 | Props went live and credits are being spent. Makes a silent join failure observable. |
| 4 | `BUILD-QUEUE-2026-09-18-mainline.md` | 15 | Three diagnosed defects, five capture tasks, four loop-closing tasks, three enumerating guards. |
| 5 | `BUILD-QUEUE-2026-09-18-head-serve.md` | 6 | Somewhere for a fitted head to go, and a gate with something to gate. Registry ships empty. |
| 6 | `BUILD-QUEUE-2026-09-18-tenancy.md` | 6 | The multi-tenancy foundation, while every row still belongs to one tenant by definition. |

## The acceptance test every queue shares

**Merged and deployed with no founder action, nothing behaves differently.**

Every switch defaults to current behaviour. Every registry ships empty. Every SQL proposal
waits for the founder to apply it. If a task's work would change a rendered value, a
published number, an ordering or a gate result on merge, that task is wrong.

## Why this order

Rulers first, because every other queue's output is graded by them and all three are
currently broken: a probability column rewritten after settlement with inputs that are not
as-of, a closing-value grade averaged across a book set that differs between mint and close,
and a decision table nothing has written in 94 days. Two further tasks ride with them for a
reason that matters when several models work at once: a conformal quantile that clamps
instead of refusing, and walk-forward folds cut by row index with no group key. Models that
share contaminated folds are not independent estimates; they are one estimate wearing
several labels, and their agreement is not evidence.

Ranking second, by founder direction on 2026-09-18: it is four tasks, it produces the
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

**Both of the gaps first recorded here are now CLOSED by the ruler queue**, which was added
after an outside analysis independently derived the same three-ruler structure:

- Track D, the `gate_decisions` writer, is ruler queue task 3.
- Track E's same-book closing value, E1, the direct attack on the 23.0 percent against
  52.4 percent ESTABLISHED blocker, is ruler queue task 2.

Still not covered, and worth stating so nothing is misread: Track E7's full attribution
test, and the remaining Track D items beyond the writer itself.

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
