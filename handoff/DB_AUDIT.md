# Prisma layer audit — P4-13 (`.claude/commands/audit-db.md`)

**Run:** 2026-09-28 · **Command:** read-only (`Read, Grep, Glob, git diff/log/status`) ·
**Product code touched: NONE.** `git status` apart from the two new `handoff/` files is clean.
**Helper:** `handoff/db-schema-scan.mjs` (node, exit 0; `--selftest` **29/29**).

## Scope measured, not assumed

| Input | Count |
|---|---|
| `packages/db/prisma/schema.prisma` | 3,923 lines, **102 models**, 62 enums |
| Indexes declared | **202 `@@index`** + **63 `@unique`** |
| `packages/db/prisma/migrations/` | **3 migration dirs**, **103 `CREATE TABLE`**, **56 `UNIQUE`** |
| Product files scanned | **5,920** (`.ts/.tsx/.js/.mjs` under `apps/`, `packages/`; skips `node_modules`, `.next`, `dist`, `build`, `coverage`; excludes `__tests__` and `*.test.*`) |

## RESULT: 0 high, 2 medium, 0 low. No schema drift, no unmigrated uniqueness, no N+1.

The headline is a **clean sweep on the two things that would be unrecoverable**: every model has
a `CREATE TABLE` in migrations, and every one of the 57 models carrying a `@unique` has a
matching UNIQUE index/constraint in migration SQL. I checked the unique case **per table**, not
by a global column-set match, precisely because a global match would report a false 0.

---

## Clean sweeps, recorded so nobody re-runs them

**NO SCHEMA DRIFT.** All 102 models resolve to a table created in migrations. The reverse
direction is also clean: **0 tables** created by migrations lack a model (the PostGIS/shadow
tables I expected to see are not in these migrations).

**NO UNMIGRATED UNIQUENESS.** 0 of 63. Verified twice by different methods: the scanner's
migrated-UNIQUE set, and a per-table pass that resolves `CREATE UNIQUE INDEX ... ON <table>`
and `ALTER TABLE <table> ADD CONSTRAINT ... UNIQUE` separately. A `@unique` in the schema that
was never migrated would be a live-DB constraint the code believes in and Postgres does not
enforce — that class is empty.

**NO N+1 ON ANY USER-FACING PATH.** `apps/web/lib/board/state.ts` has exactly one
`await db.` at :513. This independently reproduces P4-11's N+1 sweep rather than re-deriving it,
and the reason it holds is structural: the batch/cron lanes (ingestion-pipeline, settlement
outbox worker, `lib/stripe.ts`) are where per-row awaits legitimately live, and none of them is
on a request path.

**SAFE DELETES ALREADY GUARDED.** P4-8/F1 found `historical-games.ts:98 deleteMany({})` guarded
on *emptiness* not *completeness*, and deliberately did not fix it. Confirmed still in that
state — the finding stands, this audit does not reopen it.

---

## F1 (medium) — `Pick` has no index that can seek on `isBootstrap`, and 51 call sites filter on it

`apps/web/app/admin/clv/page.tsx:42` and 50 others.

`Pick` declares **9** index/unique constraints. The two that touch this column are
`@@index([isPublished, isBootstrap, generatedAt])` (schema:86) and nothing else with
`isBootstrap` leading. A query filtering `isBootstrap` **alone** therefore cannot use that
composite as a seek — `isBootstrap` is its *second* column.

Measured reach, not asserted: **51 `where`-bearing call sites** filter `isBootstrap` (and 1
further site carries it only inside `select`, correctly excluded). The heaviest cluster is
`apps/web/app/dashboard/page.tsx:156-160,171` (5 calls), then
`api/cron/generate-drafts/route.ts:163,308`.

Scale: AGENTS.md records **2,641 settled picks**, and the published-record tables are larger.
This is a seq-scan-shaped predicate over a table that grows every cycle, on the surfaces that
render the dashboard and the graded record.

**Honest severity.** Medium, not high, and I will not inflate it: every one of these queries
also carries a discriminating predicate (`result: { in: [...] }`, `clvVerdict: { not: null }`,
or a date range), and several of those columns *are* indexed, so the planner has a usable
alternate path. This is a lost-optimization finding, not a demonstrated stall. No latency
figure is quoted anywhere in this report because **no database was touched** — there is no
`EXPLAIN ANALYZE` behind any of this.

**Fix, NOT applied.** `schema.prisma` is **LAW-2 SEALED**; this needs the owner. Proposed
migration draft (for review, not written):

```sql
-- Draft only. Requires owner approval: schema.prisma is law-2 sealed.
CREATE INDEX CONCURRENTLY "picks_isBootstrap_result_idx" ON "picks" ("isBootstrap", "result");
-- Rationale: isBootstrap is the discriminating predicate in the 51 sites, and `result`
-- is the most common co-predicate. A bare (isBootstrap) index has ~2 distinct values and
-- is close to useless on its own, which is why the composite is the honest proposal.
```

I deliberately did **not** propose a bare `isBootstrap` index: with two values it has poor
selectivity, and a composite that matches the real predicate shape is the better artifact.

## F2 (medium) — 20 models cascade-delete with no `Restrict`/`SetNull` sibling

`Account`, `Session`, `Subscription`, `OpeningLine`, `TeamGameLog`, `OddsLineSnapshot`,
`GameSignal`, `PickSignalSnapshot`, `Alert`, `Watchlist`, `PushSubscription`,
`CockpitDecision`, `DailyBriefSection`, `DailyBriefItem`, `ContentSource`, `ContentReview`,
`ModerationAppeal`, `PlayerGameStat`, `CreditGrantReservation`, `EntityEdge`.

Most of this list is **correct and intentional** — cascading a user's `Session` /
`PushSubscription` / `Watchlist` on account delete is the desired semantic, and cascading
`DailyBriefItem` off its section is right. I am filing it as a review surface, not a defect
claim, because the rule cannot tell intent from accident and I did not read all 20 bodies.

The two I did read, and why they are the ones worth an owner's eye. In both, the cascade is
declared on the **child** relation, and the parent's back-relation is a plain list
(`Game.oddsLineSnapshots OddsLineSnapshot[]`, schema:62; `Game.pickSignalSnapshots`,
schema:58) — so the delete that triggers them is a `Game` delete:

- **`OddsLineSnapshot` (schema:467).** `game Game @relation(..., onDelete: Cascade)` (schema:467,14).
  AGENTS.md records **684,498 rows** in this table. It is the evidence base for the CLV work, and
  CLV is the acknowledged blocker. Deleting a fixture row would silently destroy line-archive
  history that no re-ingest would restore — the archive only ever grows forward in time.
- **`PickSignalSnapshot` (schema:801).** Cascades from **both** `Pick` and `Game` (schema:801,
  51-52) — two independent delete paths, not one. AGENTS.md's signal-path work depends on these
  rows; the 42-snapshot gap in the AGENTS.md audit is about this table.

**F2 IS LATENT, NOT LIVE.** I checked whether any product code actually deletes a `Game` row,
because a cascade nobody triggers is a different finding from one that fires. Result: **no
product code path calls `db.game.delete` or `db.game.deleteMany`.** Every `db.game.*` call in
the product is a read (`findMany` on 8 files) or an `updateMany`
(`free-score-persist.ts:471`). The only unbounded `deleteMany` in this area is
`db.historicalGame.deleteMany({})` (`historical-games.ts:98`) — a **different table**, and the
P4-8/F1 finding already recorded.

So no CLV history has been destroyed by this today. It stays a finding because the delete is one
line away and the archive is unrecoverable if taken, and because an owner-script or admin
action (or a future retention lane) reaches the same place. But it is a **guard-rail** finding,
not an active data-loss incident, and it should not be read as one.

**Fix, NOT applied.** Changing `onDelete` is a schema migration (law-2 sealed, owner). The
code-side alternative that needs no schema change: for the two evidence tables, make the
deleting lane **unpublish rather than delete**. The repo already owns that shape — P4-9/F1
records that `founder-picks` unpublishes instead of withdrawing, and `stale-pick-policy.ts`
does the same. That is precedent, not a mandate.

---

## Refuted so nobody re-runs these (all were scanner output, all are wrong)

This is the majority of the raw `NO-LEADING-INDEX` list. Each was read by hand against the
call site **and** the schema:

| Reported | Why it is not a defect |
|---|---|
| `OpeningLine.market` (settle-sport.ts:814) | `findUnique({ where: { gameId_market: {...} } })` — a **compound-key** lookup served exactly by `@@unique([gameId, market])`. The rule cannot see the compound form. |
| `Pick.pickType` (shadow-evaluation-pass.ts:230) | `where: { pickType, result, game: {...} }`; `result` is indexed (`@@index([result])`) and `pickType` is in `@@unique([gameId, pickType])`. Composite-served. |
| `ClaudeApiCallRecord.success` (dashboard.ts:64) | `@@index([surface, observedAt])` serves the seek; `success: false` is a low-cardinality boolean residual filter, not a seek predicate. |
| `HistoricalGame.homeScore` / `awayScore` (elo-backtest.ts:51) | `where: { homeScore: { not: null } }` — a **null test**, which is non-sargable. An index on it is not a fix. |
| `Game.homeScore` / `awayScore` (shadow-evaluation-pass.ts:170) | Same null-test shape, alongside `id: { in: pendingIds }` which *is* the indexed seek. |
| `IngestionRun.completedAt(orderBy)` | `where: { status: "SUCCESS" }, orderBy: { completedAt: "desc" }` — served directly by `@@index([status, completedAt])`, and the schema comment at :17 says so. My first rule missed the composite. |
| `PostSettlementWork.createdAt(orderBy)`, `PickSettlementEvent.createdAt(orderBy)`, `ModerationReport.createdAt(orderBy)`, `GateDecision.evaluatedAt(orderBy)`, `Subscription.status` | `take`-bounded queue polls (`take: 80`, `take: 100`, batch caps) on low-cardinality status columns. The `take` bounds the work; a sort over a status-filtered set is the plan, and these are cron/cockpit lanes, not request paths. Not worth a migration. |
| `Pick.modelVersion` | Filtered as `NOT: { modelVersion: { contains: "seed" } }` — a `contains`, which is non-sargable without a trigram index. Not a btree candidate. |

## Five scanner bugs found and fixed (the `--selftest` is why)

Recorded because each one **changed the answer**, and three of them were false *negatives* —
the dangerous direction, where a broken scanner reports a clean result.

1. **SQL comments were not stripped before matching `CREATE TABLE`/`UNIQUE`** — the worst one. A
   commented-out `CREATE TABLE` counted as migrated, so real drift would have been *hidden*.
   Fixed; three specimens now pin it.
2. **`@@unique([a, b])` captured the brackets**, so it normalized to `[a, b]` and never matched
   the migration's `a, b`. Every block-form unique would have reported as unmigrated.
3. **`@unique(map: "name")` was read as a column list.** Now explicitly excluded.
4. **Composite indexes were ignored** — only a *leading* column counted, so
   `@@index([status, completedAt])` failed to cover a `status` filter. Now prefix-matched.
5. **`orderBy` bled across call boundaries** — a fixed lookahead window read the *next* query's
   `orderBy` and attributed it to the current call. Caught by hand on
   `pickSettlementDelivery`, which orders by nothing in that call. Now scoped to the call's own
   balanced parens, with string-literal awareness.

Plus one more, found by reading output rather than by a failing test:

6. **`select` was read as a filter.** A call with no `where:` has only projections and relation
   includes. `select: { isBootstrap: true }` was reported as an unindexed `isBootstrap` filter.
   Fixed by requiring a `where:` in the call.

The false-positive count fell **101 → 20 → 15** across fixes 4-6. The number falling is not
evidence the scanner improved; the six pinned specimens are.

## NOT DETERMINED, stated plainly

- **No database was touched.** No connection, no migration, no `EXPLAIN ANALYZE`. Every index
  claim is read from `schema.prisma`; every cost statement is inference from the row counts
  AGENTS.md records (2,641 settled picks; 684,498 line snapshots). **No millisecond figure in
  this report is a measurement.**
- **3 migration directories only.** If the live database was provisioned outside this directory
  (baseline push, manual `prisma db push`, a shadow DB), the drift check cannot see it. The
  per-table unique pass would then be a floor, not a proof.
- **F2 is a review surface, not 20 defects.** I read `OddsLineSnapshot` and
  `PickSignalSnapshot`; I did not individually read the other 18 relations. And per the latency
  check above, F2 is **latent** — no product code deletes a `Game` row today.
- **The index rule does not model the query planner.** It reads predicates and `orderBy` text.
  It cannot know selectivity, cannot see `$queryRaw`, and cannot evaluate a `where` assembled in
  a variable — a call whose filter is built dynamically is invisible to it. Its zeros are a
  **floor, not a proof**.
- **Nullable-should-be-required** (the last clause of the command) is reported as a sweep, not
  a finding: 10 model.field pairs are optional and filtered. Making any of them required is a
  data-migration decision about what NULL means, not a mechanical change, and I did not
  determine that.
- 29 tracked files over 2MB and any built `.next` unscanned, carried forward unchanged from
  P4-6/7/8/9/10/11/12.

## Verification

`typecheck` exit 0 · `lint` exit 0 · `guard:commercial-copy` OK 470 files ·
`guard:secrets` OK · `db-schema-scan --selftest` **29/29** exit 0.
