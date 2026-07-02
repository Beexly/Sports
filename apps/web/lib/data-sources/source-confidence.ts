import type { SourceCost, SourceStatus } from "./catalog";
import type { SourceRightsStatus } from "@/lib/scraping/source-rights-registry";

/**
 * StatKing source-confidence model.
 *
 * Source cards carry not just a status but a calibrated, DATA-BACKED read of how
 * much weight we may place on them. Every field below is DERIVED from facts we
 * already hold (rights status, wiring status, cost, provider liveness) — never a
 * hand-assigned number — so the model can't drift into fabricated certainty.
 *
 * Invariant: `noFakeLiveData` is always true. We never present unverified or stale
 * third-party data as live; an unproven source lowers confidence, it does not get
 * dressed up as fresh.
 *
 * Relationship to the other two source-scoring modules (deliberately NOT merged —
 * each answers a different question):
 *   - This module: per-SOURCE-TYPE static/structural trust (rights + wiring +
 *     cost); time-invariant; rendered on /cockpit/sources.
 *   - lib/source-intelligence/index.ts — per-ARTIFACT (pick/promo/brief)
 *     freshness gate over ephemeral evidence lists.
 *   - lib/sources/source-reliability.ts — per-source rolling OPERATIONAL
 *     telemetry score (uptime/freshness/agreement/schema/latency).
 */

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export interface SourceConfidence {
  /** Trust in the underlying data itself. */
  readonly sourceConfidence: ConfidenceLevel;
  /** Trust that what we hold is current. */
  readonly freshnessConfidence: ConfidenceLevel;
  /** Clarity of the licensing terms. */
  readonly licenseConfidence: ConfidenceLevel;
  /** Clarity of the automation/usage rights. */
  readonly rightsConfidence: ConfidenceLevel;
  /** Residual uncertainty (high = less certain). */
  readonly uncertainty: ConfidenceLevel;
  /** How often the source changes/breaks (high = churns a lot). */
  readonly volatility: ConfidenceLevel;
  /** Hard invariant — never present unverified/stale data as live. Always true. */
  readonly noFakeLiveData: true;
  /** Whether the owner/legal must approve before any use. */
  readonly ownerApprovalRequired: boolean;
  /** What evidence backs this read. */
  readonly proofNote: string;
  readonly limitations: readonly string[];
}

export type DeriveSourceConfidenceInput = {
  readonly rightsStatus?: SourceRightsStatus;
  readonly cost: SourceCost;
  readonly status: SourceStatus;
  /** True if a live provider check shows the source wired and returning data. */
  readonly providerWired?: boolean;
};

const RANK: Record<ConfidenceLevel, number> = { unknown: 0, low: 1, medium: 2, high: 3 };

/** Worst (lowest) of several levels — uncertainty tracks the weakest link. */
function worst(...levels: ConfidenceLevel[]): ConfidenceLevel {
  return levels.reduce((acc, l) => (RANK[l] < RANK[acc] ? l : acc), "high" as ConfidenceLevel);
}

/** Uncertainty is the inverse of the weakest confidence signal. */
function invert(level: ConfidenceLevel): ConfidenceLevel {
  switch (level) {
    case "high":
      return "low";
    case "medium":
      return "medium";
    case "low":
      return "high";
    default:
      return "high"; // unknown ⇒ high uncertainty
  }
}

function rightsAndLicense(status?: SourceRightsStatus): {
  rights: ConfidenceLevel;
  license: ConfidenceLevel;
  ownerApproval: boolean;
} {
  switch (status) {
    case "approved_open_license":
    case "approved_api":
    case "approved_written_permission":
      return { rights: "high", license: "high", ownerApproval: false };
    case "approved_public_logged_off":
      return { rights: "medium", license: "medium", ownerApproval: false };
    case "vendor_candidate":
      return { rights: "low", license: "low", ownerApproval: true };
    case "manual_research_only":
      return { rights: "low", license: "low", ownerApproval: true };
    case "permission_required":
    case "blocked_technical_controls":
      return { rights: "low", license: "low", ownerApproval: true };
    case "excluded":
      return { rights: "low", license: "low", ownerApproval: true };
    default:
      return { rights: "unknown", license: "unknown", ownerApproval: true };
  }
}

function dataAndFreshness(status: SourceStatus, providerWired?: boolean): {
  source: ConfidenceLevel;
  freshness: ConfidenceLevel;
} {
  switch (status) {
    case "wired":
      return { source: providerWired === false ? "medium" : "high", freshness: providerWired === false ? "medium" : "high" };
    case "scheduled-code":
      return { source: "high", freshness: "high" };
    case "adapter-ready":
      return { source: "medium", freshness: "medium" };
    case "manual-ingest":
      return { source: "medium", freshness: "low" };
    case "founder-gated":
    case "permission-required":
      return { source: "low", freshness: "unknown" };
    case "planned":
      return { source: "unknown", freshness: "unknown" };
    default:
      return { source: "unknown", freshness: "unknown" };
  }
}

function deriveVolatility(cost: SourceCost, rightsStatus?: SourceRightsStatus): ConfidenceLevel {
  if (rightsStatus === "permission_required" || rightsStatus === "blocked_technical_controls") return "high";
  if (rightsStatus === "approved_open_license") return "low";
  if (cost === "licensed" || cost === "paid-optional") return "medium";
  return "medium";
}

export function deriveSourceConfidence(input: DeriveSourceConfidenceInput): SourceConfidence {
  const { rights, license, ownerApproval } = rightsAndLicense(input.rightsStatus);
  const { source, freshness } = dataAndFreshness(input.status, input.providerWired);
  const volatility = deriveVolatility(input.cost, input.rightsStatus);

  const weakest = worst(source, freshness, license, rights);
  const uncertainty = invert(weakest);

  const limitations: string[] = [];
  if (rights === "low" || rights === "unknown") limitations.push("Automation rights not confirmed. Gate before any use.");
  if (license === "low" || license === "unknown") limitations.push("License terms unverified. Confirm before commercial display.");
  if (freshness === "low" || freshness === "unknown") limitations.push("Freshness unproven. Validate timestamps before treating as live.");
  if (input.providerWired === false) limitations.push("Live provider check currently failing.");
  if (ownerApproval) limitations.push("Owner/legal approval required before activation.");

  const proofNote =
    input.rightsStatus
      ? `Derived from rights status "${input.rightsStatus}", wiring status "${input.status}"` +
        (input.providerWired === undefined ? "." : `, live provider ${input.providerWired ? "wired" : "failing"}.`)
      : `Derived from wiring status "${input.status}" (no rights-registry entry).`;

  return {
    sourceConfidence: source,
    freshnessConfidence: freshness,
    licenseConfidence: license,
    rightsConfidence: rights,
    uncertainty,
    volatility,
    noFakeLiveData: true,
    ownerApprovalRequired: ownerApproval,
    proofNote,
    limitations,
  };
}
