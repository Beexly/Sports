/**
 * Purchase Ledger & Durable Customer Entitlement Store
 *
 * Ensures one-time Stripe & Whop package purchases survive browser tab closures,
 * page navigations, session expirations, and power unified `getUserEntitlements()`.
 */

import { db } from "@sports/db";
import type { SubscriptionTier } from "@sports/types";

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

const IN_MEMORY_PURCHASE_CACHE = new Map<string, PurchaseLedgerRecord>();
const LEDGER_QUERY_TAKE = 500;
const WEEKLY_PACK_TTL_MS = 8 * 24 * 60 * 60 * 1000;
const SEASON_PASS_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export const FOUNDER_FAMILY_VIP_EMAILS = new Set<string>([
  "baxley.garrett@gmail.com",
  "dbax66@icloud.com",
  "garrett@beexly.com",
  "hq@galaxysportsedge.com",
]);

export function isFounderOrFamilyVipEmail(email?: string | null): boolean {
  if (!email) return false;
  return FOUNDER_FAMILY_VIP_EMAILS.has(email.trim().toLowerCase());
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  FANTASY: 1,
  PRO: 2,
  ELITE: 3,
};

function isSeasonPassSlug(slug: string): boolean {
  return (
    slug === "vip-season-pass" ||
    slug === "season-membership" ||
    slug === "season-membership-monthly" ||
    slug === "global-multisport-pro"
  );
}

function isAllAccessBundleSlug(slug: string): boolean {
  return (
    slug === "week8-all-access" ||
    slug === "vip-season-pass" ||
    slug === "season-membership" ||
    slug === "global-multisport-pro"
  );
}

function tierForPackageSlug(slug: string): SubscriptionTier {
  if (!slug || slug === "unmapped-pack" || slug === "free-proof-room") return "FREE";
  if (
    slug === "vip-season-pass" ||
    slug === "week8-all-access" ||
    slug === "season-membership" ||
    slug === "global-multisport-pro"
  ) {
    return "ELITE";
  }
  if (slug === "redzone-dfs-pro-pack" || slug === "week8-sun-mon-dfs-expanded-pack") {
    return "FANTASY";
  }
  return "PRO";
}

function isPurchaseActiveAt(timestampIso: string, slug: string, nowMs: number): boolean {
  const purchasedMs = Date.parse(timestampIso);
  if (!Number.isFinite(purchasedMs)) return false;
  const ttlMs = isSeasonPassSlug(slug) ? SEASON_PASS_TTL_MS : WEEKLY_PACK_TTL_MS;
  return nowMs - purchasedMs <= ttlMs && nowMs >= purchasedMs - 5 * 60 * 1000;
}

export function higherEntitlementTier(a: SubscriptionTier, b: SubscriptionTier): SubscriptionTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

/** Clears the in-memory purchase cache (for automated unit test isolation). */
export function clearPurchaseLedgerCacheForTests(): void {
  IN_MEMORY_PURCHASE_CACHE.clear();
}

/** Persists a completed one-time package checkout purchase. */
export async function recordPurchaseLedgerEntry(
  record: Omit<PurchaseLedgerRecord, "timestamp"> & { timestamp?: string },
): Promise<PurchaseLedgerRecord> {
  const fullRecord: PurchaseLedgerRecord = {
    ...record,
    timestamp: record.timestamp || new Date().toISOString(),
  };

  IN_MEMORY_PURCHASE_CACHE.set(record.sessionId, fullRecord);

  if (record.customerEmail) {
    const cleanEmail = record.customerEmail.toLowerCase().trim();
    const emailKey = `email:${cleanEmail}:${record.packageSlug}`;
    IN_MEMORY_PURCHASE_CACHE.set(emailKey, fullRecord);
    if (isAllAccessBundleSlug(record.packageSlug)) {
      IN_MEMORY_PURCHASE_CACHE.set(`email:${cleanEmail}:*`, fullRecord);
    }
  }

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
    console.warn(
      "[purchase-ledger] Failed to write to db.revenueEvent:",
      err instanceof Error ? err.message : String(err),
    );
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

  if (isFounderOrFamilyVipEmail(email)) {
    const cleanVip = email!.trim().toLowerCase();
    return {
      unlocked: true,
      record: {
        sessionId: `vip_founder_family_${cleanVip}`,
        packageSlug: slug || "global-multisport-pro",
        customerEmail: cleanVip,
        userId: userId || null,
        amountCents: 0,
        currency: "usd",
        timestamp: new Date().toISOString(),
        metadata: { provider: "whop_founder_family_vip", permanentAllAccess: true },
      },
    };
  }

  if (sessionId && IN_MEMORY_PURCHASE_CACHE.has(sessionId)) {
    const rec = IN_MEMORY_PURCHASE_CACHE.get(sessionId)!;
    if (!slug || rec.packageSlug === slug || isAllAccessBundleSlug(rec.packageSlug)) {
      return { unlocked: true, record: rec };
    }
  }

  if (email && slug) {
    const cleanEmail = email.toLowerCase().trim();
    const emailKey = `email:${cleanEmail}:${slug}`;
    if (IN_MEMORY_PURCHASE_CACHE.has(emailKey)) {
      return { unlocked: true, record: IN_MEMORY_PURCHASE_CACHE.get(emailKey) };
    }
    const allAccessKey = `email:${cleanEmail}:*`;
    if (IN_MEMORY_PURCHASE_CACHE.has(allAccessKey)) {
      return { unlocked: true, record: IN_MEMORY_PURCHASE_CACHE.get(allAccessKey) };
    }
  }

  if (sessionId || email || userId) {
    try {
      if (typeof db?.revenueEvent?.findMany === "function") {
        const events = await db.revenueEvent.findMany({
          where: {
            kind: "one_time_pack",
            ...(userId ? { userId } : {}),
          },
          orderBy: { at: "desc" },
          take: LEDGER_QUERY_TAKE,
        });

        for (const ev of events) {
          const meta = (ev.meta as Record<string, unknown>) || {};
          const metaSession = typeof meta.sessionId === "string" ? meta.sessionId : null;
          const metaSlug = typeof meta.packageSlug === "string" ? meta.packageSlug : null;
          const metaEmail = typeof meta.customerEmail === "string" ? meta.customerEmail : null;

          const sessionMatches = Boolean(sessionId && metaSession === sessionId);
          const emailMatches = Boolean(
            email && metaEmail?.toLowerCase().trim() === email.toLowerCase().trim(),
          );
          const userMatches = Boolean(userId && ev.userId === userId);

          if (sessionMatches || emailMatches || userMatches) {
            if (!slug || metaSlug === slug || (metaSlug ? isAllAccessBundleSlug(metaSlug) : false)) {
              const restored: PurchaseLedgerRecord = {
                sessionId: metaSession || ev.id,
                packageSlug: metaSlug || "unmapped-pack",
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
      // Fail closed to unauthorized.
    }
  }

  return { unlocked: false };
}

/**
 * Resolves the highest unexpired SubscriptionTier granted by one-time pack
 * purchases matching either `userId` or normalized `email`.
 */
export async function resolvePackEntitlementTier(params: {
  userId?: string | null;
  email?: string | null;
  nowMs?: number;
}): Promise<SubscriptionTier> {
  const userId = params.userId?.trim() || null;
  const email = params.email?.trim().toLowerCase() || null;
  if (isFounderOrFamilyVipEmail(email)) {
    return "ELITE";
  }
  if (!userId && !email) {
    return "FREE";
  }

  const nowMs = params.nowMs ?? Date.now();
  let bestTier: SubscriptionTier = "FREE";

  for (const rec of IN_MEMORY_PURCHASE_CACHE.values()) {
    const recEmail = rec.customerEmail?.trim().toLowerCase() || null;
    const matchesIdentity = Boolean((userId && rec.userId === userId) || (email && recEmail === email));
    if (!matchesIdentity) continue;
    if (!isPurchaseActiveAt(rec.timestamp, rec.packageSlug, nowMs)) continue;
    bestTier = higherEntitlementTier(bestTier, tierForPackageSlug(rec.packageSlug));
  }

  const revenueEvents = (
    db as unknown as {
      revenueEvent?: {
        findMany?: (args: {
          where: { kind: string; OR?: Array<Record<string, unknown>> };
          orderBy: { at: "desc" };
          take: number;
        }) => Promise<
          Array<{
            id: string;
            at: Date;
            userId: string | null;
            amountCents: number;
            currency: string;
            meta: unknown;
          }>
        >;
      };
    }
  ).revenueEvent;

  if (typeof revenueEvents?.findMany === "function") {
    const events = await revenueEvents.findMany({
      where: { kind: "one_time_pack" },
      orderBy: { at: "desc" },
      take: LEDGER_QUERY_TAKE,
    });
    for (const ev of events) {
      const meta = (ev.meta as Record<string, unknown>) || {};
      const metaSlug = typeof meta.packageSlug === "string" ? meta.packageSlug : "";
      const metaEmail = typeof meta.customerEmail === "string" ? meta.customerEmail.trim().toLowerCase() : null;
      const matchesIdentity = Boolean((userId && ev.userId === userId) || (email && metaEmail === email));
      if (!matchesIdentity) continue;
      if (!isPurchaseActiveAt(ev.at.toISOString(), metaSlug, nowMs)) continue;
      bestTier = higherEntitlementTier(bestTier, tierForPackageSlug(metaSlug));
    }
  }

  return bestTier;
}
