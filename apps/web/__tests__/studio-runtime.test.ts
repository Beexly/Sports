import { describe, expect, it } from "vitest";
import {
  buildGameIntelligenceNode,
  type IntelligenceGameInput,
  type IntelligenceSignalInput,
} from "@/lib/intelligence-graph";
import {
  STUDIO_THIN_EVIDENCE_REFUSAL,
  buildStudioAssetDraft,
  buildStudioDraftsForNode,
  inferStudioGateState,
  scanStudioContent,
} from "@/lib/studio/build-assets";
import { STUDIO_TEMPLATES } from "@/lib/studio/templates";
import { fixtureGame, fixturePick, fixtureSignals } from "../__fixtures__/intelligence-graph/game-node";

const context = {
  gameId: fixtureGame.id,
  modelVersion: "v6.0.4",
  brandConfig: {
    publicUrl: "https://galaxysportsedge.com",
    voiceReferences: ["docs/positioning.md"],
  },
};

function makeNode() {
  return buildGameIntelligenceNode({
    game: fixtureGame,
    picks: [fixturePick],
    signals: fixtureSignals,
    now: new Date("2026-05-22T18:30:00.000Z"),
  });
}

describe("Galaxy Studio runtime", () => {
  it("builds one draft package for each Phase 3 template", () => {
    const drafts = buildStudioDraftsForNode(makeNode(), context);
    expect(STUDIO_TEMPLATES).toHaveLength(8);
    expect(drafts).toHaveLength(8);
    expect(drafts.every((draft) => draft.prompt !== null)).toBe(true);
    expect(drafts.every((draft) => draft.citations.length >= 2)).toBe(true);
  });

  it("injects the node's verified game data into every prompt so the model does not fabricate stats", () => {
    const drafts = buildStudioDraftsForNode(makeNode(), context);
    for (const draft of drafts) {
      const user = draft.prompt?.user ?? "";
      // Real node values are present in the prompt, not left for the model to invent.
      expect(user).toContain("=== GAME DATA (verified platform values) ===");
      expect(user).toContain("Milwaukee Bucks @ Boston Celtics");
      expect(user).toContain("Edge Index: 71");
      expect(user).toContain("Boston Celtics -4.5");
      expect(user).toContain("market ATS_SPREAD");
      // The model is explicitly told not to fabricate anything absent from GAME DATA.
      expect(user).toContain("Do NOT invent");
    }
  });

  it("marks absent market fields and empty pick lists so the model does not invent them", () => {
    const node = buildGameIntelligenceNode({
      game: {
        ...fixtureGame,
        id: "no-line-move",
        currentEdgeIndex: null,
        lineMovementSpread: null,
        lineMovementTotal: null,
      },
      picks: [],
      signals: fixtureSignals.map((signal) => ({
        ...signal,
        isBootstrap: false,
        expiresAt: "2026-05-23T00:00:00.000Z",
      })),
      now: new Date("2026-05-22T18:30:00.000Z"),
    });
    const draft = buildStudioAssetDraft({
      node,
      templateKind: "BETTING_EDUCATION",
      context: { ...context, gameId: "no-line-move" },
    });
    const user = draft.prompt?.user ?? "";
    expect(user).toContain("Edge Index: not available - do not cite a value");
    expect(user).toContain("Line movement (spread): not available - do not cite a value");
    expect(user).toContain("Published picks: none published yet - do not invent a pick.");
  });

  it("refuses thin-evidence games before prompt construction", () => {
    const thinGame: IntelligenceGameInput = {
      ...fixtureGame,
      id: "thin-game",
      bookmakerCoverageMax: 0,
      isBootstrap: true,
    };
    const node = buildGameIntelligenceNode({
      game: thinGame,
      picks: [],
      signals: [],
      now: new Date("2026-05-22T18:30:00.000Z"),
    });
    const draft = buildStudioAssetDraft({
      node,
      templateKind: "NEWSLETTER_BLOCK",
      context: { ...context, gameId: thinGame.id },
    });
    expect(inferStudioGateState(node)).toBe("THIN");
    expect(draft.prompt).toBeNull();
    expect(draft.refusalReason).toBe(STUDIO_THIN_EVIDENCE_REFUSAL);
  });

  it("marks canonical games without published picks as gated, not thin", () => {
    const signals: IntelligenceSignalInput[] = fixtureSignals.map((signal) => ({
      ...signal,
      isBootstrap: false,
      expiresAt: "2026-05-23T00:00:00.000Z",
    }));
    const node = buildGameIntelligenceNode({
      game: { ...fixtureGame, id: "gated-game", currentEdgeIndex: 0.4 },
      picks: [],
      signals,
      now: new Date("2026-05-22T18:30:00.000Z"),
    });
    expect(inferStudioGateState(node)).toBe("GATED");
  });

  it("runs platform and template compliance rules against generated output", () => {
    const scan = scanStudioContent(
      "BETTING_EDUCATION",
      "This is AI-powered and you should bet this side."
    );
    expect(scan.status).toBe("red");
    expect(scan.publicReady).toBe(false);
    expect(scan.flags.map((flag) => flag.id)).toContain("L1-AI-POWERED");
    expect(scan.flags.map((flag) => flag.id)).toContain("BE-RECOMMENDATION");
  });
});
