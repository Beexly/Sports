/**
 * Pressure-to-sack ratio — AGENTS.md X-feed find @PFF_Jim.
 *
 * True PTR = sacks / times_pressured. FTN charting via nflverse has no hurry
 * column; qb_hit + sack is a floor, not true pressure. This module never
 * relabels the floor as PTR.
 */

import { round } from "../expected-metrics/numeric.js";

export const PRESSURE_TO_SACK_METHOD_TAG = "gse-pressure-to-sack-v1" as const;

export interface PressureToSackInput {
  readonly sacks: number;
  /** True pressures (hurries + hits + sacks), when charted. */
  readonly timesPressured: number | null;
  /** Optional hit+sack floor counts — used only for the documented proxy. */
  readonly qbHits?: number;
  readonly dropbacks?: number;
}

export type PressureToSackResult =
  | {
      readonly ok: true;
      readonly method: typeof PRESSURE_TO_SACK_METHOD_TAG;
      readonly kind: "true_ptr";
      readonly sacks: number;
      readonly timesPressured: number;
      readonly pressureToSack: number;
    }
  | {
      readonly ok: false;
      readonly method: typeof PRESSURE_TO_SACK_METHOD_TAG;
      readonly reason: "no_pressure_charting" | "zero_pressures" | "non_finite";
    }
  | {
      readonly ok: true;
      readonly method: typeof PRESSURE_TO_SACK_METHOD_TAG;
      readonly kind: "hit_sack_floor_proxy";
      readonly sacks: number;
      readonly qbHits: number;
      readonly dropbacks: number;
      /** (sacks + qbHits) / dropbacks. Not PTR. */
      readonly hitSackFloorRate: number;
      readonly caveat: "ftn_has_no_hurry_column_this_is_not_pressure_to_sack";
    };

export function pressureToSack(input: PressureToSackInput): PressureToSackResult {
  if (!Number.isFinite(input.sacks) || input.sacks < 0) {
    return { ok: false, method: PRESSURE_TO_SACK_METHOD_TAG, reason: "non_finite" };
  }
  if (input.timesPressured === null || !Number.isFinite(input.timesPressured)) {
    const hits = input.qbHits;
    const db = input.dropbacks;
    if (
      hits !== undefined &&
      db !== undefined &&
      Number.isFinite(hits) &&
      Number.isFinite(db) &&
      hits >= 0 &&
      db > 0
    ) {
      return {
        ok: true,
        method: PRESSURE_TO_SACK_METHOD_TAG,
        kind: "hit_sack_floor_proxy",
        sacks: input.sacks,
        qbHits: hits,
        dropbacks: db,
        hitSackFloorRate: round((input.sacks + hits) / db, 6),
        caveat: "ftn_has_no_hurry_column_this_is_not_pressure_to_sack",
      };
    }
    return { ok: false, method: PRESSURE_TO_SACK_METHOD_TAG, reason: "no_pressure_charting" };
  }
  if (input.timesPressured <= 0) {
    return { ok: false, method: PRESSURE_TO_SACK_METHOD_TAG, reason: "zero_pressures" };
  }
  return {
    ok: true,
    method: PRESSURE_TO_SACK_METHOD_TAG,
    kind: "true_ptr",
    sacks: input.sacks,
    timesPressured: input.timesPressured,
    pressureToSack: round(input.sacks / input.timesPressured, 6),
  };
}
