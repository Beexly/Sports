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
const REVOKED_SESSION_IDS = new Set<string>();
const REVOKED_EMAIL_SLUGS = new Set<string>();
const LEDGER_QUERY_TAKE = 500;
const WEEKLY_PACK_TTL_MS = 8 * 24 * 60 * 60 * 1000;
const MONTHLY_PASS_TTL_MS = 35 * 24 * 60 * 60 * 1000;
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

const ELITE_SLUGS = new Set<string>([
  "vip-season-pass",
  "week8-all-access",
  "week8-all-access-gameday-pass",
  "season-membership",
  "season-membership-monthly",
  "elite-monthly",
  "global-multisport-pro",
]);

const FANTASY_SLUGS = new Set<string>([
  "redzone-dfs-pro-pack",
  "week8-sun-mon-dfs-expanded-pack",
]);

const PRO_SLUGS = new Set<string>([
  "primetime-showdown-pack",
  "thanksgiving-5game-pack",
  "sunday-full-slate-pack",
  "pro-monthly",
  "sgp-correlation-basket",
  "sunday-nfl-5pct-slate",
  "tnf-all-in-pack",
  "week8-tnf-pack",
  "week8-defense-idp-pack",
  "week8-anytime-td-pack",
  "week8-parlay-sgp-pack",
  "week8-kicking-1q-1h-pack",
  "sunday-main-dfs-pack",
  "mnf-showdown-pack",
]);

const MONTHLY_PASS_SLUGS = new Set<string>([
  "pro-monthly",
  "elite-monthly",
  "season-membership-monthly",
  "global-multisport-pro",
]);

const SEASON_PASS_SLUGS = new Set<string>([
  "vip-season-pass",
  "season-membership",
]);

const ALL_ACCESS_BUNDLE_SLUGS = new Set<string>([
  "week8-all-access",
  "week8-all-access-gameday-pass",
  "vip-season-pass",
  "season-membership",
  "season-membership-monthly",
  "elite-monthly",
  "global-multisport-pro",
]);

function isSeasonPassSlug(slug: string): boolean {
  return SEASON_PASS_SLUGS.has(slug);
}

function isMonthlyPassSlug(slug: string): boolean {
  return MONTHLY_PASS_SLUGS.has(slug);
}

export function isAllAccessBundleSlug(slug: string): boolean {
  return ALL_ACCESS_BUNDLE_SLUGS.has(slug);
}

/**
 * Explicit allowlist mapping from paid package slug -> SubscriptionTier.
 * Any unrecognized, free-room, or lead-capture slug strictly resolves to "FREE".
 */
export function tierForPackageSlug(slug: string): SubscriptionTier {
  if (!slug) return "FREE";
  const normalized = slug.trim().toLowerCase();
  if (ELITE_SLUGS.has(normalized)) return "ELITE";
  if (FANTASY_SLUGS.has(normalized)) return "FANTASY";
  if (PRO_SLUGS.has(normalized)) return "PRO";
  return "FREE";
}

export function isPurchaseActiveAt(timestampIso: string, slug: string, nowMs: number): boolean {
  const purchasedMs = Date.parse(timestampIso);
  if (!Number.isFinite(purchasedMs)) return false;
  const ttlMs = isSeasonPassSlug(slug)
    ? SEASON_PASS_TTL_MS
    : isMonthlyPassSlug(slug)
      ? MONTHLY_PASS_TTL_MS
      : WEEKLY_PACK_TTL_MS;
  return nowMs - purchasedMs <= ttlMs && nowMs >= purchasedMs - 5 * 60 * 1000;
}

export function higherEntitlementTier(a: SubscriptionTier, b: SubscriptionTier): SubscriptionTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

/** Clears the in-memory purchase and revocation caches (for automated unit test isolation). */
export function clearPurchaseLedgerCacheForTests(): void {
  IN_MEMORY_PURCHASE_CACHE.clear();
  REVOKED_SESSION_IDS.clear();
  REVOKED_EMAIL_SLUGS.clear();
}

/** Persists a completed one-time package checkout purchase. */
export async function recordPurchaseLedgerEntry(
  record: Omit<PurchaseLedgerRecord, "timestamp"> & { timestamp?: string },
  opts?: { throwOnDbError?: boolean },
): Promise<PurchaseLedgerRecord> {
  const normalizedEmail = record.customerEmail?.trim().toLowerCase() || null;
  const fullRecord: PurchaseLedgerRecord = {
    ...record,
    customerEmail: normalizedEmail,
    timestamp: record.timestamp || new Date().toISOString(),
  };

  REVOKED_SESSION_IDS.delete(record.sessionId);
  if (normalizedEmail) {
    REVOKED_EMAIL_SLUGS.delete(`${normalizedEmail}:${record.packageSlug}`);
  }

  IN_MEMORY_PURCHASE_CACHE.set(record.sessionId, fullRecord);

  if (normalizedEmail) {
    const emailKey = `email:${normalizedEmail}:${record.packageSlug}`;
    IN_MEMORY_PURCHASE_CACHE.set(emailKey, fullRecord);
    if (isAllAccessBundleSlug(record.packageSlug)) {
      IN_MEMORY_PURCHASE_CACHE.set(`email:${normalizedEmail}:*`, fullRecord);
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
            customerEmail: normalizedEmail,
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
    if (opts?.throwOnDbError) {
      throw err;
    }
  }

  return fullRecord;
}

/** Revokes ledger entitlements matching a refunded/canceled session, email, or pack slug. */
export async function revokePurchaseLedgerEntries(
  params: {
    sessionId?: string | null;
    customerEmail?: string | null;
    packageSlug?: string | null;
    reason?: string;
  },
  opts?: { throwOnDbError?: boolean },
): Promise<void> {
  const sessionId = params.sessionId?.trim() || null;
  const cleanEmail = params.customerEmail?.trim().toLowerCase() || null;
  const packageSlug = params.packageSlug?.trim() || null;

  if (sessionId) {
    REVOKED_SESSION_IDS.add(sessionId);
    IN_MEMORY_PURCHASE_CACHE.delete(sessionId);
  }
  if (cleanEmail && packageSlug) {
    REVOKED_EMAIL_SLUGS.add(`${cleanEmail}:${packageSlug}`);
    IN_MEMORY_PURCHASE_CACHE.delete(`email:${cleanEmail}:${packageSlug}`);
  }
  for (const [key, rec] of IN_MEMORY_PURCHASE_CACHE.entries()) {
    const recEmail = rec.customerEmail?.trim().toLowerCase() || null;
    const matchSession = Boolean(sessionId && rec.sessionId === sessionId);
    const matchEmail = Boolean(
      cleanEmail &&
        recEmail === cleanEmail &&
        (!packageSlug || rec.packageSlug === packageSlug),
    );
    if (matchSession || matchEmail) {
      REVOKED_SESSION_IDS.add(rec.sessionId);
      IN_MEMORY_PURCHASE_CACHE.delete(key);
    }
  }

  try {
    if (typeof db?.revenueEvent?.create === "function") {
      await db.revenueEvent.create({
        data: {
          kind: "one_time_pack_revoked",
          amountCents: 0,
          currency: "usd",
          userId: null,
          meta: {
            sessionId,
            customerEmail: cleanEmail,
            packageSlug,
            revoked: true,
            reason: params.reason || "refund_or_revocation",
          },
        },
      });
    }
  } catch (err) {
    console.warn(
      "[purchase-ledger] Failed to write revocation to db.revenueEvent:",
      err instanceof Error ? err.message : String(err),
    );
    if (opts?.throwOnDbError) {
      throw err;
    }
  }
}

function collectRevokedMarkersFromEvents(
  events: ReadonlyArray<{ meta: unknown }>,
  kindLookup?: ReadonlyArray<{ kind?: string; meta: unknown }>,
): { sessions: Set<string>; emailSlugs: Set<string> } {
  const sessions = new Set<string>(REVOKED_SESSION_IDS);
  const emailSlugs = new Set<string>(REVOKED_EMAIL_SLUGS);
  const source = kindLookup ?? events;
  for (const ev of source) {
    if ("kind" in ev && ev.kind !== "one_time_pack_revoked") continue;
    const meta = (ev.meta as Record<string, unknown>) || {};
    if (typeof meta.sessionId === "string" && meta.sessionId) {
      sessions.add(meta.sessionId);
    }
    if (typeof meta.customerEmail === "string" && meta.customerEmail) {
      const e = meta.customerEmail.trim().toLowerCase();
      const s = typeof meta.packageSlug === "string" && meta.packageSlug ? meta.packageSlug : "*";
      emailSlugs.add(`${e}:${s}`);
    }
  }
  return { sessions, emailSlugs };
}

function isRevokedRecord(
  sessionId: string,
  email: string | null | undefined,
  slug: string,
  revoked: { sessions: Set<string>; emailSlugs: Set<string> },
): boolean {
  if (revoked.sessions.has(sessionId)) return true;
  if (email) {
    const clean = email.trim().toLowerCase();
    if (revoked.emailSlugs.has(`${clean}:${slug}`) || revoked.emailSlugs.has(`${clean}:*`)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a user has unlocked a specific package slug by session ID, email, or user ID.
 */
export async function checkPurchaseLedgerAccess(params: {
  slug?: string | null;
  sessionId?: string | null;
  email?: string | null;
  userId?: string | null;
  nowMs?: number;
}): Promise<{ unlocked: boolean; record?: PurchaseLedgerRecord }> {
  const { slug, sessionId, email, userId } = params;
  const nowMs = params.nowMs ?? Date.now();
  const emptyRevoked = { sessions: REVOKED_SESSION_IDS, emailSlugs: REVOKED_EMAIL_SLUGS };

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
        timestamp: new Date(nowMs).toISOString(),
        metadata: { provider: "whop_founder_family_vip", permanentAllAccess: true },
      },
    };
  }

  if (sessionId && IN_MEMORY_PURCHASE_CACHE.has(sessionId)) {
    const rec = IN_MEMORY_PURCHASE_CACHE.get(sessionId)!;
    const paidTier = tierForPackageSlug(rec.packageSlug) !== "FREE";
    if (
      paidTier &&
      !isRevokedRecord(rec.sessionId, rec.customerEmail, rec.packageSlug, emptyRevoked) &&
      isPurchaseActiveAt(rec.timestamp, rec.packageSlug, nowMs) &&
      (!slug || rec.packageSlug === slug || isAllAccessBundleSlug(rec.packageSlug))
    ) {
      return { unlocked: true, record: rec };
    }
  }

  if (email && slug) {
    const cleanEmail = email.toLowerCase().trim();
    const emailKey = `email:${cleanEmail}:${slug}`;
    if (IN_MEMORY_PURCHASE_CACHE.has(emailKey)) {
      const rec = IN_MEMORY_PURCHASE_CACHE.get(emailKey)!;
      if (
        tierForPackageSlug(rec.packageSlug) !== "FREE" &&
        !isRevokedRecord(rec.sessionId, cleanEmail, rec.packageSlug, emptyRevoked) &&
        isPurchaseActiveAt(rec.timestamp, rec.packageSlug, nowMs)
      ) {
        return { unlocked: true, record: rec };
      }
    }
    const allAccessKey = `email:${cleanEmail}:*`;
    if (IN_MEMORY_PURCHASE_CACHE.has(allAccessKey)) {
      const rec = IN_MEMORY_PURCHASE_CACHE.get(allAccessKey)!;
      if (
        tierForPackageSlug(rec.packageSlug) !== "FREE" &&
        !isRevokedRecord(rec.sessionId, cleanEmail, rec.packageSlug, emptyRevoked) &&
        isPurchaseActiveAt(rec.timestamp, rec.packageSlug, nowMs)
      ) {
        return { unlocked: true, record: rec };
      }
    }
  }

  if (sessionId || email || userId) {
    try {
      const revenueEvents = (
        db as unknown as {
          revenueEvent?: {
            findMany?: (args: {
              where: Record<string, unknown>;
              orderBy: { at: "desc" };
              take: number;
            }) => Promise<
              Array<{
                id: string;
                kind?: string;
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
        // Query both grants and revocations without locking out Stripe guest rows (`userId: null`)
        // or Whop rows (`whopUserId`) when `sessionId` or `email` is present.
        const events = await revenueEvents.findMany({
          where: {
            kind: { in: ["one_time_pack", "one_time_pack_revoked"] },
          },
          orderBy: { at: "desc" },
          take: LEDGER_QUERY_TAKE,
        });

        const revoked = collectRevokedMarkersFromEvents(events, events);

        for (const ev of events) {
          if (ev.kind && ev.kind !== "one_time_pack") continue;
          const meta = (ev.meta as Record<string, unknown>) || {};
          if (meta.revoked === true) continue;

          const metaSession = typeof meta.sessionId === "string" ? meta.sessionId : null;
          const metaSlug = typeof meta.packageSlug === "string" ? meta.packageSlug : null;
          const metaEmail = typeof meta.customerEmail === "string" ? meta.customerEmail : null;

          if (!metaSlug || tierForPackageSlug(metaSlug) === "FREE") continue;
          if (isRevokedRecord(metaSession || ev.id, metaEmail, metaSlug, revoked)) continue;
          if (!isPurchaseActiveAt(ev.at.toISOString(), metaSlug, nowMs)) continue;

          const sessionMatches = Boolean(sessionId && metaSession === sessionId);
          const emailMatches = Boolean(
            email && metaEmail?.toLowerCase().trim() === email.toLowerCase().trim(),
          );
          const userMatches = Boolean(userId && ev.userId === userId);

          if (sessionMatches || emailMatches || userMatches) {
            if (!slug || metaSlug === slug || isAllAccessBundleSlug(metaSlug)) {
              const restored: PurchaseLedgerRecord = {
                sessionId: metaSession || ev.id,
                packageSlug: metaSlug,
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
    if (
      isRevokedRecord(rec.sessionId, recEmail, rec.packageSlug, {
        sessions: REVOKED_SESSION_IDS,
        emailSlugs: REVOKED_EMAIL_SLUGS,
      })
    ) {
      continue;
    }
    if (!isPurchaseActiveAt(rec.timestamp, rec.packageSlug, nowMs)) continue;
    bestTier = higherEntitlementTier(bestTier, tierForPackageSlug(rec.packageSlug));
  }

  const revenueEvents = (
    db as unknown as {
      revenueEvent?: {
        findMany?: (args: {
          where: Record<string, unknown>;
          orderBy: { at: "desc" };
          take: number;
        }) => Promise<
          Array<{
            id: string;
            kind?: string;
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
      where: { kind: { in: ["one_time_pack", "one_time_pack_revoked"] } },
      orderBy: { at: "desc" },
      take: LEDGER_QUERY_TAKE,
    });
    const revoked = collectRevokedMarkersFromEvents(events, events);
    for (const ev of events) {
      if (ev.kind && ev.kind !== "one_time_pack") continue;
      const meta = (ev.meta as Record<string, unknown>) || {};
      if (meta.revoked === true) continue;
      const metaSession = typeof meta.sessionId === "string" ? meta.sessionId : ev.id;
      const metaSlug = typeof meta.packageSlug === "string" ? meta.packageSlug : "";
      const metaEmail = typeof meta.customerEmail === "string" ? meta.customerEmail.trim().toLowerCase() : null;
      const matchesIdentity = Boolean((userId && ev.userId === userId) || (email && metaEmail === email));
      if (!matchesIdentity) continue;
      if (isRevokedRecord(metaSession, metaEmail, metaSlug, revoked)) continue;
      if (!isPurchaseActiveAt(ev.at.toISOString(), metaSlug, nowMs)) continue;
      bestTier = higherEntitlementTier(bestTier, tierForPackageSlug(metaSlug));
    }
  }

  return bestTier;
}
