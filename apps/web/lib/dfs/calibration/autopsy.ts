/**
 * Phase 10: Post-slate autopsy and model calibration.
 *
 * Compares projected vs actual points and ownership for every player in a slate,
 * computes MAE / RMSE / bias / Pearson-r, and persists DfsAutopsy + DfsCalibrationResult
 * rows so future projections can learn from past errors.
 */

import { db } from "@sports/db";
import { $Enums } from "@sports/db";

// ── Input / output types ────────────────────────────────────────────────────

export interface SlatePlayerResult {
  name: string;
  team: string;
  position: string;
  projectedPoints: number;
  actualPoints: number;
  projectedOwnership: number; // 0–1
  actualOwnership: number; // 0–1
  sourceNames?: string[];
  narrativeType?: string;
  stackWorked?: boolean;
  stackDescription?: string;
}

export interface AutopsyInput {
  slateId: string;
  modelVersion: string;
  sport?: string;
  playerResults: SlatePlayerResult[];
}

export interface PlayerAutopsyRecord {
  name: string;
  team: string;
  position: string;
  projectedPoints: number;
  actualPoints: number;
  projectionError: number; // actual − projected (negative = over-projected)
  projectionErrorPct: number;
  projectedOwnership: number;
  actualOwnership: number;
  ownershipError: number;
  category: $Enums.DfsAutopsyCategory;
  lessonLearned: string;
}

export interface CalibrationMetrics {
  projectionMae: number;
  projectionRmse: number;
  projectionBias: number;
  projectionCorrelation: number;
  ownershipMae: number;
  ownershipBias: number;
  ownershipCorrelation: number;
  sampleSize: number;
}

export interface AutopsyOutput {
  slateId: string;
  modelVersion: string;
  playerRecords: PlayerAutopsyRecord[];
  calibration: CalibrationMetrics;
}

// ── Stats helpers ───────────────────────────────────────────────────────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dxSq = 0;
  let dySq = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    num += dx * dy;
    dxSq += dx * dx;
    dySq += dy * dy;
  }
  const denom = Math.sqrt(dxSq * dySq);
  return denom === 0 ? 0 : num / denom;
}

// ── Category classification ─────────────────────────────────────────────────

function categorize(r: SlatePlayerResult): $Enums.DfsAutopsyCategory {
  const projErr = r.actualPoints - r.projectedPoints; // + = outperformed
  const ownErr = r.actualOwnership - r.projectedOwnership; // + = over-owned vs. expectation

  const largeMiss = Math.abs(projErr) > 6;
  const largeOwnMiss = Math.abs(ownErr) > 0.1;

  // Good process = projection was within ±6 pts
  const goodProcess = !largeMiss;

  if (goodProcess && projErr >= 0)
    return $Enums.DfsAutopsyCategory.GOOD_PROCESS_GOOD_OUTCOME;
  if (goodProcess && projErr < 0)
    return $Enums.DfsAutopsyCategory.GOOD_PROCESS_BAD_OUTCOME;

  // Bad process paths
  if (!goodProcess && projErr > 6 && ownErr < 0)
    return $Enums.DfsAutopsyCategory.LUCKY; // outperformed AND was contrarian

  if (!goodProcess && projErr > 6)
    return $Enums.DfsAutopsyCategory.BAD_PROCESS_GOOD_OUTCOME;

  if (largeOwnMiss && largeMiss)
    return $Enums.DfsAutopsyCategory.OWNERSHIP_MISREAD;

  if (largeMiss && projErr < 0) return $Enums.DfsAutopsyCategory.PROJECTION_MISS;

  return $Enums.DfsAutopsyCategory.BAD_PROCESS_BAD_OUTCOME;
}

function lessonFor(
  r: SlatePlayerResult,
  cat: $Enums.DfsAutopsyCategory
): string {
  const err = r.actualPoints - r.projectedPoints;
  const over = err < 0;
  switch (cat) {
    case $Enums.DfsAutopsyCategory.GOOD_PROCESS_GOOD_OUTCOME:
      return `Projection of ${r.projectedPoints.toFixed(1)} was accurate; ${r.name} delivered ${r.actualPoints.toFixed(1)} pts.`;
    case $Enums.DfsAutopsyCategory.GOOD_PROCESS_BAD_OUTCOME:
      return `Process was sound but ${r.name} underperformed by ${Math.abs(err).toFixed(1)} pts — variance, not a model error.`;
    case $Enums.DfsAutopsyCategory.BAD_PROCESS_GOOD_OUTCOME:
      return `${r.name} outperformed by ${err.toFixed(1)} pts despite a poor projection — review assumptions.`;
    case $Enums.DfsAutopsyCategory.LUCKY:
      return `${r.name} was a contrarian dart that hit (+${err.toFixed(1)} pts). Confirm volume/efficiency signals before crediting the model.`;
    case $Enums.DfsAutopsyCategory.PROJECTION_MISS:
      return `${over ? "Over" : "Under"}-projected ${r.name} by ${Math.abs(err).toFixed(1)} pts. Audit input signals for this player.`;
    case $Enums.DfsAutopsyCategory.OWNERSHIP_MISREAD:
      return `Ownership model was off by ${((r.actualOwnership - r.projectedOwnership) * 100).toFixed(1)}pp for ${r.name}. Recalibrate field-ownership inputs.`;
    case $Enums.DfsAutopsyCategory.BAD_PROCESS_BAD_OUTCOME:
      return `Both projection and outcome were poor for ${r.name}. Full audit of this player's signal chain recommended.`;
    default:
      return `Review ${r.name}'s signals for this slate.`;
  }
}

// ── Core engine ─────────────────────────────────────────────────────────────

export function computeAutopsy(input: AutopsyInput): AutopsyOutput {
  const { slateId, modelVersion, playerResults } = input;

  const playerRecords: PlayerAutopsyRecord[] = playerResults.map((r) => {
    const projectionError = r.actualPoints - r.projectedPoints;
    const projectionErrorPct =
      r.projectedPoints !== 0
        ? (projectionError / r.projectedPoints) * 100
        : 0;
    const ownershipError = r.actualOwnership - r.projectedOwnership;
    const category = categorize(r);
    const lessonLearned = lessonFor(r, category);

    return {
      name: r.name,
      team: r.team,
      position: r.position,
      projectedPoints: r.projectedPoints,
      actualPoints: r.actualPoints,
      projectionError,
      projectionErrorPct,
      projectedOwnership: r.projectedOwnership,
      actualOwnership: r.actualOwnership,
      ownershipError,
      category,
      lessonLearned,
    };
  });

  const projErrors = playerRecords.map((r) => r.projectionError);
  const projProjected = playerResults.map((r) => r.projectedPoints);
  const projActual = playerResults.map((r) => r.actualPoints);
  const ownErrors = playerRecords.map((r) => r.ownershipError);
  const ownProjected = playerResults.map((r) => r.projectedOwnership);
  const ownActual = playerResults.map((r) => r.actualOwnership);

  const calibration: CalibrationMetrics = {
    projectionMae:
      mean(projErrors.map((e) => Math.abs(e))),
    projectionRmse: Math.sqrt(mean(projErrors.map((e) => e * e))),
    projectionBias: mean(projErrors), // positive = we under-projected
    projectionCorrelation: pearsonR(projProjected, projActual),
    ownershipMae: mean(ownErrors.map((e) => Math.abs(e))),
    ownershipBias: mean(ownErrors),
    ownershipCorrelation: pearsonR(ownProjected, ownActual),
    sampleSize: playerResults.length,
  };

  return { slateId, modelVersion, playerRecords, calibration };
}

// ── DB persistence ──────────────────────────────────────────────────────────

export async function runAutopsy(input: AutopsyInput): Promise<AutopsyOutput> {
  const output = computeAutopsy(input);

  await db.$transaction(async (tx) => {
    // Upsert per-player autopsy records
    await tx.dfsAutopsy.createMany({
      data: output.playerRecords.map((r) => ({
        slateId: output.slateId,
        playerName: r.name,
        team: r.team,
        position: r.position,
        projectedPoints: r.projectedPoints,
        actualPoints: r.actualPoints,
        projectionError: r.projectionError,
        projectionErrorPct: r.projectionErrorPct,
        projectedOwnership: r.projectedOwnership,
        actualOwnership: r.actualOwnership,
        ownershipError: r.ownershipError,
        autopsyCategory: r.category,
        lessonLearned: r.lessonLearned,
        recordedAt: new Date(),
      })),
    });

    // Persist calibration result
    await tx.dfsCalibrationResult.create({
      data: {
        slateId: output.slateId,
        modelVersion: output.modelVersion,
        sport: input.sport ?? "NFL",
        projectionMae: output.calibration.projectionMae,
        projectionRmse: output.calibration.projectionRmse,
        projectionBias: output.calibration.projectionBias,
        projectionCorrelation: output.calibration.projectionCorrelation,
        ownershipMae: output.calibration.ownershipMae,
        ownershipBias: output.calibration.ownershipBias,
        ownershipCorrelation: output.calibration.ownershipCorrelation,
        sampleSize: output.calibration.sampleSize,
        period: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      },
    });
  });

  return output;
}
