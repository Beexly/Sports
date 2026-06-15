import type { SourceFreshnessStatus } from "./stale-data-detector";
export function summarizeIngestionHealth(statuses: readonly SourceFreshnessStatus[]) {
  if (statuses.length === 0 || statuses.some((status) => status.status === "UNKNOWN")) return "UNKNOWN" as const;
  if (statuses.some((status) => status.status === "STALE" && status.critical)) return "CRITICAL" as const;
  if (statuses.some((status) => status.status === "STALE")) return "STALE" as const;
  return "HEALTHY" as const;
}
