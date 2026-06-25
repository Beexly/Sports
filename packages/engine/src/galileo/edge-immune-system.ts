/**
 * GSE GALILEO — Edge Immune System (Invention 9).
 *
 * Every candidate is presumed a fake edge until it survives attack. Ten adversarial
 * prosecutors each try to KILL the candidate on a specific failure mode the prior session
 * learned the hard way: leakage, thin sample, no FDR, no settlement, CLV-only, unchecked
 * liquidity, single-season, dirty data, bare-trend simplicity, and efficient-market priors.
 *
 * Each returns PASS / WARNING / FAIL with a reason and the required next test. A single FAIL
 * caps the candidate at WATCHLIST — it may not advance until the prosecutor is satisfied. This
 * is the structural enforcement of "no candidate moves beyond WATCHLIST unless it survives
 * review." Pure + deterministic.
 */

import type { EdgeCandidate } from "../market-physics/edge-ledger.js";

export type ProsecutorVerdict = "PASS" | "WARNING" | "FAIL";

export type ProsecutorName =
  | "LeakageProsecutor"
  | "SampleSizeProsecutor"
  | "FDRProsecutor"
  | "SettlementProsecutor"
  | "CLVProsecutor"
  | "LiquidityProsecutor"
  | "SeasonalityProsecutor"
  | "DataQualityProsecutor"
  | "SimplicityProsecutor"
  | "MarketEfficiencyProsecutor";

export interface ProsecutorResult {
  readonly prosecutor: ProsecutorName;
  readonly verdict: ProsecutorVerdict;
  readonly reason: string;
  readonly requiredNextTest: string | null;
}

/** A candidate plus the structural context the immune system needs. */
export interface ImmuneCandidate extends EdgeCandidate {
  /** Is there a structural market-incoherence reason (not a bare historical trend)? */
  readonly incoherenceBasis?: boolean;
  readonly marketEfficiencyClass?: "efficient_main" | "soft_secondary" | "unknown";
  readonly leakageSuspected?: boolean;
}

export interface ImmuneOptions {
  readonly minSample?: number;
}

type Prosecutor = (c: ImmuneCandidate, o: Required<ImmuneOptions>) => ProsecutorResult;

const PROSECUTORS: Prosecutor[] = [
  (c) => ({
    prosecutor: "LeakageProsecutor",
    ...(c.futureContamination || c.leakageSuspected
      ? { verdict: "FAIL" as const, reason: "Future-game contamination or leakage suspected.", requiredNextTest: "Rebuild features with strict pre-decision timestamps; re-run." }
      : { verdict: "PASS" as const, reason: "No leakage indicators.", requiredNextTest: null }),
  }),
  (c, o) => ({
    prosecutor: "SampleSizeProsecutor",
    ...(c.sampleSize < o.minSample
      ? { verdict: "FAIL" as const, reason: `Sample ${c.sampleSize} < ${o.minSample}.`, requiredNextTest: "Collect more settled observations." }
      : c.sampleSize < 2 * o.minSample
        ? { verdict: "WARNING" as const, reason: `Sample ${c.sampleSize} is modest.`, requiredNextTest: "Widen the window to tighten the CI." }
        : { verdict: "PASS" as const, reason: `Sample ${c.sampleSize}.`, requiredNextTest: null }),
  }),
  (c) => ({
    prosecutor: "FDRProsecutor",
    ...(c.fdr === "fail"
      ? { verdict: "FAIL" as const, reason: "Did not survive FDR control.", requiredNextTest: "Re-pre-register; control the family." }
      : c.fdr === "not_run"
        ? { verdict: "WARNING" as const, reason: "FDR not run.", requiredNextTest: "Run Benjamini-Hochberg over the tested family." }
        : { verdict: "PASS" as const, reason: "Survived FDR.", requiredNextTest: null }),
  }),
  (c) => ({
    prosecutor: "SettlementProsecutor",
    ...(c.settlement === "fail"
      ? { verdict: "FAIL" as const, reason: "Settlement-negative (lost vs real outcomes).", requiredNextTest: "Reject; do not promote." }
      : c.settlement === "not_run"
        ? { verdict: "WARNING" as const, reason: "Settlement unproven.", requiredNextTest: "Settle picks vs real outcomes ≥52.4%." }
        : { verdict: "PASS" as const, reason: "Settles profitably.", requiredNextTest: null }),
  }),
  (c) => ({
    prosecutor: "CLVProsecutor",
    ...(c.clv === "pass" && c.settlement !== "pass"
      ? { verdict: "WARNING" as const, reason: "CLV-only — leading indicator, not proven profit.", requiredNextTest: "Convert CLV to a settlement result." }
      : { verdict: "PASS" as const, reason: c.clv === "pass" ? "CLV positive and settlement-backed." : "CLV not the sole basis.", requiredNextTest: null }),
  }),
  (c) => ({
    prosecutor: "LiquidityProsecutor",
    ...(c.liquidityChecked
      ? { verdict: "PASS" as const, reason: "Liquidity verified.", requiredNextTest: null }
      : { verdict: "WARNING" as const, reason: "Real limits not verified.", requiredNextTest: "Confirm usable limits at the edge price." }),
  }),
  (c) => ({
    prosecutor: "SeasonalityProsecutor",
    ...(c.seasonsCovered < 2
      ? { verdict: "FAIL" as const, reason: `Only ${c.seasonsCovered} season(s).`, requiredNextTest: "Replicate on a different season." }
      : c.seasonsCovered < 3
        ? { verdict: "WARNING" as const, reason: "Two seasons — replication thin.", requiredNextTest: "Add a third season / out-of-weeks test." }
        : { verdict: "PASS" as const, reason: `${c.seasonsCovered} seasons.`, requiredNextTest: null }),
  }),
  (c) => ({
    prosecutor: "DataQualityProsecutor",
    ...(c.dataQualityClean
      ? { verdict: "PASS" as const, reason: "Data-quality clean.", requiredNextTest: null }
      : { verdict: "FAIL" as const, reason: "Data-quality issue present.", requiredNextTest: "Fix the data bug; re-run before any promotion." }),
  }),
  (c) => ({
    prosecutor: "SimplicityProsecutor",
    ...(c.incoherenceBasis
      ? { verdict: "PASS" as const, reason: "Backed by a structural market incoherence.", requiredNextTest: null }
      : { verdict: "FAIL" as const, reason: "Bare historical trend with no structural reason the market is wrong.", requiredNextTest: "Supply a market-incoherence basis (no angle-mining)." }),
  }),
  (c) => ({
    prosecutor: "MarketEfficiencyProsecutor",
    ...(c.marketEfficiencyClass === "soft_secondary"
      ? { verdict: "PASS" as const, reason: "Softer secondary market — plausible mispricing.", requiredNextTest: null }
      : c.marketEfficiencyClass === "efficient_main"
        ? { verdict: "WARNING" as const, reason: "Most-efficient main market — strong prior of no edge.", requiredNextTest: "Need a specific microstructure reason (stale/contradiction), not a level view." }
        : { verdict: "WARNING" as const, reason: "Market efficiency class unknown.", requiredNextTest: "Classify the market's efficiency." }),
  }),
];

export interface ImmuneReview {
  readonly candidateId: string;
  readonly results: readonly ProsecutorResult[];
  readonly fails: readonly ProsecutorName[];
  readonly warnings: readonly ProsecutorName[];
  readonly survives: boolean;
  /** If it does not survive, the candidate is capped here until prosecutors are satisfied. */
  readonly cappedStatus: "WATCHLIST" | null;
  readonly requiredNextTests: readonly string[];
}

/** Run all ten prosecutors. A single FAIL caps the candidate at WATCHLIST. */
export function runImmuneReview(c: ImmuneCandidate, options: ImmuneOptions = {}): ImmuneReview {
  const o = { minSample: options.minSample ?? 100 };
  const results = PROSECUTORS.map((p) => p(c, o));
  const fails = results.filter((r) => r.verdict === "FAIL").map((r) => r.prosecutor);
  const warnings = results.filter((r) => r.verdict === "WARNING").map((r) => r.prosecutor);
  const survives = fails.length === 0;
  return {
    candidateId: c.candidateId,
    results,
    fails,
    warnings,
    survives,
    cappedStatus: survives ? null : "WATCHLIST",
    requiredNextTests: results.map((r) => r.requiredNextTest).filter((t): t is string => !!t),
  };
}
