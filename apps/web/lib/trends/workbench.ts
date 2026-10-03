import {
  discoverCohortTrends,
  range,
  type Observation,
  type Trend,
  type TrendConfig,
} from "@sports/prediction-engine";
import { TREND_BACKLOG } from "@/lib/data-sources/catalog";
import { renderableTrendOrNull, type RenderableTrend } from "./render-contract";

export interface TrendWorkbench {
  readonly observationCount: number;
  readonly publishedTrendCount: number;
  readonly candidateCount: number;
  readonly topTrends: readonly Trend[];
  /**
   * The ONLY collection a public trend surface may render. Every entry has
   * passed the four-leg render contract (sample floor, base rate,
   * regression-to-mean caveat, calibrated forward probability).
   *
   * Empty today and honestly so: discovery cannot produce legs (c) and (d),
   * so a trend becomes publishable only when a human supplies them. That is
   * the intended friction — publishing a streak should be an affirmative act.
   */
  readonly renderableTrends: readonly RenderableTrend[];
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

  // Significance alone never reaches a public surface. A trend discovered by
  // scanning many cohorts is exactly the finding most likely to be noise, so
  // each one must additionally carry a base rate, a regression-to-mean caveat,
  // and a calibrated forward probability before it can render.
  const renderableTrends = topTrends
    .map((trend) =>
      renderableTrendOrNull({
        trend,
        minSampleSize: QB_AGE_RB_SHARE_CONFIG.minSampleSize ?? 30,
        // Not yet supplied by any pipeline — deliberately absent, so nothing
        // publishes until a human attaches the missing legs.
        regressionCaveat: null,
        calibratedProbability: null,
      }),
    )
    .filter((t): t is RenderableTrend => t !== null);

  return {
    observationCount: observations.length,
    publishedTrendCount: topTrends.length,
    candidateCount: candidates.length,
    topTrends,
    renderableTrends,
    backlog: TREND_BACKLOG,
    status: observations.length === 0 ? "ready-no-observations" : "ready-with-candidates",
    sourceNote:
      "Trend discovery is wired as deterministic code. Public trends stay empty until real nflverse observations are stored.",
  };
}
