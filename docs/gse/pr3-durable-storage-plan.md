# GSE PR3 — Durable Storage Plan (WaitlistLead)

**Status:** PLAN ONLY. Owner-gated (schema/DB migration). Not implemented.
**Repo:** C:/Users/Garrett/Sports · branch `codex/galaxy-dynasty-studio-rescue-v2`.
**Supersedes the fallback in:** `apps/web/lib/gse/waitlist-store.ts` (local-file `.gse-local/`).

> No deploy, no push, no migration run, no DB write authorized by this doc. It is
> the blueprint for an owner-approved follow-up PR.

## 1. Why this is gated

PR2 deliberately used a local-file fallback because adding a Prisma model requires
a generated migration that touches `packages/db` and the database, and (per repo
convention) migrations lead code in the Vercel build. That is an owner decision,
not autonomous work.

## 2. Proposed Prisma model

Mirror the validated shape in `StoredWaitlistLead` (`waitlist-store.ts`). Add to
`packages/db/prisma/schema.prisma`:

```prisma
model WaitlistLead {
  id              String   @id @default(cuid())
  email           String   @unique            // lowercased at write
  fullName        String
  role            String                       // operator | analyst | founder | bettor
  sportInterests  String[]                     // Postgres text[]
  currentStack    String?
  weakestProcess  String?
  consent         Boolean                      // always true at write (consent gate)
  consentAt       DateTime                     // consent timestamp (provenance)
  copyVersion     String?
  utmSource       String?
  utmCampaign     String?
  referrer        String?
  sourcePath      String?                      // request path (note: `path` is reserved-ish; rename)
  reviewStatus    WaitlistReviewStatus @default(QUEUED)
  createdAt       DateTime @default(now())
  deletedAt       DateTime?                    // soft delete
  @@index([reviewStatus])
  @@index([createdAt])
}

enum WaitlistReviewStatus {
  QUEUED
  NEEDS_INTAKE
  APPROVED
  DECLINED
}
```

Field parity check vs `StoredWaitlistLead`: email, fullName, role, sportInterests,
currentStack, weakestProcess, consent, createdAt, utmSource, utmCampaign, referrer,
path→`sourcePath`, copyVersion, reviewStatus. All preserved.

## 3. Storage interface (so PR2 and PR3 share one contract)

Refactor `waitlist-store.ts` to an interface so the file store and the DB store are
interchangeable behind a flag — no behavior change at the call site (`route.ts`):

```ts
export interface WaitlistStore {
  record(lead: WaitlistLeadInput): Promise<{ stored: boolean; duplicate: boolean }>;
  list(): Promise<StoredWaitlistLead[]>;
}
// selectWaitlistStore(): file store by default; DB store when WAITLIST_STORAGE=db
```

`route.ts` already depends only on `record()` — the swap is a one-line factory
change, fully reversible.

## 4. Migration plan (owner-run, local first)

1. Owner approves the schema change.
2. `npm run db:generate` (prisma generate — no DB needed).
3. Local: `npm run db:migrate` against a local Postgres (creates the migration SQL +
   applies to dev DB). Review the generated SQL.
4. Commit the migration **and** the model in the same change (migration leads code).
5. The Vercel build runs migrations in-build (existing `migrate-in-build`), so the
   table exists before the new code path is reachable — but deploy itself stays a
   separate owner gate.

## 5. Data privacy

- Store the minimum; `email` unique + lowercased; never log raw email in analytics
  (hash if an identifier is needed — see `pr3-analytics-provider-plan.md`).
- `consentAt` recorded; soft delete via `deletedAt` for unsubscribe/erasure.
- No third-party processor without an owner gate. Local `.gse-local/` JSON remains
  gitignored and is migrated/discarded by the owner, not auto-imported.

## 6. Tests (added in the PR3 branch)

1. DB store satisfies the same `WaitlistStore` contract tests as the file store
   (record/dedupe/list parity) — run the existing suite against both.
2. Consent gate still rejects `consent=false` at the route.
3. Unique-email constraint surfaces as a safe `duplicate: true`, not a 500.
4. Soft delete excludes a lead from `list()`.
5. Migration smoke: `prisma migrate diff` is empty after generate (schema/migration in sync).

## 7. Rollback

- Flag-based: `WAITLIST_STORAGE=file` reverts to the local-file store instantly
  (no data loss for new leads; file store keeps working).
- Schema rollback: a down-migration drops the table; because storage is flag-gated,
  reverting the flag first makes the table inert before any drop.
- Note (from ops memory): prod is alias-based; a Vercel "rollback" won't undo a
  migration — so the down-migration + flag flip is the real rollback path.

## 8. Owner gates (all still BLOCKED)

- Approve the schema model + migration.
- Run any migration against a non-local database.
- Deploy. (This doc never deploys.)

## 9. Exact next safe action

Leave the local-file fallback in place. When the owner approves, implement the
interface refactor + model + migration in a dedicated PR3 branch, validate locally
(generate + migrate against local Postgres + the parity tests), and stop before any
deploy/push.
