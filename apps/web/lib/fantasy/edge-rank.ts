/**
 * Edge rank — rank-by-edge display column for optimizer output (Wave4 #12).
 *
 * Glass-box inputs only: each lineup's mean leverage (ceiling per point of
 * projected ownership) and projection-per-$1k. No new math invented here —
 * the score reuses the optimizer's own leverage() and the GPP weights, and
 * every row carries its components so the ranking is auditable, not magic.
 * Illustrative-slate numbers stay illustrative; this ranks, it never predicts.
 */

import { leverage, type DfsPlayer } from "./dfs-slate";

export type RankedLineup = {
  readonly rank: number;
  /** mean leverage across the 9 rostered players */
  readonly meanLeverage: number;
  /** total projected points */
  readonly totalProj: number;
  /** total salary */
  readonly totalSalary: number;
  /** projection per $1k salary */
  readonly valuePer1k: number;
  /**
   * Composite edge score = meanLeverage * 6 + totalCeiling * 0.45 / 10.
   * Mirrors the GPP scorer weights in dfs-optimizer.ts (leverage*6 +
   * ceiling*0.45), scaled to a readable range. Higher = more tournament edge.
   */
  readonly edgeScore: number;
  readonly players: readonly DfsPlayer[];
};

const r3 = (n: number): number => Math.round(n * 1000) / 1000;

export function rankLineupsByEdge(lineups: readonly (readonly DfsPlayer[])[]): RankedLineup[] {
  const rows = lineups.map((lu) => {
    const meanLeverage = lu.length === 0 ? 0 : lu.reduce((s, p) => s + leverage(p), 0) / lu.length;
    const totalProj = lu.reduce((s, p) => s + p.proj, 0);
    const totalCeil = lu.reduce((s, p) => s + p.ceiling, 0);
    const totalSalary = lu.reduce((s, p) => s + p.salary, 0);
    const valuePer1k = totalSalary > 0 ? (totalProj / totalSalary) * 1000 : 0;
    const edgeScore = meanLeverage * 6 + (totalCeil * 0.45) / 10;
    return { meanLeverage: r3(meanLeverage), totalProj: r3(totalProj), totalSalary, valuePer1k: r3(valuePer1k), edgeScore: r3(edgeScore), players: lu };
  });
  const sorted = [...rows].sort((a, b) => b.edgeScore - a.edgeScore || b.valuePer1k - a.valuePer1k);
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}
