import type {
  StudioAssetDraft,
  StudioDashboardData,
  StudioGameOption,
} from "@/lib/studio/build-assets";

export interface StudioNodeSummary {
  readonly id: string;
  readonly matchup: string;
  readonly evidenceScore: number;
  readonly evidenceStatus: string;
  readonly edgeIndex: number | null;
}

export interface StudioWorkspaceProps {
  readonly games: readonly StudioGameOption[];
  readonly selectedGame: StudioGameOption | null;
  readonly selectedNode: StudioNodeSummary | null;
  readonly drafts: readonly StudioAssetDraft[];
}

export function studioWorkspaceProps(data: StudioDashboardData): StudioWorkspaceProps {
  return {
    games: data.games,
    selectedGame: data.selectedGame,
    selectedNode: data.selectedNode
      ? {
          id: data.selectedNode.id,
          matchup: data.selectedNode.matchup,
          evidenceScore: data.selectedNode.evidenceHealth.score,
          evidenceStatus: data.selectedNode.evidenceHealth.status,
          edgeIndex: data.selectedNode.marketPulse.edgeIndex,
        }
      : null,
    drafts: data.drafts,
  };
}
