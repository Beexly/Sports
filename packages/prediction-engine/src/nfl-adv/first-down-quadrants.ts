/**
 * RB / skill first-down quadrants — AGENTS.md OWN-AND-DOMINATE (@GridironInfo_).
 *
 * Axes: rush first-down rate vs receiving first-down rate. High = >= sample
 * median among players who have both rates finite. On-median ties stay
 * `on_median` rather than being forced into a quadrant.
 *
 * Empty dual-threat sample → refuse. Missing rate → that player is dropped,
 * never filled with 0.
 */

import { round } from "../expected-metrics/numeric.js";

export const FIRST_DOWN_QUADRANT_METHOD_TAG = "gse-first-down-quadrants-v1" as const;

export type FirstDownQuadrant =
  | "high_rush_high_rec"
  | "high_rush_low_rec"
  | "low_rush_high_rec"
  | "low_rush_low_rec"
  | "on_median";

export interface FirstDownPlayer {
  readonly playerId: string;
  readonly rushFdRate: number | null;
  readonly recFdRate: number | null;
}

export interface FirstDownQuadrantRow {
  readonly playerId: string;
  readonly rushFdRate: number;
  readonly recFdRate: number;
  readonly quadrant: FirstDownQuadrant;
}

export type FirstDownQuadrantResult =
  | {
      readonly ok: true;
      readonly method: typeof FIRST_DOWN_QUADRANT_METHOD_TAG;
      readonly n: number;
      readonly medianRushFdRate: number;
      readonly medianRecFdRate: number;
      readonly rows: readonly FirstDownQuadrantRow[];
    }
  | {
      readonly ok: false;
      readonly method: typeof FIRST_DOWN_QUADRANT_METHOD_TAG;
      readonly reason: "insufficient_dual_threat_sample";
      readonly n: number;
    };

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return s[mid] ?? 0;
  return ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

function quadrantOf(
  rush: number,
  rec: number,
  medRush: number,
  medRec: number,
): FirstDownQuadrant {
  if (rush === medRush || rec === medRec) return "on_median";
  const highRush = rush > medRush;
  const highRec = rec > medRec;
  if (highRush && highRec) return "high_rush_high_rec";
  if (highRush && !highRec) return "high_rush_low_rec";
  if (!highRush && highRec) return "low_rush_high_rec";
  return "low_rush_low_rec";
}

export function firstDownQuadrants(players: readonly FirstDownPlayer[]): FirstDownQuadrantResult {
  const dual: Array<{ playerId: string; rushFdRate: number; recFdRate: number }> = [];
  for (const p of players) {
    if (
      p.rushFdRate !== null &&
      p.recFdRate !== null &&
      Number.isFinite(p.rushFdRate) &&
      Number.isFinite(p.recFdRate)
    ) {
      dual.push({ playerId: p.playerId, rushFdRate: p.rushFdRate, recFdRate: p.recFdRate });
    }
  }
  if (dual.length < 2) {
    return {
      ok: false,
      method: FIRST_DOWN_QUADRANT_METHOD_TAG,
      reason: "insufficient_dual_threat_sample",
      n: dual.length,
    };
  }
  const medRush = median(dual.map((p) => p.rushFdRate));
  const medRec = median(dual.map((p) => p.recFdRate));
  const rows: FirstDownQuadrantRow[] = dual
    .map((p) => ({
      playerId: p.playerId,
      rushFdRate: p.rushFdRate,
      recFdRate: p.recFdRate,
      quadrant: quadrantOf(p.rushFdRate, p.recFdRate, medRush, medRec),
    }))
    .sort((a, b) => (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0));
  return {
    ok: true,
    method: FIRST_DOWN_QUADRANT_METHOD_TAG,
    n: rows.length,
    medianRushFdRate: round(medRush, 6),
    medianRecFdRate: round(medRec, 6),
    rows,
  };
}
