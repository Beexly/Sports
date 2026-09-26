/**
 * Shared types for the frozen-holdout harness (LAST_PLAN §4.2).
 *
 * The input artifact is a JSON export written by the calibration-metrics cron
 * beside holdout-ranking-report.json. Agents never touch the DB (law 7); the
 * export is the only channel. Shape is defined here even when the file does
 * not exist yet — fixtures exercise every path.
 */

import type { CalibrationVerdict } from "./calibration";
import type { Decision } from "./integrity";

/** How a candidate's Brier gap to the market decomposes. */
export type CalibrationDiagnosis = CalibrationVerdict["diagnosis"];

/** How a cluster-level comparison should be reported. */
export type ClusterVerdict = Decision["verdict"];

/** Frozen holdout identifiers. Never edited without a new ID. */
export type HoldoutId = "PICKS-H1" | "NFL-H2";

/** Settled published pick row as carried by verifier/picks-h1.json. */
export type HoldoutPickRow = {
  readonly id: string;
  /** Sport key, e.g. "NFL", "MLB". */
  readonly sport: string;
  /** Market key, e.g. "MONEYLINE", "SPREAD", "TOTAL". */
  readonly market: string;
  /** Settled outcome of the picked side: 1 = win/cover/over, 0 = loss. */
  readonly outcome: 0 | 1;
  /** Market's fair probability of the picked side (de-vigged). */
  readonly marketFairProb: number;
  /**
   * Model probability of the picked side at publish time, when the version
   * stored one. Null when the version only stored confidence.
   */
  readonly modelProb: number | null;
  /** 0–100 Edge Index. Not a probability (C-28); never scored as one. */
  readonly confidence: number | null;
  readonly modelVersion: string;
  readonly generatedAt: string;
  readonly isFounder: boolean;
  readonly isPublished: boolean;
  readonly isSettled: boolean;
  /** Optional league season for NFL-H2 era splits. */
  readonly season?: number | null;
};

/** Top-level export document. */
export type PicksH1Export = {
  readonly holdoutId: HoldoutId;
  readonly generatedAt: string;
  readonly schemaVersion: 1;
  readonly rows: readonly HoldoutPickRow[];
  /** Optional free-text provenance (cron run id, commit sha). */
  readonly source?: string;
};

/** One scored forecast vs its outcome. */
export type ScoredRow = {
  readonly p: number;
  readonly y: 0 | 1;
  readonly sport: string;
  readonly market: string;
  readonly modelVersion: string;
  readonly id: string;
};

/** Candidate vs baseline comparison on identical rows. */
export type Scorecard = {
  readonly n: number;
  readonly candidateBrier: number;
  readonly marketBrier: number;
  readonly deltaBrier: number;
  readonly candidateLogLoss: number;
  readonly marketLogLoss: number;
  readonly deltaLogLoss: number;
  /** Paired-bootstrap P(candidate Brier < market Brier). */
  readonly pBetter: number;
  readonly pBetterResamples: number;
  readonly pBetterSeed: number;
  readonly bySport: readonly SportStratum[];
  readonly wilson: WilsonBand | null;
  /**
   * Calibration diagnostics, reported for BOTH arms against the market
   * (arXiv:2607.00164). Brier alone cannot tell a resolution-limited model from
   * a badly calibrated one, and the two call for opposite responses, so the
   * scorecard now says which one it is in `calibrationDiagnosis`.
   */
  readonly candidateEce: number;
  readonly marketEce: number;
  readonly candidateMce: number;
  readonly marketMce: number;
  readonly candidateResolution: number;
  readonly marketResolution: number;
  /** Ten equal-width bins; see DEFAULT_CALIBRATION_BINS. */
  readonly calibrationBins: number;
  readonly calibrationDiagnosis: CalibrationDiagnosis;
  /**
   * Cluster-level verdict from a game-level bootstrap (arXiv:2604.01491), or
   * null when the export carries no cluster key. Never silently omitted:
   * `clusterNote` says which case this is.
   */
  readonly clusterVerdict: ClusterVerdict;
  readonly clusterNote: string;
  readonly harnessOk: boolean;
  readonly harnessNote: string;
};

export type SportStratum = {
  readonly sport: string;
  readonly n: number;
  readonly candidateBrier: number;
  readonly marketBrier: number;
  readonly deltaBrier: number;
  readonly pBetter: number;
};

export type WilsonBand = {
  readonly successes: number;
  readonly n: number;
  readonly point: number;
  readonly low: number;
  readonly high: number;
  readonly z: number;
};

/** Duel: candidate model vs market-anchored baseline (L11 precondition). */
export type DuelResult = {
  readonly holdoutId: HoldoutId;
  readonly candidateLabel: string;
  readonly baselineLabel: string;
  readonly scorecard: Scorecard;
  /** True when candidate ΔBrier < 0 AND P(better) ≥ 0.75 (keep rule). */
  readonly passesKeepRule: boolean;
  readonly keepRule: string;
};

/** Joint-factor row: market logit + one added factor. */
export type JointRow = {
  readonly outcome: 0 | 1;
  readonly marketFairProb: number;
  /** Pre-registered factor value; null when missing (row dropped). */
  readonly factor: number | null;
  readonly era: "discover" | "validate";
  readonly sport: string;
  readonly id: string;
};

export type JointResult = {
  readonly factorId: string;
  readonly nDiscover: number;
  readonly nValidate: number;
  readonly marketOnlyBrierValidate: number;
  readonly withFactorBrierValidate: number;
  readonly deltaBrier: number;
  readonly pBetter: number;
  readonly factorCoefDiscover: number;
  readonly factorCoefValidate: number;
  readonly signAgrees: boolean;
  readonly status: "CANDIDATE" | "DEAD" | "INSUFFICIENT";
  readonly keepRule: string;
  readonly reason: string;
};

/** Factor YAML spec (docs/factors/<id>.yaml) — §4.1. */
export type FactorSpec = {
  readonly id: string;
  readonly title: string;
  readonly hypothesis: string;
  readonly estimand: string;
  readonly unit: string;
  readonly data: readonly string[];
  readonly discover_era: string;
  readonly validate_era: string;
  readonly kill_line: string;
  readonly mde_80pct_power: number | null;
  readonly script: string;
  readonly status: "UNTESTED" | "CANDIDATE" | "LIVE" | "DEAD" | "BLOCKED";
  readonly number: number | null;
  readonly ci: readonly [number, number] | null;
  readonly n: number | null;
  readonly run_sha: string | null;
  readonly run_at: string | null;
  readonly blocked_on: string | null;
  readonly notes: string;
};

/** Mint-log entry for a held pick (replaces gate_decisions, D14). */
export type MintLogEntry = {
  readonly pickId: string;
  readonly holdoutId: HoldoutId;
  readonly decision: "held" | "published";
  readonly reason: string;
  readonly modelVersion: string;
  readonly generatedAt: string;
  readonly loggedAt: string;
};
