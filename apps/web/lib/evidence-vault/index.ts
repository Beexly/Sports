/**
 * Evidence Vault Service (ADR 003)
 *
 * Append-only structured intelligence store. Every observed fact that backs
 * a pick, claim, or Brain answer is stored here. Rows are immutable after
 * insert — updates produce new rows. TTL expiry is enforced by the settlement
 * worker, not by DB triggers.
 *
 * Public-safety gate: publicSafe must be true before any fact is surfaced
 * to unpaid users. The gate is set at insert time based on sourceTier and
 * claimType; only the cockpit operator may override it to true.
 */

import { db as prisma, Prisma } from "@sports/db";
import type { EvidenceItem } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────────

export type EntityType = "player" | "team" | "game" | "market" | "league";

export type ClaimType =
  | "injury_status"
  | "line_movement"
  | "sharp_action"
  | "rumor"
  | "weather"
  | "schedule"
  | "odds_snapshot"
  | "public_lean"
  | "book_disagreement"
  | "usage_trend";

export interface EvidenceInsert {
  sourceId: string;
  sourceTier: 1 | 2 | 3 | 4 | 5 | 6;
  entityType: EntityType;
  entityId: string;
  claimType: ClaimType;
  observedAt: Date;
  content: Record<string, unknown>;
  ttlSeconds: number;
  confidence?: number;
}

export interface EvidenceLookup {
  entityType: EntityType;
  entityId: string;
  claimType?: ClaimType;
  minTier?: number;
  maxTier?: number;
  publicSafeOnly?: boolean;
  excludeExpired?: boolean;
}

// ── Tier defaults ─────────────────────────────────────────────────────────

const PUBLIC_SAFE_TIERS: ReadonlySet<number> = new Set([1, 2]);

function defaultPublicSafe(tier: number, claimType: ClaimType): boolean {
  if (!PUBLIC_SAFE_TIERS.has(tier)) return false;
  // Rumors and unverified sharp action are never auto-public-safe
  if (claimType === "rumor" || claimType === "sharp_action") return false;
  return true;
}

// ── Write ────────────────────────────────────────────────────────────────

export async function insertEvidenceItem(
  input: EvidenceInsert,
): Promise<EvidenceItem> {
  const publicSafe = defaultPublicSafe(input.sourceTier, input.claimType);

  return prisma.evidenceItem.create({
    data: {
      sourceId: input.sourceId,
      sourceTier: input.sourceTier,
      entityType: input.entityType,
      entityId: input.entityId,
      claimType: input.claimType,
      observedAt: input.observedAt,
      content: input.content as Prisma.InputJsonValue,
      ttlSeconds: input.ttlSeconds,
      confidence: input.confidence ?? 1.0,
      publicSafe,
      auditLog: [{ at: new Date().toISOString(), actor: "system", action: "insert" }],
    },
  });
}

/** Mark all stale items for an entity+claimType as expired. */
export async function expireStaleItems(
  entityId: string,
  claimType: ClaimType,
  expiredAt: Date = new Date(),
): Promise<number> {
  const threshold = new Date(expiredAt.getTime());

  const { count } = await prisma.evidenceItem.updateMany({
    where: {
      entityId,
      claimType,
      expiredAt: null,
      observedAt: {
        lt: new Date(threshold.getTime() - 0), // all prior items
      },
    },
    data: { expiredAt },
  });

  return count;
}

// ── Read ─────────────────────────────────────────────────────────────────

export async function lookupEvidence(
  query: EvidenceLookup,
): Promise<EvidenceItem[]> {
  return prisma.evidenceItem.findMany({
    where: {
      entityType: query.entityType,
      entityId: query.entityId,
      ...(query.claimType ? { claimType: query.claimType } : {}),
      ...(query.publicSafeOnly ? { publicSafe: true } : {}),
      ...(query.excludeExpired !== false ? { expiredAt: null } : {}),
      ...(query.minTier !== undefined ? { sourceTier: { gte: query.minTier } } : {}),
      ...(query.maxTier !== undefined ? {
        sourceTier: {
          ...(query.minTier !== undefined ? { gte: query.minTier } : {}),
          lte: query.maxTier,
        },
      } : {}),
    },
    orderBy: [{ sourceTier: "asc" }, { observedAt: "desc" }],
  });
}

/** Freshest non-expired item for a specific entity+claimType, or null. */
export async function latestEvidence(
  entityId: string,
  claimType: ClaimType,
  publicSafeOnly = false,
): Promise<EvidenceItem | null> {
  return prisma.evidenceItem.findFirst({
    where: {
      entityId,
      claimType,
      expiredAt: null,
      ...(publicSafeOnly ? { publicSafe: true } : {}),
    },
    orderBy: [{ sourceTier: "asc" }, { observedAt: "desc" }],
  });
}

/** TTL expiry sweep — called by the settlement worker on a cron. */
export async function sweepExpiredItems(): Promise<number> {
  const now = new Date();

  // Find items where observedAt + ttlSeconds < now and expiredAt is null.
  // Prisma doesn't support computed WHERE; use raw SQL via $queryRaw for
  // the selection and updateMany for the mutation.
  const stale = await prisma.evidenceItem.findMany({
    where: {
      expiredAt: null,
    },
    select: { id: true, observedAt: true, ttlSeconds: true },
  });

  const staleIds = stale
    .filter((item: { id: string; observedAt: Date; ttlSeconds: number }) => {
      const expiresAt = new Date(item.observedAt.getTime() + item.ttlSeconds * 1000);
      return expiresAt <= now;
    })
    .map((item: { id: string; observedAt: Date; ttlSeconds: number }) => item.id);

  if (staleIds.length === 0) return 0;

  const { count } = await prisma.evidenceItem.updateMany({
    where: { id: { in: staleIds } },
    data: { expiredAt: now },
  });

  return count;
}
