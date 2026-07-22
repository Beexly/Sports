/**
 * Directive §9 — authoritative claim/idempotency, provider-exact dispatch,
 * durable attempts, blocked decisions, and the observability split.
 *
 * Structure:
 *   1. Claim semantics (§9.2)     — replay, IN_PROGRESS, fenced steal,
 *                                   fingerprint conflict, terminal replay.
 *   2. Fail-closed authority (§9.1) — store down / attempt refusal block
 *                                   dispatch BEFORE any provider call.
 *   3. Observability split (§9.1/§9.7) — post-success telemetry failure never
 *                                   retries the paid call; recovery is queued.
 *   4. Exact provider dispatch (§9.3) — one adapter = one transport, nested
 *                                   fallback structurally impossible.
 *   5. Control-plane fallback + ambiguity (§9.3/§9.4).
 *   6. Blocked decisions (§9.6)   — durable non-dispatchable incidents.
 *
 * The SQL-level atomicity of the claim (100 concurrent claimers → one
 * ACQUIRED against real Postgres) is proven separately in
 * ai-control-plane-claim-pg.test.ts.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import type {
  AiTaskInvocationRequest,
  EffectiveAuthority,
  ProviderRouteId,
} from "@/lib/ai-control-plane/contracts";
import {
  AmbiguousCharge,
  InvalidInput,
  PolicyBlocked,
  ProviderUnavailable,
  StoreUnavailable,
} from "@/lib/ai-control-plane/errors";
import {
  createAiExecutor,
  createLedgeredDispatch,
  computeRequestFingerprint,
  canonicalJson,
  sha256Hex,
  deriveProviderPayload,
  dispatchAnthropicDirect,
  dispatchBedrock,
  dispatchCerebras,
  dispatchLocal,
  createProviderDispatchers,
  failClosedReceiptStore,
  ObservabilitySink,
  type AiDispatchPlan,
  type AuthoritativeControlStore,
  type BlockedInvocationInput,
  type ClaimInvocationInput,
  type ClaimOutcome,
  type ControlSqlClient,
  type ProviderDispatchFn,
  type SealedAiExecutorDependencies,
  failClosedCreditAuthorizationPort,
} from "@/lib/ai-control-plane/internal";
import { getTaskPolicy } from "@/lib/ai-control-plane/policy-registry";
import { resolveEffectiveAuthority } from "@/lib/ai-control-plane/validation";
import { serviceActor } from "@/lib/auth/actor";

const NOW = new Date("2026-07-22T12:00:00.000Z");
const ACTOR = serviceActor({ subjectId: "service:invocation-tests" });

function validRequest(
  overrides: Partial<AiTaskInvocationRequest> = {},
): AiTaskInvocationRequest {
  return {
    taskClass: "brief.daily-summary",
    requestId: "req-invocation-0001",
    actor: ACTOR,
    entity: "GSE",
    input: { user: "summarize the slate", maxTokens: 64 },
    ...overrides,
  };
}

function authorityFor(request: AiTaskInvocationRequest): EffectiveAuthority {
  return resolveEffectiveAuthority(
    getTaskPolicy(request.taskClass),
    request.narrowing,
  );
}

function makePlan(overrides: Partial<AiDispatchPlan> = {}): AiDispatchPlan {
  const request = overrides.request ?? validRequest();
  return {
    request,
    authority: authorityFor(request),
    costMode: "CONFIRMED_CREDITS_ONLY",
    maxVendorCashUsd: 0,
    fundingLabel: "CREDIT_ELIGIBLE_UNCONFIRMED",
    envClass: "test",
    envClassSource: "explicit",
    ...overrides,
  };
}

// ─── In-memory authoritative store (semantic mirror of the PG store) ──────────

interface MemInvocation {
  id: string;
  requestId: string;
  taskClass: string;
  status: string;
  requestFingerprint: string;
  executionOwnerToken: string | null;
  leaseExpiresAt: Date | null;
  stealCount: number;
  resultJson: string | null;
  resultHash: string | null;
  blockedReasonCode: string | null;
}

interface MemAttempt {
  id: string;
  invocationId: string;
  ordinal: number;
  providerRequested: string;
  providerUsed: string | null;
  modelRequested: string;
  modelResolved: string | null;
  status: string;
  errorCode: string | null;
}

class MemStore implements AuthoritativeControlStore {
  invocations = new Map<string, MemInvocation>();
  attempts: MemAttempt[] = [];
  attributions: Array<{ invocationId: string; estimatedGrossUsd: number; fundingLabel: string }> = [];

  private key(requestId: string, taskClass: string): string {
    return `${requestId}::${taskClass}`;
  }

  async claimInvocation(input: ClaimInvocationInput): Promise<ClaimOutcome> {
    const k = this.key(input.requestId, input.taskClass);
    const existing = this.invocations.get(k);
    const expires = new Date(input.now.getTime() + input.leaseMs);
    if (existing === undefined) {
      this.invocations.set(k, {
        id: input.invocationId,
        requestId: input.requestId,
        taskClass: input.taskClass,
        status: "RUNNING",
        requestFingerprint: input.requestFingerprint,
        executionOwnerToken: input.ownerToken,
        leaseExpiresAt: expires,
        stealCount: 0,
        resultJson: null,
        resultHash: null,
        blockedReasonCode: null,
      });
      return {
        kind: "ACQUIRED",
        invocationId: input.invocationId,
        stolen: false,
        nextOrdinal: 0,
      };
    }
    if (existing.requestFingerprint !== input.requestFingerprint) {
      return {
        kind: "FINGERPRINT_CONFLICT",
        invocationId: existing.id,
        existingFingerprint: existing.requestFingerprint,
      };
    }
    if (existing.status !== "RUNNING") {
      return {
        kind: "REPLAY_TERMINAL",
        invocationId: existing.id,
        status: existing.status,
        output:
          existing.resultJson === null ? null : JSON.parse(existing.resultJson),
        resultHash: existing.resultHash,
        attempts: this.attempts
          .filter((a) => a.invocationId === existing.id)
          .map((a) => ({
            ordinal: a.ordinal,
            providerRequested: a.providerRequested as ProviderRouteId,
            providerUsed: a.providerUsed as ProviderRouteId | null,
            modelRequested: a.modelRequested,
            modelResolved: a.modelResolved,
            status: a.status as "SUCCEEDED",
            ...(a.errorCode ? { errorCode: a.errorCode } : {}),
          })),
      };
    }
    const live =
      existing.leaseExpiresAt !== null &&
      existing.leaseExpiresAt.getTime() > input.now.getTime();
    if (live) return { kind: "IN_PROGRESS", invocationId: existing.id };
    // Fenced steal.
    existing.executionOwnerToken = input.ownerToken;
    existing.leaseExpiresAt = expires;
    existing.stealCount += 1;
    const maxOrdinal = this.attempts
      .filter((a) => a.invocationId === existing.id)
      .reduce((m, a) => Math.max(m, a.ordinal), -1);
    return {
      kind: "ACQUIRED",
      invocationId: existing.id,
      stolen: true,
      nextOrdinal: maxOrdinal + 1,
    };
  }

  private held(invocationId: string, ownerToken: string): MemInvocation | null {
    for (const inv of this.invocations.values()) {
      if (inv.id === invocationId) {
        return inv.executionOwnerToken === ownerToken && inv.status === "RUNNING"
          ? inv
          : null;
      }
    }
    return null;
  }

  async startAttempt(input: Parameters<AuthoritativeControlStore["startAttempt"]>[0]): Promise<void> {
    const inv = this.held(input.invocationId, input.ownerToken);
    if (inv === null || inv.leaseExpiresAt === null || inv.leaseExpiresAt <= input.now) {
      throw new StoreUnavailable("lease not held — attempt refused");
    }
    this.attempts.push({
      id: input.attemptId,
      invocationId: input.invocationId,
      ordinal: input.ordinal,
      providerRequested: input.providerRequested,
      providerUsed: null,
      modelRequested: input.modelRequested,
      modelResolved: null,
      status: "DISPATCHED",
      errorCode: null,
    });
  }

  async recordAttemptFailure(input: Parameters<AuthoritativeControlStore["recordAttemptFailure"]>[0]): Promise<void> {
    if (this.held(input.invocationId, input.ownerToken) === null) {
      throw new StoreUnavailable("fenced out — failure record refused");
    }
    const attempt = this.attempts.find((a) => a.id === input.attemptId);
    if (!attempt) throw new StoreUnavailable("attempt row missing");
    attempt.status = input.status;
    attempt.providerUsed = input.providerUsed;
    attempt.errorCode = input.errorCode;
  }

  async createAttribution(input: Parameters<AuthoritativeControlStore["createAttribution"]>[0]): Promise<void> {
    if (!this.attributions.some((a) => a.invocationId === input.invocationId)) {
      this.attributions.push({
        invocationId: input.invocationId,
        estimatedGrossUsd: input.estimatedGrossUsd,
        fundingLabel: input.fundingLabel,
      });
    }
  }

  async finalizeSuccess(input: Parameters<AuthoritativeControlStore["finalizeSuccess"]>[0]): Promise<boolean> {
    const inv = this.held(input.invocationId, input.ownerToken);
    if (inv === null) return false; // fenced
    inv.status = "SUCCEEDED";
    inv.resultJson = input.resultJson;
    inv.resultHash = input.resultHash;
    inv.leaseExpiresAt = null;
    const attempt = this.attempts.find((a) => a.id === input.attemptId);
    if (attempt) {
      attempt.status = "SUCCEEDED";
      attempt.providerUsed = input.providerUsed;
      attempt.modelResolved = input.modelResolved;
    }
    return true;
  }

  async finalizeFailure(input: Parameters<AuthoritativeControlStore["finalizeFailure"]>[0]): Promise<boolean> {
    const inv = this.held(input.invocationId, input.ownerToken);
    if (inv === null) return false;
    inv.status = input.status;
    inv.leaseExpiresAt = null;
    return true;
  }

  async recordBlockedInvocation(input: BlockedInvocationInput): Promise<void> {
    const k = this.key(input.requestId, input.taskClass);
    if (this.invocations.has(k)) return;
    this.invocations.set(k, {
      id: input.invocationId,
      requestId: input.requestId,
      taskClass: input.taskClass,
      status: "BLOCKED",
      requestFingerprint: input.requestFingerprint,
      executionOwnerToken: null,
      leaseExpiresAt: null,
      stealCount: 0,
      resultJson: null,
      resultHash: null,
      blockedReasonCode: input.blockedReasonCode,
    });
  }
}

// ─── Pipeline harness ─────────────────────────────────────────────────────────

function successDispatcher(route: ProviderRouteId): ProviderDispatchFn {
  return async () => ({
    kind: "SUCCEEDED",
    providerUsed: route,
    modelResolved: `${route}-model`,
    output: { text: `answer from ${route}` },
    inputTokens: 10,
    outputTokens: 20,
    providerRequestId: null,
  });
}

function neverDispatcher(calls: string[]): ProviderDispatchFn {
  return async () => {
    calls.push("UNEXPECTED_DISPATCH");
    throw new Error("this dispatcher must never run");
  };
}

interface Harness {
  store: MemStore;
  dispatchCalls: string[];
  queueRows: Array<{ kind: string; invocationId: string }>;
  dispatch: ReturnType<typeof createLedgeredDispatch>;
}

function makeHarness(args?: {
  store?: AuthoritativeControlStore;
  dispatchers?: Partial<Record<ProviderRouteId, ProviderDispatchFn>>;
  queueSql?: ControlSqlClient | null;
  now?: () => Date;
}): Harness {
  const store = (args?.store as MemStore) ?? new MemStore();
  const dispatchCalls: string[] = [];
  const queueRows: Array<{ kind: string; invocationId: string }> = [];
  const queueSql: ControlSqlClient | null =
    args?.queueSql !== undefined
      ? args.queueSql
      : {
          async query(text, params) {
            if (text.includes("ai_telemetry_recovery")) {
              queueRows.push({
                kind: String(params[2]),
                invocationId: String(params[1]),
              });
            }
            return [];
          },
        };
  const tracked = (route: ProviderRouteId, fn: ProviderDispatchFn): ProviderDispatchFn =>
    async (payload) => {
      dispatchCalls.push(route);
      return fn(payload);
    };
  const base: Record<ProviderRouteId, ProviderDispatchFn> = {
    "anthropic-direct": successDispatcher("anthropic-direct"),
    bedrock: successDispatcher("bedrock"),
    vertex: successDispatcher("vertex"),
    cerebras: successDispatcher("cerebras"),
    local: successDispatcher("local"),
  };
  for (const [route, fn] of Object.entries(args?.dispatchers ?? {})) {
    base[route as ProviderRouteId] = fn as ProviderDispatchFn;
  }
  const dispatchers = Object.fromEntries(
    Object.entries(base).map(([route, fn]) => [
      route,
      tracked(route as ProviderRouteId, fn),
    ]),
  ) as Record<ProviderRouteId, ProviderDispatchFn>;

  let idCounter = 0;
  const dispatch = createLedgeredDispatch({
    store: (args?.store ?? store) as AuthoritativeControlStore,
    observability: () => new ObservabilitySink(queueSql, () => {}),
    dispatchers,
    now: args?.now ?? (() => NOW),
    idFactory: () => `id-${(idCounter += 1)}`,
    leaseMs: 120_000,
  });
  return { store, dispatchCalls, queueRows, dispatch };
}

// ─── 1. Claim semantics (§9.2) ────────────────────────────────────────────────

describe("§9.2 atomic claim / idempotency semantics", () => {
  it("first claim dispatches exactly once and persists a durable result", async () => {
    const h = makeHarness();
    const outcome = await h.dispatch(makePlan());
    expect(outcome.kind).toBe("COMPLETED");
    if (outcome.kind !== "COMPLETED") return;
    expect(outcome.replayed).toBe(false);
    expect(outcome.telemetryStatus).toBe("OK");
    expect(outcome.output).toEqual({ text: "answer from anthropic-direct" });
    expect(h.dispatchCalls).toEqual(["anthropic-direct"]);
    const inv = [...h.store.invocations.values()][0]!;
    expect(inv.status).toBe("SUCCEEDED");
    expect(inv.resultHash).toBe(
      sha256Hex(canonicalJson({ text: "answer from anthropic-direct" })),
    );
  });

  it("terminal replay returns the ORIGINAL result and never dispatches again", async () => {
    const h = makeHarness();
    await h.dispatch(makePlan());
    const replay = await h.dispatch(makePlan());
    expect(replay.kind).toBe("COMPLETED");
    if (replay.kind !== "COMPLETED") return;
    expect(replay.replayed).toBe(true);
    expect(replay.output).toEqual({ text: "answer from anthropic-direct" });
    // ONE dispatch total across both calls.
    expect(h.dispatchCalls).toEqual(["anthropic-direct"]);
  });

  it("an active RUNNING lease yields IN_PROGRESS and NEVER a second dispatch", async () => {
    const h = makeHarness();
    // Seed a live claim owned by someone else.
    await h.store.claimInvocation({
      invocationId: "other-inv",
      requestId: "req-invocation-0001",
      taskClass: "brief.daily-summary",
      surface: "brief",
      entity: "GSE",
      dataClass: "internal",
      costMode: "CONFIRMED_CREDITS_ONLY",
      envClass: "test",
      envClassSource: "explicit",
      policyVersion: "v",
      actorType: "SERVICE",
      actorSubjectId: "s",
      requestFingerprint: computeRequestFingerprint({
        taskClass: "brief.daily-summary",
        entity: "GSE",
        input: { user: "summarize the slate", maxTokens: 64 },
        narrowing: null,
      }),
      ownerToken: "other-owner",
      leaseMs: 120_000,
      now: NOW,
    });
    const outcome = await h.dispatch(makePlan());
    expect(outcome).toEqual({ kind: "IN_PROGRESS", invocationId: "other-inv" });
    expect(h.dispatchCalls).toEqual([]);
  });

  it("a stale lease is stolen with a fence: the new owner completes, the stale owner's writes are refused", async () => {
    const h = makeHarness();
    const fingerprint = computeRequestFingerprint({
      taskClass: "brief.daily-summary",
      entity: "GSE",
      input: { user: "summarize the slate", maxTokens: 64 },
      narrowing: null,
    });
    // A crashed run: RUNNING, lease already expired at NOW.
    const stale = await h.store.claimInvocation({
      invocationId: "stale-inv",
      requestId: "req-invocation-0001",
      taskClass: "brief.daily-summary",
      surface: "brief",
      entity: "GSE",
      dataClass: "internal",
      costMode: "CONFIRMED_CREDITS_ONLY",
      envClass: "test",
      envClassSource: "explicit",
      policyVersion: "v",
      actorType: "SERVICE",
      actorSubjectId: "s",
      requestFingerprint: fingerprint,
      ownerToken: "stale-owner",
      leaseMs: -1,
      now: NOW,
    });
    expect(stale.kind).toBe("ACQUIRED");
    const outcome = await h.dispatch(makePlan());
    expect(outcome.kind).toBe("COMPLETED");
    const inv = [...h.store.invocations.values()][0]!;
    expect(inv.stealCount).toBe(1);
    expect(inv.status).toBe("SUCCEEDED");
    // The stale owner comes back and tries to finalize: fenced out.
    const applied = await h.store.finalizeSuccess({
      invocationId: "stale-inv",
      ownerToken: "stale-owner",
      attemptId: "whatever",
      providerUsed: "anthropic-direct",
      modelResolved: "m",
      providerRequestId: null,
      inputTokens: null,
      outputTokens: null,
      resultJson: canonicalJson({ text: "stale write" }),
      resultHash: "stale",
      now: NOW,
    });
    expect(applied).toBe(false);
    expect(inv.resultJson).not.toContain("stale write");
  });

  it("same requestId + different payload → hard conflict, no dispatch (§9.2)", async () => {
    const h = makeHarness();
    await h.dispatch(makePlan());
    const changed = makePlan({
      request: validRequest({ input: { user: "DIFFERENT prompt", maxTokens: 64 } }),
    });
    await expect(h.dispatch(changed)).rejects.toBeInstanceOf(InvalidInput);
    expect(h.dispatchCalls).toEqual(["anthropic-direct"]); // only the first
  });

  it("replay of a terminal FAILED invocation re-raises the failure without dispatching", async () => {
    const failAll: ProviderDispatchFn = async () => ({
      kind: "FAILED",
      dispatched: true,
      errorCode: "HTTP_529",
    });
    const h = makeHarness({
      dispatchers: { "anthropic-direct": failAll, bedrock: failAll },
    });
    await expect(h.dispatch(makePlan())).rejects.toBeInstanceOf(ProviderUnavailable);
    const callsAfterFirst = h.dispatchCalls.length;
    await expect(h.dispatch(makePlan())).rejects.toBeInstanceOf(ProviderUnavailable);
    expect(h.dispatchCalls.length).toBe(callsAfterFirst); // replay dispatched nothing
  });

  it("malformed task input fails BEFORE any claim state exists", async () => {
    const h = makeHarness();
    const plan = makePlan({ request: validRequest({ input: { nope: true } }) });
    await expect(h.dispatch(plan)).rejects.toBeInstanceOf(InvalidInput);
    expect(h.store.invocations.size).toBe(0);
    expect(h.dispatchCalls).toEqual([]);
  });
});

// ─── 2. Fail-closed authority (§9.1) ──────────────────────────────────────────

describe("§9.1 authoritative control store fails closed BEFORE dispatch", () => {
  it("control store down → StoreUnavailable, ZERO provider calls", async () => {
    const downStore: AuthoritativeControlStore = {
      claimInvocation: async () => {
        throw new StoreUnavailable("db down");
      },
      startAttempt: async () => {
        throw new StoreUnavailable("db down");
      },
      recordAttemptFailure: async () => {
        throw new StoreUnavailable("db down");
      },
      createAttribution: async () => {
        throw new StoreUnavailable("db down");
      },
      finalizeSuccess: async () => {
        throw new StoreUnavailable("db down");
      },
      finalizeFailure: async () => {
        throw new StoreUnavailable("db down");
      },
      recordBlockedInvocation: async () => {
        throw new StoreUnavailable("db down");
      },
    };
    const calls: string[] = [];
    const h = makeHarness({
      store: downStore,
      dispatchers: {
        "anthropic-direct": neverDispatcher(calls),
        bedrock: neverDispatcher(calls),
      },
    });
    await expect(h.dispatch(makePlan())).rejects.toBeInstanceOf(StoreUnavailable);
    expect(calls).toEqual([]);
  });

  it("a refused pre-dispatch attempt row blocks dispatch (§9.4/§9.8)", async () => {
    const mem = new MemStore();
    const refusingStore: AuthoritativeControlStore = {
      ...memDelegate(mem),
      startAttempt: async () => {
        throw new StoreUnavailable("attempt authorization refused");
      },
    };
    const calls: string[] = [];
    const h = makeHarness({
      store: refusingStore,
      dispatchers: {
        "anthropic-direct": neverDispatcher(calls),
        bedrock: neverDispatcher(calls),
      },
    });
    await expect(h.dispatch(makePlan())).rejects.toBeInstanceOf(StoreUnavailable);
    expect(calls).toEqual([]);
  });
});

function memDelegate(mem: MemStore): AuthoritativeControlStore {
  return {
    claimInvocation: (i) => mem.claimInvocation(i),
    startAttempt: (i) => mem.startAttempt(i),
    recordAttemptFailure: (i) => mem.recordAttemptFailure(i),
    createAttribution: (i) => mem.createAttribution(i),
    finalizeSuccess: (i) => mem.finalizeSuccess(i),
    finalizeFailure: (i) => mem.finalizeFailure(i),
    recordBlockedInvocation: (i) => mem.recordBlockedInvocation(i),
  };
}

// ─── 3. Observability split (§9.1/§9.7/§9.8) ──────────────────────────────────

describe("§9.7 observability failure never retries a successful paid call", () => {
  it("finalize failure after success → result returned, DEGRADED, recovery queued, ONE dispatch", async () => {
    const mem = new MemStore();
    const flakyStore: AuthoritativeControlStore = {
      ...memDelegate(mem),
      finalizeSuccess: async () => {
        throw new StoreUnavailable("store died right after the paid call");
      },
    };
    const h = makeHarness({ store: flakyStore });
    const outcome = await h.dispatch(makePlan());
    expect(outcome.kind).toBe("COMPLETED");
    if (outcome.kind !== "COMPLETED") return;
    expect(outcome.telemetryStatus).toBe("DEGRADED");
    expect(outcome.output).toEqual({ text: "answer from anthropic-direct" });
    expect(h.dispatchCalls).toEqual(["anthropic-direct"]); // never retried
    expect(h.queueRows).toEqual([
      { kind: "FINALIZE_SUCCESS", invocationId: expect.any(String) },
    ]);
  });

  it("even the recovery QUEUE being down still returns the provider result", async () => {
    const mem = new MemStore();
    const flakyStore: AuthoritativeControlStore = {
      ...memDelegate(mem),
      finalizeSuccess: async () => {
        throw new StoreUnavailable("store down");
      },
    };
    const h = makeHarness({
      store: flakyStore,
      queueSql: {
        async query() {
          throw new Error("queue down too");
        },
      },
    });
    const outcome = await h.dispatch(makePlan());
    expect(outcome.kind).toBe("COMPLETED");
    if (outcome.kind !== "COMPLETED") return;
    expect(outcome.telemetryStatus).toBe("DEGRADED");
    expect(h.dispatchCalls).toEqual(["anthropic-direct"]);
  });

  it("a fenced finalize (lease stolen mid-flight) degrades + queues, never re-dispatches", async () => {
    const mem = new MemStore();
    const fencedStore: AuthoritativeControlStore = {
      ...memDelegate(mem),
      finalizeSuccess: async () => false,
    };
    const h = makeHarness({ store: fencedStore });
    const outcome = await h.dispatch(makePlan());
    expect(outcome.kind).toBe("COMPLETED");
    if (outcome.kind !== "COMPLETED") return;
    expect(outcome.telemetryStatus).toBe("DEGRADED");
    expect(h.queueRows.map((r) => r.kind)).toEqual(["FINALIZE_SUCCESS"]);
    expect(h.dispatchCalls).toEqual(["anthropic-direct"]);
  });
});

// ─── 4. Exact provider dispatch (§9.3) ────────────────────────────────────────

function fetchRecorder(
  responder: (url: string) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    return responder(url);
  }) as typeof fetch;
  return { fetchImpl, urls };
}

const payload = {
  modelRequested: "claude-sonnet-4-6",
  system: "sys",
  user: "hello",
  maxTokens: 32,
};

describe("§9.3 exact per-provider adapters — no nested fallback possible", () => {
  it("anthropic-direct hits ONLY the Anthropic API", async () => {
    const { fetchImpl, urls } = fetchRecorder(() =>
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "hi" }],
          usage: { input_tokens: 1, output_tokens: 2 },
        }),
        { status: 200 },
      ),
    );
    const outcome = await dispatchAnthropicDirect({ ANTHROPIC_API_KEY: "k" })({
      ...payload,
      fetchImpl,
    });
    expect(outcome.kind).toBe("SUCCEEDED");
    if (outcome.kind !== "SUCCEEDED") return;
    expect(outcome.providerUsed).toBe("anthropic-direct");
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("api.anthropic.com");
  });

  it("bedrock adapter NEVER falls back to the direct Anthropic API on error", async () => {
    const { fetchImpl, urls } = fetchRecorder(
      () => new Response("boom", { status: 500 }),
    );
    const env = {
      AWS_ACCESS_KEY_ID: "AKIAX",
      AWS_SECRET_ACCESS_KEY: "s",
      AWS_REGION: "us-east-1",
      ANTHROPIC_API_KEY: "k", // present and MUST NOT be used
      BEDROCK_MODEL_MAP: '{"claude-sonnet-4-6":"anthropic.claude-sonnet"}',
    };
    const outcome = await dispatchBedrock(env)({ ...payload, fetchImpl });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind === "SUCCEEDED") return;
    expect(outcome.dispatched).toBe(true);
    expect(outcome.errorCode).toBe("HTTP_500");
    // Every network call went to Bedrock; zero to Anthropic.
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toContain("bedrock-runtime");
      expect(url).not.toContain("anthropic.com");
    }
  });

  it("an unconfigured route reports dispatched=false and makes NO network call", async () => {
    const { fetchImpl, urls } = fetchRecorder(() => new Response("", { status: 200 }));
    const bedrock = await dispatchBedrock({})({ ...payload, fetchImpl });
    const cerebras = await dispatchCerebras({})({ ...payload, fetchImpl });
    const local = await dispatchLocal({})({ ...payload, fetchImpl });
    for (const outcome of [bedrock, cerebras, local]) {
      expect(outcome.kind).toBe("FAILED");
      if (outcome.kind === "SUCCEEDED") continue;
      expect(outcome.dispatched).toBe(false);
      expect(outcome.errorCode).toContain("PROVIDER_CONFIG");
    }
    expect(urls).toEqual([]);
  });

  it("every registered provider route has exactly one adapter", () => {
    const table = createProviderDispatchers({});
    expect(Object.keys(table).sort()).toEqual(
      ["anthropic-direct", "bedrock", "cerebras", "local", "vertex"].sort(),
    );
  });
});

// ─── 5. Control-plane fallback + ambiguity (§9.3/§9.4) ────────────────────────

describe("§9.3 the control plane alone owns fallback order", () => {
  it("clean failure on route 1 → route 2 tried; two durable attempt rows; failed row never claims to have served", async () => {
    const h = makeHarness({
      dispatchers: {
        "anthropic-direct": async () => ({
          kind: "FAILED",
          dispatched: true,
          errorCode: "HTTP_529",
        }),
      },
    });
    const outcome = await h.dispatch(makePlan());
    expect(outcome.kind).toBe("COMPLETED");
    if (outcome.kind !== "COMPLETED") return;
    expect(h.dispatchCalls).toEqual(["anthropic-direct", "bedrock"]);
    expect(h.store.attempts).toHaveLength(2);
    const [first, second] = h.store.attempts;
    expect(first!.ordinal).toBe(0);
    expect(first!.status).toBe("FAILED");
    expect(first!.modelResolved).toBeNull(); // never "served"
    expect(second!.ordinal).toBe(1);
    expect(second!.status).toBe("SUCCEEDED");
    expect(second!.providerUsed).toBe("bedrock");
  });

  it("AMBIGUOUS after dispatch STOPS the walk — same funds are never re-spent", async () => {
    const calls: string[] = [];
    const h = makeHarness({
      dispatchers: {
        "anthropic-direct": async () => ({
          kind: "AMBIGUOUS",
          dispatched: true,
          errorCode: "SOCKET_DROP",
        }),
        bedrock: neverDispatcher(calls),
      },
    });
    await expect(h.dispatch(makePlan())).rejects.toBeInstanceOf(AmbiguousCharge);
    expect(calls).toEqual([]);
    const inv = [...h.store.invocations.values()][0]!;
    expect(inv.status).toBe("AMBIGUOUS");
    // Replay of the ambiguous terminal also refuses to dispatch.
    await expect(h.dispatch(makePlan())).rejects.toBeInstanceOf(AmbiguousCharge);
    expect(calls).toEqual([]);
  });

  it("one attribution per invocation: estimate + funding intent only", async () => {
    const h = makeHarness();
    await h.dispatch(makePlan());
    expect(h.store.attributions).toEqual([
      {
        invocationId: expect.any(String),
        estimatedGrossUsd: 0,
        fundingLabel: "CREDIT_ELIGIBLE_UNCONFIRMED",
      },
    ]);
  });
});

// ─── 6. Blocked decisions (§9.6) + executor integration ───────────────────────

describe("§9.6 blocked decisions become durable non-dispatchable incidents", () => {
  function executorDeps(
    mem: MemStore,
    plans: AiDispatchPlan[],
  ): SealedAiExecutorDependencies {
    return {
      // Unset LLM_COST_MODE in test env → NO_BILLABLE_EXTERNAL; the policy
      // grants no "local" route → PolicyBlocked BEFORE the dispatch seam.
      env: { AI_ENV_CLASS: "test" },
      now: () => NOW,
      policies: { getTaskPolicy },
      receipts: failClosedReceiptStore,
      // §10.8: the fail-closed port — no test in this suite reaches a
      // credit-funded dispatch, and if one did it would (correctly) block.
      credit: failClosedCreditAuthorizationPort,
      recordBlocked: async (record) => {
        await mem.recordBlockedInvocation({
          invocationId: `blocked-${record.request.requestId}`,
          requestId: record.request.requestId,
          taskClass: record.request.taskClass,
          surface: record.surface,
          entity: record.request.entity,
          dataClass: record.dataClass,
          costMode: record.costMode,
          envClass: record.envClass,
          envClassSource: record.envClassSource,
          policyVersion: record.policyVersion,
          actorType: record.request.actor.actorType,
          actorSubjectId: record.request.actor.subjectId,
          requestFingerprint: computeRequestFingerprint({
            taskClass: record.request.taskClass,
            entity: record.request.entity,
            input: record.request.input,
            narrowing: record.request.narrowing ?? null,
          }),
          blockedReasonCode: record.reasonCode,
          blockedDetail: record.detail,
        });
      },
      dispatch: async (plan) => {
        plans.push(plan);
        return {
          kind: "COMPLETED",
          invocationId: "should-not-happen",
          output: null,
          attempts: [],
          telemetryStatus: "OK",
          replayed: false,
        };
      },
    };
  }

  it("a policy block persists a BLOCKED row WITHOUT any provider call", async () => {
    const mem = new MemStore();
    const plans: AiDispatchPlan[] = [];
    const executor = createAiExecutor(executorDeps(mem, plans));
    await expect(executor.executeAiTask(validRequest())).rejects.toBeInstanceOf(
      PolicyBlocked,
    );
    expect(plans).toEqual([]); // never reached the dispatch seam
    const row = [...mem.invocations.values()][0]!;
    expect(row.status).toBe("BLOCKED");
    expect(row.blockedReasonCode).toBe("POLICY_BLOCKED");
    expect(row.executionOwnerToken).toBeNull(); // non-dispatchable
  });

  it("a later claim on the BLOCKED row refuses to dispatch", async () => {
    const mem = new MemStore();
    const plans: AiDispatchPlan[] = [];
    const executor = createAiExecutor(executorDeps(mem, plans));
    await expect(executor.executeAiTask(validRequest())).rejects.toBeInstanceOf(
      PolicyBlocked,
    );
    // Same request now goes through a working pipeline: the durable BLOCKED
    // decision short-circuits it (terminal replay of a non-dispatchable state).
    const h = makeHarness({ store: memDelegate(mem) });
    await expect(h.dispatch(makePlan())).rejects.toBeInstanceOf(PolicyBlocked);
    expect(h.dispatchCalls).toEqual([]);
  });

  it("a recorder failure never masks the authoritative block", async () => {
    const mem = new MemStore();
    const plans: AiDispatchPlan[] = [];
    const deps = executorDeps(mem, plans);
    const executor = createAiExecutor({
      ...deps,
      recordBlocked: async () => {
        throw new Error("owner queue down");
      },
    });
    await expect(executor.executeAiTask(validRequest())).rejects.toBeInstanceOf(
      PolicyBlocked,
    );
  });
});

// ─── Payload derivation + fingerprint unit checks ─────────────────────────────

describe("payload derivation and canonical fingerprint", () => {
  it("fingerprints are stable under key order and sensitive to values", () => {
    const a = computeRequestFingerprint({
      taskClass: "t",
      entity: "GSE",
      input: { x: 1, y: [1, 2] },
      narrowing: null,
    });
    const b = computeRequestFingerprint({
      taskClass: "t",
      entity: "GSE",
      input: { y: [1, 2], x: 1 },
      narrowing: null,
    });
    const c = computeRequestFingerprint({
      taskClass: "t",
      entity: "GSE",
      input: { y: [2, 1], x: 1 },
      narrowing: null,
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("rejects non-object, missing-user, and oversized-token inputs", () => {
    expect(() => deriveProviderPayload("nope", "m")).toThrow(InvalidInput);
    expect(() => deriveProviderPayload({ system: "s" }, "m")).toThrow(InvalidInput);
    expect(() =>
      deriveProviderPayload({ user: "u", maxTokens: 10_000_000 }, "m"),
    ).toThrow(InvalidInput);
    const ok = deriveProviderPayload({ user: "u" }, "model-x");
    expect(ok).toEqual({
      modelRequested: "model-x",
      system: "",
      user: "u",
      maxTokens: 1024,
    });
  });
});
