export interface SourceFreshnessInput { readonly sourceId: string; readonly lastSuccessAt: string | null; readonly now: string; readonly critical?: boolean; }
export interface SourceFreshnessStatus { readonly sourceId: string; readonly status: "FRESH" | "STALE" | "UNKNOWN"; readonly ageHours: number | null; readonly critical: boolean; }
export function detectStaleSource(input: SourceFreshnessInput, thresholdHours = 4): SourceFreshnessStatus {
  if (!input.lastSuccessAt) return { sourceId: input.sourceId, status: "UNKNOWN", ageHours: null, critical: input.critical === true };
  const ageHours = (Date.parse(input.now) - Date.parse(input.lastSuccessAt)) / 36e5;
  return { sourceId: input.sourceId, status: ageHours > thresholdHours ? "STALE" : "FRESH", ageHours, critical: input.critical === true };
}
