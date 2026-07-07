import {
  PROPRIETARY_COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES,
  type ProprietaryComposedDecisionMetricPayloadFixture,
  type ProprietaryComposedDecisionMetricPayloadFixtureId,
} from "@sports/prediction-engine";

import { filterApiV1MetricPayloadFields } from "./payload-filter";

export interface ApiV1ComposedMetricPayloadFixtureBridgeResult {
  readonly fixtureId: ProprietaryComposedDecisionMetricPayloadFixtureId;
  readonly description: string;
  readonly ok: boolean;
  readonly approvedFields: readonly string[];
  readonly blockedFields: readonly string[];
  readonly blockers: readonly string[];
  readonly payload: Record<string, unknown>;
  readonly expectedApprovedFields: readonly string[];
  readonly expectedBlockedFields: readonly string[];
  readonly shadowOnly: true;
  readonly liveRouteCreated: false;
  readonly routePath: null;
}

export interface ApiV1ComposedMetricPayloadFixtureBridgeSummary {
  readonly total: number;
  readonly ok: number;
  readonly blocked: number;
  readonly approvedFieldCount: number;
  readonly blockedFieldCount: number;
  readonly liveRouteCreatedCount: 0;
}

const generatedAt = "2026-07-06T00:00:00.000Z";

export function runApiV1ComposedMetricPayloadFixtureBridge(
  fixtures: readonly ProprietaryComposedDecisionMetricPayloadFixture[] =
    PROPRIETARY_COMPOSED_DECISION_METRIC_PAYLOAD_FIXTURES,
): readonly ApiV1ComposedMetricPayloadFixtureBridgeResult[] {
  return fixtures.map((fixture) => {
    const result = filterApiV1MetricPayloadFields(fixture.fields, {
      generatedAt,
      requestId: `api_v1_${fixture.fixtureId}`,
    });
    return {
      approvedFields: result.approvedFields,
      blockedFields: result.blockedFields,
      blockers: result.blockers,
      description: fixture.description,
      expectedApprovedFields: fixture.expectedApprovedFields,
      expectedBlockedFields: fixture.expectedBlockedFields,
      fixtureId: fixture.fixtureId,
      liveRouteCreated: false,
      ok: result.ok,
      payload: result.payload,
      routePath: null,
      shadowOnly: true,
    };
  });
}

export function summarizeApiV1ComposedMetricPayloadFixtureBridge(
  results: readonly ApiV1ComposedMetricPayloadFixtureBridgeResult[],
): ApiV1ComposedMetricPayloadFixtureBridgeSummary {
  return {
    approvedFieldCount: results.reduce((sum, result) => sum + result.approvedFields.length, 0),
    blocked: results.filter((result) => !result.ok).length,
    blockedFieldCount: results.reduce((sum, result) => sum + result.blockedFields.length, 0),
    liveRouteCreatedCount: 0,
    ok: results.filter((result) => result.ok).length,
    total: results.length,
  };
}
