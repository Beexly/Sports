/**
 * /api/mcp — the hosted Galaxy Proof MCP endpoint (W-MCP).
 *
 * Pins: the MCP handshake subset (initialize / initialized / ping /
 * tools/list / tools/call), the 7-tool contract, trustless local verification
 * (match + mismatch with real hashes), the honest empty-record audit, and
 * JSON-RPC error mapping. The receipts source is the REAL route handler with
 * a mocked db — one truth path exercised end to end.
 */

import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  slateFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
}));
vi.mock("@sports/db", () => ({
  db: {
    pickProofReceipt: { findMany: mocks.findMany },
    game: { findUnique: mocks.gameFindUnique },
    slateCommitment: { findUnique: mocks.slateFindUnique },
  },
}));

import { GET, POST } from "@/app/api/mcp/route";

function rpc(body: unknown): Promise<Response> {
  return POST(
    new Request("https://x.test/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  ) as Promise<Response>;
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

const sha = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

describe("MCP handshake", () => {
  it("initialize returns protocol version, tools capability, and server info", async () => {
    const body = await json(await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }));
    const result = body["result"] as { protocolVersion: string; serverInfo: { name: string }; instructions: string };
    expect(result.protocolVersion).toBe("2025-03-26");
    expect(result.serverInfo.name).toBe("galaxy-proof");
    expect(result.instructions).toMatch(/no tool here makes a performance claim/i);
  });

  it("notifications/initialized → 202 empty; ping → empty result", async () => {
    const n = await rpc({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(n.status).toBe(202);
    const p = await json(await rpc({ jsonrpc: "2.0", id: 2, method: "ping" }));
    expect(p["result"]).toEqual({});
  });

  it("unknown method → -32601; malformed body → -32700", async () => {
    const bad = await json(await rpc({ jsonrpc: "2.0", id: 3, method: "resources/list" }));
    expect((bad["error"] as { code: number }).code).toBe(-32601);
    const parse = await POST(new Request("https://x.test/api/mcp", { method: "POST", body: "not json" }));
    expect(((await json(parse))["error"] as { code: number }).code).toBe(-32700);
  });
});

describe("tools/list", () => {
  it("exposes exactly the 8-tool proof contract with schemas", async () => {
    const body = await json(await rpc({ jsonrpc: "2.0", id: 4, method: "tools/list" }));
    const tools = (body["result"] as { tools: { name: string; inputSchema: unknown }[] }).tools;
    expect(tools.map((t) => t.name).sort()).toEqual([
      "audit_record_trustlessly",
      "get_openapi_contract",
      "get_reality_receipt",
      "get_record_summary",
      "get_verification_spec",
      "list_settled_receipts",
      "verify_receipt_local",
      "verify_receipt_via_api",
    ]);
    for (const t of tools) expect(t.inputSchema).toBeDefined();
  });
});

describe("tools/call — trustless verification", () => {
  it("verify_receipt_local: a genuine (pickId, payload, hash) triple matches", async () => {
    const payload = "asOf=2020-01-01T00:00:00.000Z|line=-3.5";
    const contentHash = sha(`leaf:pick-1:${payload}`);
    const body = await json(
      await rpc({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "verify_receipt_local", arguments: { pickId: "pick-1", payload, contentHash } },
      }),
    );
    const result = body["result"] as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0]!.text) as { matches: boolean; recomputed: string };
    expect(parsed.matches).toBe(true);
    expect(parsed.recomputed).toBe(contentHash);
  });

  it("verify_receipt_local: a tampered payload does NOT match", async () => {
    const contentHash = sha("leaf:pick-1:original");
    const body = await json(
      await rpc({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: { name: "verify_receipt_local", arguments: { pickId: "pick-1", payload: "tampered", contentHash } },
      }),
    );
    const parsed = JSON.parse((body["result"] as { content: { text: string }[] }).content[0]!.text) as { matches: boolean };
    expect(parsed.matches).toBe(false);
  });

  it("audit_record_trustlessly on an empty record: honest zero + sha256('') root", async () => {
    mocks.findMany.mockResolvedValue([]);
    const body = await json(
      await rpc({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "audit_record_trustlessly", arguments: {} } }),
    );
    const parsed = JSON.parse((body["result"] as { content: { text: string }[] }).content[0]!.text) as {
      ok: boolean;
      settledReceiptsAudited: number;
      merkleRootOverSettledSet: string;
      note: string;
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.settledReceiptsAudited).toBe(0);
    expect(parsed.merkleRootOverSettledSet).toBe(sha(""));
    expect(parsed.note).toMatch(/honest empty record/i);
  });

  it("get_record_summary surfaces the founder-gated ledger verbatim (unpublished by default)", async () => {
    const body = await json(
      await rpc({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "get_record_summary", arguments: {} } }),
    );
    const parsed = JSON.parse((body["result"] as { content: { text: string }[] }).content[0]!.text) as {
      ledger: { published: boolean };
    };
    expect(parsed.ledger.published).toBe(false);
  });

  it("unknown tool → -32602", async () => {
    const body = await json(
      await rpc({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "drop_tables", arguments: {} } }),
    );
    expect((body["error"] as { code: number }).code).toBe(-32602);
  });
});

describe("GET descriptor", () => {
  it("describes the endpoint, transport, and tool names", async () => {
    const body = await json(GET() as unknown as Response);
    expect(body["transport"]).toBe("streamable-http");
    expect((body["tools"] as string[]).length).toBe(8);
  });
});

describe("tools/call — get_reality_receipt (one truth path over the real route)", () => {
  function realityFixture(commenceTime: Date) {
    return {
      id: "game-1",
      homeTeamName: "Home",
      awayTeamName: "Away",
      commenceTime,
      lineMovementSpread: -0.5,
      lineMovementTotal: null,
      sport: { name: "NFL" },
      picks: [],
      gateDecisions: [
        {
          id: "gate-1",
          pickId: null,
          status: "GATED",
          reason: "No edge cleared the floor.",
          reasonCode: "EDGE_BELOW_FLOOR",
          edgeIndex: 40,
          confidence: null,
          modelVersion: "gse-v6",
          evaluatedAt: new Date("2026-07-14T16:05:00.000Z"),
          evidenceRefs: null,
        },
      ],
      odds: [],
      gameSignals: [],
    };
  }

  it("a PASSED decision returns found:true with an honest NOT_CAPTURED receipt leg — never an error", async () => {
    mocks.gameFindUnique.mockResolvedValue(realityFixture(new Date("2026-12-31T20:00:00.000Z")));
    const body = await json(
      await rpc({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "get_reality_receipt", arguments: { gameId: "game-1" } } }),
    );
    const result = body["result"] as { content: { text: string }[]; isError?: boolean };
    const parsed = JSON.parse(result.content[0]!.text) as { ok: boolean; found: boolean; receipt: { receipt: { state: string } } };
    expect(result.isError).toBeUndefined();
    expect(parsed.ok).toBe(true);
    expect(parsed.found).toBe(true);
    expect(parsed.receipt.receipt.state).toBe("NOT_CAPTURED");
  });

  it("no such game returns found:false honestly, not isError", async () => {
    mocks.gameFindUnique.mockResolvedValue(null);
    const body = await json(
      await rpc({ jsonrpc: "2.0", id: 11, method: "tools/call", params: { name: "get_reality_receipt", arguments: { gameId: "nope" } } }),
    );
    const result = body["result"] as { content: { text: string }[]; isError?: boolean };
    const parsed = JSON.parse(result.content[0]!.text) as { ok: boolean; found: boolean; reason: string };
    expect(result.isError).toBeUndefined();
    expect(parsed.found).toBe(false);
    expect(parsed.reason).toMatch(/no such game/i);
  });

  it("a DB outage maps to isError:true — never a false found:false", async () => {
    mocks.gameFindUnique.mockRejectedValue(new Error("connection reset"));
    const body = await json(
      await rpc({ jsonrpc: "2.0", id: 12, method: "tools/call", params: { name: "get_reality_receipt", arguments: { gameId: "game-1" } } }),
    );
    const result = body["result"] as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
  });

  it("a missing gameId is a tool-input error", async () => {
    const body = await json(
      await rpc({ jsonrpc: "2.0", id: 13, method: "tools/call", params: { name: "get_reality_receipt", arguments: {} } }),
    );
    const result = body["result"] as { isError?: boolean };
    expect(result.isError).toBe(true);
  });
});
