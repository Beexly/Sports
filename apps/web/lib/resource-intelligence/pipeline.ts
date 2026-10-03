/**
 * Resource Intelligence — pipeline.
 *
 * parse → dedupe (stable id) → classify → ledger + queues.
 * Pure and deterministic: same dump in ⇒ same ledger out. No I/O here; the
 * generator script owns reading the dump and writing artifacts.
 */

import { parseDump } from "./parse";
import { classifyResource, stableId } from "./classify";
import type {
  ClassifiedResource,
  DispositionCounts,
  ResourceDisposition,
  ResourceLedger,
} from "./types";
import { IMPLEMENTABLE_DISPOSITIONS } from "./types";

function emptyCounts(): DispositionCounts {
  return {
    approved_direct: 0,
    approved_internal_reference: 0,
    prototype: 0,
    roadmap: 0,
    owner_review: 0,
    quarantine: 0,
    rejected_noise: 0,
  };
}

export type BuildLedgerOptions = {
  readonly sourceFile: string;
  readonly sourceSha256?: string | null;
  readonly now?: Date;
};

export function buildLedger(raw: string, opts: BuildLedgerOptions): ResourceLedger {
  const { entries, rawLineCount, candidateEntryCount } = parseDump(raw);

  // Dedupe by stable id; keep the first occurrence as representative, count the rest.
  const byId = new Map<string, { first: (typeof entries)[number]; count: number }>();
  for (const entry of entries) {
    const id = stableId(entry.name);
    const existing = byId.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      byId.set(id, { first: entry, count: 1 });
    }
  }

  const resources: ClassifiedResource[] = [];
  const counts = emptyCounts();
  for (const { first, count } of byId.values()) {
    const resource = classifyResource(first, count);
    resources.push(resource);
    counts[resource.disposition] += 1;
  }

  // Deterministic ordering: disposition priority, then risk, then name.
  const order: Record<ResourceDisposition, number> = {
    approved_direct: 0,
    prototype: 1,
    approved_internal_reference: 2,
    roadmap: 3,
    owner_review: 4,
    quarantine: 5,
    rejected_noise: 6,
  };
  resources.sort((a, b) => {
    if (order[a.disposition] !== order[b.disposition]) return order[a.disposition] - order[b.disposition];
    return a.normalizedName.localeCompare(b.normalizedName);
  });

  return {
    generatedAt: (opts.now ?? new Date()).toISOString(),
    sourceFile: opts.sourceFile,
    sourceSha256: opts.sourceSha256 ?? null,
    rawLineCount,
    candidateEntryCount,
    uniqueResourceCount: resources.length,
    counts,
    resources,
  };
}

// ─── Queue selectors ──────────────────────────────────────────────────────────

/** IMPLEMENT-NOW: only safe, actionable dispositions — never gated/terminal ones. */
export function implementNowQueue(ledger: ResourceLedger): readonly ClassifiedResource[] {
  return ledger.resources.filter((r) => IMPLEMENTABLE_DISPOSITIONS.includes(r.disposition));
}

export function ownerReviewQueue(ledger: ResourceLedger): readonly ClassifiedResource[] {
  return ledger.resources.filter((r) => r.disposition === "owner_review");
}

export function quarantineQueue(ledger: ResourceLedger): readonly ClassifiedResource[] {
  return ledger.resources.filter((r) => r.disposition === "quarantine");
}

/**
 * Safety assertion usable at runtime: returns the ids of any resource that
 * leaked a quarantine/owner-review item into the implement-now queue. MUST be
 * empty. Tests assert this; callers can defensively assert it too.
 */
export function findGatedLeaks(ledger: ResourceLedger): readonly string[] {
  const implementable = new Set(IMPLEMENTABLE_DISPOSITIONS);
  return implementNowQueue(ledger)
    .filter((r) => !implementable.has(r.disposition))
    .map((r) => r.id);
}
