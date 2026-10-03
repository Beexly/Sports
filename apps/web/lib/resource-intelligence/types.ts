/**
 * Resource Intelligence — shared types.
 *
 * The "Garrett resource dump" is raw research intake: a large awesome-list style
 * collection of tool/resource NAMES (no live URLs). It is NOT approval to use any
 * resource. Every resource is parsed, normalized to a stable id, and classified
 * into exactly one disposition. Risky resources (piracy, evasion, circumvention)
 * are QUARANTINED — terminal, never promoted. Anything that would touch third-party
 * sports data, scraping/crawling, RSS/YouTube/podcast/API ingestion is routed to
 * OWNER_REVIEW and is gated behind the existing source-provider + clearance engine.
 *
 * These types deliberately mirror the vocabulary of the scraping gates
 * (source-rights-registry / data-rules / clearance-engine) so the resource ledger
 * plugs into the same rights posture rather than inventing a parallel one.
 */

// ─── Disposition ────────────────────────────────────────────────────────────────

/**
 * The single bucket a normalized resource lands in. Ordered roughly from
 * most-actionable to least; `quarantine` and `rejected_noise` are terminal.
 */
export type ResourceDisposition =
  | "approved_direct"               // Vetted, safe, high-value — may be adopted directly
  | "approved_internal_reference"   // Safe, but reference-only (not wired into product yet)
  | "prototype"                     // Safe + high-value category — candidate to trial behind a flag
  | "roadmap"                       // Safe + relevant later — parked on the roadmap
  | "owner_review"                  // Needs owner/legal/source-provider decision before ANY use
  | "quarantine"                    // Piracy / evasion / circumvention — hard-blocked, terminal
  | "rejected_noise";               // Not a real resource (warnings, tips, prose, headers)

/** True for dispositions that are safe to surface in the IMPLEMENT-NOW queue. */
export const IMPLEMENTABLE_DISPOSITIONS: readonly ResourceDisposition[] = [
  "approved_direct",
  "prototype",
];

/** Dispositions that must NEVER be auto-promoted into product/automation. */
export const GATED_DISPOSITIONS: readonly ResourceDisposition[] = [
  "owner_review",
  "quarantine",
];

// ─── Risk ───────────────────────────────────────────────────────────────────────

export type ResourceRiskTier = "none" | "low" | "medium" | "high" | "blocked";

// ─── Functional category (for prioritization only — not a rights decision) ───────

export type ResourceCategory =
  | "testing_qa"
  | "security"
  | "analytics"
  | "infrastructure"
  | "data_ops"
  | "ai_ml_cost"
  | "api_tooling"
  | "design_ux"
  | "content_intel"
  | "sports_data"
  | "scraping_crawling"
  | "media_piracy"
  | "circumvention"
  | "system_tool"
  | "dev_tool"
  | "uncategorized";

// ─── Raw + classified shapes ─────────────────────────────────────────────────────

/** One resource name extracted from one dump line (a line may yield several). */
export type RawResourceEntry = {
  readonly rawLine: string;
  readonly lineNumber: number;
  readonly sourceFile: string;
  readonly section: string;
  readonly name: string;
  readonly description: string;
};

export type ClassifiedResource = {
  readonly id: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly description: string;
  readonly section: string;
  readonly sourceFile: string;
  readonly firstLine: number;
  readonly occurrences: number;
  readonly disposition: ResourceDisposition;
  readonly riskTier: ResourceRiskTier;
  readonly category: ResourceCategory;
  /** True when, even if safe, real use must pass the source-provider/clearance gate. */
  readonly gateRequired: boolean;
  readonly reasons: readonly string[];
};

// ─── Ledger ──────────────────────────────────────────────────────────────────────

export type DispositionCounts = Record<ResourceDisposition, number>;

export type ResourceLedger = {
  readonly generatedAt: string;
  readonly sourceFile: string;
  readonly sourceSha256: string | null;
  readonly rawLineCount: number;
  readonly candidateEntryCount: number;
  readonly uniqueResourceCount: number;
  readonly counts: DispositionCounts;
  readonly resources: readonly ClassifiedResource[];
};
