export interface IpDriftCard {
  readonly metricId: string;
  readonly status: "missing" | "stable" | "watch" | "severe";
  readonly driftScore: number | null;
  readonly notes: readonly string[];
}

export function draftIpDriftCard(metricId: string): IpDriftCard {
  return {
    driftScore: null,
    metricId,
    notes: ["No production drift card exists for this metric yet."],
    status: "missing",
  };
}
