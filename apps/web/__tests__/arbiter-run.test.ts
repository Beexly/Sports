/**
 * The runner, exercised end to end against a fake transport.
 *
 * Every other arbiter test either reads a source file or calls a pure function.
 * This one actually drives `runArbiterPass` through the real code path: the real
 * pair scan, the real detector, the real budget gate, the real parser, and the
 * real ledger write. Only two things are substituted, and both at the outermost
 * boundary: `fetchImpl` for the vendor HTTP call, and `@sports/db` for the
 * database. Everything in between is the production code.
 *
 * WHY THIS IS NOT A MOCK TEST. A mocked runner proves the runner calls its
 * collaborators. It does not prove the collaborators agree with each other: that
 * the budget gate reads the same surface the recorder writes, that the parse
 * result is what gets stored, that a rejection is recorded as a rejection. Those
 * are integration facts, and the failure this whole module exists to prevent was
 * itself an integration failure (two producers, one slot, no record).
 *
 * THE FAIL-CLOSED CLAIMS ARE THE POINT. Several of these cases assert that
 * nothing was recorded and no ruling was invented when the model is absent,
 * unreachable, or refused. A single default branch that picked a winner would
 * pass every "happy path" test in the repo and would be the worst possible bug
 * in an adjudicator, so these cases are written to be the ones that catch it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Every `db` call the runner makes, recorded for assertions. */
type DbCall = { readonly op: string; readonly args: unknown };

const dbCalls: DbCall[] = [];
let pickRows: readonly Record<string, unknown>[] = [];
let jarvisWrites: Array<Record<string, unknown>> = [];
let budgetRow: unknown = undefined;
/** Spend the budget gate reads for the current month, in USD. */
let monthSpendUsd = 0;
/** Ledger rows already stored before this pass. Empty means nothing was recorded. */
let priorDecisions: readonly Record<string, unknown>[] = [];

function pickScan(args: unknown): readonly Record<string, unknown>[] {
  const query = args as {
    take?: number;
    where?: { OR?: ReadonlyArray<{ gameId?: string; pickType?: string; id?: { not?: string } }> };
  };
  if (query.where?.OR) {
    return pickRows.filter((row) =>
      query.where!.OR!.some((slot) => {
        if (slot.gameId !== undefined && row.gameId !== slot.gameId) return false;
        if (slot.pickType !== undefined && row.pickType !== slot.pickType) return false;
        if (slot.id?.not !== undefined && row.id === slot.id.not) return false;
        return true;
      }),
    );
  }
  return typeof query.take === "number" ? pickRows.slice(0, query.take) : pickRows;
}

vi.mock("@sports/db", () => ({
  db: {
    pick: {
      findMany: (args: unknown) => {
        dbCalls.push({ op: "pick.findMany", args });
        return Promise.resolve(pickScan(args));
      },
    },
    jarvisDecision: {
      findMany: (args: unknown) => {
        dbCalls.push({ op: "jarvisDecision.findMany", args });
        return Promise.resolve(priorDecisions);
      },
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    claudeApiCallRecord: {
      create: (args: unknown) => {
        dbCalls.push({ op: "claudeApiCallRecord.create", args });
        return Promise.resolve({});
      },
      aggregate: () => Promise.resolve({ _sum: { estimatedCostUsd: monthSpendUsd } }),
    },
    claudeApiBudget: {
      findUnique: (args: unknown) => {
        dbCalls.push({ op: "claudeApiBudget.findUnique", args });
        return Promise.resolve(budgetRow);
      },
    },
  },
}));

import { runArbiterPass } from "@/lib/arbiter/run";
import { ARBITER_DECISION_TYPE } from "@/lib/arbiter/ledger";

/** Build one persisted pick row in the shape the pair scan selects. */
function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p1",
    gameId: "g1",
    pickType: "MONEYLINE",
    selection: "Carolina Panthers ML (model signal)",
    confidence: 63,
    bookmakerCount: 0,
    edgeScore: 0,
    pickGrade: "LEAN",
    modelVersion: "signal-2026-09-13",
    generatedAt: new Date("2026-09-30T12:00:00Z"),
    isPublished: true,
    game: { id: "g1", homeTeamName: "Chicago Bears", awayTeamName: "Carolina Panthers" },
    ...over,
  };
}

const legacyRow = (over: Partial<Record<string, unknown>> = {}) =>
  row({
    id: "p2",
    selection: "Chicago Bears ML",
    confidence: 88,
    bookmakerCount: 11,
    edgeScore: 74,
    pickGrade: "STRONG_PLAY",
    modelVersion: "book-2026-09-13",
    ...over,
  });

/** A fetch stub that returns one Anthropic-shaped completion. */
function fakeFetch(text: string): typeof fetch {
  return (async (_url: unknown, init: { body?: string }) => {
    const body = JSON.parse(String(init.body)) as {
      messages: ReadonlyArray<{ role: string; content: string }>;
    };
    const isUserTurn = body.messages.some((m) => m.role === "user" && m.content.length > 0);
    const payload = isUserTurn
      ? text
      : "you are the adjudication layer";
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: "text", text: payload }],
        usage: { input_tokens: 120, output_tokens: 40 },
        model: "claude-opus-tier",
      }),
    };
  }) as unknown as typeof fetch;
}

const WINDOW = {
  from: new Date("2026-09-30T00:00:00Z"),
  to: new Date("2026-09-30T23:00:00Z"),
};

beforeEach(() => {
  dbCalls.length = 0;
  jarvisWrites = [];
  pickRows = [];
  budgetRow = undefined;
  monthSpendUsd = 0;
  priorDecisions = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Capture what `createJarvisDecision` would have written. */
async function captureLedger() {
  const decisions = await import("@/lib/jarvis/memory/decisions");
  // The stub returns the FULL row shape the real writer returns, field for
  // field against `JarvisDecision` in schema.prisma. Returning a bare
  // `{ id }` would satisfy the runner (which reads only `.id`) while failing
  // typecheck, and a stub that lies about its return type is exactly the thing
  // that makes an integration test certify the wrong contract. The shape is
  // written out rather than cast so a schema change to this table surfaces
  // here as a compile error instead of as a silently drifting fixture.
  const row = (input: Record<string, unknown>) => ({
    id: `dec_${jarvisWrites.length + 1}`,
    decision_title: String(input["decision_title"] ?? ""),
    decision_summary: String(input["decision_summary"] ?? ""),
    decision_type: String(input["decision_type"] ?? ""),
    rationale: String(input["rationale"] ?? ""),
    evidence: (input["evidence"] ?? null) as never,
    alternatives_rejected: (input["alternatives_rejected"] ?? null) as never,
    owner: String(input["owner"] ?? ""),
    decision_date: new Date(),
    revisit_date: (input["revisit_date"] ?? null) as Date | null,
    outcome: null as string | null,
    status: String(input["status"] ?? "open"),
    source_refs: (input["source_refs"] ?? null) as never,
    created_at: new Date(),
    updated_at: new Date(),
  });
  const spy = vi
    .spyOn(decisions, "createJarvisDecision")
    .mockImplementation(async (input) => {
      jarvisWrites.push(input as unknown as Record<string, unknown>);
      return row(input as unknown as Record<string, unknown>);
    });
  return spy;
}

describe("runArbiterPass: a genuine disagreement becomes a recorded ruling", () => {
  it("pairs the two paths, calls the model once, and records the verdict", async () => {
    pickRows = [row(), legacyRow()];
    const spy = await captureLedger();

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: fakeFetch(
        JSON.stringify({
          winner: "UPHOLD_REASONING",
          confidence: 0.78,
          reasoning: "The legacy row's own top band is measured inverted at 41.5%.",
        }),
      ),
    });

    expect(result.pairsExamined).toBe(2);
    expect(result.disagreementsFound).toBe(1);
    expect(result.modelCalls).toBe(1);
    expect(result.rulingsAccepted).toBe(1);
    expect(result.rulingsRejected).toBe(0);
    expect(result.recorded).toBe(1);
    expect(result.recordFailures).toBe(0);

    expect(jarvisWrites).toHaveLength(1);
    const written = jarvisWrites[0];
    expect(written?.["decision_type"]).toBe(ARBITER_DECISION_TYPE);
    expect(written?.["status"]).toBe("open");
    expect(String(written?.["decision_summary"])).toContain("UPHOLD_REASONING");

    spy.mockRestore();
  });

  it("records the cost of the call against the budget surface", async () => {
    pickRows = [row(), legacyRow()];
    const spy = await captureLedger();
    await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: fakeFetch(
        JSON.stringify({ winner: "UPHOLD_LEGACY", confidence: 0.6, reasoning: "Because." }),
      ),
    });
    const costCall = dbCalls.find((c) => c.op === "claudeApiCallRecord.create");
    expect(costCall).toBeDefined();
    spy.mockRestore();
  });

  it("spends nothing when the two paths agree", async () => {
    // Same side, one point apart: below the declared floor. A pass that called
    // the model here would be spending money to be told there is no dispute.
    pickRows = [
      row({ selection: "Chicago Bears ML (model signal)", confidence: 70 }),
      legacyRow({ selection: "Chicago Bears ML", confidence: 71 }),
    ];
    const spy = await captureLedger();
    let fetches = 0;
    const countingFetch = (async () => {
      fetches += 1;
      return { ok: true, status: 200, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: countingFetch,
    });

    expect(fetches).toBe(0);
    expect(result.modelCalls).toBe(0);
    expect(result.recorded).toBe(0);
    // A pair was FOUND and then judged AGREEMENT: the two counts are separate,
    // and collapsing them would report this healthy board as a dispute.
    expect(result.pairsFound).toBe(1);
    expect(result.disagreementsFound).toBe(0);
    expect(jarvisWrites).toHaveLength(0);
    spy.mockRestore();
  });

  it("spends nothing when only one path wrote a row", async () => {
    pickRows = [row()];
    const spy = await captureLedger();
    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: fakeFetch("{}"),
    });
    expect(result.modelCalls).toBe(0);
    expect(result.recorded).toBe(0);
    spy.mockRestore();
  });
});

describe("runArbiterPass: a decline is recorded, not retried into a verdict", () => {
  it("stores UNDECIDED as its own status and counts it as neither accepted nor rejected", async () => {
    pickRows = [row(), legacyRow()];
    const spy = await captureLedger();

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: fakeFetch(
        JSON.stringify({
          winner: "UNDECIDED",
          confidence: 0.4,
          reasoning: "The two rows name the same side and the gap is inside the bands.",
        }),
      ),
    });

    // A decline is a VALID outcome: it is recorded, and it is not a rejection.
    expect(result.rulingsAccepted).toBe(1);
    expect(result.rulingsRejected).toBe(0);
    expect(result.recorded).toBe(1);
    expect(jarvisWrites[0]?.["status"]).toBe("undecided");
    spy.mockRestore();
  });

  it("stores a rejected output as rejected, with the reason, and records no cost-free success", async () => {
    pickRows = [row(), legacyRow()];
    const spy = await captureLedger();

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: fakeFetch(
        JSON.stringify({
          winner: "UPHOLD_REASONING",
          confidence: 0.8,
          reasoning: "The model hit 71.4% here.",
        }),
      ),
    });

    expect(result.rulingsAccepted).toBe(0);
    expect(result.rulingsRejected).toBe(1);
    expect(result.recorded).toBe(1);
    expect(jarvisWrites[0]?.["status"]).toBe("rejected");
    expect(String(jarvisWrites[0]?.["rationale"])).toContain("UNGROUNDED_NUMBERS");

    // The call was still billed, and recorded as unsuccessful.
    const costCall = dbCalls.find((c) => c.op === "claudeApiCallRecord.create");
    const args = costCall?.args as { data?: { success?: boolean; errorKind?: string } };
    expect(args?.data?.success).toBe(false);
    expect(String(args?.data?.errorKind)).toContain("UNGROUNDED_NUMBERS");
    spy.mockRestore();
  });
});

describe("runArbiterPass: no path invents a ruling", () => {
  it("records a rejection and rules nothing when the API key is absent", async () => {
    pickRows = [row(), legacyRow()];
    const spy = await captureLedger();

    const result = await runArbiterPass({
      ...WINDOW,
      env: { MODEL_OPUS: "opus-tier" },
      fetchImpl: fakeFetch("SHOULD NEVER BE CALLED"),
    });

    expect(result.rulingsAccepted).toBe(0);
    expect(result.rulingsRejected).toBe(1);
    expect(jarvisWrites[0]?.["status"]).toBe("rejected");
    expect(String(jarvisWrites[0]?.["rationale"])).toContain("NO_API_KEY");
    spy.mockRestore();
  });

  it("records a transport failure as a rejection, not as a verdict", async () => {
    pickRows = [row(), legacyRow()];
    const spy = await captureLedger();
    const explodingFetch = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: explodingFetch,
    });

    expect(result.rulingsAccepted).toBe(0);
    expect(result.rulingsRejected).toBe(1);
    expect(result.recorded).toBe(1);
    expect(String(jarvisWrites[0]?.["rationale"])).toContain("TRANSPORT_");
    spy.mockRestore();
  });

  it("refuses the whole pass when the budget is exhausted, and spends nothing", async () => {
    pickRows = [row(), legacyRow()];
    const spy = await captureLedger();
    // The gate is `spent / monthlyBudgetUsd` compared against the thresholds:
    // `requestAllowed` is false once the ratio reaches the `red` threshold.
    // So the refusal needs BOTH a cap and a spend that reaches it.
    budgetRow = {
      surface: "MODEL_COURT_ANSWER",
      monthlyBudgetUsd: 100,
      alertThresholds: { yellow: 0.5, orange: 0.8, red: 1, hardCap: 1.5 },
      overrideActive: false,
    };
    monthSpendUsd = 120;

    let fetches = 0;
    const countingFetch = (async () => {
      fetches += 1;
      return { ok: true, status: 200, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: countingFetch,
    });

    expect(result.budgetRefused).toBe(true);
    expect(fetches).toBe(0);
    expect(result.rulingsAccepted).toBe(0);
    // The refusal is still recorded, so the ledger shows a pass that ran and
    // declined to spend rather than a pass that never happened.
    expect(result.recorded).toBe(1);
    expect(String(jarvisWrites[0]?.["rationale"])).toContain("BUDGET_REFUSED");
    spy.mockRestore();
  });
});

describe("runArbiterPass: the model is never hardcoded", () => {
  it("reports the tier id it actually issued against", async () => {
    pickRows = [row(), legacyRow()];
    const spy = await captureLedger();
    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "claude-opus-5-5-mapped" },
      fetchImpl: fakeFetch(
        JSON.stringify({ winner: "UPHOLD_REASONING", confidence: 0.5, reasoning: "Because." }),
      ),
    });
    // Whatever id the env maps is what lands in the ledger, which is what makes
    // a tier promotion visible in the accuracy record rather than invisible.
    expect(result.modelName).toBe("claude-opus-5-5-mapped");
    expect(jarvisWrites[0]?.["owner"]).toBe("arbiter:claude-opus-5-5-mapped");
    spy.mockRestore();
  });
});

describe("runArbiterPass: a recorded pair is not paid for again", () => {
  const ruling = {
    source_refs: {
      gameId: "g1",
      reasoningPickId: "p1",
      legacyPickId: "p2",
      modelName: "opus-tier",
      schema: "arbiter-decision.v1",
    },
    status: "open",
    rationale: "The legacy row's own top band is measured inverted.",
  };

  it("skips the model when the reasoning and legacy pick ids are already on the ledger", async () => {
    pickRows = [row(), legacyRow()];
    priorDecisions = [ruling];
    const spy = await captureLedger();
    let fetches = 0;
    const countingFetch = (async () => {
      fetches += 1;
      return { ok: true, status: 200, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: countingFetch,
    });

    expect(fetches).toBe(0);
    expect(result.modelCalls).toBe(0);
    expect(result.alreadyRecorded).toBe(1);
    expect(result.disagreementsFound).toBe(1);
    expect(result.recorded).toBe(0);
    expect(jarvisWrites).toHaveLength(0);
    spy.mockRestore();
  });

  it("retries an infrastructure refusal, which spent no adjudication", async () => {
    pickRows = [row(), legacyRow()];
    priorDecisions = [{ ...ruling, status: "rejected", rationale: "REJECTED: BUDGET_REFUSED" }];
    const spy = await captureLedger();

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: fakeFetch(
        JSON.stringify({ winner: "UPHOLD_LEGACY", confidence: 0.6, reasoning: "Because." }),
      ),
    });

    expect(result.modelCalls).toBe(1);
    expect(result.alreadyRecorded).toBe(0);
    expect(result.recorded).toBe(1);
    spy.mockRestore();
  });

  it("does not retry a content rejection, which already spent a call", async () => {
    pickRows = [row(), legacyRow()];
    priorDecisions = [{ ...ruling, status: "rejected", rationale: "REJECTED: UNGROUNDED_NUMBERS" }];
    const spy = await captureLedger();
    let fetches = 0;
    const countingFetch = (async () => {
      fetches += 1;
      return { ok: true, status: 200, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const result = await runArbiterPass({
      ...WINDOW,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: countingFetch,
    });

    expect(fetches).toBe(0);
    expect(result.alreadyRecorded).toBe(1);
    expect(result.modelCalls).toBe(0);
    spy.mockRestore();
  });

  it("backfills the older side of a pair that the row ceiling would have cut", async () => {
    // limit 1 reads two rows. The legacy mate sorts third, so a take-before-pair
    // scan drops the collision. The partner query has to bring it back.
    pickRows = [
      row({ id: "p1" }),
      row({
        id: "filler",
        gameId: "g2",
        selection: "Green Bay Packers ML",
        bookmakerCount: 4,
        game: { id: "g2", homeTeamName: "Chicago Bears", awayTeamName: "Green Bay Packers" },
      }),
      legacyRow({ id: "p2" }),
    ];
    const spy = await captureLedger();

    const result = await runArbiterPass({
      ...WINDOW,
      limit: 1,
      env: { ANTHROPIC_API_KEY: "k", MODEL_OPUS: "opus-tier" },
      fetchImpl: fakeFetch(
        JSON.stringify({ winner: "UPHOLD_REASONING", confidence: 0.7, reasoning: "Because." }),
      ),
    });

    expect(result.pairsFound).toBe(1);
    expect(result.modelCalls).toBe(1);
    expect(result.recorded).toBe(1);
    const reads = dbCalls.filter((c) => c.op === "pick.findMany");
    expect(reads.length).toBe(2);
    spy.mockRestore();
  });
});
