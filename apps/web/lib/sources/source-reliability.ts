/**
 * Source Reliability Score — a continuous, auditable trust score per data source.
 *
 * Not every source deserves equal weight, and a source's reliability changes over time
 * (an outage, a schema break, drift from consensus, a rights downgrade). This scores
 * each source 0–100 from uptime, freshness-within-TTL, schema stability, agreement with
 * other sources, and latency — minus a penalty for settlement losses traced to its bad
 * data — then maps to a tier, a confidence penalty applied to its signals, and whether
 * it may back a PUBLIC claim (rights-gated). Pure, no I/O.
 *
 * Relationship to the other two source-scoring modules (deliberately NOT merged —
 * each answers a different question):
 *   - This module: per-source rolling OPERATIONAL telemetry score
 *     (uptime/freshness/agreement/schema/latency).
 *   - lib/source-intelligence/index.ts — per-ARTIFACT (pick/promo/brief)
 *     freshness gate over ephemeral evidence lists.
 *   - lib/data-sources/source-confidence.ts — per-SOURCE-TYPE static/structural
 *     trust (rights + wiring + cost); time-invariant.
 *
 * UNWIRED as of 2026-07: inputs require a telemetry-accrual layer that does not
 * yet exist; scoped as a future task.
 */

export type RightsStatus =
  | "approved"
  | "vendor_candidate"
  | "permission_required"
  | "blocked"
  | "excluded";

export type ReliabilityTier = "HIGH" | "MEDIUM" | "LOW" | "SUSPENDED";

export interface SourceReliabilityInput {
  readonly sourceId: string;
  /** Successful-fetch uptime over the window, 0–100. */
  readonly uptimePct: number;
  /** Age (minutes) of the freshest data from this source. */
  readonly freshnessMinutes: number;
  /** Expected freshness TTL (minutes). Default 120. */
  readonly maxFreshnessMinutes?: number;
  /** Schema unchanged this window (a break is a reliability hit). */
  readonly schemaStable: boolean;
  /** Agreement with other sources on overlapping facts, 0–1. */
  readonly agreementRate: number;
  readonly rightsStatus: RightsStatus;
  readonly latencyMs: number;
  /** Settlement losses traced to this source's bad data (downstream blast). */
  readonly settlementLossesAttributed: number;
}

export interface SourceReliability {
  readonly sourceId: string;
  readonly score: number; // 0–100
  readonly tier: ReliabilityTier;
  /** 0–1 penalty applied to the confidence of signals derived from this source. */
  readonly confidencePenalty: number;
  readonly flags: readonly string[];
  /** Only rights-clean, reliable sources may back a PUBLIC claim. */
  readonly usableForPublicClaims: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

const RIGHTS_OK: ReadonlySet<RightsStatus> = new Set(["approved"]);
const RIGHTS_HARD_STOP: ReadonlySet<RightsStatus> = new Set(["blocked", "excluded"]);

/**
 * Score a source's reliability. Rights hard-stops (blocked/excluded) force SUSPENDED
 * regardless of operational metrics — a source you can't legally use is not reliable.
 */
export function scoreSourceReliability(input: SourceReliabilityInput): SourceReliability {
  const maxFresh = input.maxFreshnessMinutes ?? 120;
  const flags: string[] = [];

  // Rights hard stop dominates everything.
  if (RIGHTS_HARD_STOP.has(input.rightsStatus)) {
    return {
      sourceId: input.sourceId,
      score: 0,
      tier: "SUSPENDED",
      confidencePenalty: 1,
      flags: [`rights ${input.rightsStatus}: unusable`],
      usableForPublicClaims: false,
    };
  }

  // Component sub-scores, 0–1.
  const uptime = clamp(input.uptimePct / 100, 0, 1);
  const freshness = input.freshnessMinutes <= maxFresh
    ? 1
    : clamp(1 - (input.freshnessMinutes - maxFresh) / maxFresh, 0, 1);
  const schema = input.schemaStable ? 1 : 0.4;
  const agreement = clamp(input.agreementRate, 0, 1);
  const latency = input.latencyMs <= 1000 ? 1 : clamp(1 - (input.latencyMs - 1000) / 4000, 0, 1);

  // Weighted blend (sums to 1).
  let raw =
    uptime * 0.3 +
    freshness * 0.25 +
    agreement * 0.2 +
    schema * 0.15 +
    latency * 0.1;

  // Downstream blast penalty: settlement losses traced to this source.
  const lossPenalty = clamp(input.settlementLossesAttributed * 0.05, 0, 0.5);
  raw = clamp(raw - lossPenalty, 0, 1);

  const score = Math.round(raw * 100);

  if (input.uptimePct < 90) flags.push("low uptime");
  if (input.freshnessMinutes > maxFresh) flags.push("stale");
  if (!input.schemaStable) flags.push("schema changed");
  if (input.agreementRate < 0.8) flags.push("disagrees with other sources");
  if (input.settlementLossesAttributed > 0) flags.push(`${input.settlementLossesAttributed} settlement loss(es) attributed`);
  if (!RIGHTS_OK.has(input.rightsStatus)) flags.push(`rights ${input.rightsStatus}: not public-usable`);

  const tier: ReliabilityTier =
    score >= 80 ? "HIGH" : score >= 50 ? "MEDIUM" : score >= 20 ? "LOW" : "SUSPENDED";

  // Confidence penalty grows as the score drops (1 - score/100), floored by tier.
  const confidencePenalty = Math.round((1 - raw) * 100) / 100;

  // Public claims require an APPROVED rights status AND at least MEDIUM reliability.
  const usableForPublicClaims = RIGHTS_OK.has(input.rightsStatus) && (tier === "HIGH" || tier === "MEDIUM");

  return { sourceId: input.sourceId, score, tier, confidencePenalty, flags, usableForPublicClaims };
}
