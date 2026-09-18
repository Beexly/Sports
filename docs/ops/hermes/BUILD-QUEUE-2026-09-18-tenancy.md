# Hermes build queue, 2026-09-18: the tenancy foundation

Issued by the architect session. Third queue, after props and mainline. This one is
different from those two: it lays the foundation for multi-tenancy, which is the largest
structural change in any queue so far. Read section 0 before anything else. The order of
operations is the entire safety argument.

`AGENTS.md` and `CLAUDE.md` bind you in full. Where this file and a law disagree, the law
wins and you mark the task BLOCKED.

---

## 0. Why now, and why this shape

### The argument for doing it now rather than later

GSE is single-tenant today. Verified: `packages/db/prisma/schema.prisma` has 102 models,
no `Tenant`, `Organization` or `Workspace` among them, and zero occurrences of `tenantId`,
`organizationId` or `workspaceId`. The only near-match is `Account` at `:46`, which is
NextAuth's OAuth record.

That is exactly why this is the cheapest it will ever be. Retrofitting a tenant key is a
function of how much data and how many customers exist when you do it. Today every existing
row belongs to one tenant by definition, so the backfill is a constant. After white-label
revenue exists it is surgery under load, with real customers on both sides of every
migration. The cost curve only goes up, and it never comes back down. This is the same
wall-clock asymmetry that governs the capture plane, applied to schema instead of sample.

### Why our position is much better than the reference implementation

The founder pointed at `ever-co/ever-gauzy`. Its tenant model is clean but its ENFORCEMENT
is manual: `RequestContext.currentTenantId()` called by hand across 196 files, 42 of them
writing the tenant into a where clause literally. One forgotten predicate is a cross-tenant
read. That design **fails open**.

We are not in that position, and the reason is a single measured fact: this repository
exports ONE database client, `export const db` at `packages/db/src/index.ts:250`, and 240
files import it (221 outside test files; a looser textual match returns 363). Measured with
`grep -rlE "^[^/]*(import|require|from)[^;]*['\"]@sports/db['\"]"` over ts/tsx/mjs/cjs/js
from the repository root, excluding `node_modules`, `dist` and `.next`. An earlier draft of
this queue said 308, which no definition of the count reproduces. One chokepoint, not 240.
That means tenant scoping can be
enforced centrally, in two layers that both fail CLOSED:

1. **Postgres row-level security.** The database refuses to return rows outside the current
   tenant. A forgotten predicate returns zero rows instead of someone else's data.
2. **A Prisma client extension** at the single `db` export, which sets the tenant for each
   transaction so the policies have something to read.

Belt and braces, and neither depends on a developer remembering anything.

### The pooling trap, which decides the whole design

`packages/db/src/index.ts:225-233` builds a Neon `Pool` with `PrismaNeon` when the
serverless driver is on, and a plain `PrismaClient` otherwise. Both pool connections.

**Therefore a session-level `SET app.current_tenant` is forbidden.** A pooled connection is
reused by the next request, so a session-level setting leaks the previous request's tenant
into the next one, which is the exact vulnerability this work exists to prevent. Every
tenant assignment is transaction-local, inside an explicit transaction, so it dies with the
transaction. Task 2 carries the reason the statement is
`SELECT set_config('app.current_tenant', $1, true)` and not `SET LOCAL`: identical lifetime,
but only `set_config` can take the tenant as a bind parameter. There are 33 non-test
`$transaction` call sites today (measured with `grep -rnE "\.\$transaction\("` over ts/tsx,
excluding `node_modules`, `dist`, `.next` and test files), so the pattern already exists
here.

Any task that proposes a session-level set is wrong and must be marked BLOCKED.

---

## 1. Hard boundaries for this queue

Everything in section 0 is design. Here is what you may and may not touch.

- **You may NOT edit `packages/db/prisma/schema.prisma` or anything under
  `migrations/**`.** Law 2, absolute. Every schema change in this queue is authored as
  proposal SQL under `docs/ops/proposals/` and applied by the founder. You write the SQL;
  you never run it.
- **You may NOT touch a database.** Law 7. Not to test a policy, not to check a row count,
  not read-only. Every test you write uses a fake or a pure function.
- **You may NOT enable enforcement.** Nothing you build turns RLS on, and nothing you build
  changes what any existing query returns. The default for every switch in this queue is
  OFF, and flipping it is founder-only under law 3.
- **You may NOT change the 240 call sites.** If your design requires editing call sites,
  the design is wrong and you have reproduced Gauzy's failure mode. Mark it BLOCKED.
- Standard bans still apply: no env flag, no package install, no guardrail script, no
  published number, no fabricated value, no `MODEL_VERSION` change, no push unless the
  founder said so this session.

**The one-line test for every task here:** if it were merged and deployed tonight with no
founder action, would anything behave differently? The answer must be NO for all six tasks.

---

## 2. How to work

AGENTS.md THE LOOP. Claim your ledger row in the same commit that starts the work, owner
`hermes`, one row per task, unique titles, `DONE` needs a SHA that resolves for someone
else.

Verify block before every code commit, real exit codes:

```bash
npm run typecheck                       # exit 0
npm run lint                            # exit 0
npx vitest run <this task's test file>  # green
```

Before the final commit: `npm run guardrails` at 26/26 and
`node scripts/ops/check-agent-ledger.mjs` showing only the known M-1 violation, which is
founder-only and not yours.

Two attempts per task, then revert and mark BLOCKED with the exact error pasted in. One
task, one commit, staged by name, tagged `[hermes-tenancy-N]`.

---

## 3. The tasks

### Task 1. The tenant context, as a pure library

Build `packages/types/src/tenancy.ts`. It goes in `@sports/types` and nowhere else, because
that is the boundary both `apps/web` and `packages/*` cross intact, and because 22 files
under `apps/web` partially mock `@sports/prediction-engine` so a new import from the engine
would resolve to `undefined` there.

Contents, all pure, no database, no I/O:

- A branded `TenantId` type, so a bare string cannot be passed where a tenant is expected.
- `SYSTEM_TENANT_ID`, the single well-known constant every existing row will be backfilled
  to. Name it explicitly rather than deriving it.
- A `TenantContext` type carrying the tenant and its provenance (authenticated user,
  system job, migration), because a cron has no user and must still be attributable.
- `requireTenant(ctx)`, which THROWS on an absent tenant rather than defaulting. A default
  here is the failure mode; absence must be loud.
- A `TenantScope` discriminated union covering `single`, meaning today's behaviour, and
  `scoped`, meaning enforcement is live. Nothing reads it yet.

**Definition of done.** `packages/types/src/__tests__/tenancy.test.ts` proving the branded
type rejects a bare string at compile time (a `@ts-expect-error` line is the idiom and is
permitted in a test asserting a type error, which is not the same as suppressing one in
source), that `requireTenant` throws on absence rather than returning a default, and that
the union is exhaustive.

**Export it from the barrel, in this same commit.** `packages/types`'s `package.json` has no
`exports` map: `main` and `types` both point at `./src/index.ts`, and that barrel today
re-exports exactly two sibling files. A new file under `packages/types/src/` is therefore
UNREACHABLE from any other package until `export * from "./tenancy.js";` is added to
`packages/types/src/index.ts`. This task's own test is a same-package relative import, so it
passes either way and hides the gap; the failure surfaces later, as a typecheck error in the
cross-package consumer named above. Add the line and add a test that the symbols resolve
through the package barrel, not only by direct path.

### Task 2. The client extension, wired but inert

Build the Prisma client extension that will eventually set the tenant per transaction, at
`packages/db/src/tenant-scope-extension.ts`. Prisma is `^5.22.0`, which supports `$extends`,
and `packages/db/src/index.ts:157` already references it.

Requirements:

- It takes a `TenantContext` and, inside an EXPLICIT transaction, issues
  `SELECT set_config('app.current_tenant', $1, true)` before the callee's work.
- **Transaction-local only, and spelled `set_config`, not `SET LOCAL`.** Two requirements
  pull against each other here, so read this before you write the statement. A session-level
  set is forbidden for the pooling reason in section 0, and `set_config`'s third argument is
  exactly that switch: `true` is transaction-local, the same lifetime `SET LOCAL` gives, and
  `false` is session-level, which is the leak. So the third argument is `true`, always, and a
  test asserts it. The reason it cannot be written `SET LOCAL app.current_tenant = $1` is
  PostgreSQL grammar: `SET` and `SET LOCAL` take a literal, an identifier or `DEFAULT` as the
  value and do not accept a bind parameter, so a parameterized `SET LOCAL ... = $1` fails at
  prepare time. Interpolating the tenant into the SQL text instead would satisfy the grammar
  and reintroduce injection, which the next requirement forbids. `set_config` is an ordinary
  function, so its arguments bind normally and both properties hold at once.
  **NOT VERIFIED against a live database.** Law 7 bars touching one and none is reachable
  from an agent session, so this is derived from the documented grammar of `SET`, not from an
  executed query. If you find a counterexample, mark the task BLOCKED with the exact error
  text. Do not resolve it by interpolating the tenant.
- It is **not applied to the exported `db` singleton in this task.** Build it, export it,
  test it, leave it unattached. Attaching it is a later, founder-gated step.
- It must be a no-op when the scope is `single`, so attaching it later changes nothing
  until the founder flips the scope.

**Definition of done.** `packages/db/src/tenant-scope-extension.ts` and
`packages/db/src/__tests__/tenant-scope-extension.test.ts` exist, with unit tests against a
fake transaction client proving: the emitted statement calls `set_config` with its third
argument `true` and never `false`; it emits no bare `SET app.current_tenant` in any form; the
tenant is passed as a bound argument, never interpolated into SQL text; scope `single` emits
nothing at all; an absent tenant under scope `scoped` throws rather than proceeding
unscoped.

### Task 3. The proposal SQL, phase one: columns and backfill, no enforcement

Author `docs/ops/proposals/2026-09-18-tenancy-phase-1-columns.sql`. **You write it. The
founder applies it. You never run it.**

It must:

- Create a `tenants` table with the system tenant row seeded.
- Add a NULLABLE `tenant_id` to every table that holds tenant-scoped data, with an index on
  each, and a foreign key to `tenants`.
- Backfill every existing row to `SYSTEM_TENANT_ID`.
- **Not** set `NOT NULL`, **not** enable RLS, **not** create a single policy. Phase one is
  additive and reversible, and after it every existing query behaves exactly as it does
  today because nothing reads the new column.

**Which tables.** Do not guess and do not do all 102. Produce the list by reading
`schema.prisma` and classifying each model into tenant-scoped (anything belonging to a
customer, a pick, a subscription, a board), global reference data (sports, teams, fixtures,
odds, nflverse imports, anything describing the world rather than a customer), or
ambiguous. **Emit the ambiguous list as a separate section of the proposal for the founder
to rule on; do not resolve it yourself.** A wrong classification here is expensive in both
directions: a missing key means a leak later, and a spurious key on global reference data
means every read is needlessly scoped.

**Definition of done.** The SQL file exists, is idempotent, states its rollback, and
carries the three-way classification with counts. A test asserts the file parses as SQL and
that every `ALTER TABLE` in it is additive, meaning no `DROP`, no `NOT NULL`, no
`ENABLE ROW LEVEL SECURITY`.

### Task 4. The proposal SQL, phase two: policies, written but not applied

Author `docs/ops/proposals/2026-09-18-tenancy-phase-2-rls.sql`, for a LATER founder
decision, explicitly not to be applied alongside phase one.

It must:

- Enable RLS per table and create a policy reading
  `current_setting('app.current_tenant', true)`.
- Use the `true` second argument so a missing setting yields NULL rather than raising, and
  then have the policy DENY on NULL. Fail closed, deliberately.
- Include the `FORCE ROW LEVEL SECURITY` consideration and state plainly whether the
  application's database role is the table owner, since an owner bypasses RLS unless forced,
  and getting that wrong means the policies silently do nothing.
- Carry a rollback section that disables the policies cleanly.

**Definition of done.** The file exists with a header stating it must not be applied until
phase one is live, verified, and the founder has read the cutover runbook from task 6. A
test asserts the policy text denies on a NULL setting rather than permitting.

### Task 5. The guard that makes a missing key visible

An enumerating test at `packages/db/src/__tests__/tenant-scoping-guard.test.ts`, not a
guardrail script, since `scripts/guardrails/**` is frozen.

It reads `schema.prisma`, applies the same classification as task 3, and asserts that every
model classified tenant-scoped either carries a `tenantId` field or appears on an explicit,
committed exceptions list with a written reason per entry. It ENUMERATES offenders in the
failure message rather than asserting a count.

Before phase one is applied this test will fail, loudly, for every tenant-scoped model.
**That is correct and intended.** Commit it skipped with a comment naming the task that
unskips it, rather than weakening the assertion. A skipped test with a named unskip
condition is honest; a weakened assertion is not.

**Definition of done.** `packages/db/src/__tests__/tenant-scoping-guard.test.ts` exists, its
exceptions list exists at `packages/db/src/tenant-scoping-exceptions.ts` and is empty, and
the skip carries its unskip condition in a comment.

### Task 6. The cutover runbook

Write `docs/ops/TENANCY_CUTOVER.md`. This is the document the founder reads before applying
anything, and it is the deliverable that makes the rest safe.

It must contain, in order: the phase ordering and why each phase is separately reversible;
the exact verification the founder runs after phase one, phrased as read-only SQL the
founder executes, never an agent; the rollback for each phase; the pooling hazard and why
session-level sets are forbidden; the owner-bypass hazard from task 4; the explicit
statement that enabling RLS with the application role as table owner and no `FORCE` results
in policies that appear active and enforce nothing; and a named list of what breaks if
phase two is applied before the client extension is attached, which is that every scoped
read returns zero rows.

Also state the one thing that would make this whole queue wasted work: if the founder rules
that white-label and partner revenue are not a path, phase one should not be applied and
this foundation stays on the shelf. Write that honestly rather than assuming the answer.

**Definition of done.** The document exists and a reader who has not seen this queue could
execute the cutover from it alone.

---

## 4. Escalate, do not decide

- The ambiguous table classification from task 3. That is a founder ruling.
- Anything that would require editing call sites.
- Anything that would change what an existing query returns.
- Any temptation to apply SQL, enable a policy, or attach the extension to the live `db`.
- Whether `partner-stack` should drive the tenant boundary. It exists
  (`assessPartner`, `grantCredits`, `allowedRevenueStreams`) with zero importers outside its
  own package, so it is scaffolded rather than live, and whether a partner is a tenant is a
  product decision.

---

## 5. What done looks like

Six ledger rows. A working tree passing typecheck, lint and 26/26 guardrails, whose only
ledger violation is the pre-existing M-1. Two SQL proposals the founder can read and apply
on his own schedule. A library and an extension that are fully tested and attached to
nothing. One skipped guard with a named unskip condition. One runbook.

And the property that makes it safe: **merged and deployed tonight with no founder action,
nothing behaves differently.** If you cannot say that of your own work at the end of the
run, say so in your ledger evidence rather than claiming the run is clean.
