/**
 * Broadcast-Rights Gate (Pillar E.1)
 *
 * Enforces broadcast rights before any pick analysis is surfaced publicly.
 * A pick may only be broadcast when ALL CLAIM signals have:
 *   1. A resolved rights mapping (non-null)
 *   2. commercial_display_allowed = true
 *   3. FRESH or AGING freshness (not STALE)
 *
 * The distinction between CLAIM and CONTEXT is load-bearing here:
 *   - CONTEXT links do not block broadcast on their own
 *   - CC BY-SA attribution flows through all links, not just CLAIM
 *
 * quarantineSource: crude text-search quarantine used when a source receives
 * a cease-and-desist. No separate index exists — this is an O(n) scan that
 * is acceptable at current data volumes but should be indexed if the
 * decision_records table grows beyond ~100k rows.
 */

import type { ProvenanceChain } from "./trace-claim";
import { db } from "@sports/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadcastRightsResult {
  readonly allowed: boolean;
  readonly blocks: readonly string[];
  readonly attribution: readonly string[];
}

// ─── assertBroadcastRights ────────────────────────────────────────────────────

/**
 * Synchronous check — no DB access required because the chain carries all
 * necessary rights metadata. Call traceClaim() first to get the chain.
 *
 * Returns:
 *  - allowed: true only when no blocks exist
 *  - blocks: human-readable strings describing each blocking condition
 *  - attribution: distinct attribution texts to surface in any broadcast output
 */
export function assertBroadcastRights(
  chain: ProvenanceChain
): BroadcastRightsResult {
  const blocks: string[] = [];
  const claimLinks = chain.links.filter((l) => l.kind === "CLAIM");

  // 1. Unresolved CLAIM sources — no rights mapping available
  for (const link of claimLinks) {
    if (link.rights === null) {
      blocks.push(
        `UNRESOLVED_RIGHTS: source "${link.sourceName}" has no rights mapping — cannot confirm commercial_display_allowed`
      );
    } else if (!link.rights.commercial_display_allowed) {
      blocks.push(
        `COMMERCIAL_DISPLAY_DENIED: source "${link.sourceName}" (status: ${link.rights.status}) does not permit commercial display`
      );
    }
  }

  // 2. Stale CLAIM sources — evidence may be outdated
  for (const link of claimLinks) {
    if (link.freshness === "STALE") {
      blocks.push(
        `STALE_SIGNAL: "${link.signalKey}" from "${link.sourceName}" is STALE — claim may be outdated`
      );
    }
  }

  // 3. Attribution — CC BY-SA flows through all links, not just CLAIM
  const attribution: string[] = [
    ...new Set(
      chain.links
        .map((l) => l.rights?.attribution_text)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
    ),
  ];

  return { allowed: blocks.length === 0, blocks, attribution };
}

// ─── quarantineSource ─────────────────────────────────────────────────────────

/**
 * Mark all DecisionRecords that reference a source as quarantined.
 *
 * Uses a text-contains search on chainPayload — crude but correct given that
 * no separate index of source references exists in DecisionRecord. This is
 * acceptable at current data volumes. If the table grows substantially,
 * a normalized source-reference index should be added.
 *
 * Returns the number of records quarantined.
 */
export async function quarantineSource(sourceId: string): Promise<number> {
  const affected = await db.decisionRecord.findMany({
    where: {
      isQuarantined: false,
      chainPayload: { contains: sourceId },
    },
    select: { id: true },
  });

  if (affected.length === 0) return 0;

  await db.decisionRecord.updateMany({
    where: { id: { in: affected.map((r: { id: string }) => r.id) } },
    data: { isQuarantined: true },
  });

  return affected.length;
}
