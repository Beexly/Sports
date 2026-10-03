import {
  COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES,
  type ComposedDecisionMetricPayloadFixture,
  type ComposedDecisionMetricPayloadFixtureId,
} from "./metric-payload-envelope-fixture-data.js";
import { filterMetricPayloadEnvelope, type MetricPayloadEnvelope } from "./payload-envelope.js";

export type { ComposedDecisionMetricPayloadFixture, ComposedDecisionMetricPayloadFixtureId };
export { COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES };

export interface ComposedDecisionMetricPayloadFixtureResult {
  readonly fixtureId: ComposedDecisionMetricPayloadFixtureId;
  readonly description: string;
  readonly expectedOk: boolean;
  readonly envelope: MetricPayloadEnvelope;
  readonly expectedApprovedFields: readonly string[];
  readonly expectedBlockedFields: readonly string[];
}

export interface ComposedDecisionMetricPayloadFixtureSummary {
  readonly total: number;
  readonly ok: number;
  readonly blocked: number;
  readonly approvedFieldCount: number;
  readonly blockedFieldCount: number;
}

const generatedAt = "2026-07-06T00:00:00.000Z";

export function runComposedDecisionMetricPayloadFixtures(
  fixtures: readonly ComposedDecisionMetricPayloadFixture[] = COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES,
): readonly ComposedDecisionMetricPayloadFixtureResult[] {
  return fixtures.map((fixture) => {
    const envelope = filterMetricPayloadEnvelope({
      exposure: fixture.exposure,
      fields: fixture.fields,
      generatedAt,
      requestId: `req_${fixture.fixtureId}`,
    });
    return {
      description: fixture.description,
      envelope,
      expectedApprovedFields: fixture.expectedApprovedFields,
      expectedBlockedFields: fixture.expectedBlockedFields,
      expectedOk: fixture.expectedBlockedFields.length === 0,
      fixtureId: fixture.fixtureId,
    };
  });
}

export function summarizeComposedDecisionMetricPayloadFixtures(
  results: readonly ComposedDecisionMetricPayloadFixtureResult[],
): ComposedDecisionMetricPayloadFixtureSummary {
  return {
    approvedFieldCount: results.reduce((sum, result) => sum + result.envelope.approvedFields.length, 0),
    blocked: results.filter((result) => !result.envelope.ok).length,
    blockedFieldCount: results.reduce((sum, result) => sum + result.envelope.blockedFields.length, 0),
    ok: results.filter((result) => result.envelope.ok).length,
    total: results.length,
  };
}
