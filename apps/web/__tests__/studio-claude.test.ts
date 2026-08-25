import { describe, expect, it, vi } from "vitest";
import { buildGameIntelligenceNode } from "@/lib/intelligence-graph";
import { buildStudioNumericGrounding } from "@/lib/studio/build-assets";
import {
  callClaudeForStudioAsset,
  evaluateStudioGeneratedBodyPolicy,
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
          usage: { input_tokens: 1000, output_tokens: 250 },
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
      system: string | Array<{ type: string; text: string; cache_control?: { type: string } }>;
      messages: Array<{ content: string }>;
    };
    // cache:{system:true} sends the system prompt as a cache_control block array
    // (~0.1× input cost on reuse) — the template prompt must still be inside it.
    const systemText =
      typeof requestBody.system === "string"
        ? requestBody.system
        : requestBody.system.map((b) => b.text).join("\n");
    expect(systemText).toContain("X (Twitter) thread");
    expect(requestBody.messages[0]?.content).toContain("https://galaxysportsedge.com");
  });

  it("records Studio Claude usage with game and template context", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Draft body with Source: PickSignalSnapshot #pick-bos-1" }],
          usage: { input_tokens: 1000, output_tokens: 250 },
        }),
        { status: 200 }
      )
    );
    const create = vi.fn().mockResolvedValue({ id: "record-1" });

    await callClaudeForStudioAsset(
      { node: makeNode(), templateKind: "X_THREAD", context },
      {
        apiKey: "test-key",
        fetchImpl,
        recordUsage: true,
        userId: "user-1",
        usageClient: {
          claudeApiCallRecord: {
            aggregate: vi.fn(),
            create,
          },
        },
      }
    );

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "STUDIO_GENERATION",
      modelName: "claude-sonnet-4-6",
      inputTokens: 1000,
      outputTokens: 250,
      estimatedCostUsd: 0.00675,
      userId: "user-1",
      gameId: fixtureGame.id,
      templateKind: "X_THREAD",
      success: true,
      errorKind: null,
    });
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

  it("allows Studio generation when an operator budget override is active", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "Draft body with Source: PickSignalSnapshot #pick-bos-1" }],
          usage: { input_tokens: 1000, output_tokens: 250 },
        }),
        { status: 200 }
      )
    );

    await expect(
      callClaudeForStudioAsset(
        { node: makeNode(), templateKind: "X_THREAD", context },
        {
          apiKey: "test-key",
          fetchImpl,
          monthlySpendUsd: 500,
          budgetOverrideActive: true,
        }
      )
    ).resolves.toContain("Draft body");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("records a policy failure when Claude returns blocked Studio copy", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "This is an AI-powered lock. Source: PickSignalSnapshot #pick-bos-1" }],
          usage: { input_tokens: 1000, output_tokens: 250 },
        }),
        { status: 200 }
      )
    );
    const create = vi.fn().mockResolvedValue({ id: "record-policy" });

    await expect(
      callClaudeForStudioAsset(
        { node: makeNode(), templateKind: "X_THREAD", context },
        {
          apiKey: "test-key",
          fetchImpl,
          recordUsage: true,
          usageClient: {
            claudeApiCallRecord: {
              aggregate: vi.fn(),
              create,
            },
          },
        }
      )
    ).rejects.toThrow("policy validation");

    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      surface: "STUDIO_GENERATION",
      success: false,
      errorKind: "POLICY_L1-AI-POWERED",
    });
  });

  it("exposes Studio generated-body policy checks for route-level tests", () => {
    expect(evaluateStudioGeneratedBodyPolicy("BETTING_EDUCATION", "You should bet this side.")).toEqual(
      expect.arrayContaining(["BE-RECOMMENDATION"])
    );
  });

  // Studio bodies are persisted to CreatorAsset and exported by creators under the
  // platform's name, and the templates ask for "the actual numbers" — so the
  // generation path must reject any stat the node never held. Grounding is the
  // GAME DATA block ONLY: the templates' SYSTEM prompts carry example statistics
  // (FANTASY_ANGLE illustrates prop movement as a "line moved from 7.5 to 8.5"),
  // so grounding on the prompt would let the model's own instructions launder a
  // fabricated number into "grounded".
  describe("UNGROUNDED_NUMERIC", () => {
    const CITE = "Source: PickSignalSnapshot #pick-bos-1";

    function respondWith(text: string) {
      return vi.fn(async () =>
        new Response(
          JSON.stringify({
            content: [{ type: "text", text }],
            usage: { input_tokens: 1000, output_tokens: 250 },
          }),
          { status: 200 }
        )
      );
    }

    it("excludes the template system prompt's example statistics from the grounding set", () => {
      const grounded = buildStudioNumericGrounding(makeNode());
      // The set is typed GroundedValues now, not bare numbers — a value grounds
      // a claim only when the KINDS are compatible too. These assertions read
      // the value out so they still test membership, and the kind is pinned
      // separately below.
      const values = grounded.map((g) => g.value);

      // 7.5 / 8.5 exist only in the FANTASY_ANGLE system prompt's illustration.
      expect(values).not.toContain(7.5);
      expect(values).not.toContain(8.5);
      // The node's own verified values are there.
      expect(values).toContain(4.5); // the pick's line, inside "Boston Celtics -4.5"
      expect(values).toContain(1.5); // |line movement (spread)| = |-1.5|
      expect(values).toContain(71); // Edge Index
    });

    it("types the structured values so a number cannot ground an unrelated claim", () => {
      const grounded = buildStudioNumericGrounding(makeNode());
      const kindsOf = (v: number): string[] =>
        grounded.filter((g) => g.value === v).map((g) => g.kind);

      // A line is a magnitude and only a magnitude: it must not be borrowable
      // to justify a record or a percentage that happens to share its digits.
      expect(kindsOf(4.5)).toContain("magnitude");
      expect(kindsOf(4.5)).not.toContain("record");
      expect(kindsOf(4.5)).not.toContain("rate");
      // Tallies are counts, which is a genuinely different thing.
      expect(kindsOf(makeNode().evidenceHealth.sourceCount)).toContain("count");
    });

    it("rejects a prop line the model borrowed from its own system prompt", async () => {
      const fetchImpl = respondWith(
        `Milwaukee's prop line moved from 7.5 to 8.5 this week. ${CITE}`
      );

      await expect(
        callClaudeForStudioAsset(
          { node: makeNode(), templateKind: "FANTASY_ANGLE", context },
          { apiKey: "test-key", fetchImpl }
        )
      ).rejects.toThrow("UNGROUNDED_NUMERIC");
      expect(fetchImpl).toHaveBeenCalledOnce();
    });

    it("rejects a fabricated win rate the GAME DATA never stated", async () => {
      const fetchImpl = respondWith(`Boston has covered 63% of these spots. ${CITE}`);

      await expect(
        callClaudeForStudioAsset(
          { node: makeNode(), templateKind: "X_THREAD", context },
          { apiKey: "test-key", fetchImpl }
        )
      ).rejects.toThrow("UNGROUNDED_NUMERIC");
    });

    it("rejects a fabricated record the GAME DATA never stated", async () => {
      const fetchImpl = respondWith(`Boston is 9-2 at home since March. ${CITE}`);

      await expect(
        callClaudeForStudioAsset(
          { node: makeNode(), templateKind: "X_THREAD", context },
          { apiKey: "test-key", fetchImpl }
        )
      ).rejects.toThrow("UNGROUNDED_NUMERIC");
    });

    it("accepts a body whose numbers are the node's own verified values", async () => {
      const fetchImpl = respondWith(
        `Boston Celtics are laying 4.5 and the spread has moved 1.5 points. ${CITE}`
      );

      const body = await callClaudeForStudioAsset(
        { node: makeNode(), templateKind: "X_THREAD", context },
        { apiKey: "test-key", fetchImpl }
      );

      expect(body).toContain("laying 4.5");
    });

    it("records the numeric-guard failure on the usage ledger", async () => {
      const fetchImpl = respondWith(`Boston has covered 63% of these spots. ${CITE}`);
      const create = vi.fn().mockResolvedValue({ id: "record-ungrounded" });

      await expect(
        callClaudeForStudioAsset(
          { node: makeNode(), templateKind: "X_THREAD", context },
          {
            apiKey: "test-key",
            fetchImpl,
            recordUsage: true,
            usageClient: {
              claudeApiCallRecord: { aggregate: vi.fn(), create },
            },
          }
        )
      ).rejects.toThrow("policy validation");

      expect(create.mock.calls[0]?.[0].data).toMatchObject({
        surface: "STUDIO_GENERATION",
        success: false,
        errorKind: "POLICY_UNGROUNDED_NUMERIC",
      });
    });
  });
});
