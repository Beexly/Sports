/**
 * Calibration ladder state loader.
 *
 * Loads settled canonical picks and runs buildCalibrationLadder() to surface
 * the path-to-70 Step 1 activation status on the public /performance page.
 * Pure read — no writes, no model changes.
 */

import { db } from "@sports/db";
import {
  buildCalibrationLadder,
  DEFAULT_LADDER_MIN_SAMPLE,
  getReadinessGates,
} from "@sports/prediction-engine";
import type { CalibrationSample } from "@sports/prediction-engine";

export interface CalibrationLadderState {
  /** Whether the public stats gate is open. */
  gateOpen: boolean;
  /** Number of settled canonical picks that contribute. */
  settledCount: number;
  /** Minimum required to activate. */
  minSample: number;
  /** Whether the ladder found a method that beats identity on held-out data. */
  isActive: boolean;
  /** Selected calibration method, or "identity" when inactive. */
  method: string;
  /** Held-out ECE for each method (identity baseline is always present). */
  heldOutEce: Record<string, number>;
  /** Wilson lower bound at confidence = 70 (the defensible 70-tier floor). */
  wilsonFloor70: number | null;
  /** Wilson lower bound at confidence = 65. */
  wilsonFloor65: number | null;
}

export async function loadCalibrationLadderState(): Promise<CalibrationLadderState> {
  const gates = getReadinessGates();
  const minSample = DEFAULT_LADDER_MIN_SAMPLE;

  if (!gates.canExposePerformanceStats) {
    const bootstrap = buildCalibrationLadder([]);
    return {
      gateOpen: false,
      settledCount: 0,
      minSample,
      isActive: false,
      method: "identity",
      heldOutEce: bootstrap.heldOutEce,
      wilsonFloor70: null,
      wilsonFloor65: null,
    };
  }

  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS"] },
      signalSnapshot: { is: { eligibleForLearning: true } },
      NOT: { modelVersion: "v5.0.0-seed" },
    },
    select: { confidence: true, result: true },
    orderBy: { settledAt: "asc" },
    take: 500,
  });

  const samples: CalibrationSample[] = picks.map((p: { confidence: number; result: string }) => ({
    p: p.confidence / 100,
    y: (p.result === "WIN" ? 1 : 0) as 0 | 1,
  }));

  const ladder = buildCalibrationLadder(samples);

  return {
    gateOpen: true,
    settledCount: samples.length,
    minSample,
    isActive: ladder.isActive,
    method: ladder.method,
    heldOutEce: ladder.heldOutEce,
    wilsonFloor70: ladder.lowerBound(70),
    wilsonFloor65: ladder.lowerBound(65),
  };
}
