# GSE PR3 — WaitlistLead Migration Runbook (owner-run)

**Status:** RUNBOOK ONLY. Owner-gated. Nothing here runs autonomously — it documents
the exact local steps for when the owner approves durable storage. No deploy, no push.

> Prerequisite gate: owner approves the `WaitlistLead` schema/migration (see
> `pr3-durable-storage-plan.md`). Until then, the local-file fallback stays in place.

## 0. Pre-flight

- Branch off current `main` (e.g. `claude/gse-waitlist-durable-storage`).
- Local Postgres reachable (`DATABASE_URL` / `DIRECT_URL` in `.env.local`).
- Confirm the local store has any leads worth migrating: `node scripts/gse-waitlist-list.mjs`.

## 1. Schema

- Add the `WaitlistLead` model + `WaitlistReviewStatus` enum to
  `packages/db/prisma/schema.prisma` exactly as in `pr3-durable-storage-plan.md` §2.

## 2. Generate + migrate (LOCAL only)

```bash
npm run db:generate                 # prisma generate (no DB needed)
npm run db:migrate                  # creates + applies the migration to local Postgres
# review the generated SQL under packages/db/prisma/migrations/<ts>_waitlist_lead/
npx prisma migrate diff --from-schema-datamodel packages/db/prisma/schema.prisma \
    --to-migrations packages/db/prisma/migrations --shadow-database-url "$DIRECT_URL"
# expect: "No difference detected" (schema and migration in sync)
```

## 3. DB store implementation

- Implement `createDbWaitlistStore(): WaitlistStore` in `apps/web/lib/gse/waitlist-store.ts`
  (or a sibling `waitlist-store-db.ts`) satisfying the SAME `WaitlistStore` contract:
  `record()` (insert; unique-email → `{ stored:false, duplicate:true }`), `list()`
  (non-deleted rows).
- Flip the commented branch in `selectWaitlistStore()`:
  `if (process.env.WAITLIST_STORAGE === "db") return createDbWaitlistStore();`

## 4. Optional one-time import of local leads

- Read `.gse-local/waitlist-leads.json`, map fields (`path`→`sourcePath`,
  `createdAt`→`DateTime`, derive `consentAt`), upsert by lowercased `email`. Keep it a
  separate, idempotent script the owner runs once; never auto-import.

## 5. Validation (must stay GREEN)

```bash
npm run typecheck --workspace=apps/web        # expect 0
npm run lint --workspace=apps/web             # expect 0
npx vitest run apps/web/__tests__/gse-waitlist.test.ts apps/web/__tests__/guardrails.test.ts
# run the store contract tests against BOTH stores (WAITLIST_STORAGE unset and =db)
```
Note (from ops history): a stale Prisma client or `.next` cache causes false
typecheck reds — run `npm run db:generate` and wipe `apps/web/.next` first.

## 6. Rollback

- `WAITLIST_STORAGE=file` reverts to the file store instantly (no call-site change).
- Down-migration drops the table; flip the flag first so the table is inert before any drop.
- Ops: prod is alias-based — a Vercel "rollback" does NOT undo a migration; the real
  rollback is flag-flip + down-migration, then re-alias.

## 7. Gates that remain after this runbook

- Deploy / push / promote production → Level 3 (separate owner approval).
- Analytics provider, email send → separate gates.
- This runbook stops at a validated local branch; it never deploys.
