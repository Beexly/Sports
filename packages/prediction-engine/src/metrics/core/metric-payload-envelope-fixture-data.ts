import { gseSignalScore } from "../decision/gse-signal-score.js";
import { playableWindowScore } from "../decision/playable-window-score.js";
import { marketMirageScore } from "../market/market-mirage-score.js";
import { staleLineRiskScore } from "../market/stale-line-risk-score.js";
import { qbBurdenIndex } from "../passing/qb-burden-index.js";
import { roleVolatilityIndex } from "../role/role-volatility-index.js";
import type { MetricPayloadEnvelopeField } from "./payload-envelope.js";
import type { MetricPayloadExposure } from "./payload-rights.js";
import type { MetricSourcePolicy } from "./validation.js";

export type ComposedDecisionMetricPayloadFixtureId =
  | "composed_decision_api_safe"
  | "composed_decision_blocks_protected_raw_and_probability"
  | "composed_decision_blocks_uncleared_source";

export interface ComposedDecisionMetricPayloadFixture {
  readonly fixtureId: ComposedDecisionMetricPayloadFixtureId;
  readonly description: string;
  readonly exposure: MetricPayloadExposure;
  readonly fields: readonly MetricPayloadEnvelopeField[];
  readonly expectedApprovedFields: readonly string[];
  readonly expectedBlockedFields: readonly string[];
}

const footballPolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "Data from nflverse",
  sourceId: "nflverse",
  status: "approved",
};

const marketPolicy: MetricSourcePolicy = {
  allowedForModeling: true,
  attributionRequired: "Derived market movement from approved odds fixture",
  sourceId: "the-odds-api",
  status: "approved",
};

export const COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES: readonly ComposedDecisionMetricPayloadFixture[] = [
  {
    description: "PWS, GSS, MMS, SLRS, QBI, and RVI expose only derived scores, bands, and public drivers.",
    expectedApprovedFields: safeComposedDecisionFields().map((field) => field.path),
    expectedBlockedFields: [],
    exposure: "API",
    fields: safeComposedDecisionFields(),
    fixtureId: "composed_decision_api_safe",
  },
  {
    description: "Composed decision payload blocks protected weights, raw fields, provider ids, and probability claims.",
    expectedApprovedFields: safeComposedDecisionFields().map((field) => field.path),
    expectedBlockedFields: unsafeComposedDecisionFields().map((field) => field.path),
    exposure: "API",
    fields: [...safeComposedDecisionFields(), ...unsafeComposedDecisionFields()],
    fixtureId: "composed_decision_blocks_protected_raw_and_probability",
  },
  {
    description: "Uncleared fallback sources cannot be smuggled into a metric API payload.",
    expectedApprovedFields: [],
    expectedBlockedFields: ["metrics.playableWindow.fallback.publicSignal"],
    exposure: "API",
    fields: [
      {
        description: "Fallback public source signal with no derived API rights.",
        exposure: "API",
        kind: "DERIVED_METRIC",
        path: "metrics.playableWindow.fallback.publicSignal",
        sourceIds: ["espn-public-api"],
        value: "blocked",
      },
    ],
    fixtureId: "composed_decision_blocks_uncleared_source",
  },
];

function safeComposedDecisionFields(): readonly MetricPayloadEnvelopeField[] {
  const slrs = staleLineRiskScore({
    bookLines: [-2.5, -2.5, -3],
    currentLine: -2.5,
    expectedSourceCount: 3,
    freshnessTtlMinutes: 10,
    lineAgeMinutes: 2,
    marketType: "spread",
    openingLine: -2,
    rightsStatus: "approved",
    sourceCount: 3,
  });
  const qbi = qbBurdenIndex({
    airYards: 11,
    down: 3,
    expectedCompletionProbability: 0.61,
    pressureProxy: 0.28,
    sampleSize: 250,
    sourcePolicy: [footballPolicy],
    yardsToGo: 6,
  });
  const rvi = roleVolatilityIndex({
    routeShareDelta: 0.08,
    sampleGames: 8,
    snapShareDelta: 0.08,
    sourcePolicy: [footballPolicy],
    targetShareDelta: 0.06,
    usageAgeDays: 2,
    usageFreshnessTtlDays: 7,
  });
  const pws = playableWindowScore({
    calibrationDebt: 10,
    driftPressure: 12,
    evidenceHealth: 88,
    marketGravityIndex: 86,
    marketSignalAllowed: slrs.marketSignalAllowed,
    modelAgreement: 0.78,
    noBetPressure: 14,
    qbBurdenIndex: qbi.burdenIndex,
    roleVolatilityIndex: rvi.volatilityIndex,
    signalIntegrityIndex: 86,
    sourcePolicy: [footballPolicy, marketPolicy],
    staleLineRiskScore: slrs.score,
  });
  const mms = marketMirageScore({
    bookDispersionIndex: 8,
    calibrationDebt: 10,
    driftPressure: 12,
    explainabilityScore: 88,
    marketGravityIndex: 86,
    marketSignalAllowed: slrs.marketSignalAllowed,
    noBetPressure: 14,
    publicNarrativeHeat: 12,
    sourceContradictionPressure: 4,
    sourcePolicy: [footballPolicy, marketPolicy],
    staleLineRiskScore: slrs.score,
  });
  const gss = gseSignalScore({
    calibrationDebt: 12,
    calibrationIntegrityGrade: 84,
    driftPressure: 10,
    edgeQualityScore: 66,
    marketGravityIndex: 86,
    modelAgreement: 0.78,
    noBetPressure: 18,
    playableWindowScore: pws.score,
    portfolioFitScore: 72,
    proprietaryPlayerSignal: 62,
    roleVolatility: rvi.volatilityIndex,
    signalIntegrityIndex: 86,
    staleLineRiskScore: slrs.score,
  });

  return [
    field("metrics.playableWindow.score", "DERIVED_METRIC", pws.score, ["nflverse", "the-odds-api"]),
    field("metrics.playableWindow.band", "AGGREGATE_SUMMARY", pws.band, ["nflverse", "the-odds-api"]),
    field("metrics.playableWindow.drivers", "PUBLIC_DRIVER", publicDrivers(pws.drivers), ["nflverse", "the-odds-api"]),
    field("metrics.gseSignal.score", "DERIVED_METRIC", gss.score, ["nflverse", "the-odds-api"]),
    field("metrics.gseSignal.grade", "AGGREGATE_SUMMARY", gss.grade, ["nflverse", "the-odds-api"]),
    field("metrics.gseSignal.confidenceMeaning", "PUBLIC_DRIVER", gss.confidenceMeaning, ["nflverse"]),
    field("metrics.marketMirage.score", "DERIVED_METRIC", mms.score, ["nflverse", "the-odds-api"]),
    field("metrics.marketMirage.band", "AGGREGATE_SUMMARY", mms.band, ["nflverse", "the-odds-api"]),
    field("metrics.marketMirage.marketInterpretationAllowed", "AGGREGATE_SUMMARY", mms.marketInterpretationAllowed, ["nflverse", "the-odds-api"]),
    field("metrics.staleLineRisk.score", "DERIVED_METRIC", slrs.score, ["the-odds-api"]),
    field("metrics.staleLineRisk.marketSignalAllowed", "AGGREGATE_SUMMARY", slrs.marketSignalAllowed, ["the-odds-api"]),
    field("metrics.qbBurden.burdenIndex", "DERIVED_METRIC", qbi.burdenIndex, ["nflverse"]),
    field("metrics.roleVolatility.volatilityIndex", "DERIVED_METRIC", rvi.volatilityIndex, ["nflverse"]),
  ];
}

function unsafeComposedDecisionFields(): readonly MetricPayloadEnvelopeField[] {
  return [
    field("metrics.playableWindow.weights.supportBlend", "PROTECTED_WEIGHT", 0.41, ["nflverse", "the-odds-api"], "INTERNAL"),
    field("metrics.playableWindow.raw.market.price", "RAW_SOURCE_VALUE", -110, ["the-odds-api"]),
    field("metrics.playableWindow.providerIds.oddsEventId", "PROVIDER_IDENTIFIER", "evt_unsafe", ["the-odds-api"]),
    field("metrics.gseSignal.probability", "UNSUPPORTED_PROBABILITY_CLAIM", 0.72, ["nflverse", "the-odds-api"]),
    field("metrics.roleVolatility.raw.snapShareDelta", "RAW_SOURCE_VALUE", 0.21, ["nflverse"]),
  ];
}

function field(
  path: string,
  kind: MetricPayloadEnvelopeField["kind"],
  value: unknown,
  sourceIds: readonly string[],
  exposure: MetricPayloadExposure = "API",
): MetricPayloadEnvelopeField {
  return { description: `${path} fixture field.`, exposure, kind, path, sourceIds, value };
}

function publicDrivers(drivers: readonly { name: string; direction: string; explanation: string }[]): readonly string[] {
  return drivers.map((driver) => `${driver.name}:${driver.direction}:${driver.explanation}`);
}
