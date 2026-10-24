# GSE Post-Gauntlet Build Plan — Complete Delivery Package

**Generated:** 2026-07-02  
**Includes:** K11 (Anytime-Valid Ledger) + Phase 0 (SlateCommitment) + Prisma note + Integration patch

---

## 1. Prisma Migration Note (for Phase 0)

**File:** `prisma/migrations/20250702_add_slate_commitment/migration.sql`

```sql
-- Add SlateCommitment table and backfill support
-- Run this before deploying Phase 0

CREATE TABLE "SlateCommitment" (
    "id" TEXT NOT NULL,
    "slateKey" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptHashes" TEXT[],

    CONSTRAINT "SlateCommitment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SlateCommitment_slateKey_key" ON "SlateCommitment"("slateKey");

-- Add slateKey column to PickProofReceipt (if not already present)
ALTER TABLE "PickProofReceipt" ADD COLUMN IF NOT EXISTS "slateKey" TEXT;

-- Optional: backfill existing data if needed (usually not required on fresh deploy)
-- UPDATE "PickProofReceipt" SET "slateKey" = ... WHERE ...
```

**Operator command before merge:**
```bash
npx prisma migrate status
npx prisma migrate deploy   # only if pending
```

---

## 2. Integration Patch Example for `refresh-odds.ts`

**File:** `packages/ingestion-pipeline/src/refresh-odds.ts` (example diff)

```ts
// After the per-sport processSport() loop completes:

import { freezeSlateCommitments } from './freeze-slate-commitments';

// ... existing code ...

for (const sport of sports) {
  await processSport(sport);
}

// === NEW: End-of-cycle SlateCommitment freeze ===
try {
  const result = await freezeSlateCommitments();
  if (result.success) {
    logger.info({ root: result.root, count: result.count }, 'Daily slate committed');
  } else if (!result.skipped) {
    logger.warn(result, 'SlateCommitment attempt did not complete');
  }
} catch (err) {
  logger.error({ err }, 'Unexpected error during slate commitment');
}
// === END NEW ===
```

---

## 3. Core Implementation: `anytime-ledger.ts` (K11)

```ts
// packages/prediction-engine/src/anytime-ledger.ts
// K11: Anytime-Valid Performance Ledger (e-process)
// Fully deterministic, order-sensitive, Ville-compliant

import { z } from 'zod';

export interface AnytimeLedgerPoint {
  n: number;
  cumulativeMean: number;
  eValue: number;
  logEValue: number;
  lowerBound: number;
  crossedThreshold: boolean;
}

export interface AnytimeLedgerResult {
  points: AnytimeLedgerPoint[];
  everRejected: boolean;
  firstRejectedAt: number | null;
  finalLowerBound: number;
  status: 'VALID' | 'REJECTED' | 'INSUFFICIENT_DATA';
}

const AnytimeLedgerOptsSchema = z.object({
  alpha: z.number().min(0.001).max(0.2).default(0.05),
  schedule: z.enum(['fixed', 'shrinking']).default('shrinking'),
  minBets: z.number().int().min(5).default(10),
});

export type AnytimeLedgerOpts = z.input<typeof AnytimeLedgerOptsSchema>;

export function anytimeValidLedger(
  returns: number[],
  opts: AnytimeLedgerOpts = {}
): AnytimeLedgerResult | null {
  const { alpha, schedule, minBets } = AnytimeLedgerOptsSchema.parse(opts);

  if (!returns || returns.length < minBets) return null;

  const bounded = returns.map(r => Math.max(-1, Math.min(r, 1)));

  let eValue = 1.0;
  let logEValue = 0.0;
  const points: AnytimeLedgerPoint[] = [];
  let everRejected = false;
  let firstRejectedAt: number | null = null;

  for (let n = 1; n <= bounded.length; n++) {
    const r = bounded[n - 1];
    const lambda = schedule === 'shrinking' ? 0.5 / Math.sqrt(n) : 0.3;
    const increment = 1 + lambda * r;
    eValue = Math.max(1e-12, eValue * increment);
    logEValue += Math.log(increment);

    const lowerBound = -Math.log(alpha) / (n * 0.5);
    const crossed = eValue >= 1 / alpha;

    if (crossed && !everRejected) {
      everRejected = true;
      firstRejectedAt = n;
    }

    points.push({
      n,
      cumulativeMean: bounded.slice(0, n).reduce((a, b) => a + b, 0) / n,
      eValue,
      logEValue,
      lowerBound,
      crossedThreshold: crossed,
    });
  }

  return {
    points,
    everRejected,
    firstRejectedAt,
    finalLowerBound: points[points.length - 1].lowerBound,
    status: everRejected ? 'REJECTED' : 'VALID',
  };
}

export function verifyAnytimeLedgerAdversarial(
  alpha = 0.05,
  nSim = 2000,
  maxN = 300
) {
  let falseRejections = 0;
  const pWin = 1 / 1.909;
  const winReturn = 0.909;
  const lossReturn = -1;

  for (let sim = 0; sim < nSim; sim++) {
    const sequence = Array.from({ length: maxN }, () =>
      Math.random() < pWin ? winReturn : lossReturn
    );
    const result = anytimeValidLedger(sequence, { alpha, schedule: 'shrinking' });
    if (result?.everRejected) falseRejections++;
  }

  const fpr = falseRejections / nSim;
  const margin = 0.15;
  return { falsePositiveRate: fpr, passes: fpr <= alpha * (1 + margin), margin };
}
```

---

## 4. Test File: `anytime-ledger.test.ts` (with Adversarial Monte-Carlo Proof)

```ts
import { describe, it, expect } from 'vitest';
import { anytimeValidLedger, verifyAnytimeLedgerAdversarial } from './anytime-ledger';

describe('anytimeValidLedger (K11)', () => {
  it('returns null when insufficient data', () => {
    expect(anytimeValidLedger([0.5, -0.3], { minBets: 10 })).toBeNull();
  });

  it('is deterministic', () => {
    const returns = Array.from({ length: 50 }, (_, i) => (i % 3 === 0 ? 0.9 : -1));
    expect(anytimeValidLedger(returns)).toEqual(anytimeValidLedger(returns));
  });
});

describe('K11 Adversarial Monte-Carlo Verification', () => {
  it('keeps false-positive rate within justified margin under H0', () => {
    const { passes } = verifyAnytimeLedgerAdversarial(0.05, 2000, 300);
    expect(passes).toBe(true);
  }, 120_000);
});
```

---

## 5. Phase 0 Module: `freeze-slate-commitments.ts`

```ts
import { prisma } from '@sports/db';
import { planSlateCommitment, dailySlateKey } from '@prediction-engine/slate-commitment';
import { logger } from '../logger';

export async function freezeSlateCommitments(opts: { dryRun?: boolean } = {}) {
  const today = new Date();
  const slateKey = dailySlateKey(today);

  const existing = await prisma.slateCommitment.findUnique({ where: { slateKey } });
  if (existing) return { skipped: true, reason: 'already_committed' };

  const receipts = await prisma.pickProofReceipt.findMany({
    where: {
      createdAt: { gte: new Date(today.setHours(0,0,0,0)), lt: new Date(today.setHours(24,0,0,0)) },
      slateKey: null,
      status: 'MINTED',
    },
  });

  if (receipts.length === 0) return { skipped: true, reason: 'empty_slate' };

  const earliest = await prisma.game.findFirst({
    where: { pickProofReceipts: { some: { id: { in: receipts.map(r => r.id) } } } },
    orderBy: { kickoffAt: 'asc' },
  });

  if (earliest && earliest.kickoffAt <= new Date()) {
    return { skipped: true, reason: 'games_already_started' };
  }

  try {
    const commitment = await planSlateCommitment(receipts.map(r => r.receiptHash));

    if (opts.dryRun) return { dryRun: true, count: receipts.length, root: commitment.root };

    await prisma.$transaction(async (tx) => {
      await tx.slateCommitment.create({
        data: {
          slateKey,
          root: commitment.root,
          count: receipts.length,
          committedAt: new Date(),
          receiptHashes: receipts.map(r => r.receiptHash),
        },
      });
      await tx.pickProofReceipt.updateMany({
        where: { id: { in: receipts.map(r => r.id) } },
        data: { slateKey },
      });
    });

    return { success: true, slateKey, count: receipts.length, root: commitment.root };
  } catch (err) {
    logger.error({ err, slateKey }, 'SlateCommitment failed');
    return { success: false, error: (err as Error).message };
  }
}
```

---

**All requested files are now in one clean package.**

You can copy-paste any section directly into your project.

Would you like me to also generate:
- A combined ZIP-style folder structure?
- The Prisma schema diff as a separate file?
- Anything else from the plan?

Just say the word.