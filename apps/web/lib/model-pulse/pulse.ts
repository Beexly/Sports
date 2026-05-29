/**
 * Model Pulse — public visualization of the model's metabolism.
 *
 * Shows STATE, not METHOD. Methodology stays protected — this exposes
 * slate-wide counts, edge index distribution, uncertainty levels.
 *
 * No prompts, weights, thresholds, or formulas leak. Pure aggregation
 * over public pick metadata.
 */

import { db } from "@sports/db";
import { isFeatureEnabled } from "@/lib/release/feature-flags";

export interface PulseSlice {
  readonly label: string;
  readonly count: number;
  readonly accent: "ion-blue" | "cyan" | "amber" | "emerald" | "gray";
}

export interface ModelPulse {
  readonly enabled: boolean;
  readonly takenAt: string;
  readonly slateGameCount: number;
  readonly publishedPickCount: number;
  readonly gatedGameCount: number;
  readonly scoringGameCount: number;
  readonly avgEdgeIndex: number | null;
  readonly avgEvidenceHealth: number | null;
  readonly confidenceDistribution: ReadonlyArray<PulseSlice>;
  readonly modelVersion: string | null;
}

const CONFIDENCE_BANDS = [
  { label: "<50", min: 0, max: 49, accent: "gray" as const },
  { label: "50-59", min: 50, max: 59, accent: "gray" as const },
  { label: "60-69", min: 60, max: 69, accent: "amber" as const },
  { label: "70-79", min: 70, max: 79, accent: "cyan" as const },
  { label: "80-89", min: 80, max: 89, accent: "ion-blue" as const },
  { label: "90-100", min: 90, max: 100, accent: "emerald" as const },
];

function emptyPulse(now: Date): ModelPulse {
  return {
    enabled: false,
    takenAt: now.toISOString(),
    slateGameCount: 0,
    publishedPickCount: 0,
    gatedGameCount: 0,
    scoringGameCount: 0,
    avgEdgeIndex: null,
    avgEvidenceHealth: null,
    confidenceDistribution: CONFIDENCE_BANDS.map((b) => ({
      label: b.label,
      count: 0,
      accent: b.accent,
    })),
    modelVersion: null,
  };
}

export async function loadModelPulse(now = new Date()): Promise<ModelPulse> {
  const enabled = isFeatureEnabled("MODEL_PULSE_ENABLED");
  if (!enabled) return { ...emptyPulse(now), enabled: false };

  // Slate window: games whose commenceTime is today
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [slateGames, publishedPicks, scoringGames] = await Promise.all([
    db.game.count({ where: { commenceTime: { gte: startOfDay, lt: endOfDay } } }).catch(() => 0),
    db.pick
      .findMany({
        where: {
          isPublished: true,
          isBootstrap: false,
          generatedAt: { gte: startOfDay, lt: endOfDay },
        },
        select: {
          confidence: true,
          edgeScore: true,
          modelVersion: true,
          game: { select: { dataQualityScore: true } },
        },
      })
      .catch(
        () =>
          [] as Array<{
            confidence: number;
            edgeScore: number;
            modelVersion: string;
            game: { dataQualityScore: number };
          }>,
      ),
    db.game
      .count({
        where: { commenceTime: { gte: startOfDay, lt: endOfDay }, homeScore: null },
      })
      .catch(() => 0),
  ]);

  const gatedGameCount = Math.max(0, slateGames - publishedPicks.length);

  const avgEdge = publishedPicks.length > 0
    ? publishedPicks.reduce((acc, p) => acc + p.edgeScore, 0) / publishedPicks.length
    : null;
  const avgHealth = publishedPicks.length > 0
    ? publishedPicks.reduce((acc, p) => acc + p.game.dataQualityScore, 0) / publishedPicks.length
    : null;
  const modelVersion = publishedPicks[0]?.modelVersion ?? null;

  const confidenceDistribution: PulseSlice[] = CONFIDENCE_BANDS.map((b) => ({
    label: b.label,
    count: publishedPicks.filter((p) => p.confidence >= b.min && p.confidence <= b.max).length,
    accent: b.accent,
  }));

  return {
    enabled: true,
    takenAt: now.toISOString(),
    slateGameCount: slateGames,
    publishedPickCount: publishedPicks.length,
    gatedGameCount,
    scoringGameCount: scoringGames,
    avgEdgeIndex: avgEdge === null ? null : Math.round(avgEdge),
    avgEvidenceHealth: avgHealth === null ? null : Math.round(avgHealth),
    confidenceDistribution,
    modelVersion,
  };
}
