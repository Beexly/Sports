/**
 * Settlement → learning loop (pure).
 *
 * Converts settled outcomes into calibration-safe training signals without
 * applying any model update. Self-correcting systems learn from grades;
 * they do not silently mutate MODEL_VERSION.
 *
 * Law: no invented outcomes · learning off until floors · refuse public claims.
 */

export type GradedSettlement = {
  readonly pickId: string;
  readonly sportKey: string;
  readonly pickType: string;
  readonly modelVersion: string;
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly confirmation: "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED" | "UNKNOWN";
  readonly modelEdge: number | null;
  readonly clv: number | null;
  readonly settledAtIso: string;
};

export type LearningSample = {
  readonly pickId: string;
  readonly sportKey: string;
  readonly pickType: string;
  readonly modelVersion: string;
  /** 1 win, 0 loss; pushes/voids excluded from binary series. */
  readonly y: 0 | 1 | null;
  readonly modelEdge: number | null;
  readonly clv: number | null;
  readonly trustWeight: number;
  readonly eligibleForCalibration: boolean;
  readonly excludeReason: string | null;
};

export type LearningBatchReport = {
  readonly nInput: number;
  readonly nEligible: number;
  readonly nExcluded: number;
  readonly winRateEligible: number | null;
  readonly meanClvEligible: number | null;
  readonly bySport: Readonly<Record<string, { n: number; wins: number }>>;
  readonly byModel: Readonly<Record<string, { n: number; wins: number }>>;
  readonly samples: readonly LearningSample[];
  readonly directives: readonly string[];
};

const TRUST_WEIGHT: Record<GradedSettlement["confirmation"], number> = {
  CONFIRMED: 1,
  SINGLE_SOURCE: 0.7,
  DISPUTED: 0,
  UNKNOWN: 0.5,
};

/**
 * Map graded settlements into learning samples. PUSH/VOID never enter y.
 * DISPUTED never eligible. SINGLE_SOURCE down-weighted, still eligible for
 * offline analysis (not for silent online apply).
 */
export function settlementsToLearningSamples(
  rows: readonly GradedSettlement[],
): LearningSample[] {
  return rows.map((r) => {
    let y: 0 | 1 | null = null;
    let excludeReason: string | null = null;
    let eligible = true;

    if (r.result === "PUSH" || r.result === "VOID") {
      y = null;
      eligible = false;
      excludeReason = `result_${r.result.toLowerCase()}`;
    } else if (r.result === "WIN") {
      y = 1;
    } else if (r.result === "LOSS") {
      y = 0;
    }

    if (r.confirmation === "DISPUTED") {
      eligible = false;
      excludeReason = "disputed_confirmation";
    }

    if (r.modelVersion.toLowerCase().includes("seed") || r.modelVersion.toLowerCase().includes("bootstrap")) {
      eligible = false;
      excludeReason = "bootstrap_or_seed_model";
    }

    return {
      pickId: r.pickId,
      sportKey: r.sportKey,
      pickType: r.pickType,
      modelVersion: r.modelVersion,
      y,
      modelEdge: r.modelEdge,
      clv: r.clv,
      trustWeight: TRUST_WEIGHT[r.confirmation],
      eligibleForCalibration: eligible && y !== null,
      excludeReason: eligible && y !== null ? null : excludeReason ?? "ineligible",
    };
  });
}

export function summarizeLearningBatch(samples: readonly LearningSample[]): LearningBatchReport {
  const eligible = samples.filter((s) => s.eligibleForCalibration && s.y !== null);
  const nInput = samples.length;
  const nEligible = eligible.length;
  const nExcluded = nInput - nEligible;

  let wins = 0;
  let clvSum = 0;
  let clvN = 0;
  const bySport: Record<string, { n: number; wins: number }> = {};
  const byModel: Record<string, { n: number; wins: number }> = {};

  for (const s of eligible) {
    const w = s.y === 1 ? 1 : 0;
    wins += w;
    if (s.clv !== null && Number.isFinite(s.clv)) {
      clvSum += s.clv;
      clvN += 1;
    }
    bySport[s.sportKey] = bySport[s.sportKey] ?? { n: 0, wins: 0 };
    bySport[s.sportKey]!.n += 1;
    bySport[s.sportKey]!.wins += w;
    byModel[s.modelVersion] = byModel[s.modelVersion] ?? { n: 0, wins: 0 };
    byModel[s.modelVersion]!.n += 1;
    byModel[s.modelVersion]!.wins += w;
  }

  const directives: string[] = [];
  if (nEligible < 20) {
    directives.push("sample_floor — need ≥20 eligible settled binary outcomes before any calibration proposal.");
  }
  if (nEligible >= 20 && nEligible < 100) {
    directives.push("accumulate_toward_100 — PROVEN ladder step still closed; keep free settle draining.");
  }
  if (nEligible >= 100) {
    directives.push(
      "eligible_for_offline_calibration_export — run export:settled-picks; do NOT enable CALIBRATION_ADJUSTMENTS without held-out proof.",
    );
  }
  directives.push("never_apply_online_without_MODEL_VERSION_activation_receipt");

  return {
    nInput,
    nEligible,
    nExcluded,
    winRateEligible: nEligible > 0 ? wins / nEligible : null,
    meanClvEligible: clvN > 0 ? clvSum / clvN : null,
    bySport,
    byModel,
    samples,
    directives,
  };
}

/**
 * Self-correction signal: if SINGLE_SOURCE share is high, improve dual-source
 * coverage rather than trusting the record for public claims.
 */
export function sourceTrustDirective(
  rows: readonly GradedSettlement[],
): { singleSourceShare: number; directive: string } {
  if (rows.length === 0) {
    return { singleSourceShare: 0, directive: "no_settlements_yet" };
  }
  const single = rows.filter((r) => r.confirmation === "SINGLE_SOURCE").length;
  const share = single / rows.length;
  const directive =
    share > 0.4
      ? "high_single_source_share — expand secondary score feeds before public performance claims"
      : "source_mix_acceptable_for_offline_learning";
  return { singleSourceShare: share, directive };
}
