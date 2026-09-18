/**
 * Charting metrics that nflverse cannot support. AGENTS.md X-feed / PFF notes:
 * read-progression, time-to-pressure, and PFF positive/negative play rates.
 *
 * There is no success path. Callers get a typed refuse. Do not stub a number.
 */

export const CHARTING_REFUSED_METHOD_TAG = "gse-charting-refused-v1" as const;

export type ChartingMetric =
  | "qb_read_distribution"
  | "time_to_pressure"
  | "pff_positive_play_rate"
  | "pff_negative_play_rate";

export type ChartingRefuseReason =
  | "no_read_progression_charting"
  | "no_timing_column"
  | "pff_paywalled_not_ingested";

export interface ChartingRefused {
  readonly ok: false;
  readonly method: typeof CHARTING_REFUSED_METHOD_TAG;
  readonly metric: ChartingMetric;
  readonly reason: ChartingRefuseReason;
}

const TABLE: Readonly<Record<ChartingMetric, ChartingRefuseReason>> = {
  qb_read_distribution: "no_read_progression_charting",
  time_to_pressure: "no_timing_column",
  pff_positive_play_rate: "pff_paywalled_not_ingested",
  pff_negative_play_rate: "pff_paywalled_not_ingested",
};

export function refuseChartingMetric(metric: ChartingMetric): ChartingRefused {
  return {
    ok: false,
    method: CHARTING_REFUSED_METHOD_TAG,
    metric,
    reason: TABLE[metric],
  };
}
