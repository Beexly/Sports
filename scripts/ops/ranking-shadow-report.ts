/**
 * Ranking shadow report. Injected loader only. No database.
 * Target path: scripts/ops/ranking-shadow-report.ts
 * npm script: ops:ranking-shadow
 *
 * Honesty: count beside every rate; null below the sample floor;
 * pushes excluded from win rates and counted separately; row-level
 * figures say so (one fixture can contribute several markets).
 */

import {
  RANKING_ORDERING_SWITCH,
  sortByOrdering,
  type RankingCandidateRow,
  type RankingOrderingName,
} from "../../packages/types/src/ranking-candidates";

export const SHADOW_REPORT_TARGET_PATH = "scripts/ops/ranking-shadow-report.ts";
export const WIN_RATE_SAMPLE_FLOOR = 20;

export type SettledShadowRow = RankingCandidateRow & {
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";
  readonly slateId: string;
};

export type ShadowLoader = () => Promise<readonly SettledShadowRow[]> | readonly SettledShadowRow[];

export interface OrderingSlice {
  readonly ordering: RankingOrderingName;
  readonly topIds: readonly string[];
  readonly n: number;
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly voids: number;
  /** Null when nWinLoss < WIN_RATE_SAMPLE_FLOOR. */
  readonly winRate: number | null;
  readonly winRateWithheldReason: string | null;
  readonly meanExpectedClv: number | null;
  readonly meanExpectedClvN: number;
  readonly figureGrain: "row-level";
}

export interface ShadowReport {
  readonly targetPath: typeof SHADOW_REPORT_TARGET_PATH;
  readonly committedSwitch: RankingOrderingName;
  readonly sampleFloor: number;
  readonly nRows: number;
  readonly nPushesExcludedFromRates: number;
  readonly excludedMissingEdge: { readonly reason: string; readonly n: number }[];
  readonly spearmanVsCurrent: Partial<Record<RankingOrderingName, number>>;
  readonly slices: readonly OrderingSlice[];
  readonly largestDisagreements: readonly {
    readonly id: string;
    readonly currentRank: number;
    readonly otherOrdering: RankingOrderingName;
    readonly otherRank: number;
  }[];
  readonly grainNote: string;
}

function spearman(a: readonly string[], b: readonly string[]): number {
  const rankB = new Map(b.map((id, i) => [id, i]));
  const n = a.length;
  if (n < 2) return 1;
  let sumd2 = 0;
  a.forEach((id, i) => {
    const d = i - (rankB.get(id) ?? i);
    sumd2 += d * d;
  });
  return 1 - (6 * sumd2) / (n * (n * n - 1));
}

function sliceFor(
  ordering: RankingOrderingName,
  ranked: readonly SettledShadowRow[],
  k: number,
): OrderingSlice {
  const top = ranked.slice(0, k);
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let voids = 0;
  const clvs: number[] = [];
  for (const r of top) {
    if (r.result === "WIN") wins += 1;
    else if (r.result === "LOSS") losses += 1;
    else if (r.result === "PUSH") pushes += 1;
    else voids += 1;
    if (typeof r.expectedClv === "number" && Number.isFinite(r.expectedClv)) {
      clvs.push(r.expectedClv);
    }
  }
  const nWinLoss = wins + losses;
  const belowFloor = nWinLoss < WIN_RATE_SAMPLE_FLOOR;
  return {
    ordering,
    topIds: top.map((r) => r.id),
    n: top.length,
    wins,
    losses,
    pushes,
    voids,
    winRate: belowFloor ? null : wins / nWinLoss,
    winRateWithheldReason: belowFloor
      ? `n=${nWinLoss} graded (pushes excluded) is below floor ${WIN_RATE_SAMPLE_FLOOR}`
      : null,
    meanExpectedClv: clvs.length ? clvs.reduce((s, v) => s + v, 0) / clvs.length : null,
    meanExpectedClvN: clvs.length,
    figureGrain: "row-level",
  };
}

export async function buildRankingShadowReport(
  loader: ShadowLoader,
  ks: readonly number[] = [3, 5, 10],
): Promise<ShadowReport> {
  const rows = [...(await loader())];
  const orderings: RankingOrderingName[] = [
    "current",
    "priced-tier-first",
    "edge-first",
    "model-minus-market",
  ];
  const ranked: Record<RankingOrderingName, SettledShadowRow[]> = {
    current: [],
    "edge-first": [],
    "model-minus-market": [],
    "priced-tier-first": [],
  };
  for (const name of orderings) {
    ranked[name] = sortByOrdering(rows, name) as SettledShadowRow[];
  }
  const currentIds = ranked.current.map((r) => r.id);
  const spearmanVsCurrent: Partial<Record<RankingOrderingName, number>> = {};
  for (const name of orderings) {
    spearmanVsCurrent[name] = spearman(
      currentIds,
      ranked[name].map((r) => r.id),
    );
  }

  const slices: OrderingSlice[] = [];
  for (const name of orderings) {
    for (const k of ks) {
      slices.push(sliceFor(name, ranked[name], k));
    }
  }

  const disagreements: ShadowReport["largestDisagreements"] = [];
  for (const name of orderings) {
    if (name === "current") continue;
    const otherRank = new Map(ranked[name].map((r, i) => [r.id, i]));
    const scored = currentIds.map((id, i) => ({
      id,
      currentRank: i,
      otherOrdering: name,
      otherRank: otherRank.get(id) ?? i,
      delta: Math.abs(i - (otherRank.get(id) ?? i)),
    }));
    scored.sort((a, b) => b.delta - a.delta);
    disagreements.push(
      ...scored.slice(0, 5).map(({ id, currentRank, otherOrdering, otherRank }) => ({
        id,
        currentRank,
        otherOrdering,
        otherRank,
      })),
    );
  }

  const missingEdge = rows.filter(
    (r) => r.expectedClv == null || !Number.isFinite(r.expectedClv),
  ).length;

  return {
    targetPath: SHADOW_REPORT_TARGET_PATH,
    committedSwitch: RANKING_ORDERING_SWITCH,
    sampleFloor: WIN_RATE_SAMPLE_FLOOR,
    nRows: rows.length,
    nPushesExcludedFromRates: rows.filter((r) => r.result === "PUSH").length,
    excludedMissingEdge: [{ reason: "expectedClv_absent_or_nonfinite", n: missingEdge }],
    spearmanVsCurrent,
    slices,
    largestDisagreements: disagreements,
    grainNote:
      "Figures are row-level. One fixture can contribute several markets whose outcomes move together, so these bounds overstate confidence relative to fixture-clustered ones.",
  };
}
