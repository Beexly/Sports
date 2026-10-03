import {
  evaluateMetricPayloadRights,
  type MetricPayloadExposure,
  type MetricPayloadField,
  type MetricPayloadRightsDecision,
} from "./payload-rights.js";
import type { MetricSourceRightsPolicy } from "./source-rights.js";
import type { HistoricalDistributionRecord } from "./metric-historical-distribution-adapter.js";

export function reviewHistoricalDistributionPayload(
  record: HistoricalDistributionRecord,
  policies: readonly MetricSourceRightsPolicy[],
  exposure: MetricPayloadExposure,
): MetricPayloadRightsDecision {
  return evaluateMetricPayloadRights({
    exposure,
    fields: payloadFieldsForRecord(record),
    policies,
  });
}

function payloadFieldsForRecord(record: HistoricalDistributionRecord): readonly MetricPayloadField[] {
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
    description: "Historical distribution adapter payload field.",
    exposure: "API",
    kind,
    path,
    sourceIds,
  };
}
