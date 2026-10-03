export interface ProjectionFeatureDefinition {
  readonly id: string;
  readonly label: string;
  readonly source: "historical-player-stats" | "historical-snaps" | "historical-injuries" | "historical-games";
  readonly ownerAgent: "prism" | "ascend" | "audit";
  readonly requiresAuditReview: boolean;
  readonly requiresOwnerApprovalForWeightChange: boolean;
  readonly excludesUnsettledSeasons: boolean;
}

export const PROJECTION_FEATURE_REGISTRY: readonly ProjectionFeatureDefinition[] = [
  { id: "player-volume-recency", label: "Player volume recency", source: "historical-player-stats", ownerAgent: "prism", requiresAuditReview: true, requiresOwnerApprovalForWeightChange: true, excludesUnsettledSeasons: true },
  { id: "snap-share-stability", label: "Snap share stability", source: "historical-snaps", ownerAgent: "ascend", requiresAuditReview: true, requiresOwnerApprovalForWeightChange: true, excludesUnsettledSeasons: true },
  { id: "injury-availability-context", label: "Injury availability context", source: "historical-injuries", ownerAgent: "audit", requiresAuditReview: true, requiresOwnerApprovalForWeightChange: true, excludesUnsettledSeasons: true },
  { id: "market-closing-baseline", label: "Market closing baseline", source: "historical-games", ownerAgent: "audit", requiresAuditReview: true, requiresOwnerApprovalForWeightChange: true, excludesUnsettledSeasons: true },
] as const;
