import {
  discoverCohortTrends,
  range,
  type Observation,
  type Trend,
  type TrendConfig,
} from "@sports/prediction-engine";
import { TREND_BACKLOG } from "@/lib/data-sources/catalog";

export interface TrendWorkbench {
  readonly observationCount: number;
  readonly publishedTrendCount: number;
  readonly candidateCount: number;
  readonly topTrends: readonly Trend[];
  readonly backlog: typeof TREND_BACKLOG;
  readonly status: "ready-no-observations" | "ready-with-candidates";
  readonly sourceNote: string;
}

const QB_AGE_RB_SHARE_CONFIG: TrendConfig = {
  feature: "qbAge",
  buckets: [range("QB age 34+", 34), range("QB age 30-33", 30, 33), range("QB age under 30", 0, 29)],
  minSampleSize: 30,
  alpha: 0.01,
};

function loadLiveObservations(): Observation[] {
  // Intentionally empty until nflverse player/team-week rows are persisted.
  // This keeps the public page from publishing synthetic p-values or effect sizes.
  return [];
}

export function loadTrendWorkbench(): TrendWorkbench {
  const observations = loadLiveObservations();
  const candidates = discoverCohortTrends(observations, QB_AGE_RB_SHARE_CONFIG);
  const topTrends = candidates.filter((trend) => trend.significant).slice(0, 6);

  return {
    observationCount: observations.length,
    publishedTrendCount: topTrends.length,
    candidateCount: candidates.length,
    topTrends,
    backlog: TREND_BACKLOG,
    status: observations.length === 0 ? "ready-no-observations" : "ready-with-candidates",
    sourceNote:
      "Trend discovery is wired as deterministic code. Public trends stay empty until real nflverse observations are stored.",
  };
}
