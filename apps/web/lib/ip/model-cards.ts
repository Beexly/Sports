export interface IpModelCard {
  readonly modelId: string;
  readonly status: "missing" | "draft" | "ready";
  readonly summary: string;
  readonly limitations: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export function draftIpModelCard(modelId: string, limitations: readonly string[]): IpModelCard {
  return {
    evidenceRefs: [],
    limitations,
    modelId,
    status: "draft",
    summary: "Draft model card. Validation evidence is required before public or API approval.",
  };
}
