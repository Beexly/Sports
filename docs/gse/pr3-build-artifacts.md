# GSE PR3 — Build Artifacts (ready to apply; awaiting owner phrase)

**Status:** PREPARED, NOT APPLIED. The agent attempted to stage this on an isolated
branch, but the permission gate correctly **blocked editing the canonical
`packages/db/prisma/schema.prisma`** — that is the migrate-in-build, owner-only change,
and the standing instruction is "await phrase." So the full implementation lives here as
copy-paste-ready artifacts. **No schema edited, no migration run, no DB touched, no push.**

> To authorize the agent to actually stage this on a local branch (still no apply / no
> push), the explicit phrase is: **"approve PR3 schema build — local only, no migrate, no
> push."** Even then: NO `prisma migrate dev/deploy`, NO `db push`, NO push, NO deploy.

## Sacred invariants (must hold at every step)
1. **Backtest truth stays false.** `BACKTEST_TRUTH.beatsNaive === false`; never spun.
2. **No-claim stays CI-enforced.** The compliance scanner stays green on all surfaces.
3. **File store stays the default.** DB path is reachable ONLY when `WAITLIST_STORAGE=db`.
4. **No autonomous DB apply.** The migration is applied only by the owner against a
   **verified-local** DB (`prisma migrate dev`). The agent never runs a DB-applying command.
5. **No push / no deploy / no merge to main.** All of these are owner actions.
6. **Reversibility.** A single env flag (`WAITLIST_STORAGE=file`) reverts to the file store
   with zero code change.

## Artifact 1 — Prisma model (append to `packages/db/prisma/schema.prisma`)
```prisma
model WaitlistLead {
  id             String               @id @default(cuid())
  email          String               @unique
  fullName       String
  role           String
  sportInterests String[]
  currentStack   String?
  weakestProcess String?
  consent        Boolean
  consentAt      DateTime
  copyVersion    String?
  utmSource      String?
  utmCampaign    String?
  referrer       String?
  sourcePath     String?
  reviewStatus   WaitlistReviewStatus @default(QUEUED)
  createdAt      DateTime             @default(now())
  deletedAt      DateTime?

  @@index([reviewStatus])
  @@index([createdAt])
  @@map("waitlist_leads")
}

enum WaitlistReviewStatus {
  QUEUED
  NEEDS_INTAKE
  APPROVED
  DECLINED
}
```
Field parity vs `WaitlistLeadRow` (`apps/web/lib/gse/waitlist-store-db.ts`): exact.

## Artifact 2 — Migration SQL (reference; owner regenerates the canonical one)
Run `prisma migrate dev --name waitlist_lead` to produce the canonical migration; it
should match this:
```sql
CREATE TYPE "WaitlistReviewStatus" AS ENUM ('QUEUED', 'NEEDS_INTAKE', 'APPROVED', 'DECLINED');

CREATE TABLE "waitlist_leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sportInterests" TEXT[],
    "currentStack" TEXT,
    "weakestProcess" TEXT,
    "consent" BOOLEAN NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "copyVersion" TEXT,
    "utmSource" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "sourcePath" TEXT,
    "reviewStatus" "WaitlistReviewStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "waitlist_leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_leads_email_key" ON "waitlist_leads"("email");
CREATE INDEX "waitlist_leads_reviewStatus_idx" ON "waitlist_leads"("reviewStatus");
CREATE INDEX "waitlist_leads_createdAt_idx" ON "waitlist_leads"("createdAt");
```

## Artifact 3 — Delegate wiring (edit `apps/web/lib/gse/waitlist-store.ts`)
The DB store logic already exists (`createDbWaitlistStore`, tested). Only the selector
needs the live delegate:
```ts
import { db } from "@sports/db";
import { createDbWaitlistStore, type WaitlistLeadDelegate } from "@/lib/gse/waitlist-store-db";

export function selectWaitlistStore(): WaitlistStore {
  if (process.env.WAITLIST_STORAGE === "db") {
    // After `prisma generate`, db.waitlistLead structurally implements the port.
    // The boundary cast adapts Prisma's wider generated delegate to the minimal interface.
    return createDbWaitlistStore(db.waitlistLead as unknown as WaitlistLeadDelegate);
  }
  return createWaitlistStore();
}
```
No call-site change (`route.ts` already calls `selectWaitlistStore()`).

## 10-step dry-run simulation (owner-run, local, verified-DB)
1. Branch off `main`: `git checkout -b claude/gse-pr3-durable-storage`. → clean tree.
2. Append Artifact 1 to `schema.prisma`. → schema has `WaitlistLead`.
3. **Verify `DATABASE_URL` points to a LOCAL/disposable DB** (not prod). → confirmed by you.
4. `npm run db:generate` (no DB). → client gains `db.waitlistLead`.
5. Apply Artifact 3 wiring. → `selectWaitlistStore` has the db branch.
6. `npm run db:migrate` (a.k.a. `prisma migrate dev --name waitlist_lead`). → migration created + applied to the local DB; SQL ≈ Artifact 2.
7. `npm run db:generate && rm -rf apps/web/.next` (clear stale artifacts). → clean build inputs.
8. `npm run typecheck --workspace=apps/web` → 0; `npm run lint` → 0.
9. Run the suite incl. DB-store contract tests against a test DB with `WAITLIST_STORAGE=db`; then again unset (file). → both green; **49/49 + 6/6 stays green**.
10. `prisma migrate diff --from-migrations … --to-schema-datamodel … --shadow-database-url $DIRECT_URL` → "No difference detected".

STOP here. Do NOT push/deploy/merge. The branch is now a ready PR3.

## Rollback / self-destruct-retry triggers
- **Validation RED at any step** → revert the working tree (`git checkout -- .`), drop the
  branch (`git branch -D claude/gse-pr3-durable-storage`), diagnose, retry from step 1.
- **Migration produces unexpected SQL** (≠ Artifact 2) → do not proceed; re-derive the model.
- **`DATABASE_URL` not provably local** → ABORT step 6 entirely (never migrate an unverified DB).
- **Runtime flag flip needed back** → `WAITLIST_STORAGE=file` (instant, no code change).
- **Down-migration** (if the table must go) → flip the flag first, then the Prisma
  down-migration; on prod (alias-based) re-alias after — a Vercel "rollback" won't undo DDL.

## What the agent has done vs. is waiting on
- ✅ DB store logic (`waitlist-store-db.ts`) + tests (fake delegate). ✅ This artifact pack.
- 🔒 Waiting on the phrase to stage Artifacts 1+3 on a local branch (still no migrate/push).
- 🔒 The owner alone runs step 6 (migrate) against a verified DB, and any push/deploy.
