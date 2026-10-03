import { describe, expect, it } from "vitest";
import { buildGameIntelligenceNode } from "@/lib/intelligence-graph";
import {
  buildStudioDraftsForNode,
  type StudioAssetDraft,
  type StudioDashboardData,
  type StudioGameOption,
} from "@/lib/studio/build-assets";
import { studioWorkspaceProps } from "@/app/cockpit/studio/studio-props";
import { fixtureGame, fixturePick, fixtureSignals } from "../__fixtures__/intelligence-graph/game-node";

const NOW = new Date("2026-05-22T18:30:00.000Z");

const context = {
  gameId: fixtureGame.id,
  modelVersion: "v6.0.4",
  brandConfig: {
    publicUrl: "https://galaxysportsedge.com",
    voiceReferences: ["docs/positioning.md"],
  },
};

function makeNode(overrides: Partial<typeof fixtureGame> = {}) {
  return buildGameIntelligenceNode({
    game: { ...fixtureGame, ...overrides },
    picks: [fixturePick],
    signals: fixtureSignals,
    now: NOW,
  });
}

const gameOption: StudioGameOption = {
  id: fixtureGame.id,
  matchup: `${fixtureGame.awayTeamName} @ ${fixtureGame.homeTeamName}`,
  sport: fixtureGame.sport,
  commenceTime: fixtureGame.commenceTime as string,
  edgeIndex: fixtureGame.currentEdgeIndex ?? null,
  evidenceStatus: "STRONG",
};

function makeDrafts(): readonly StudioAssetDraft[] {
  return buildStudioDraftsForNode(makeNode(), context);
}

describe("studioWorkspaceProps", () => {
  it("flattens a non-null selectedNode into exactly the StudioNodeSummary fields", () => {
    const node = makeNode();
    const drafts = makeDrafts();
    const data: StudioDashboardData = {
      games: [gameOption],
      selectedGame: gameOption,
      selectedNode: node,
      drafts,
    };

    const props = studioWorkspaceProps(data);
    expect(props.selectedNode).not.toBeNull();
    const summary = props.selectedNode!;

    // (1) flattening pulls nested node values up to the summary
    expect(summary.id).toBe(node.id);
    expect(summary.matchup).toBe(node.matchup);
    expect(summary.evidenceScore).toBe(node.evidenceHealth.score);
    expect(summary.evidenceStatus).toBe(node.evidenceHealth.status);
    expect(summary.edgeIndex).toBe(node.marketPulse.edgeIndex);

    // (5) only the five StudioNodeSummary fields are present — no leaked node internals
    expect(Object.keys(summary).sort()).toEqual(
      ["edgeIndex", "evidenceScore", "evidenceStatus", "id", "matchup"].sort(),
    );
  });

  it("maps a null selectedNode straight to null without fabricating a summary", () => {
    const drafts = makeDrafts();
    const data: StudioDashboardData = {
      games: [gameOption],
      selectedGame: gameOption,
      selectedNode: null,
      drafts,
    };

    expect(() => studioWorkspaceProps(data)).not.toThrow();
    expect(studioWorkspaceProps(data).selectedNode).toBeNull();
  });

  it("passes games, drafts, and selectedGame through by reference identity", () => {
    const node = makeNode();
    const drafts = makeDrafts();
    const games = [gameOption];
    const data: StudioDashboardData = {
      games,
      selectedGame: gameOption,
      selectedNode: node,
      drafts,
    };

    const props = studioWorkspaceProps(data);
    expect(props.games).toBe(games);
    expect(props.drafts).toBe(drafts);
    expect(props.selectedGame).toBe(gameOption);
  });

  it("passes a null edgeIndex through without coercing it to 0", () => {
    // currentEdgeIndex=null => marketPulse.edgeIndex=null => summary.edgeIndex stays null
    const node = makeNode({ currentEdgeIndex: null });
    expect(node.marketPulse.edgeIndex).toBeNull();
    const drafts = makeDrafts();
    const data: StudioDashboardData = {
      games: [gameOption],
      selectedGame: gameOption,
      selectedNode: node,
      drafts,
    };

    const summary = studioWorkspaceProps(data).selectedNode;
    expect(summary).not.toBeNull();
    expect(summary!.edgeIndex).toBeNull();
    expect(summary!.edgeIndex).not.toBe(0);
  });
});
