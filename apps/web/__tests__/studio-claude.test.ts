import { describe, expect, it, vi } from "vitest";
import { buildGameIntelligenceNode } from "@/lib/intelligence-graph";
import {
  callClaudeForStudioAsset,
  generateStudioAssetDraft,
  StudioGenerationError,
} from "@/lib/studio/claude";
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

describe("Studio Claude generation", () => {
  it("sends the selected template prompt to Claude and returns text", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Draft body with Source: PickSignalSnapshot #pick-bos-1" }],
        }),
        { status: 200 }
      )
    );

    const body = await callClaudeForStudioAsset(
      { node: makeNode(), templateKind: "X_THREAD", context },
      { apiKey: "test-key", fetchImpl }
    );

    expect(body).toContain("Draft body");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    const requestBody = JSON.parse(String(calls[0]?.[1].body)) as {
      system: string;
      messages: Array<{ content: string }>;
    };
    expect(requestBody.system).toContain("X (Twitter) thread");
    expect(requestBody.messages[0]?.content).toContain("https://galaxysportsedge.com");
  });

  it("returns a scanner-checked draft from generated content", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "A clean newsletter draft. Source: Game Intelligence Room." }],
        }),
        { status: 200 }
      )
    );

    const draft = await generateStudioAssetDraft(
      { node: makeNode(), templateKind: "NEWSLETTER_BLOCK", context },
      { apiKey: "test-key", fetchImpl }
    );

    expect(draft.body).toContain("clean newsletter");
    expect(draft.compliance.status).toBe("green");
    expect(draft.citations.length).toBeGreaterThan(0);
  });

  it("refuses before calling Claude when evidence is thin", async () => {
    const fetchImpl = vi.fn();
    const node = buildGameIntelligenceNode({
      game: { ...fixtureGame, id: "thin", isBootstrap: true },
      picks: [],
      signals: [],
    });

    await expect(
      callClaudeForStudioAsset(
        { node, templateKind: "FAN_EXPLAINER", context: { ...context, gameId: "thin" } },
        { apiKey: "test-key", fetchImpl: fetchImpl as unknown as typeof fetch }
      )
    ).rejects.toBeInstanceOf(StudioGenerationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses before calling Claude when Studio generation budget is exhausted", async () => {
    const fetchImpl = vi.fn();

    await expect(
      callClaudeForStudioAsset(
        { node: makeNode(), templateKind: "X_THREAD", context },
        { apiKey: "test-key", fetchImpl: fetchImpl as unknown as typeof fetch, monthlySpendUsd: 500 }
      )
    ).rejects.toThrow("Studio is at generation capacity for this billing cycle.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
