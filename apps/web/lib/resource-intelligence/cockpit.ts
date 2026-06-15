/**
 * Resource Intelligence — owner cockpit decision feed.
 *
 * `buildCockpitSummary` is the pure builder the generator uses to write a small,
 * committed `generated/summary.json`. `getResourceCockpitFeed` is the runtime,
 * app-facing accessor: it reads that committed summary so a cockpit route never
 * has to re-parse the 532 KB dump on a request.
 *
 * The feed only ever surfaces SAFE opportunities for action. Owner-review and
 * quarantine appear strictly as COUNTS + a decision prompt — never as
 * ready-to-use items — honoring the rule that gated resources are not promoted
 * into public claims, StatKing evidence, Airwave feeds, or automation.
 */

import type { DispositionCounts, ResourceLedger } from "./types";

export type TopSafeItem = {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly disposition: "approved_direct" | "prototype";
  readonly note: string;
};

export type ResourceCockpitSummary = {
  readonly generatedAt: string;
  readonly sourceSha256: string | null;
  readonly totals: {
    readonly rawLines: number;
    readonly candidateEntries: number;
    readonly uniqueResources: number;
  };
  readonly counts: DispositionCounts;
  readonly safeOpportunities: number;
  readonly topSafe: readonly TopSafeItem[];
  readonly ownerReview: number;
  readonly quarantine: number;
  readonly nextDecisions: readonly string[];
};

export function buildCockpitSummary(ledger: ResourceLedger, topN = 25): ResourceCockpitSummary {
  const safe = ledger.resources.filter(
    (r) => r.disposition === "approved_direct" || r.disposition === "prototype",
  );
  // approved_direct first (already sorted by pipeline), then prototype.
  const topSafe: TopSafeItem[] = safe.slice(0, topN).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    disposition: r.disposition as "approved_direct" | "prototype",
    note: r.description || r.reasons[0] || "",
  }));

  const ownerReview = ledger.counts.owner_review;
  const quarantine = ledger.counts.quarantine;

  const nextDecisions: string[] = [];
  if (ledger.counts.approved_direct > 0) {
    nextDecisions.push(`Adopt ${ledger.counts.approved_direct} approved-direct tools into the launch-quality backlog.`);
  }
  if (ownerReview > 0) {
    nextDecisions.push(`Triage ${ownerReview} owner-review items (sports/RSS/YouTube/podcast/API) through the source-provider + clearance gate before any use.`);
  }
  if (quarantine > 0) {
    nextDecisions.push(`Keep ${quarantine} quarantined resources hard-blocked — no exceptions, no automation, no claims.`);
  }

  return {
    generatedAt: ledger.generatedAt,
    sourceSha256: ledger.sourceSha256,
    totals: {
      rawLines: ledger.rawLineCount,
      candidateEntries: ledger.candidateEntryCount,
      uniqueResources: ledger.uniqueResourceCount,
    },
    counts: ledger.counts,
    safeOpportunities: safe.length,
    topSafe,
    ownerReview,
    quarantine,
    nextDecisions,
  };
}

// ─── Runtime feed (reads the committed summary) ──────────────────────────────────

import generated from "./generated/summary.json";

export type ResourceCockpitFeed = ResourceCockpitSummary & {
  /** True once a real summary has been generated from the verified dump. */
  readonly available: boolean;
};

/** App-facing accessor for an internal cockpit route/API. */
export function getResourceCockpitFeed(): ResourceCockpitFeed {
  const summary = generated as ResourceCockpitSummary;
  return {
    ...summary,
    available: summary.totals.uniqueResources > 0,
  };
}
