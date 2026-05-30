/**
 * Targeted coverage for studio/build-assets branches not reached by
 * studio-runtime.test.ts.
 *
 * The primary test covers: buildStudioDraftsForNode (all 8 templates),
 * buildStudioAssetDraft THIN state (bootstrap, no picks, no signals),
 * inferStudioGateState GATED, and scanStudioContent "red" status.
 *
 * This file covers: inferStudioGateState READY, scanStudioContent green
 * and yellow, buildStudioCitations with picks, buildStudioAssetDraft with
 * a body and in GATED state, and getStudioTemplate throws on unknown kind.
 */

import { describe, it, expect } from "vitest";
import {
  inferStudioGateState,
  buildStudioCitations,
  scanStudioContent,
  buildStudioAssetDraft,
  getStudioTemplate,
  STUDIO_THIN_EVIDENCE_REFUSAL,
} from "@/lib/studio/build-assets";
import { buildGameIntelligenceNode } from "@/lib/intelligence-graph";
import type { IntelligenceSignalInput } from "@/lib/intelligence-graph";
import { fixtureGame, fixturePick, fixtureSignals } from "@/__fixtures__/intelligence-graph/game-node";

const NOW = new Date("2026-05-22T18:30:00.000Z");

const context = {
  gameId: fixtureGame.id,
  modelVersion: "v5.1.0",
  brandConfig: {
    publicUrl: "https://galaxy.test",
    voiceReferences: [],
  },
};

function makeCanonicalNode() {
  return buildGameIntelligenceNode({
    game: fixtureGame,
    picks: [fixturePick],
    signals: fixtureSignals,
    now: NOW,
  });
}

// ============================================================
// inferStudioGateState — READY branch
// ============================================================

describe("inferStudioGateState — READY", () => {
  it("returns READY when node has canonical picks and strong evidence", () => {
    const node = makeCanonicalNode();
    expect(inferStudioGateState(node)).toBe("READY");
  });
});

// ============================================================
// inferStudioGateState — THIN via sourceCount=0
// ============================================================

describe("inferStudioGateState — THIN via sourceCount=0", () => {
  it("returns THIN when node has no signals at all (non-bootstrap game)", () => {
    const node = buildGameIntelligenceNode({
      game: { ...fixtureGame, isBootstrap: false },
      picks: [fixturePick],
      signals: [],
      now: NOW,
    });
    // sourceCount=0 → THIN regardless of picks
    expect(inferStudioGateState(node)).toBe("THIN");
  });
});

// ============================================================
// buildStudioCitations
// ============================================================

describe("buildStudioCitations — base refs", () => {
  it("always includes room and evidence-health citations", () => {
    const node = makeCanonicalNode();
    const refs = buildStudioCitations(node);
    const ids = refs.map((r) => r.id);
    expect(ids.some((id) => id.startsWith("room:"))).toBe(true);
    expect(ids.some((id) => id.startsWith("evidence:"))).toBe(true);
  });

  it("adds a citation per pick, up to 3", () => {
    const extraPick2 = { ...fixturePick, id: "pick-2", selection: "BOS ML" };
    const extraPick3 = { ...fixturePick, id: "pick-3", selection: "O 224.5" };
    const extraPick4 = { ...fixturePick, id: "pick-4", selection: "BOS -5.5" };
    const node = buildGameIntelligenceNode({
      game: fixtureGame,
      picks: [fixturePick, extraPick2, extraPick3, extraPick4],
      signals: fixtureSignals,
      now: NOW,
    });
    const refs = buildStudioCitations(node);
    const pickRefs = refs.filter((r) => r.id.startsWith("pick:"));
    // Should be capped at 3 even with 4 picks
    expect(pickRefs.length).toBe(3);
  });

  it("returns only the 2 base refs when there are no picks", () => {
    const node = buildGameIntelligenceNode({
      game: fixtureGame,
      picks: [],
      signals: fixtureSignals,
      now: NOW,
    });
    const refs = buildStudioCitations(node);
    const pickRefs = refs.filter((r) => r.id.startsWith("pick:"));
    expect(pickRefs.length).toBe(0);
    expect(refs.length).toBe(2);
  });

  it("citation label includes pick.selection and pick.market", () => {
    const node = makeCanonicalNode();
    const refs = buildStudioCitations(node);
    const pickRef = refs.find((r) => r.id.startsWith("pick:"));
    expect(pickRef?.label).toContain("Boston Celtics -4.5");
    expect(pickRef?.label).toContain("ATS_SPREAD");
  });
});

// ============================================================
// scanStudioContent — green and yellow status
// ============================================================

describe("scanStudioContent — green status", () => {
  it("returns green status for clean content with no rule violations", () => {
    const scan = scanStudioContent(
      "FAN_EXPLAINER",
      "The Celtics enter tonight's game off a strong defensive performance against Miami.",
    );
    expect(scan.status).toBe("green");
    expect(scan.publicReady).toBe(true);
    expect(scan.flags).toHaveLength(0);
  });
});

describe("scanStudioContent — yellow status (warn rules only)", () => {
  it("returns yellow for content with warn-level violations only", () => {
    // fanExplainerTemplate has a warn rule for "galaxy iq" mentions
    const scan = scanStudioContent(
      "FAN_EXPLAINER",
      "Check the Galaxy IQ on this matchup for additional context.",
    );
    expect(scan.status).toBe("yellow");
    expect(scan.publicReady).toBe(false);
    expect(scan.flags.some((f) => f.severity === "warn")).toBe(true);
    expect(scan.flags.every((f) => f.severity !== "block")).toBe(true);
  });
});

describe("scanStudioContent — flag span accuracy", () => {
  it("records correct start/end span for matched rule", () => {
    // fanExplainerTemplate blocks "spread"
    const content = "The spread on this game is 4.5 points.";
    const scan = scanStudioContent("FAN_EXPLAINER", content);
    expect(scan.status).toBe("red");
    const flag = scan.flags[0];
    expect(flag).toBeDefined();
    if (flag) {
      expect(content.slice(flag.span.start, flag.span.end)).toBe("spread");
    }
  });
});

// ============================================================
// buildStudioAssetDraft — GATED state (canonical, no picks)
// ============================================================

describe("buildStudioAssetDraft — GATED state", () => {
  it("returns a prompt when state is GATED (canonical node, no picks)", () => {
    const freshSignals: IntelligenceSignalInput[] = fixtureSignals.map((s) => ({
      ...s,
      isBootstrap: false,
      expiresAt: "2026-05-23T00:00:00.000Z",
    }));
    const node = buildGameIntelligenceNode({
      game: { ...fixtureGame, id: "game-gated" },
      picks: [],
      signals: freshSignals,
      now: NOW,
    });
    const draft = buildStudioAssetDraft({ node, templateKind: "FAN_EXPLAINER", context });
    expect(draft.gateState).toBe("GATED");
    expect(draft.refusalReason).toBeNull();
    expect(draft.prompt).not.toBeNull();
    expect(draft.citations.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// buildStudioAssetDraft — THIN state: empty citations, null prompt
// ============================================================

describe("buildStudioAssetDraft — THIN state", () => {
  it("sets citations=[] and prompt=null for thin node", () => {
    const node = buildGameIntelligenceNode({
      game: { ...fixtureGame, isBootstrap: true },
      picks: [],
      signals: [],
      now: NOW,
    });
    const draft = buildStudioAssetDraft({ node, templateKind: "FAN_EXPLAINER", context });
    expect(draft.gateState).toBe("THIN");
    expect(draft.prompt).toBeNull();
    expect(draft.citations).toHaveLength(0);
    expect(draft.refusalReason).toBe(STUDIO_THIN_EVIDENCE_REFUSAL);
  });
});

// ============================================================
// buildStudioAssetDraft — with generatedBody
// ============================================================

describe("buildStudioAssetDraft — with generatedBody", () => {
  it("runs compliance scan on body and sets compliance.status", () => {
    const node = makeCanonicalNode();
    const cleanBody = "The Celtics look strong heading into tonight's matchup.";
    const draft = buildStudioAssetDraft({
      node,
      templateKind: "FAN_EXPLAINER",
      context,
      generatedBody: cleanBody,
    });
    expect(draft.body).toBe(cleanBody);
    expect(draft.compliance.status).toBe("green");
    expect(draft.compliance.publicReady).toBe(true);
  });

  it("sets compliance to yellow (not green) when body is null/absent", () => {
    const node = makeCanonicalNode();
    const draft = buildStudioAssetDraft({ node, templateKind: "FAN_EXPLAINER", context });
    expect(draft.body).toBeNull();
    expect(draft.compliance.status).toBe("yellow");
    expect(draft.compliance.publicReady).toBe(false);
  });
});

// ============================================================
// getStudioTemplate — throws on unknown kind
// ============================================================

describe("getStudioTemplate — unknown kind", () => {
  it("throws when templateKind is not registered", () => {
    expect(() => {
      // Cast to bypass type checking — tests the runtime guard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getStudioTemplate("UNKNOWN_TEMPLATE" as any);
    }).toThrow(/Unknown Studio template/);
  });
});
