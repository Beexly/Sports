/**
 * Behavioral guardrails for the "Ask the Edge" pick explainer:
 *   1. INERT WITHOUT THE KEY — the route is the key gate; here we prove the
 *      runtime never fabricates: a policy-failing model answer is thrown, never
 *      returned. (The route-level key/flag gates are asserted in route.test.ts.)
 *   2. REVEAL-LESS — the grounded context handed to the model carries the human
 *      factor labels and values, never the internal recipe: no raw weight-tuning
 *      identifiers, no "Signal layer", no scoring-formula leakage.
 *   3. GROUNDED-OR-REFUSE — an answer missing a grounding citation, or drifting
 *      into advice/certainty/EV, is rejected by policy and never surfaced.
 *
 * All Claude I/O is faked — no network, no DB. The fake fetch returns whatever
 * text the test wants the "model" to have produced.
 */

import { describe, it, expect, vi } from "vitest";
import { explainPick, PickExplanationError, type ExplainPickOptions } from "./explain";
import { buildGroundedContext, type GroundingInput } from "./grounding";
import { DEFAULT_CLAUDE_API_BUDGETS } from "@/lib/claude-api/cost-monitor";
import type { FactorBreakdown } from "@sports/types";

const factorBreakdown: FactorBreakdown = {
  consensusScore: 22,
  marketDepthScore: 18,
  edgeScore: 12,
  lineMovementScore: 6,
  volatilityPenalty: 0,
  dataQualityScore: 80,
  factors: [
    { name: "Bookmaker Consensus", impact: "positive", description: "84% of books align.", weight: 22 },
  ],
};

const grounding: GroundingInput = {
  game: {
    homeTeamName: "Chiefs",
    awayTeamName: "Eagles",
    sport: "americanfootball_nfl",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
  },
  pick: {
    pickType: "MONEYLINE",
    selection: "Chiefs ML (-180)",
    line: -180,
    confidence: 72,
    edgeScore: 24,
    modelVersion: "v5.0.0",
    generatedAt: new Date("2026-04-15T17:00:00Z"),
    result: "PENDING",
    factorBreakdown,
  },
  snapshot: {
    capturedAt: new Date("2026-04-15T17:00:00Z"),
    confidenceAtPrediction: 72,
    dataQualityScore: 80,
    bookmakerCount: 9,
    lineMovementDelta: 6.0,
    settlementResult: null,
    signalFlags: { hadOddsSignal: true, hadLineMovementSignal: true },
  },
};

/** A fake Claude endpoint that returns the supplied text as the model output. */
function fakeFetch(modelText: string): typeof fetch {
  return vi.fn(async () =>
    new Response(
      JSON.stringify({
        content: [{ type: "text", text: modelText }],
        usage: { input_tokens: 100, output_tokens: 40 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  ) as unknown as typeof fetch;
}

/** Common options: skip the DB by injecting budget + disabling the ledger. */
function opts(modelText: string, extra?: Partial<ExplainPickOptions>): ExplainPickOptions {
  return {
    apiKey: "test-key",
    grounding,
    recordUsage: false,
    monthlySpendUsd: 0,
    budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.PICK_EXPLANATION,
    fetchImpl: fakeFetch(modelText),
    ...extra,
  };
}

const CITE = "(source: factor_breakdown at 2026-04-15T17:00:00.000Z)";

describe("explainPick — reveal-less grounding", () => {
  it("hands the model the human factor labels and values, never the recipe", () => {
    const ctx = buildGroundedContext(grounding).context;
    // Human-readable, value-bearing — what a paying user is owed.
    expect(ctx).toContain("Bookmaker Consensus");
    expect(ctx).toContain("CONFIDENCE: 72/100");
    // Never the internal recipe / weight-tuning machinery.
    expect(ctx.toLowerCase()).not.toContain("signal layer");
    expect(ctx.toLowerCase()).not.toContain("recipe");
    expect(ctx.toLowerCase()).not.toContain("secret");
    expect(ctx).not.toContain("independentEdge");
  });

  it("returns a clean, grounded explanation when the model cites its source", () => {
    return explainPick(
      opts(`The pick leans on an 84% bookmaker consensus ${CITE}. Volatility is low across 9 books.`),
    ).then((out) => {
      expect(out.text).toContain("bookmaker consensus");
      expect(out.modelName).toBeTypeOf("string");
    });
  });
});

describe("explainPick — grounded-or-refuse", () => {
  it("refuses (throws POLICY) when the model omits a grounding citation", async () => {
    await expect(
      explainPick(opts("Consensus is strong and the edge is real.")),
    ).rejects.toBeInstanceOf(PickExplanationError);
  });

  it("refuses when the model drifts into betting certainty", async () => {
    await expect(
      explainPick(opts(`This side will definitely cover ${CITE}.`)),
    ).rejects.toMatchObject({ kind: "POLICY" });
  });

  it("refuses when the model drifts into staking / EV advice", async () => {
    await expect(
      explainPick(opts(`You should bet a full unit here ${CITE}.`)),
    ).rejects.toMatchObject({ kind: "POLICY" });
  });
});

describe("explainPick — budget fail-closed", () => {
  it("refuses with a BUDGET error when the monthly spend is over cap", async () => {
    await expect(
      explainPick(
        opts(`Grounded read ${CITE}.`, {
          monthlySpendUsd: 999_999,
          budgetPolicy: DEFAULT_CLAUDE_API_BUDGETS.PICK_EXPLANATION,
        }),
      ),
    ).rejects.toMatchObject({ kind: "BUDGET" });
  });
});
