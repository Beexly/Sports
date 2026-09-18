/**
 * EPA/rush by run gap — AGENTS.md ENGINE BENCHMARK: EPA/RUSH BY RUN GAP.
 *
 * Palazzolo (2020-07-31, Open Source Football): NFL GSIS run_gap / run_location
 * is assigned after the play from the hole the runner actually took, not the
 * designed gap. This module will not return a row without that caveat.
 */

import { mean, round } from "../expected-metrics/numeric.js";

export const EPA_RUSH_GAP_METHOD_TAG = "gse-epa-rush-gap-v1" as const;

export const PALAZZOLO_RUN_GAP_CAVEAT =
  "NFL GSIS run_gap/run_location is assigned after the play from the hole the runner actually took, not the designed gap. Do not read this as scheme-gap EPA." as const;

export type RunGap = "end" | "tackle" | "guard" | "unknown";

export interface RushGapPlay {
  readonly runGap: RunGap;
  readonly epa: number;
}

export interface RushGapSplit {
  readonly gap: RunGap;
  readonly rushes: number;
  readonly epaPerRush: number | null;
  readonly caveat: typeof PALAZZOLO_RUN_GAP_CAVEAT;
}

export interface EpaRushByGapResult {
  readonly method: typeof EPA_RUSH_GAP_METHOD_TAG;
  readonly n: number;
  readonly splits: readonly RushGapSplit[];
  readonly caveat: typeof PALAZZOLO_RUN_GAP_CAVEAT;
}

const GAPS: readonly RunGap[] = ["end", "tackle", "guard", "unknown"];

export function epaRushByGap(plays: readonly RushGapPlay[]): EpaRushByGapResult {
  const splits: RushGapSplit[] = GAPS.map((gap) => {
    const sub = plays.filter((p) => p.runGap === gap);
    return {
      gap,
      rushes: sub.length,
      epaPerRush: sub.length === 0 ? null : round(mean(sub.map((p) => p.epa)), 6),
      caveat: PALAZZOLO_RUN_GAP_CAVEAT,
    };
  });
  return {
    method: EPA_RUSH_GAP_METHOD_TAG,
    n: plays.length,
    splits,
    caveat: PALAZZOLO_RUN_GAP_CAVEAT,
  };
}
