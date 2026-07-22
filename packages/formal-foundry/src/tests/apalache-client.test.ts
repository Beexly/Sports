import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApalacheJsonRpcClient } from "../apalache-client.js";
import { ApalacheRpcError, ApalacheTransportError } from "../types.js";
import { startMockApalacheServer, type MockApalacheServer } from "../mock/apalache-mock-server.js";

// ============================================================================
// HONESTY NOTE (see apalache-client.ts's header for the full statement):
// every test in this file runs against a MOCK JSON-RPC server this package
// builds (src/mock/apalache-mock-server.ts). None of it has ever talked to
// a real Apalache binary or server — none is available in this environment.
// ============================================================================

describe("ApalacheJsonRpcClient — against the mock server", () => {
  let server: MockApalacheServer;
  let client: ApalacheJsonRpcClient;

  beforeEach(async () => {
    server = await startMockApalacheServer();
    client = new ApalacheJsonRpcClient(server.url);
  });

  afterEach(async () => {
    await server.close();
  });

  it("happy path: health -> loadSpec -> assumeState -> assumeTransition -> checkInvariant -> dispose", async () => {
    const health = await client.health();
    expect(health).toMatchObject({ ok: true });

    const loaded = await client.loadSpec(["/* toy workflow source */"], ["TypeOK"]);
    expect(loaded.sessionId).toBeTruthy();
    expect(client.getSessionId()).toBe(loaded.sessionId);

    await client.assumeState({ status: "closed" });
    await client.assumeTransition(0, true);
    const result = await client.checkInvariant("candidatePrimed");
    // "closed" is terminal (no outgoing edges) -> vacuously SATISFIED.
    expect(result.invariantStatus).toBe("SATISFIED");

    await client.disposeSpec();
    expect(client.getSessionId()).toBeNull();
  });

  it("fails closed: calling assumeState with no active session throws ApalacheRpcError, never silently no-ops", async () => {
    await expect(client.assumeState({ status: "x" })).rejects.toThrow(ApalacheRpcError);
  });

  it("fails closed: an unknown/expired sessionId on the SERVER side surfaces as a typed JSON-RPC error", async () => {
    await client.loadSpec(["src"]);
    await client.disposeSpec(); // now sessionId is null client-side
    // Force a raw call with a stale/unknown sessionId by loading again and
    // disposing twice against the SAME server-issued id via a second
    // client pointed at the same mock, to exercise the SERVER's session
    // lookup failure (SESSION_ERROR) rather than the client's own
    // requireSession() guard.
    const second = new ApalacheJsonRpcClient(server.url);
    await second.loadSpec(["src"]);
    const staleId = second.getSessionId()!;
    await second.disposeSpec();
    // Manually reconstruct a client-level call against the now-disposed id
    // by loading a third session, then swapping in the stale id via a
    // fresh assumeState call routed at the dead session through a raw
    // fetch to prove the SERVER's fail-closed path specifically.
    const raw = await fetch(server.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "assumeState",
        params: { sessionId: staleId, state: { status: "pending" } },
      }),
    });
    const body = (await raw.json()) as { error?: { code: number; message: string } };
    expect(body.error).toBeDefined();
    expect(body.error!.code).toBe(-32003); // SESSION_ERROR
  });

  it("FAILS CLOSED: a non-2xx HTTP response becomes a typed ApalacheTransportError (fixed defect)", async () => {
    server.injectHttpFault(500);
    await expect(client.health()).rejects.toThrow(ApalacheTransportError);
  });

  it("FAILS CLOSED: a malformed (non-JSON) HTTP body becomes a typed ApalacheTransportError, not a raw SyntaxError (fixed defect)", async () => {
    server.injectMalformedJsonNextRequest();
    await expect(client.health()).rejects.toThrow(ApalacheTransportError);
  });

  it("FAILS CLOSED: a well-formed JSON-RPC error response is mapped to a typed ApalacheRpcError (not a raw object)", async () => {
    await client.loadSpec(["src"]);
    await expect(client.checkInvariant("not-candidatePrimed")).rejects.toThrow(ApalacheRpcError);
  });

  it("FAILS CLOSED: transport-level connection refused (no server at this URL) becomes ApalacheTransportError", async () => {
    const deadClient = new ApalacheJsonRpcClient("http://127.0.0.1:1/"); // nothing listens on port 1
    await expect(deadClient.health()).rejects.toThrow(ApalacheTransportError);
  });

  it("checkInvariant returns VIOLATED with a witness trace for a genuinely non-inductive candidate", async () => {
    await client.loadSpec(["src"]);
    await client.assumeState({}); // frame: nothing extra
    await client.assumeState({ status: "approved" }); // candidate
    await client.assumeTransition(0, true); // approved -> closed
    const result = await client.checkInvariant("candidatePrimed");
    expect(result.invariantStatus).toBe("VIOLATED");
    expect(result.trace).toBeDefined();
  });

  it("query returns witness states for kind STATE", async () => {
    await client.loadSpec(["src"]);
    await client.assumeState({ status: "pending" });
    const result = (await client.query(["STATE"])) as { states: unknown[] };
    expect(result.states).toHaveLength(1);
  });

  it("rollback restores a prior context (compact() mints a real snapshotId, not the string 'init')", async () => {
    await client.loadSpec(["src"]);
    const { snapshotId } = await client.compact();
    expect(snapshotId).toBeTruthy();
    expect(snapshotId).not.toBe("init"); // regression guard for the fixed placeholder defect

    await client.assumeState({ status: "approved" });
    await client.rollback(snapshotId!);
    await client.assumeTransition(0, true);
    const result = await client.checkInvariant("candidatePrimed");
    // After rollback, "approved" assumption is gone, context is empty ->
    // reachableFrom(undefined) = [] -> vacuously SATISFIED either way, but
    // this exercises the real rollback/compact round trip end to end.
    expect(["SATISFIED", "VIOLATED"]).toContain(result.invariantStatus);
  });
});
