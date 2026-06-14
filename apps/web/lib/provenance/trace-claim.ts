/**
 * Provenance Fusion — traceClaim (Pillar B.3)
 *
 * Reconstructs the full provenance chain for a pick: which signals backed
 * the scoring decision (CLAIM) versus which provided display context
 * (CONTEXT). Enables the Broadcast-Rights Gate and Model Court citations.
 *
 * CLAIM vs CONTEXT distinction is CRITICAL:
 *   CLAIM  — drove the pick score (sourced from the GameSignal scoring categories)
 *   CONTEXT — display-layer color only (computed / supplemental engines)
 * Never conflate them in an answer.
 */

import { db } from "@sports/db";
import { classifyFreshness } from "@/lib/source-intelligence";
import type { RightsSnapshot } from "@/lib/scraping/source-rights-registry";
import type { FreshnessStatus, SourceCategory, SourceEvidence } from "@/lib/source-intelligence";
import { bridgeSourceName } from "./bridge";

// ─── Public types ─────────────────────────────────────────────────────────────

export type ProvenanceLinkKind = "CLAIM" | "CONTEXT";

export interface ProvenanceLink {
  readonly kind: ProvenanceLinkKind;
  readonly signalKey: string;
  readonly signalValue: unknown;
  readonly sourceName: string;
  readonly trustLevel: number;
  /** ISO — signal.fetchedAt: when we could first know this fact */
  readonly knownAt: string;
  /** SourceSnapshot.payloadHash for this source (best-effort join), or null */
  readonly payloadHash: string | null;
  /** From GameSignal.rightsSnapshotJson — null if missing or not yet populated */
  readonly rights: RightsSnapshot | null;
  readonly freshness: FreshnessStatus;
  readonly expiresAt: string | null;
}

export interface ProvenanceChain {
  readonly pickId: string;
  readonly generatedAt: string;
  readonly modelVersion: string;
  readonly links: readonly ProvenanceLink[];
  /** True only when every CLAIM link has commercial_display_allowed */
  readonly broadcastAllowed: boolean;
  /** Distinct non-null attribution_text values across all links */
  readonly attribution: readonly string[];
  /** sourceName values with no rights mapping in the registry */
  readonly unresolved: readonly string[];
}

// ─── Signal-category → SourceCategory mapping ────────────────────────────────

// Maps Prisma SignalCategory enum values to source-intelligence SourceCategory.
// CLAIM categories: these directly drive pick scoring.
const SIGNAL_TO_SOURCE: Readonly<Record<string, SourceCategory>> = {
  ODDS: "ODDS",
  SCHEDULE: "TEAM_SCHEDULE",
  WEATHER: "WEATHER",
  INJURIES: "INJURY_NEWS",
  RATINGS: "PLAYER_STATS",
  MARKET_SENTIMENT: "ODDS",
  PLAYER_AVAILABILITY: "INJURY_NEWS",
  OFFICIALS: "PLAYER_STATS",
  TEAM_RATES: "TEAM_STATS",
  VENUE_ENVIRONMENT: "TEAM_SCHEDULE",
  STANDINGS: "TEAM_STATS",
  DIVISION_CONTEXT: "TEAM_STATS",
  MILESTONES: "PLAYER_STATS",
  PACE: "TEAM_STATS",
};

// Categories that make a signal a CLAIM (drives scoring) vs CONTEXT.
// A signal is CLAIM if: its sourceCategory is in this set AND isBootstrap=false.
const CLAIM_SIGNAL_CATEGORIES: ReadonlySet<string> = new Set([
  "ODDS",
  "SCHEDULE",
  "LINE_MOVEMENT",
  "WEATHER",
  "RATINGS",
  "MARKET_SENTIMENT",
  "OFFICIALS",
]);

function mapSignalCategoryToSourceCategory(signalCategory: string): SourceCategory {
  return SIGNAL_TO_SOURCE[signalCategory] ?? "ODDS";
}

function isClaimSignal(sourceCategory: string, isBootstrap: boolean): boolean {
  return CLAIM_SIGNAL_CATEGORIES.has(sourceCategory) && !isBootstrap;
}

// ─── Rights snapshot parsing ──────────────────────────────────────────────────

function parseRightsSnapshot(json: unknown): RightsSnapshot | null {
  if (json === null || json === undefined) return null;
  try {
    // json from Prisma is already a parsed object (Json field)
    const obj = typeof json === "string" ? JSON.parse(json) : json;
    if (typeof obj !== "object" || obj === null) return null;
    const r = obj as Record<string, unknown>;
    // Validate required fields
    if (typeof r["source_id"] !== "string") return null;
    if (typeof r["status"] !== "string") return null;
    return obj as RightsSnapshot;
  } catch {
    return null;
  }
}

// ─── Core loader ─────────────────────────────────────────────────────────────

/**
 * Build a full ProvenanceChain for a pick.
 *
 * Steps:
 * 1. Load pick to get gameId, generatedAt, modelVersion
 * 2. Load all GameSignal rows for this game
 * 3. Classify each signal as CLAIM or CONTEXT
 * 4. Best-effort join to SourceSnapshot for payloadHash
 * 5. Parse rightsSnapshotJson
 * 6. Classify freshness via source-intelligence classifyFreshness
 * 7. Assemble ProvenanceChain
 */
export async function traceClaim(pickId: string, now = new Date()): Promise<ProvenanceChain> {
  // 1. Load pick
  const pick = await db.pick.findUnique({
    where: { id: pickId },
    select: {
      id: true,
      gameId: true,
      generatedAt: true,
      modelVersion: true,
    },
  });

  if (!pick) throw new Error(`Pick not found: ${pickId}`);

  // 2. Load all GameSignal rows for this game
  const signals = await db.gameSignal.findMany({
    where: { gameId: pick.gameId },
    orderBy: { fetchedAt: "asc" },
  });

  // 3 & 4. Build links — for each signal, determine kind, look up payloadHash
  const links: ProvenanceLink[] = [];
  const sourceNames = [...new Set(signals.map((s: { sourceName: string }) => s.sourceName))];

  // Best-effort join: load SourceSnapshot for each unique sourceName that has signals
  // Find the snapshot closest to (but before) each signal's fetchedAt
  const snapshotsBySource = new Map<string, { fetchedAt: Date; payloadHash: string }[]>();
  if (sourceNames.length > 0) {
    const snapshots = await db.sourceSnapshot.findMany({
      where: {
        provider: { in: sourceNames },
      },
      select: { provider: true, fetchedAt: true, payloadHash: true },
      orderBy: { fetchedAt: "desc" },
      take: 200, // bounded read
    });
    for (const snap of snapshots) {
      const list = snapshotsBySource.get(snap.provider) ?? [];
      list.push({ fetchedAt: snap.fetchedAt, payloadHash: snap.payloadHash });
      snapshotsBySource.set(snap.provider, list);
    }
  }

  for (const signal of signals) {
    const kind: ProvenanceLinkKind = isClaimSignal(signal.sourceCategory, signal.isBootstrap)
      ? "CLAIM"
      : "CONTEXT";

    // Best-effort: find snapshot where fetchedAt <= signal.fetchedAt, closest
    const snapshotList = snapshotsBySource.get(signal.sourceName) ?? [];
    const signalTime = signal.fetchedAt.getTime();
    const bestSnapshot = snapshotList
      .filter((s) => s.fetchedAt.getTime() <= signalTime)
      .sort((a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime())[0] ?? null;

    // Parse rights from GameSignal.rightsSnapshotJson
    // If null, attempt a live bridge lookup (for signals written before V9)
    let rights: RightsSnapshot | null = parseRightsSnapshot(signal.rightsSnapshotJson);
    if (rights === null) {
      // Fallback: snapshot live rights from bridge (not immutable, but better than null)
      const bridged = bridgeSourceName(signal.sourceName);
      if (bridged) {
        rights = {
          source_id: bridged.source_id,
          source_url: bridged.source_url,
          status: bridged.status,
          automation_allowed: bridged.automation_allowed,
          public_logged_off_allowed: bridged.public_logged_off_allowed,
          commercial_display_allowed: bridged.commercial_display_allowed,
          storage_allowed: bridged.storage_allowed,
          derived_analytics_allowed: bridged.derived_analytics_allowed,
          model_training_allowed: bridged.model_training_allowed,
          attribution_required: bridged.attribution_required,
          attribution_text: bridged.attribution_text,
          reviewed_at: bridged.reviewed_at,
          snapshotted_at: now.toISOString(),
        };
      }
    }

    // Classify freshness
    const sourceEvidence: SourceEvidence = {
      category: mapSignalCategoryToSourceCategory(signal.sourceCategory),
      sourceId: signal.sourceName,
      fetchedAt: signal.fetchedAt,
      trustScore: signal.trustLevel * 100,
    };
    const freshness = classifyFreshness(sourceEvidence, now);

    links.push({
      kind,
      signalKey: signal.signalKey,
      signalValue: signal.signalValue,
      sourceName: signal.sourceName,
      trustLevel: signal.trustLevel,
      knownAt: signal.fetchedAt.toISOString(),
      payloadHash: bestSnapshot?.payloadHash ?? null,
      rights,
      freshness,
      expiresAt: signal.expiresAt?.toISOString() ?? null,
    });
  }

  // 7. Assemble chain
  const claimLinks = links.filter((l) => l.kind === "CLAIM");

  // broadcastAllowed: all CLAIM links must have commercial_display_allowed
  // Null rights (unresolved) = NOT allowed
  const broadcastAllowed = claimLinks.every(
    (l) => l.rights !== null && l.rights.commercial_display_allowed === true
  );

  // attribution: distinct non-null attribution_text from all links
  const attribution: string[] = [
    ...new Set(
      links
        .map((l) => l.rights?.attribution_text)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
    ),
  ];

  // unresolved: sourceName where rights === null
  const unresolved: string[] = [
    ...new Set(
      links.filter((l) => l.rights === null).map((l) => l.sourceName)
    ),
  ];

  return {
    pickId: pick.id,
    generatedAt: pick.generatedAt.toISOString(),
    modelVersion: pick.modelVersion,
    links,
    broadcastAllowed,
    attribution,
    unresolved,
  };
}
