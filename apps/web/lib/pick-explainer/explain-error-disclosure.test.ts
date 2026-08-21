import { describe, expect, it } from "vitest";
import { explainPick, PickExplanationError } from "./explain";
import type { GroundingInput } from "./grounding";
import type { ClaudeApiBudgetPolicy } from "@/lib/claude-api/cost-monitor";

/**
 * GSE-SEC-071 — the explainer must not forward upstream Anthropic error bodies.
 *
 * `callClaudeMessages` throws
 *   `Claude API error: ${status} - ${await response.text()}`
 * so a `ClaudeMessagesError`'s message carries the RAW upstream body. `explainPick`
 * used to rewrap that message verbatim, and the route returns `err.message` to the
 * caller — handing request ids, account/quota detail and internal error text to any
 * authenticated user who can hit the endpoint.
 *
 * The detail is not discarded: the upstream status is ledgered as `HTTP_<status>`
 * and the full error goes to Sentry. Only the CALLER's copy is generic.
 */

const BUDGET_POLICY: ClaudeApiBudgetPolicy = {
  surface: "PICK_EXPLANATION",
  monthlyBudgetUsd: 100,
  thresholds: { yellow: 0.5, orange: 0.7, red: 0.85, hardCap: 1 },
};

const GROUNDING: GroundingInput = {
  game: {
    homeTeamName: "Yankees",
    awayTeamName: "Red Sox",
    sport: "MLB",
    commenceTime: new Date("2026-08-21T23:05:00.000Z"),
  },
  pick: {
    pickType: "TOTAL",
    selection: "OVER",
    line: 8.5,
    confidence: 61,
    edgeScore: 2.4,
    modelVersion: "v5.2.2",
    generatedAt: new Date("2026-08-21T18:00:00.000Z"),
    result: "PENDING",
    factorBreakdown: null,
  },
  snapshot: null,
};

/** Marker strings that stand in for the kinds of detail a real body leaks. */
const SECRETS = [
  "req_011CabcdefGHIJKLmnop",
  "organization org_9f3c2b",
  "credit balance is too low",
  "internal-model-router-7",
];

function claudeErrorFetch(status: number): typeof fetch {
  const body = JSON.stringify({
    type: "error",
    error: { type: "invalid_request_error", message: SECRETS.join(" | ") },
    request_id: SECRETS[0],
  });
  return (async () =>
    new Response(body, {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

async function explainAgainst(status: number): Promise<PickExplanationError> {
  try {
    await explainPick({
      apiKey: "sk-ant-test-not-a-real-key",
      grounding: GROUNDING,
      recordUsage: false,
      monthlySpendUsd: 0,
      budgetPolicy: BUDGET_POLICY,
      fetchImpl: claudeErrorFetch(status),
    });
  } catch (err) {
    expect(err).toBeInstanceOf(PickExplanationError);
    return err as PickExplanationError;
  }
  throw new Error("explainPick resolved; expected it to throw on an upstream error");
}

describe("explainPick — upstream error bodies are not forwarded to the caller", () => {
  it.each([400, 401, 429, 500, 529])(
    "leaks nothing from a %i upstream body",
    async (status) => {
      const err = await explainAgainst(status);

      for (const secret of SECRETS) {
        expect(err.message).not.toContain(secret);
      }
      // The wrapper prefix itself is upstream-shaped — it carries the status code
      // and is the string the raw body was concatenated onto.
      expect(err.message).not.toContain("Claude API error");
      expect(err.message).not.toContain(String(status));
    },
  );

  it("returns an actionable generic message, not an empty one", async () => {
    const err = await explainAgainst(500);
    expect(err.message.length).toBeGreaterThan(20);
    expect(err.message).toMatch(/temporarily unavailable/i);
  });

  it("tags the failure UPSTREAM so the route can answer 503, not 422", async () => {
    // 422 tells a caller their request was unprocessable and not to retry. An
    // upstream outage is the opposite: retrying is exactly right.
    const err = await explainAgainst(529);
    expect(err.kind).toBe("UPSTREAM");
  });

  it("still distinguishes a BUDGET stop from an upstream failure", async () => {
    // Budget messages are authored here and are meant for the user, so this path
    // must keep its own kind rather than being swallowed by the generic wrapper.
    let caught: PickExplanationError | null = null;
    try {
      await explainPick({
        apiKey: "sk-ant-test-not-a-real-key",
        grounding: GROUNDING,
        recordUsage: false,
        monthlySpendUsd: 1_000_000,
        budgetPolicy: BUDGET_POLICY,
        fetchImpl: claudeErrorFetch(500),
      });
    } catch (err) {
      caught = err as PickExplanationError;
    }
    expect(caught?.kind).toBe("BUDGET");
  });
});
