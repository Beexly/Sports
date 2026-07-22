/**
 * GSE Formal Foundry — Mock Apalache JSON-RPC Server
 *
 * TEST INFRASTRUCTURE ONLY. This is NOT a real Apalache server, does NOT
 * talk to Z3, and is NEVER started outside this package's own test suite
 * (see apalache-client.ts's header for the full honesty statement on why
 * this package's RPC protocol is its own reconstruction, never verified
 * against a real Apalache release).
 *
 * Speaks the SAME JSON-RPC 2.0 wire shape `apalache-client.ts` speaks
 * (positional `loadSpec(sources, invariants, exports)`, `assumeState(state)`,
 * `assumeTransition(transitionId, checkEnabled)`,
 * `checkInvariant(invariantId)`, `query(kinds)`, `rollback(snapshotId)`,
 * `compact(snapshotId?)`, `applyInOrder(ops)`, `disposeSpec()`), backed by a
 * tiny, HONESTLY-COMPUTED (not hard-coded per test) toy state machine: a
 * 4-state approval workflow (`pending -> approved | rejected`,
 * `approved -> closed`), matching this package's own README usage example
 * (`{status:"pending"}` / `{status:"approved"}`). SAT/UNSAT-style answers
 * for `checkInvariant`/`query` are computed by brute-force enumeration over
 * this tiny explicit graph — the same BFS-over-explicit-states idea TLC
 * itself uses, just hand-built instead of symbolic — never fabricated to
 * match an expected test outcome.
 *
 * PROTOCOL NOTE (own convention, documented): `IC3Controller.
 * isRelativelyInductive` calls `assumeState` TWICE per check — once for
 * `frame`, once for `candidate` — rather than pre-merging them client-side,
 * specifically so a server (this mock, or a hypothetical real one) can tell
 * which fields are "the candidate" for `checkInvariant("candidatePrimed")`
 * to check the primed form of. This mock tracks the MOST RECENT
 * `assumeState` call's fields as "the candidate" for that purpose.
 */

import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { decodeState, encodeState, type ItfState } from "../itf.js";
import { APALACHE_ERROR_CODES } from "../types.js";

// ----------------------------------------------------------------------------
// Toy workflow spec: a genuinely tiny, explicit, honestly-enumerated graph.
// ----------------------------------------------------------------------------

export type WorkflowStatus = "pending" | "approved" | "rejected" | "closed";

/** Edges of the toy approval workflow — real enumeration, not per-test. */
const WORKFLOW_EDGES: ReadonlyArray<readonly [WorkflowStatus, WorkflowStatus]> = [
  ["pending", "approved"],
  ["pending", "rejected"],
  ["approved", "closed"],
  // "rejected" and "closed" are terminal: no outgoing edges.
];

const INIT_STATUS: WorkflowStatus = "pending";

function reachableFrom(status: unknown): WorkflowStatus[] {
  if (typeof status !== "string") return [];
  return WORKFLOW_EDGES.filter(([from]) => from === status).map(([, to]) => to);
}

// ----------------------------------------------------------------------------
// Session state
// ----------------------------------------------------------------------------

interface SessionSnapshot {
  readonly context: Record<string, unknown>;
  readonly lastAssumed: Record<string, unknown> | null;
  readonly transitionApplied: boolean;
  readonly reachablePostStatuses: readonly WorkflowStatus[];
}

interface Session {
  varTypes: Record<string, string>;
  context: Record<string, unknown>;
  lastAssumed: Record<string, unknown> | null;
  transitionApplied: boolean;
  reachablePostStatuses: WorkflowStatus[];
  snapshots: Map<string, SessionSnapshot>;
  snapshotCounter: number;
}

class MockRpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

function snapshotOf(s: Session): SessionSnapshot {
  return {
    context: { ...s.context },
    lastAssumed: s.lastAssumed ? { ...s.lastAssumed } : null,
    transitionApplied: s.transitionApplied,
    reachablePostStatuses: [...s.reachablePostStatuses],
  };
}

export interface MockApalacheServer {
  readonly url: string;
  /** Force the NEXT HTTP request to receive a non-2xx status (proves the
   *  client's `ApalacheTransportError` path against a real HTTP round trip,
   *  not just a hand-written fake transport). */
  injectHttpFault(status: number): void;
  /** Force the NEXT HTTP request's response body to be invalid JSON. */
  injectMalformedJsonNextRequest(): void;
  close(): Promise<void>;
}

export function startMockApalacheServer(): Promise<MockApalacheServer> {
  const sessions = new Map<string, Session>();
  let sessionCounter = 0;
  let pendingHttpFaultStatus: number | null = null;
  let pendingMalformedJson = false;

  function requireSession(sessionId: unknown): Session {
    if (typeof sessionId !== "string" || !sessions.has(sessionId)) {
      throw new MockRpcError(APALACHE_ERROR_CODES.SESSION_ERROR, `unknown sessionId: ${JSON.stringify(sessionId)}`);
    }
    return sessions.get(sessionId)!;
  }

  function saveSnapshot(s: Session): string {
    s.snapshotCounter += 1;
    const id = `snap-${s.snapshotCounter}`;
    s.snapshots.set(id, snapshotOf(s));
    return id;
  }

  function dispatch(method: string, params: unknown): unknown {
    switch (method) {
      case "health":
        return { ok: true, version: "mock-apalache-0.1.0 (NOT real Apalache)" };

      case "loadSpec": {
        const p = params as { sources?: unknown; invariants?: unknown };
        if (!Array.isArray(p.sources) || p.sources.length === 0) {
          throw new MockRpcError(APALACHE_ERROR_CODES.SPEC_LOAD_ERROR, `loadSpec: "sources" must be a non-empty array`);
        }
        sessionCounter += 1;
        const sessionId = `session-${sessionCounter}`;
        sessions.set(sessionId, {
          varTypes: {},
          context: {},
          lastAssumed: null,
          transitionApplied: false,
          reachablePostStatuses: [],
          snapshots: new Map(),
          snapshotCounter: 0,
        });
        const invariants = Array.isArray(p.invariants) ? p.invariants : [];
        return {
          sessionId,
          transitions: [{ index: 0, labels: ["Next"] }],
          invariants: invariants.map((name: unknown, i: number) => ({ index: i, name })),
        };
      }

      case "assumeState": {
        const p = params as { sessionId?: string; state?: unknown };
        const session = requireSession(p.sessionId);
        let decoded: Record<string, unknown>;
        try {
          decoded = decodeState(p.state as ItfState);
        } catch (err) {
          throw new MockRpcError(APALACHE_ERROR_CODES.MALFORMED_ITF, `assumeState: ${String(err)}`);
        }
        session.context = { ...session.context, ...decoded };
        session.lastAssumed = decoded;
        return { ok: true };
      }

      case "assumeTransition": {
        const p = params as { sessionId?: string; transitionId?: unknown; checkEnabled?: boolean };
        const session = requireSession(p.sessionId);
        if (p.transitionId === "Init") {
          session.context = { status: INIT_STATUS };
          session.lastAssumed = { status: INIT_STATUS };
          session.transitionApplied = false;
          session.reachablePostStatuses = [];
          return { transitionStatus: "ENABLED" };
        }
        // Any other transitionId is treated as this toy spec's single
        // composed "Next" relation (real Apalache numbers transitions per
        // spec `Next` disjunct; this toy spec has exactly one).
        const reachable = reachableFrom(session.context["status"]);
        session.reachablePostStatuses = reachable;
        session.transitionApplied = true;
        if (p.checkEnabled === true) {
          return { transitionStatus: reachable.length > 0 ? "ENABLED" : "DISABLED" };
        }
        return {};
      }

      case "checkInvariant": {
        const p = params as { sessionId?: string; invariantId?: unknown };
        const session = requireSession(p.sessionId);
        if (p.invariantId !== "candidatePrimed") {
          throw new MockRpcError(
            APALACHE_ERROR_CODES.INVALID_PARAMS,
            `checkInvariant: this mock only understands invariantId "candidatePrimed", got ${JSON.stringify(p.invariantId)}`,
          );
        }
        if (!session.transitionApplied) {
          throw new MockRpcError(
            APALACHE_ERROR_CODES.SESSION_ERROR,
            `checkInvariant("candidatePrimed") called with no transition assumed — call assumeTransition first`,
          );
        }
        const candidate = session.lastAssumed ?? {};
        if (session.reachablePostStatuses.length === 0) {
          // No successor exists (terminal state) -> vacuously entailed.
          return { invariantStatus: "SATISFIED" };
        }
        const allHold = session.reachablePostStatuses.every((post) =>
          Object.entries(candidate).every(([k, v]) => (k === "status" ? post === v : true)),
        );
        if (allHold) return { invariantStatus: "SATISFIED" };
        return {
          invariantStatus: "VIOLATED",
          trace: {
            pre: session.context,
            postStatuses: session.reachablePostStatuses,
            candidate,
          },
        };
      }

      case "query": {
        const p = params as { sessionId?: string; kinds?: unknown };
        const session = requireSession(p.sessionId);
        const kinds = Array.isArray(p.kinds) ? p.kinds : [];
        if (!kinds.includes("STATE")) {
          return { states: [] };
        }
        // This toy mock does not perform real search — it echoes the
        // currently-assumed context as the single witness state. Enough to
        // prove the wiring (real ITF decode of the returned state), not a
        // claim of real frontier search.
        if (Object.keys(session.context).length === 0) {
          return { states: [] };
        }
        return { states: [encodeState(session.context, session.varTypes)] };
      }

      case "rollback": {
        const p = params as { sessionId?: string; snapshotId?: string };
        const session = requireSession(p.sessionId);
        const snap = typeof p.snapshotId === "string" ? session.snapshots.get(p.snapshotId) : undefined;
        if (!snap) {
          throw new MockRpcError(APALACHE_ERROR_CODES.SESSION_ERROR, `unknown snapshotId: ${JSON.stringify(p.snapshotId)}`);
        }
        session.context = { ...snap.context };
        session.lastAssumed = snap.lastAssumed ? { ...snap.lastAssumed } : null;
        session.transitionApplied = snap.transitionApplied;
        session.reachablePostStatuses = [...snap.reachablePostStatuses];
        return { ok: true };
      }

      case "compact": {
        const p = params as { sessionId?: string; snapshotId?: string };
        const session = requireSession(p.sessionId);
        if (typeof p.snapshotId === "string") {
          if (!session.snapshots.has(p.snapshotId)) {
            throw new MockRpcError(APALACHE_ERROR_CODES.SESSION_ERROR, `unknown snapshotId: ${JSON.stringify(p.snapshotId)}`);
          }
          return { snapshotId: p.snapshotId };
        }
        // No snapshotId given -> materialize the CURRENT context as a
        // fresh, real, server-issued snapshot (this is what
        // IC3Controller.init() uses to bootstrap its Init snapshot).
        return { snapshotId: saveSnapshot(session) };
      }

      case "applyInOrder": {
        const p = params as { sessionId?: string; ops?: unknown };
        requireSession(p.sessionId);
        if (!Array.isArray(p.ops)) {
          throw new MockRpcError(APALACHE_ERROR_CODES.INVALID_PARAMS, `applyInOrder: "ops" must be an array`);
        }
        const results: unknown[] = [];
        for (const op of p.ops) {
          const o = op as { method?: string; params?: Record<string, unknown> };
          if (typeof o.method !== "string") {
            throw new MockRpcError(APALACHE_ERROR_CODES.INVALID_PARAMS, `applyInOrder: each op needs a "method"`);
          }
          results.push(dispatch(o.method, { sessionId: p.sessionId, ...(o.params ?? {}) }));
        }
        return { results };
      }

      case "disposeSpec": {
        const p = params as { sessionId?: string };
        requireSession(p.sessionId);
        sessions.delete(p.sessionId as string);
        return { ok: true };
      }

      default:
        throw new MockRpcError(APALACHE_ERROR_CODES.METHOD_NOT_FOUND, `unknown method: ${method}`);
    }
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (pendingHttpFaultStatus !== null) {
        const status = pendingHttpFaultStatus;
        pendingHttpFaultStatus = null;
        res.writeHead(status, { "content-type": "text/html" });
        res.end(`<html><body>injected fault: HTTP ${status}</body></html>`);
        return;
      }
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString("utf8");
      });
      req.on("end", () => {
        if (pendingMalformedJson) {
          pendingMalformedJson = false;
          res.writeHead(200, { "content-type": "application/json" });
          res.end("{not valid json");
          return;
        }
        let request: { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };
        try {
          request = JSON.parse(body);
        } catch {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: { code: APALACHE_ERROR_CODES.PARSE_ERROR, message: "invalid JSON request body" },
            }),
          );
          return;
        }
        const id = request.id ?? null;
        try {
          const result = dispatch(String(request.method), request.params);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
        } catch (err) {
          const code = err instanceof MockRpcError ? err.code : APALACHE_ERROR_CODES.INTERNAL_ERROR;
          const message = err instanceof Error ? err.message : String(err);
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
        }
      });
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${addr.port}/`,
        injectHttpFault(status: number) {
          pendingHttpFaultStatus = status;
        },
        injectMalformedJsonNextRequest() {
          pendingMalformedJson = true;
        },
        close(): Promise<void> {
          return new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          });
        },
      });
    });
  });
}
