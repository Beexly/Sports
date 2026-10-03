import type { PlayableWindowScoreInput } from "../decision/playable-window-score.js";
import type { RoleVolatilityIndexInput } from "../role/role-volatility-index.js";
import type { MetricSourcePolicy } from "./validation.js";

export interface RoleStabilityValidationSplit {
  readonly splitId: string;
  readonly description: string;
  readonly input: RoleVolatilityIndexInput;
}

export interface DecisionWindowValidationSplit {
  readonly splitId: string;
  readonly description: string;
  readonly input: PlayableWindowScoreInput;
}

const cleanPolicy: readonly MetricSourcePolicy[] = [
  {
    allowedForModeling: true,
    attributionRequired: "synthetic-local-fixture",
    sourceId: "synthetic-local-fixture",
    status: "approved",
  },
];

const blockedPolicy: readonly MetricSourcePolicy[] = [
  {
    allowedForModeling: false,
    sourceId: "restricted-fixture-source",
    status: "blocked",
  },
];

export const ROLE_STABILITY_VALIDATION_SPLITS: readonly RoleStabilityValidationSplit[] = [
  {
    description: "Stable role evidence with fresh usage and clean source posture.",
    input: {
      sampleGames: 10,
      snapShareDelta: 0.03,
      sourcePolicy: cleanPolicy,
      usageAgeDays: 1,
      usageFreshnessTtlDays: 7,
    },
    splitId: "role_stable_clean",
  },
  {
    description: "Elevated but still reviewable role movement from opportunity and depth-chart shock.",
    input: {
      depthChartShock: true,
      routeShareDelta: 0.18,
      sampleGames: 6,
      snapShareDelta: 0.18,
      sourcePolicy: cleanPolicy,
      targetShareDelta: 0.16,
      usageAgeDays: 2,
      usageFreshnessTtlDays: 7,
    },
    splitId: "role_elevated_watch",
  },
  {
    description: "Stale usage evidence must fail closed regardless of otherwise usable source posture.",
    input: {
      routeShareDelta: 0.04,
      sampleGames: 8,
      snapShareDelta: 0.04,
      sourcePolicy: cleanPolicy,
      targetShareDelta: 0.03,
      usageAgeDays: 8,
      usageFreshnessTtlDays: 7,
    },
    splitId: "role_stale_fail_closed",
  },
  {
    description: "Blocked source posture must disable role signal even with fresh stable usage.",
    input: {
      routeShareDelta: 0.02,
      sampleGames: 8,
      snapShareDelta: 0.02,
      sourcePolicy: blockedPolicy,
      targetShareDelta: 0.02,
      usageAgeDays: 1,
      usageFreshnessTtlDays: 7,
    },
    splitId: "role_blocked_source_fail_closed",
  },
];

export const DECISION_WINDOW_VALIDATION_SPLITS: readonly DecisionWindowValidationSplit[] = [
  {
    description: "Fresh, source-clean, low-pressure window can remain open for downstream review.",
    input: {
      calibrationDebt: 6,
      driftPressure: 8,
      evidenceHealth: 90,
      marketGravityIndex: 88,
      marketSignalAllowed: true,
      noBetPressure: 10,
      signalIntegrityIndex: 90,
      sourcePolicy: cleanPolicy,
      staleLineRiskScore: 5,
    },
    splitId: "decision_window_open_clean",
  },
  {
    description: "Role and QB context pressure narrows the decision window without pretending to be a pick.",
    input: {
      calibrationDebt: 20,
      driftPressure: 18,
      evidenceHealth: 78,
      marketGravityIndex: 72,
      marketSignalAllowed: true,
      modelAgreement: 0.62,
      noBetPressure: 32,
      qbBurdenIndex: 62,
      roleVolatilityIndex: 68,
      signalIntegrityIndex: 70,
      sourcePolicy: cleanPolicy,
      staleLineRiskScore: 18,
    },
    splitId: "decision_window_context_watch",
  },
  {
    description: "Stale market snapshot must close the decision window before action review.",
    input: {
      calibrationDebt: 8,
      driftPressure: 8,
      evidenceHealth: 90,
      marketGravityIndex: 94,
      marketSignalAllowed: false,
      modelAgreement: 0.9,
      noBetPressure: 10,
      qbBurdenIndex: 12,
      roleVolatilityIndex: 10,
      signalIntegrityIndex: 88,
      sourcePolicy: cleanPolicy,
      staleLineRiskScore: 90,
    },
    splitId: "decision_window_stale_market_fail_closed",
  },
  {
    description: "Calibration debt must close the decision window even when market gravity looks strong.",
    input: {
      calibrationDebt: 88,
      driftPressure: 18,
      evidenceHealth: 90,
      marketGravityIndex: 90,
      marketSignalAllowed: true,
      modelAgreement: 0.9,
      noBetPressure: 12,
      qbBurdenIndex: 12,
      roleVolatilityIndex: 12,
      signalIntegrityIndex: 90,
      sourcePolicy: cleanPolicy,
      staleLineRiskScore: 12,
    },
    splitId: "decision_window_calibration_fail_closed",
  },
  {
    description: "Blocked source posture must close the decision window even when component scores look usable.",
    input: {
      calibrationDebt: 8,
      driftPressure: 8,
      evidenceHealth: 88,
      marketGravityIndex: 86,
      marketSignalAllowed: true,
      modelAgreement: 0.82,
      noBetPressure: 10,
      qbBurdenIndex: 12,
      roleVolatilityIndex: 12,
      signalIntegrityIndex: 88,
      sourcePolicy: blockedPolicy,
      staleLineRiskScore: 10,
    },
    splitId: "decision_window_blocked_source_fail_closed",
  },
];
