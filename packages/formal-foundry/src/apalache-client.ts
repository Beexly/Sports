/**
 * GSE Formal Foundry — Apalache JSON-RPC Client
 * Interactive explorer server client for relative-inductiveness checks.
 * Fail-closed on transport / solver unknown / timeout.
 */

import { ApalacheRpcError } from "./types";
import type { ItfState } from "./itf";

export interface LoadSpecResult {
  sessionId: string;
  transitions?: { index: number; labels?: string[] }[];
  invariants?: { index: number; name?: string }[];
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
    exports: string[] = []
  ): Promise<LoadSpecResult> {
    const result = await this.rpc("loadSpec", {
      sources,
      invariants,
      exports,
    });
    this.sessionId = result.sessionId;
    return result;
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
    checkEnabled = true
  ): Promise<{ transitionStatus?: string }> {
    this.requireSession();
    return this.rpc("assumeTransition", {
      sessionId: this.sessionId,
      transitionId,
      checkEnabled,
    });
  }

  async checkInvariant(
    invariantId: string | number
  ): Promise<{ invariantStatus: "SATISFIED" | "VIOLATED" | string; trace?: unknown }> {
    this.requireSession();
    return this.rpc("checkInvariant", {
      sessionId: this.sessionId,
      invariantId,
    });
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

  async compact(snapshotId?: string): Promise<{ snapshotId?: string }> {
    this.requireSession();
    return this.rpc("compact", {
      sessionId: this.sessionId,
      snapshotId,
    });
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

  private async rpc(method: string, params: Record<string, unknown>): Promise<any> {
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
      throw new ApalacheRpcError(
        `Transport error: ${(err as Error).message}`,
        undefined,
        err
      );
    }

    const data = await res.json();
    if (data.error) {
      throw new ApalacheRpcError(
        data.error.message || "Apalache RPC error",
        data.error.code,
        data.error.data
      );
    }
    return data.result;
  }
}
