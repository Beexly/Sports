/**
 * GSE Formal Foundry — Apalache JSON-RPC Client
 * Interactive explorer server client for relative-inductiveness checks.
 * Fail-closed on transport / solver unknown / timeout.
 *
 * HONESTY STATEMENT: no Apalache binary or JAR has ever been available in
 * this environment, and no real Apalache server has ever been reachable
 * from it (see this repo's `formal/README.md` and
 * `formal/INDUCTION_DOCTRINE.md` §8, branch `labs/constellation-wave3-inductive` —
 * Apalache's GitHub release assets are egress-restricted here, and unlike
 * TLC's `tla2tools.jar`, no non-GitHub mirror was found for Apalache).
 * Consequently:
 *   - This file has NEVER been run against a real Apalache server.
 *   - Its test coverage (src/tests/apalache-client.test.ts,
 *     src/tests/ic3-controller.test.ts) runs exclusively against a MOCK
 *     JSON-RPC server this same package builds
 *     (src/mock/apalache-mock-server.ts) — proving this client's
 *     request/response wiring and error-interpretation logic are internally
 *     consistent. It proves NOTHING about wire-compatibility with a real
 *     Apalache release. Every method name / param shape below is this
 *     client's OWN reconstruction of a plausible JSON-RPC front end for
 *     Apalache's documented interactive/incremental checking concepts, not
 *     a transcription of a verified Apalache artifact.
 */

import {
  ApalacheProtocolError,
  ApalacheRpcError,
  ApalacheTransportError,
  apalacheErrorForCode,
} from "./types";
import type { ItfState } from "./itf";

export interface LoadSpecResult {
  sessionId: string;
  transitions?: { index: number; labels?: string[] }[];
  invariants?: { index: number; name?: string }[];
}

/** Minimal runtime shape guard: every RPC result this client trusts is
 *  validated at least this much before being handed back typed — the
 *  server is untrusted input as far as this client is concerned. */
function expectObject(v: unknown, method: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new ApalacheProtocolError(`${method}: expected an object result, got ${JSON.stringify(v)}`);
  }
  return v as Record<string, unknown>;
}

function expectString(v: unknown, method: string, field: string): string {
  if (typeof v !== "string") {
    throw new ApalacheProtocolError(`${method}: expected "${field}" to be a string, got ${JSON.stringify(v)}`);
  }
  return v;
}

export class ApalacheJsonRpcClient {
  private baseUrl: string;
  private sessionId: string | null = null;

  constructor(baseUrl = "http://localhost:8822/rpc") {
    this.baseUrl = baseUrl;
  }

  async health(): Promise<unknown> {
    return this.rpc("health", {});
  }

  async loadSpec(
    sources: string[],
    invariants: string[] = [],
    exports: string[] = [],
  ): Promise<LoadSpecResult> {
    const result = expectObject(
      await this.rpc("loadSpec", { sources, invariants, exports }),
      "loadSpec",
    );
    const sessionId = expectString(result["sessionId"], "loadSpec", "sessionId");
    this.sessionId = sessionId;
    return result as unknown as LoadSpecResult;
  }

  async assumeState(state: ItfState | Record<string, unknown>): Promise<unknown> {
    this.requireSession();
    return this.rpc("assumeState", {
      sessionId: this.sessionId,
      state,
    });
  }

  async assumeTransition(
    transitionId: number | string,
    checkEnabled = true,
  ): Promise<{ transitionStatus?: string }> {
    this.requireSession();
    const result = expectObject(
      await this.rpc("assumeTransition", {
        sessionId: this.sessionId,
        transitionId,
        checkEnabled,
      }),
      "assumeTransition",
    );
    return result as unknown as { transitionStatus?: string };
  }

  async checkInvariant(
    invariantId: string | number,
  ): Promise<{ invariantStatus: "SATISFIED" | "VIOLATED" | string; trace?: unknown }> {
    this.requireSession();
    const result = expectObject(
      await this.rpc("checkInvariant", {
        sessionId: this.sessionId,
        invariantId,
      }),
      "checkInvariant",
    );
    expectString(result["invariantStatus"], "checkInvariant", "invariantStatus");
    return result as unknown as { invariantStatus: "SATISFIED" | "VIOLATED" | string; trace?: unknown };
  }

  async query(kinds: string[] = ["STATE"]): Promise<unknown> {
    this.requireSession();
    return this.rpc("query", {
      sessionId: this.sessionId,
      kinds,
    });
  }

  async rollback(snapshotId: string): Promise<unknown> {
    this.requireSession();
    return this.rpc("rollback", {
      sessionId: this.sessionId,
      snapshotId,
    });
  }

  /**
   * Materialize the current incremental assumption stack into a named,
   * rollback-able snapshot (this client's own convention for how a
   * `snapshotId` handle is minted — see ic3-controller.ts's `init` for the
   * concrete "loadSpec -> assumeTransition(Init) -> compact()" bootstrap
   * sequence this exists to support).
   */
  async compact(snapshotId?: string): Promise<{ snapshotId?: string }> {
    this.requireSession();
    const result = expectObject(
      await this.rpc("compact", {
        sessionId: this.sessionId,
        snapshotId,
      }),
      "compact",
    );
    return result as unknown as { snapshotId?: string };
  }

  async applyInOrder(ops: unknown[]): Promise<unknown> {
    this.requireSession();
    return this.rpc("applyInOrder", {
      sessionId: this.sessionId,
      ops,
    });
  }

  async disposeSpec(): Promise<void> {
    if (!this.sessionId) return;
    await this.rpc("disposeSpec", { sessionId: this.sessionId });
    this.sessionId = null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  private requireSession(): void {
    if (!this.sessionId) {
      throw new ApalacheRpcError("No active session — call loadSpec first");
    }
  }

  /**
   * FIXED (was this package's two real defects at this layer):
   *   1. Used to return `Promise<any>` (banned under this repo's TS-strict,
   *      no-`any` rule) — now returns `Promise<unknown>`, and every typed
   *      public method above narrows/validates the shape it needs via
   *      `expectObject`/`expectString` rather than trusting the wire blindly.
   *   2. Used to call `res.json()` OUTSIDE the `try/catch` that wrapped only
   *      the `fetch()` call, and never checked `res.ok` — so an HTTP 500
   *      with an HTML error-page body escaped as a raw, untyped JSON
   *      `SyntaxError` instead of a typed `ApalacheRpcError`. FAIL-CLOSED
   *      now means exactly that: a non-2xx status becomes a typed
   *      `ApalacheTransportError` (status included) BEFORE any body
   *      parsing is attempted, and a body-parse failure (any status) is
   *      its own typed `ApalacheTransportError`, not an escaping raw
   *      exception.
   */
  private async rpc(method: string, params: Record<string, unknown>): Promise<unknown> {
    const body = {
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now(),
    };

    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ApalacheTransportError(`Transport error: ${(err as Error).message}`, err);
    }

    if (!res.ok) {
      throw new ApalacheTransportError(`HTTP ${res.status} ${res.statusText} from ${this.baseUrl}`);
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch (err) {
      throw new ApalacheTransportError(
        `response body was not valid JSON: ${(err as Error).message}`,
        err,
      );
    }

    if (typeof data !== "object" || data === null) {
      throw new ApalacheProtocolError(`response was not a JSON-RPC object: ${JSON.stringify(data)}`);
    }
    const obj = data as Record<string, unknown>;
    if (obj["error"] !== undefined && obj["error"] !== null) {
      const err = obj["error"] as Record<string, unknown>;
      const code = typeof err["code"] === "number" ? err["code"] : undefined;
      const message = typeof err["message"] === "string" ? err["message"] : "Apalache RPC error";
      if (code !== undefined) {
        throw apalacheErrorForCode(code, message, err["data"]);
      }
      throw new ApalacheRpcError(message, undefined, err["data"]);
    }
    if (!("result" in obj)) {
      throw new ApalacheProtocolError(`response has neither "result" nor "error"`);
    }
    return obj["result"];
  }
}
