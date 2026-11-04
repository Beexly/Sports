/**
 * Purchase Ledger & Durable Customer Entitlement Store
 *
 * Ensures one-time Stripe checkout purchases survive browser tab closures,
 * page navigations, and session expirations.
 */

import { db } from "@sports/db";

export interface PurchaseLedgerRecord {
  sessionId: string;
  packageSlug: string;
  customerEmail?: string | null;
  userId?: string | null;
  amountCents: number;
  currency: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// In-memory fallback ledger for test environments and fast read caching
const IN_MEMORY_PURCHASE_CACHE = new Map<string, PurchaseLedgerRecord>();

/**
 * Persists a completed one-time package checkout purchase.
 */
export async function recordPurchaseLedgerEntry(
  record: Omit<PurchaseLedgerRecord, "timestamp"> & { timestamp?: string },
): Promise<PurchaseLedgerRecord> {
  const fullRecord: PurchaseLedgerRecord = {
    ...record,
    timestamp: record.timestamp || new Date().toISOString(),
  };

  // Cache by sessionId
  IN_MEMORY_PURCHASE_CACHE.set(record.sessionId, fullRecord);

  // Cache by email + slug if email is provided
  if (record.customerEmail) {
    const emailKey = `email:${record.customerEmail.toLowerCase().trim()}:${record.packageSlug}`;
    IN_MEMORY_PURCHASE_CACHE.set(emailKey, fullRecord);
    // All-access pass unlocks everything
    if (record.packageSlug === "week8-all-access" || record.packageSlug === "vip-season-pass") {
      IN_MEMORY_PURCHASE_CACHE.set(`email:${record.customerEmail.toLowerCase().trim()}:*`, fullRecord);
    }
  }

  // Attempt durable persistence to Prisma Postgres db.revenueEvent
  try {
    if (typeof db?.revenueEvent?.create === "function") {
      await db.revenueEvent.create({
        data: {
          kind: "one_time_pack",
          amountCents: record.amountCents,
          currency: record.currency || "usd",
          userId: record.userId || null,
          meta: {
            packageSlug: record.packageSlug,
            sessionId: record.sessionId,
            customerEmail: record.customerEmail,
            ...(record.metadata || {}),
          },
        },
      });
    }
  } catch (err) {
    // If DB is offline or table temporarily unavailable in dev/test, the memory cache retains access
    console.warn("[purchase-ledger] Failed to write to db.revenueEvent:", err instanceof Error ? err.message : String(err));
  }

  return fullRecord;
}

/**
 * Checks if a user has unlocked a specific package slug by session ID, email, or user ID.
 */
export async function checkPurchaseLedgerAccess(params: {
  slug?: string | null;
  sessionId?: string | null;
  email?: string | null;
  userId?: string | null;
}): Promise<{ unlocked: boolean; record?: PurchaseLedgerRecord }> {
  const { slug, sessionId, email, userId } = params;

  // 1. Check in-memory cache by session ID
  if (sessionId && IN_MEMORY_PURCHASE_CACHE.has(sessionId)) {
    const rec = IN_MEMORY_PURCHASE_CACHE.get(sessionId)!;
    if (!slug || rec.packageSlug === slug || rec.packageSlug === "week8-all-access" || rec.packageSlug === "vip-season-pass") {
      return { unlocked: true, record: rec };
    }
  }

  // 2. Check in-memory cache by email
  if (email && slug) {
    const emailKey = `email:${email.toLowerCase().trim()}:${slug}`;
    if (IN_MEMORY_PURCHASE_CACHE.has(emailKey)) {
      return { unlocked: true, record: IN_MEMORY_PURCHASE_CACHE.get(emailKey) };
    }
    const allAccessKey = `email:${email.toLowerCase().trim()}:*`;
    if (IN_MEMORY_PURCHASE_CACHE.has(allAccessKey)) {
      return { unlocked: true, record: IN_MEMORY_PURCHASE_CACHE.get(allAccessKey) };
    }
  }

  // 3. Query Prisma DB if available
  if (sessionId || email || userId) {
    try {
      if (typeof db?.revenueEvent?.findFirst === "function") {
        const events = await db.revenueEvent.findMany({
          where: {
            kind: "one_time_pack",
            ...(userId ? { userId } : {}),
          },
          orderBy: { at: "desc" },
          take: 20,
        });

        for (const ev of events) {
          const meta = (ev.meta as Record<string, unknown>) || {};
          const metaSession = typeof meta.sessionId === "string" ? meta.sessionId : null;
          const metaSlug = typeof meta.packageSlug === "string" ? meta.packageSlug : null;
          const metaEmail = typeof meta.customerEmail === "string" ? meta.customerEmail : null;

          const sessionMatches = sessionId && metaSession === sessionId;
          const emailMatches = email && metaEmail?.toLowerCase().trim() === email.toLowerCase().trim();

          if (sessionMatches || emailMatches) {
            if (!slug || metaSlug === slug || metaSlug === "week8-all-access" || metaSlug === "vip-season-pass") {
              const restored: PurchaseLedgerRecord = {
                sessionId: metaSession || ev.id,
                packageSlug: metaSlug || "week8-all-access",
                customerEmail: metaEmail,
                userId: ev.userId,
                amountCents: ev.amountCents,
                currency: ev.currency,
                timestamp: ev.at.toISOString(),
                metadata: meta,
              };
              IN_MEMORY_PURCHASE_CACHE.set(restored.sessionId, restored);
              return { unlocked: true, record: restored };
            }
          }
        }
      }
    } catch {
      // Continue to unauthorized
    }
  }

  return { unlocked: false };
}
