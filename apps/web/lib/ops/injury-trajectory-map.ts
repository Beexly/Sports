/**
 * Pure mapping: stored `Injury` rows → `InjuryPracticeReport` for the real
 * trajectory analyzer.
 *
 * WHY THIS EXISTS AS ITS OWN MODULE. The trajectory analyzer
 * (`analyzeInjuryTrajectory`) takes a Wed/Thu/Fri practice sequence; the
 * `injuries` table stores a single latest snapshot per player-week. This
 * module makes the lossy mapping explicit and testable:
 * - `reportStatus` (Out/Doubtful/Questionable/…) → `officialStatus`
 * - `practiceStatus` free text → the FRIDAY slot only (the snapshot is the
 *   latest designation; Wed/Thu are left undefined rather than invented)
 * - `position` + depth-chart rank → `PlayerPositionTier`, conservatively:
 *   only a depthRank-1 player earns a leverage tier; everyone else is
 *   STARTER_OTHER. We do not know left vs right tackle, WR1 vs WR2, or
 *   CB1 vs CB2 from the injury row alone, so we do not claim them.
 *
 * The early-warning downgrade signal (FP→DNP within the week) cannot fire
 * from single-snapshot data; the analyzer reports it as false and the ops
 * route says so plainly.
 */

import type {
  InjuryPracticeReport,
  OfficialGameStatus,
  PlayerPositionTier,
} from "@sports/prediction-engine";

export interface InjuryRowLike {
  reportStatus: string | null;
  practiceStatus: string | null;
  position: string | null;
}

export function mapReportStatus(raw: string | null | undefined): OfficialGameStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("out") && !s.includes("doubt")) return "OUT";
  if (s.includes("doubt")) return "DOUBTFUL";
  if (s.includes("question")) return "QUESTIONABLE";
  if (s.includes("active")) return "ACTIVE";
  return "NONE";
}

export function mapPracticeStatus(raw: string | null | undefined): InjuryPracticeReport["friday"] {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return undefined;
  if (s.includes("did not participate") || s === "dnp" || s.includes("did not practice")) return "DNP";
  if (s.includes("nir") || s.includes("not injury related") || s.includes("rest") || s.includes("veteran")) return "DNP_NIR";
  if (s.includes("limited") || s === "lp") return "LP";
  if (s.includes("full") || s === "fp") return "FP";
  return undefined;
}

/**
 * Conservative tier mapping. `depthRankOne` must come from the depth chart
 * (depthRank === 1); without it every player is STARTER_OTHER.
 */
export function mapPositionTier(
  position: string | null | undefined,
  depthRankOne: boolean,
): PlayerPositionTier {
  const pos = (position ?? "").toUpperCase().trim();
  if (!depthRankOne) return "STARTER_OTHER";
  if (pos === "QB") return "QB_STARTER";
  if (pos === "WR") return "WR1_ELITE";
  if (pos === "RB" || pos === "HB") return "RB_BELLCOW";
  if (pos === "CB" || pos === "DB") return "CB_SHUTDOWN";
  // OL/DL/LB/TE/S and everyone else: the table cannot prove the leverage
  // role (LT vs RT, edge vs interior), so no leverage tier is claimed.
  return "STARTER_OTHER";
}

export function toInjuryPracticeReport(
  row: InjuryRowLike,
  depthRankOne: boolean,
): InjuryPracticeReport {
  return {
    // Single snapshot → Friday slot only. Wed/Thu stay undefined; the
    // analyzer treats missing days as unknown, not as FP.
    friday: mapPracticeStatus(row.practiceStatus),
    officialStatus: mapReportStatus(row.reportStatus),
    positionTier: mapPositionTier(row.position, depthRankOne),
  };
}
