import {
  evaluateMetricPayloadRights,
  type MetricPayloadExposure,
  type MetricPayloadField,
  type MetricPayloadRightsDecision,
} from "./payload-rights.js";
import type { MetricSourceRightsPolicy } from "./source-rights.js";
import type {
  HistoricalNoBetPressureRecord,
  HistoricalValidationRecord,
} from "./metric-historical-validation-adapter.js";

export function reviewHistoricalValidationPayload(
  record: HistoricalValidationRecord,
  policies: readonly MetricSourceRightsPolicy[],
  exposure: MetricPayloadExposure,
): MetricPayloadRightsDecision | null {
  if (record.metricId !== "no-bet-pressure") return null;
  return evaluateMetricPayloadRights({
    exposure,
    fields: payloadFieldsForNoBetPressure(record),
    policies,
  });
}

function payloadFieldsForNoBetPressure(record: HistoricalNoBetPressureRecord): readonly MetricPayloadField[] {
  const basePath = record.metricId;
  const safeFields: readonly MetricPayloadField[] = [
    payloadField(`${basePath}.score`, "DERIVED_METRIC", record.sourceIds),
    payloadField(`${basePath}.band`, "AGGREGATE_SUMMARY", record.sourceIds),
    payloadField(`${basePath}.drivers`, "PUBLIC_DRIVER", record.sourceIds),
  ];
  if (record.payloadProfile === "safe_derived") return safeFields;
  if (record.payloadProfile === "raw_input_leak") {
    return [...safeFields, payloadField(`${basePath}.raw_input_snapshot`, "RAW_SOURCE_VALUE", record.sourceIds)];
  }
  return [...safeFields, payloadField(`${basePath}.probability_claim`, "UNSUPPORTED_PROBABILITY_CLAIM", record.sourceIds)];
}

function payloadField(
  path: string,
  kind: MetricPayloadField["kind"],
  sourceIds: readonly string[],
): MetricPayloadField {
  return {
    description: "Historical no-bet validation adapter payload field.",
    exposure: "API",
    kind,
    path,
    sourceIds,
  };
}
