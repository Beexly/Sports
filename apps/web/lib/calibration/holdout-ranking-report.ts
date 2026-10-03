/**
 * Canonical holdout ranking report: overall + sport|market.
 * n, Res, Brier, ECE, mean p|win, mean p|loss, separation.
 */

import type { SelectiveRow } from "@/lib/calibration/selective-publish";
import {
  computeResolutionByGroup,
  type ResolutionByGroupArtifact,
} from "@/lib/calibration/resolution-by-group";
import {
  selectivePublishSweep,
  type SweepArtifact,
} from "@/lib/calibration/selective-publish";
import {
  brierDecomposition,
  expectedCalibrationError,
} from "@sports/prediction-engine";

export type GroupHoldoutRow = {
  readonly groupKey: string;
  readonly n: number;
  readonly brier: number;
  readonly ece: number;
  readonly murphyResolution: number;
  readonly murphyReliability: number;
  readonly meanPWin: number;
  readonly meanPLoss: number;
  readonly separation: number;
  readonly pauseCandidate: boolean;
};

export type HoldoutRankingReport = {
  readonly generatedAt: string;
  readonly overall: GroupHoldoutRow;
  readonly groups: readonly GroupHoldoutRow[];
  readonly pauseCandidates: readonly string[];
  readonly resolutionArtifact: ResolutionByGroupArtifact;
  readonly selectiveSweep: SweepArtifact;
  readonly rankingLevers: readonly string[];
};

function groupDetail(groupKey: string, rows: readonly SelectiveRow[]): GroupHoldoutRow {
  if (rows.length === 0) {
    return {
      groupKey,
      n: 0,
      brier: NaN,
      ece: NaN,
      murphyResolution: NaN,
      murphyReliability: NaN,
      meanPWin: NaN,
      meanPLoss: NaN,
      separation: NaN,
      pauseCandidate: true,
    };
  }
  const samples = rows.map((r) => ({ p: r.p, y: r.y }));
  const d = brierDecomposition(samples);
  const wins = rows.filter((r) => r.y === 1);
  const losses = rows.filter((r) => r.y === 0);
  const meanPWin =
    wins.length === 0 ? NaN : wins.reduce((s, r) => s + r.p, 0) / wins.length;
  const meanPLoss =
    losses.length === 0
      ? NaN
      : losses.reduce((s, r) => s + r.p, 0) / losses.length;
  const murphyResolution = d.resolution;
  return {
    groupKey,
    n: rows.length,
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    murphyResolution,
    murphyReliability: d.reliability,
    meanPWin,
    meanPLoss,
    separation: meanPWin - meanPLoss,
    pauseCandidate: murphyResolution < 0.005 || rows.length < 20,
  };
}

export function buildHoldoutRankingReport(
  rows: readonly SelectiveRow[],
  options?: { readonly minGroupN?: number; readonly resPause?: number },
): HoldoutRankingReport {
  const minGroupN = options?.minGroupN ?? 20;
  const resPause = options?.resPause ?? 0.005;
  const by = new Map<string, SelectiveRow[]>();
  for (const r of rows) {
    const arr = by.get(r.groupKey) ?? [];
    arr.push(r);
    by.set(r.groupKey, arr);
  }
  const groups: GroupHoldoutRow[] = [];
  for (const [gk, gr] of by) {
    if (gr.length < minGroupN) continue;
    groups.push(groupDetail(gk, gr));
  }
  groups.sort((a, b) => b.murphyResolution - a.murphyResolution);

  const overall = groupDetail("ALL", rows);
  const pauseCandidates = groups
    .filter((g) => g.murphyResolution < resPause)
    .map((g) => g.groupKey);

  const groupResMap: Record<string, number> = {};
  for (const g of groups) groupResMap[g.groupKey] = g.murphyResolution;

  const resolutionArtifact = computeResolutionByGroup(
    rows.map((r) => ({
      groupKey: r.groupKey,
      p: r.p,
      y: r.y,
      marketP: r.marketP,
    })),
    { minGroupN },
  );

  const selectiveSweep = selectivePublishSweep(rows, {
    groupResMap,
    minGroupResList: [null, 0.005, 0.01],
    minN: 50,
  });

  return {
    generatedAt: new Date().toISOString(),
    overall,
    groups,
    pauseCandidates,
    resolutionArtifact,
    selectiveSweep,
    rankingLevers: [
      "Pause Res≈0 sport|market groups",
      "Selective publish: |p-0.5|≥δ and edge when lines exist",
      "Market-relative features when OddsProvider has lines",
      "Sport-specific models for high-n leagues",
      "Re-measure holdout Res/Brier/ECE before any map apply or AUTO_PUBLISH",
    ],
  };
}
