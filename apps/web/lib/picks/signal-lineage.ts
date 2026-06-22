/**
 * Signal Lineage Engine — the provenance chain behind every pick factor.
 *
 * The moat is "every number has a receipt." A pick's factors are no exception: each
 * one must show where it came from (source + tier), when it was captured, its rights
 * snapshot, its freshness, whether it was actually used or blocked, its honest
 * weakness, and which way it pushed the decision. This engine carries that lineage and
 * AUDITS it against the source-hierarchy law: only Tier 1/2 evidence may back a claim,
 * a rights-blocked source may not be active, and a "blocked" factor may not be used.
 * Pure, no I/O — it feeds the Proof Graph (claim → factor → source → snapshot).
 */

/** 1 Official · 2 Licensed · 3 Trusted secondary · 4 Market signal · 5 Community/weak · 6 Synthetic/AI. */
export type SourceTier = 1 | 2 | 3 | 4 | 5 | 6;

export type DecisionImpact = "raised" | "lowered" | "neutral";

export interface SignalFactor {
  readonly key: string; // e.g. "market.consensus", "context.atsForm"
  readonly label: string;
  readonly sourceId: string;
  readonly sourceTier: SourceTier;
  readonly capturedAt: string; // ISO
  /** Rights snapshot status captured at extraction time. */
  readonly rightsStatus: string;
  readonly freshnessMinutes: number;
  /** Whether the factor was actually used in the score. */
  readonly active: boolean;
  readonly blockedReason?: string | null;
  readonly weight: number;
  /** Honest stated weakness of this factor (never blank for an active factor). */
  readonly weakness: string;
  readonly decisionImpact: DecisionImpact;
}

export interface LineageVerdict {
  readonly factors: readonly SignalFactor[];
  readonly activeFactors: readonly SignalFactor[];
  readonly blockedFactors: readonly SignalFactor[];
  readonly maxActiveStaleMinutes: number;
  /** Worst (highest) tier among ACTIVE factors — must be ≤ 2 for a public claim. */
  readonly lowestActiveTier: SourceTier | null;
  /** True only when every lineage law holds for the ACTIVE set. */
  readonly publicSafe: boolean;
  readonly violations: readonly string[];
}

const RIGHTS_BLOCKED: ReadonlySet<string> = new Set(["blocked_technical_controls", "excluded", "permission_required"]);

/**
 * Audit a pick's factor lineage. The ACTIVE factors are what backs the pick, so the
 * laws apply to them: ≤ Tier 2, rights-clean, not contradictory (active + blocked),
 * and each carries an honest weakness.
 */
export function auditSignalLineage(factors: readonly SignalFactor[]): LineageVerdict {
  const violations: string[] = [];
  const active = factors.filter((f) => f.active);
  const blocked = factors.filter((f) => !f.active);

  for (const f of active) {
    // A factor that is marked active but carries a block reason is contradictory.
    if (f.blockedReason != null && f.blockedReason.trim() !== "") {
      violations.push(`${f.key}: active but carries a block reason ("${f.blockedReason}")`);
    }
    // Only Tier 1/2 evidence may back a claim.
    if (f.sourceTier > 2) {
      violations.push(`${f.key}: active at Tier ${f.sourceTier} — only Tier 1/2 may back a claim`);
    }
    // Rights-blocked sources may not be active.
    if (RIGHTS_BLOCKED.has(f.rightsStatus)) {
      violations.push(`${f.key}: active with rights status "${f.rightsStatus}"`);
    }
    // An active factor must state its weakness (glass-box honesty).
    if (f.weakness.trim() === "") {
      violations.push(`${f.key}: active factor must state its weakness`);
    }
  }

  const maxActiveStaleMinutes = active.reduce((m, f) => Math.max(m, f.freshnessMinutes), 0);
  const lowestActiveTier = active.length
    ? (Math.max(...active.map((f) => f.sourceTier)) as SourceTier)
    : null;

  return {
    factors,
    activeFactors: active,
    blockedFactors: blocked,
    maxActiveStaleMinutes,
    lowestActiveTier,
    publicSafe: violations.length === 0,
    violations,
  };
}
