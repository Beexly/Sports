/**
 * RumorQuarantine — separate known facts from rumor, contradiction, and expiry.
 *
 * From the research dark-corner inventory. Keeps Twitter/noise from entering the model as
 * if it were evidence. Every incoming claim is classified into one of six states; anything
 * not cleanly `known`/`reported` is quarantined and must NOT influence a decision. The
 * result feeds the genome's `evidence.rumorQuarantined`. Pure, no I/O — fail-safe: when in
 * doubt, quarantine.
 */

export type RumorStatus = "known" | "reported" | "rumored" | "contradicted" | "expired" | "unsafe";

export type ClaimSourceTier = "official" | "tier1" | "tier2" | "rumor" | "unknown";

export interface RumorInput {
  readonly sourceTier: ClaimSourceTier;
  /** Count of INDEPENDENT corroborating sources (use ClaimIndependenceIndex upstream). */
  readonly independentCorroborations: number;
  /** A more-authoritative source contradicts this claim. */
  readonly contradicted: boolean;
  readonly ageMinutes: number;
  /** Time-to-live; past it the claim is expired. */
  readonly ttlMinutes: number;
  /** Rights cleared for use. */
  readonly rightsCleared: boolean;
}

export interface RumorVerdict {
  readonly status: RumorStatus;
  /** True when the claim must not influence a decision. */
  readonly quarantined: boolean;
  readonly reason: string;
}

const QUARANTINED_STATES: ReadonlySet<RumorStatus> = new Set(["rumored", "contradicted", "expired", "unsafe"]);

/**
 * Classify a claim. Precedence (most disqualifying first): rights → contradiction →
 * expiry → source quality. Only an official source, or a tier-1/2 source with ≥2
 * independent corroborations, clears as usable.
 */
export function classifyRumor(input: RumorInput): RumorVerdict {
  const verdict = (status: RumorStatus, reason: string): RumorVerdict => ({
    status,
    quarantined: QUARANTINED_STATES.has(status),
    reason,
  });

  if (!input.rightsCleared) return verdict("unsafe", "Rights not cleared — unsafe to use.");
  if (input.contradicted) return verdict("contradicted", "A more-authoritative source contradicts this claim.");
  if (input.ageMinutes > input.ttlMinutes) return verdict("expired", `Claim is ${input.ageMinutes}m old (TTL ${input.ttlMinutes}m).`);

  if (input.sourceTier === "official") return verdict("known", "Official source.");
  if ((input.sourceTier === "tier1" || input.sourceTier === "tier2") && input.independentCorroborations >= 2) {
    return verdict("reported", `Tier-${input.sourceTier === "tier1" ? "1" : "2"} source with ${input.independentCorroborations} independent corroborations.`);
  }
  if (input.sourceTier === "rumor" || input.sourceTier === "unknown") {
    return verdict("rumored", "Rumor/unknown-tier source — quarantine until corroborated.");
  }
  return verdict("rumored", `Insufficient corroboration (${input.independentCorroborations}) for a tier-${input.sourceTier} claim.`);
}

/** Convenience: is this claim safe to feed a decision as evidence? */
export function isUsableEvidence(input: RumorInput): boolean {
  return !classifyRumor(input).quarantined;
}
