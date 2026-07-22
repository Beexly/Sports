import type {
  LearningBucket,
  LearningReport,
  OpportunityOutcome,
} from "./types";

function clampProbability(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`predictedSuccessProbability must be between 0 and 1; received ${String(value)}.`);
  }
  return value;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildBucket(key: string, outcomes: readonly OpportunityOutcome[]): LearningBucket {
  if (outcomes.length === 0) {
    return {
      key,
      sampleSize: 0,
      successRate: 0,
      meanBrierScore: 0,
      meanRevenue30dUsd: 0,
      meanSavings30dUsd: 0,
      rollbackRate: 0,
    };
  }

  let successes = 0;
  let brier = 0;
  let revenue = 0;
  let savings = 0;
  let rollbacks = 0;

  for (const outcome of outcomes) {
    const predicted = clampProbability(outcome.predictedSuccessProbability);
    const actual = outcome.success ? 1 : 0;
    successes += actual;
    brier += (predicted - actual) ** 2;
    revenue += outcome.revenue30dUsd;
    savings += outcome.savings30dUsd;
    if (outcome.rolledBack) rollbacks += 1;
  }

  return {
    key,
    sampleSize: outcomes.length,
    successRate: round(successes / outcomes.length),
    meanBrierScore: round(brier / outcomes.length),
    meanRevenue30dUsd: round(revenue / outcomes.length, 2),
    meanSavings30dUsd: round(savings / outcomes.length, 2),
    rollbackRate: round(rollbacks / outcomes.length),
  };
}

function groupBy(
  outcomes: readonly OpportunityOutcome[],
  keys: (outcome: OpportunityOutcome) => readonly string[],
): ReadonlyMap<string, readonly OpportunityOutcome[]> {
  const grouped = new Map<string, OpportunityOutcome[]>();
  for (const outcome of outcomes) {
    for (const key of keys(outcome)) {
      const bucket = grouped.get(key) ?? [];
      bucket.push(outcome);
      grouped.set(key, bucket);
    }
  }
  return grouped;
}

export function buildLearningReport(
  outcomes: readonly OpportunityOutcome[],
  now: Date = new Date(),
): LearningReport {
  const byClassMap = groupBy(outcomes, (outcome) => [outcome.opportunityClass]);
  const bySourceMap = groupBy(outcomes, (outcome) => outcome.sourceIds);
  const byClass = [...byClassMap.entries()]
    .map(([key, values]) => buildBucket(key, values))
    .sort((a, b) => a.key.localeCompare(b.key));
  const bySource = [...bySourceMap.entries()]
    .map(([key, values]) => buildBucket(key, values))
    .sort((a, b) => a.key.localeCompare(b.key));
  const overall = buildBucket("overall", outcomes);

  const recommendations: string[] = [];
  if (overall.sampleSize < 10) {
    recommendations.push("Keep scoring weights frozen: fewer than 10 measured outcomes are available.");
  } else {
    if (overall.meanBrierScore > 0.25) {
      recommendations.push("Predicted success is poorly calibrated; reduce confidence language and review score-to-probability mapping.");
    }
    if (overall.rollbackRate > 0.25) {
      recommendations.push("Rollback rate exceeds 25%; tighten sandbox acceptance and integration-complexity penalties.");
    }
  }

  for (const bucket of byClass) {
    if (bucket.sampleSize < 3) continue;
    if (bucket.successRate < 0.25) {
      recommendations.push(
        `Opportunity class ${bucket.key} has a ${Math.round(bucket.successRate * 100)}% measured success rate; require stronger evidence or a smaller test before prioritization.`,
      );
    }
    if (bucket.successRate >= 0.75 && bucket.meanBrierScore <= 0.2) {
      recommendations.push(
        `Opportunity class ${bucket.key} is performing well with acceptable calibration; consider a champion/challenger weight experiment, not a direct production change.`,
      );
    }
  }

  for (const bucket of bySource) {
    if (bucket.sampleSize < 3) continue;
    if (bucket.successRate < 0.2) {
      recommendations.push(`Source ${bucket.key} has low downstream yield; reduce polling priority but retain its historical record.`);
    }
    if (bucket.rollbackRate > 0.4) {
      recommendations.push(`Source ${bucket.key} is associated with frequent rollbacks; raise its security or implementation-risk review tier.`);
    }
  }

  if (outcomes.length === 0) recommendations.push("No outcomes are available; the engine must not claim self-learning yet.");

  return {
    generatedAt: now.toISOString(),
    overall,
    byClass,
    bySource,
    recommendations,
    weightChangesApplied: false,
  };
}
