import { metricDriver, sortedDrivers, type MetricDriver } from "./driver.js";
import { clampScore, round, weightedMean } from "./math.js";
import {
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  validateSourcePolicies,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
  type MetricValidationResult,
} from "./validation.js";

export type MetricResidualMetricId = "yac-creation-gse" | "rush-over-expected-gse";
export type MetricResidualRollupKind = "PLAYER_SEASON_RESIDUAL";
export type MetricResidualRollupExposure = "INTERNAL";
export type MetricResidualConfidenceMeaning = "EVIDENCE_QUALITY_NOT_OUTCOME_CERTAINTY";

export interface MetricResidualPlayInput {
  readonly metricId: MetricResidualMetricId;
  readonly playerId: string;
  readonly playerName?: string;
  readonly team?: string;
  readonly season: number;
  readonly week?: number;
  readonly gameId?: string;
  readonly playId?: string;
  readonly actualValue: number;
  readonly expectedValue: number;
  readonly residualValue?: number;
  readonly creationIndex?: number;
  readonly confidenceScore?: number;
  readonly uncertaintyBand?: MetricUncertaintyBand;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface MetricResidualRollup {
  readonly rollupKind: MetricResidualRollupKind;
  readonly metricId: MetricResidualMetricId;
  readonly playerId: string;
  readonly playerName?: string;
  readonly team?: string;
  readonly season: number;
  readonly sampleSize: number;
  readonly actualTotal: number;
  readonly expectedTotal: number;
  readonly residualTotal: number;
  readonly residualPerPlay: number;
  readonly creationIndexMean: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: MetricResidualConfidenceMeaning;
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly exposure: MetricResidualRollupExposure;
  readonly drivers: readonly MetricDriver[];
  readonly sourcePolicy: readonly MetricSourcePolicy[];
  readonly sourceValidation: MetricValidationResult;
}

export function buildMetricResidualRollups(rows: readonly MetricResidualPlayInput[]): readonly MetricResidualRollup[] {
  const groups = new Map<string, MetricResidualPlayInput[]>();
  for (const row of rows) {
    const key = metricResidualRollupKey(row);
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  return [...groups.values()].map(buildMetricResidualRollup).sort(compareRollups);
}

export function metricResidualRollupKey(row: MetricResidualPlayInput): string {
  return `${row.metricId}:${row.playerId}:${row.season}`;
}

export function buildMetricResidualRollup(rows: readonly MetricResidualPlayInput[]): MetricResidualRollup {
  const first = rows[0];
  if (!first) {
    throw new Error("Metric residual rollup requires at least one play row.");
  }

  assertSingleRollupKey(rows, metricResidualRollupKey(first));
  const sourcePolicy = dedupeSourcePolicies(rows.flatMap((row) => row.sourcePolicy));
  const sourceValidation = validateSourcePolicies(sourcePolicy);
  const actualTotal = rows.reduce((sum, row) => sum + row.actualValue, 0);
  const expectedTotal = rows.reduce((sum, row) => sum + row.expectedValue, 0);
  const residualTotal = rows.reduce((sum, row) => sum + residualValue(row), 0);
  const residualPerPlay = residualTotal / rows.length;
  const creationIndexMean = weightedMean(
    rows.map((row) => ({
      value: clampScore(row.creationIndex ?? 50 + residualValue(row) * 4),
      weight: 1,
    })),
  );
  const rowConfidence = weightedMean(
    rows.map((row) => ({
      value: clampScore(row.confidenceScore ?? 45),
      weight: 1,
    })),
  );
  const evidenceUncertainty = uncertaintyFromEvidence({
    sampleSize: rows.length,
    sourcePolicy,
  });
  const uncertaintyBand = worstUncertaintyBand([
    evidenceUncertainty,
    ...rows.map((row) => row.uncertaintyBand ?? "HIGH"),
  ]);
  const confidenceScore = rollupConfidence({
    rowConfidence,
    sampleSize: rows.length,
    sourcePolicy,
    uncertaintyBand,
  });

  return {
    actualTotal: round(actualTotal, 2),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_OUTCOME_CERTAINTY",
    confidenceScore,
    creationIndexMean: round(creationIndexMean, 2),
    drivers: sortedDrivers([
      metricDriver({
        contribution: residualPerPlay * 8,
        direction: residualPerPlay > 0 ? "UP" : residualPerPlay < 0 ? "DOWN" : "NEUTRAL",
        explanation: "Average play-level residual summarizes performance above or below the GSE expected baseline.",
        name: "residual_per_play",
      }),
      metricDriver({
        contribution: Math.min(20, rows.length / 5),
        direction: "UP",
        explanation: "More cleared play rows increase rollup evidence depth without changing the residual itself.",
        name: "sample_size",
      }),
      metricDriver({
        contribution: (confidenceScore - 50) / 2,
        direction: confidenceScore >= 50 ? "UP" : "DOWN",
        explanation: "Confidence is evidence quality only; it is not probability or repeatable player-skill certainty.",
        name: "evidence_confidence",
      }),
      metricDriver({
        contribution: uncertaintyBand === "LOW" ? 8 : uncertaintyBand === "MEDIUM" ? -2 : -12,
        direction: uncertaintyBand === "LOW" ? "UP" : uncertaintyBand === "MEDIUM" ? "NEUTRAL" : "DOWN",
        explanation: "Higher uncertainty keeps the rollup in shadow review until stronger evidence is available.",
        name: "uncertainty_band",
      }),
      metricDriver({
        contribution: sourceValidation.allowed ? 6 : -20,
        direction: sourceValidation.allowed ? "UP" : "DOWN",
        explanation: "Source-policy validation gates whether this rollup is safe for modeling and future evidence use.",
        name: "source_policy_posture",
      }),
    ]),
    expectedTotal: round(expectedTotal, 2),
    exposure: "INTERNAL",
    metricId: first.metricId,
    playerId: first.playerId,
    playerName: first.playerName,
    residualPerPlay: round(residualPerPlay, 3),
    residualTotal: round(residualTotal, 2),
    rollupKind: "PLAYER_SEASON_RESIDUAL",
    sampleSize: rows.length,
    season: first.season,
    sourcePolicy,
    sourceValidation,
    status: "SHADOW",
    team: first.team,
    uncertaintyBand,
  };
}

function residualValue(row: MetricResidualPlayInput): number {
  return row.residualValue ?? row.actualValue - row.expectedValue;
}

function assertSingleRollupKey(rows: readonly MetricResidualPlayInput[], expectedKey: string): void {
  for (const row of rows) {
    if (metricResidualRollupKey(row) !== expectedKey) {
      throw new Error("Metric residual rollup rows must share the same metric, player, and season.");
    }
  }
}

function rollupConfidence(input: {
  readonly rowConfidence: number;
  readonly sampleSize: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
  readonly uncertaintyBand: MetricUncertaintyBand;
}): number {
  const sampleLift = Math.min(18, input.sampleSize / 8);
  const uncertaintyPenalty = input.uncertaintyBand === "LOW" ? 0 : input.uncertaintyBand === "MEDIUM" ? 12 : 28;
  const sourcePenalty = sourcePoliciesAllowed(input.sourcePolicy) ? 0 : 30;
  return round(clampScore(input.rowConfidence + sampleLift - uncertaintyPenalty - sourcePenalty), 2);
}

function worstUncertaintyBand(bands: readonly MetricUncertaintyBand[]): MetricUncertaintyBand {
  if (bands.includes("HIGH")) return "HIGH";
  if (bands.includes("MEDIUM")) return "MEDIUM";
  return "LOW";
}

function dedupeSourcePolicies(policies: readonly MetricSourcePolicy[]): readonly MetricSourcePolicy[] {
  const byKey = new Map<string, MetricSourcePolicy>();
  for (const policy of policies) {
    const key = `${policy.sourceId}:${policy.status}:${policy.allowedForModeling}:${policy.attributionRequired ?? ""}`;
    if (!byKey.has(key)) {
      byKey.set(key, policy);
    }
  }
  return [...byKey.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function compareRollups(a: MetricResidualRollup, b: MetricResidualRollup): number {
  return (
    a.metricId.localeCompare(b.metricId) ||
    a.playerId.localeCompare(b.playerId) ||
    a.season - b.season
  );
}
