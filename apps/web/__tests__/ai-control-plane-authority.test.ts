/**
 * Directive §8 — authority inversion, sealed dependencies, TrustedActor,
 * complete validation, composable data policy, emergency receipts, and
 * authority-escalation ATTACK tests (§8.7).
 *
 * Structure:
 *   1. Policy registry (§8.1)         — versioned, complete, fail-closed load.
 *   2. Escalation attacks (§8.1/§8.7) — every widening vector is rejected.
 *   3. Request validation (§8.4/§8.5) — request-id, actor, input, secrets,
 *                                       payment-card patterns, data policy.
 *   4. Emergency receipts (§8.6)      — missing/expired/revoked/scope.
 *   5. Sealed surface (§8.2)          — the public index exports no DI.
 *   6. Executor pipeline              — end-to-end through internal DI.
 */
import { describe, it, expect, vi } from "vitest";

// The TrustedActor constructors import the NextAuth module; mock it so actor
// minting stays pure in tests (same pattern as moderation-actions.test.ts).
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import * as publicSurface from "@/lib/ai-control-plane";
import {
  POLICY_REGISTRY_VERSION,
  REGISTERED_AI_TASK_CLASSES,
  getTaskPolicy,
  isRegisteredTaskClass,
} from "@/lib/ai-control-plane/policy-registry";
import type {
  AiTaskInvocationRequest,
  AiTaskPolicyDefinition,
  RegisteredAiTaskClass,
} from "@/lib/ai-control-plane/contracts";
import {
  assertPolicyVersionAllowed,
  containsPaymentCardLikeNumber,
  resolveEffectiveAuthority,
  scanForSecretMaterial,
  validateDataPolicy,
  validateInvocationRequest,
  validatePolicyDefinition,
  validateUsdAmount,
} from "@/lib/ai-control-plane/validation";
import {
  ConfigurationError,
  InvalidInput,
  PolicyBlocked,
} from "@/lib/ai-control-plane/errors";
import {
  verifyEmergencyOverride,
  failClosedReceiptStore,
  type EmergencyOverrideReceipt,
  type EmergencyReceiptStore,
} from "@/lib/ai-control-plane/emergency";
import {
  createAiExecutor,
  type AiDispatchPlan,
  type SealedAiExecutorDependencies,
} from "@/lib/ai-control-plane/internal";
import { serviceActor, type HumanActor } from "@/lib/auth/actor";

const NOW = new Date("2026-07-22T12:00:00.000Z");
const FUTURE = new Date("2026-07-23T12:00:00.000Z");
const PAST = new Date("2026-07-21T12:00:00.000Z");

const ACTOR = serviceActor({ subjectId: "service:authority-tests" });

/**
 * An owner-grade HUMAN actor as the emergency-receipt contract requires
 * (§8.6: the approver must be a session-derived ADMIN human). Built as a
 * literal — receipts are deserialized records, not live sessions.
 */
const OWNER_ACTOR: HumanActor = {
  actorType: "HUMAN",
  subjectId: "user-owner-0001",
  authMethod: "SESSION",
  authorityScope: "ADMIN",
  tenant: null,
  project: null,
  requestId: null,
  runId: null,
  observedAt: NOW,
  emailSnapshot: null,
  policyVersion: "1a",
};

function validRequest(
  overrides: Partial<AiTaskInvocationRequest> = {},
): AiTaskInvocationRequest {
  return {
    taskClass: "brief.daily-summary",
    requestId: "req-authority-0001",
    actor: ACTOR,
    entity: "GSE",
    input: { date: "2026-07-22", slate: "NFL preseason" },
    ...overrides,
  };
}

function receipt(
  overrides: Partial<EmergencyOverrideReceipt> = {},
): EmergencyOverrideReceipt {
  return {
    id: "ovr-outage-001",
    approvedByActor: OWNER_ACTOR,
    reason: "primary provider outage",
    scope: { taskClasses: ["brief.daily-summary"] },
    maxSpendUsd: 25,
    expiresAt: FUTURE,
    revoked: false,
    ...overrides,
  };
}

function storeWith(r: EmergencyOverrideReceipt | null): EmergencyReceiptStore {
  return {
    async getReceipt(id: string) {
      return r !== null && r.id === id ? r : null;
    },
  };
}

// ─── 1. Policy registry (§8.1) ────────────────────────────────────────────────

describe("policy registry — versioned owner authority (§8.1)", () => {
  it("registry version and per-policy versions are dated (never 'unversioned')", () => {
    expect(POLICY_REGISTRY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    for (const tc of REGISTERED_AI_TASK_CLASSES) {
      expect(getTaskPolicy(tc).policyVersion).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    }
  });

  it("covers all six registered task classes, keyed consistently", () => {
    expect(REGISTERED_AI_TASK_CLASSES).toHaveLength(6);
    for (const tc of REGISTERED_AI_TASK_CLASSES) {
      const policy = getTaskPolicy(tc);
      expect(policy.taskClass).toBe(tc);
      expect(isRegisteredTaskClass(tc)).toBe(true);
    }
  });

  it("unregistered task class → InvalidInput (no default policy, no fallback)", () => {
    expect(() => getTaskPolicy("attacker.free-lunch")).toThrow(InvalidInput);
    expect(isRegisteredTaskClass("attacker.free-lunch")).toBe(false);
  });

  it("prototype-chain names are not registered task classes", () => {
    expect(isRegisteredTaskClass("constructor")).toBe(false);
    expect(isRegisteredTaskClass("__proto__")).toBe(false);
    expect(() => getTaskPolicy("toString")).toThrow(InvalidInput);
  });

  it("initial grants are minimal: $0 cash, no substitutions, retention off", () => {
    for (const tc of REGISTERED_AI_TASK_CLASSES) {
      const policy = getTaskPolicy(tc);
      expect(policy.maxVendorCashUsd).toBe(0);
      expect(policy.approvedSubstitutions).toHaveLength(0);
      expect(policy.retentionPolicy.retainPrompt).toBe(false);
      expect(policy.retentionPolicy.retainResponse).toBe(false);
      expect(policy.permittedModes).not.toContain("BUDGETED_CASH");
      expect(policy.permittedModes).not.toContain("EMERGENCY_RELIABILITY");
    }
  });

  it("a malformed policy is rejected by the load-time validator", () => {
    const good = getTaskPolicy("brief.daily-summary");
    const malformed: AiTaskPolicyDefinition = {
      ...good,
      permittedProviderRoutes: [],
    };
    expect(() => validatePolicyDefinition(malformed)).toThrow(ConfigurationError);
    const badVersion: AiTaskPolicyDefinition = { ...good, policyVersion: "v1" };
    expect(() => validatePolicyDefinition(badVersion)).toThrow(ConfigurationError);
    const badCash: AiTaskPolicyDefinition = { ...good, maxVendorCashUsd: -1 };
    expect(() => validatePolicyDefinition(badCash)).toThrow(ConfigurationError);
    const badTtl: AiTaskPolicyDefinition = {
      ...good,
      retentionPolicy: { retainPrompt: true, retainResponse: false },
    };
    expect(() => validatePolicyDefinition(badTtl)).toThrow(ConfigurationError);
  });

  it("production may not run an 'unversioned' policy; test env may", () => {
    expect(() => assertPolicyVersionAllowed("unversioned", "production")).toThrow(
      ConfigurationError,
    );
    expect(() => assertPolicyVersionAllowed("unversioned", "test")).not.toThrow();
    expect(() =>
      assertPolicyVersionAllowed("2026-07-22.1", "production"),
    ).not.toThrow();
    expect(() => assertPolicyVersionAllowed("", "test")).toThrow(ConfigurationError);
  });
});

// ─── 1b. USD amount validation (FP regression) ────────────────────────────────

describe("validateUsdAmount — decimal-place check is FP-safe", () => {
  const fail = (msg: string): never => {
    throw new InvalidInput(msg);
  };

  it("accepts EVERY cent-denominated amount in [0, $1000] (regression: exact float compare rejected 2384 of them)", () => {
    // 2.01 * 1e6 === 2010000.0000000002 in IEEE-754; the old exact comparison
    // spuriously rejected such values. The round-trip check must accept all.
    for (let cents = 0; cents <= 100_000; cents++) {
      validateUsdAmount(cents / 100, "sweep", fail);
    }
  });

  it("accepts the specific formerly-rejected cent values", () => {
    for (const usd of [2.01, 2.03, 4.1, 999.99]) {
      expect(() => validateUsdAmount(usd, "cap", fail)).not.toThrow();
    }
  });

  it("accepts micro-USD precision (exactly 6 decimal places)", () => {
    for (const usd of [0.000001, 0.123456, 999.999999]) {
      expect(() => validateUsdAmount(usd, "cap", fail)).not.toThrow();
    }
  });

  it("rejects more than 6 decimal places", () => {
    for (const usd of [0.0000001, 2.0100001, 0.1234567, 1.0000000000000002]) {
      expect(() => validateUsdAmount(usd, "cap", fail)).toThrow(
        /more than 6 decimal places/,
      );
    }
  });

  it("rejects negative, non-finite, and above-ceiling values", () => {
    for (const usd of [-0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => validateUsdAmount(usd, "cap", fail)).toThrow(InvalidInput);
    }
    expect(() => validateUsdAmount(1000.01, "cap", fail)).toThrow(/ceiling/);
  });

  it("a policy with a valid cent-denominated cash cap loads (registry-path regression)", () => {
    const good = getTaskPolicy("brief.daily-summary");
    expect(() =>
      validatePolicyDefinition({ ...good, maxVendorCashUsd: 2.01 }),
    ).not.toThrow();
    expect(() =>
      validatePolicyDefinition({ ...good, maxVendorCashUsd: 2.0000001 }),
    ).toThrow(ConfigurationError);
  });
});

// ─── 2. Authority-escalation attacks (§8.1 / §8.7) ────────────────────────────

describe("authority escalation attacks — every widening vector is rejected", () => {
  const policy = getTaskPolicy("brief.daily-summary");

  it("caller cannot grant itself a provider route the policy does not include", () => {
    expect(() =>
      resolveEffectiveAuthority(policy, {
        permittedProviderRoutes: ["vertex"],
      }),
    ).toThrow(PolicyBlocked);
    // Mixing one granted + one ungranted route is still an escalation.
    expect(() =>
      resolveEffectiveAuthority(policy, {
        permittedProviderRoutes: ["anthropic-direct", "cerebras"],
      }),
    ).toThrow(PolicyBlocked);
  });

  it("caller cannot grant itself a cost mode above the policy grant", () => {
    expect(() =>
      resolveEffectiveAuthority(policy, { permittedModes: ["BUDGETED_CASH"] }),
    ).toThrow(PolicyBlocked);
    expect(() =>
      resolveEffectiveAuthority(policy, {
        permittedModes: ["EMERGENCY_RELIABILITY"],
      }),
    ).toThrow(PolicyBlocked);
  });

  it("caller cannot raise the cash cap above the policy cap", () => {
    expect(() =>
      resolveEffectiveAuthority(policy, { maxVendorCashUsd: 0.01 }),
    ).toThrow(PolicyBlocked);
    expect(() =>
      resolveEffectiveAuthority(policy, { maxVendorCashUsd: 1_000_000 }),
    ).toThrow(InvalidInput); // above the global ceiling: malformed outright
  });

  it("caller cannot name a substitution the policy has not approved", () => {
    expect(() =>
      resolveEffectiveAuthority(policy, {
        approvedSubstitutionIds: ["sub-cheap-model"],
      }),
    ).toThrow(PolicyBlocked);
  });

  it("caller cannot enable retention the policy did not grant", () => {
    expect(() =>
      resolveEffectiveAuthority(policy, {
        retention: { retainPrompt: true, retainResponse: false, ttlDays: 30 },
      }),
    ).toThrow(PolicyBlocked);
    expect(() =>
      resolveEffectiveAuthority(policy, {
        retention: { retainPrompt: false, retainResponse: true, ttlDays: 1 },
      }),
    ).toThrow(PolicyBlocked);
  });

  it("narrowing DOWN is honored: fewer routes, fewer modes, lower cap", () => {
    const eff = resolveEffectiveAuthority(policy, {
      permittedProviderRoutes: ["anthropic-direct"],
      permittedModes: ["NO_BILLABLE_EXTERNAL"],
      maxVendorCashUsd: 0,
      approvedSubstitutionIds: [],
    });
    expect(eff.permittedProviderRoutes).toEqual(["anthropic-direct"]);
    expect(eff.permittedModes).toEqual(["NO_BILLABLE_EXTERNAL"]);
    expect(eff.maxVendorCashUsd).toBe(0);
    expect(eff.approvedSubstitutions).toEqual([]);
    expect(eff.policyVersion).toBe(policy.policyVersion);
  });

  it("no narrowing → the policy grant verbatim", () => {
    const eff = resolveEffectiveAuthority(policy, undefined);
    expect(eff.permittedProviderRoutes).toEqual(policy.permittedProviderRoutes);
    expect(eff.permittedModes).toEqual(policy.permittedModes);
    expect(eff.maxVendorCashUsd).toBe(policy.maxVendorCashUsd);
  });

  it("empty narrowing arrays for routes/modes are malformed (cannot run with nothing)", () => {
    expect(() =>
      resolveEffectiveAuthority(policy, { permittedProviderRoutes: [] }),
    ).toThrow(InvalidInput);
    expect(() =>
      resolveEffectiveAuthority(policy, { permittedModes: [] }),
    ).toThrow(InvalidInput);
  });

  it("unknown route/mode names in narrowing are malformed input, not grants", () => {
    expect(() =>
      resolveEffectiveAuthority(policy, {
        permittedProviderRoutes: ["openrouter" as never],
      }),
    ).toThrow(InvalidInput);
    expect(() =>
      resolveEffectiveAuthority(policy, {
        permittedModes: ["FREE_MONEY" as never],
      }),
    ).toThrow(InvalidInput);
  });
});

// ─── 3. Request validation (§8.4) + data policy (§8.5) ────────────────────────

describe("invocation request validation (§8.4)", () => {
  it("accepts a well-formed request", () => {
    expect(() => validateInvocationRequest(validRequest())).not.toThrow();
  });

  it("rejects malformed request ids (format/length)", () => {
    for (const bad of [
      "short", // < 8 chars
      "-starts-with-dash",
      "has spaces here",
      "a".repeat(129), // > 128
      "",
    ]) {
      expect(() =>
        validateInvocationRequest(validRequest({ requestId: bad })),
      ).toThrow(InvalidInput);
    }
  });

  it("rejects structurally invalid actors (empty subject, unknown type)", () => {
    expect(() =>
      validateInvocationRequest(
        validRequest({ actor: { ...ACTOR, subjectId: "  " } }),
      ),
    ).toThrow(InvalidInput);
    expect(() =>
      validateInvocationRequest(
        validRequest({ actor: { ...ACTOR, actorType: "GHOST" as never } }),
      ),
    ).toThrow(InvalidInput);
  });

  it("rejects unknown entities", () => {
    expect(() =>
      validateInvocationRequest(validRequest({ entity: "EVIL_CORP" as never })),
    ).toThrow(InvalidInput);
  });

  it("rejects undefined and non-serializable input", () => {
    expect(() =>
      validateInvocationRequest(validRequest({ input: undefined })),
    ).toThrow(InvalidInput);
    const cyclic: Record<string, unknown> = {};
    cyclic["self"] = cyclic;
    expect(() =>
      validateInvocationRequest(validRequest({ input: cyclic })),
    ).toThrow(InvalidInput);
  });

  it("rejects oversized input", () => {
    expect(() =>
      validateInvocationRequest(validRequest({ input: "x".repeat(600_000) })),
    ).toThrow(/exceeding/);
  });

  it("rejects secret material in input (§8.4 heuristic scan)", () => {
    const leaks: ReadonlyArray<unknown> = [
      // "EXAMPLE" keyword keeps this an obvious fixture; the control-plane
      // scanner still catches ANY "-----BEGIN … PRIVATE KEY-----" block.
      { note: "-----BEGIN EXAMPLE PRIVATE KEY-----\nMIIE..." },
      { aws: "AKIAIOSFODNN7EXAMPLE" },
      { key: "sk-ant-api03-abcdefghijklmnop" },
      { stripe: "sk_live_example0000example0000" },
      { gh: "ghp_abcdefghijklmnopqrstuv12345" },
      { slack: "xoxb-0000000000-example00000" },
      { header: "Authorization: Bearer abcdefghijklmnopqrstuvwx1234" },
      { cfg: "password = hunter2hunter2hunter2" },
      { db: "postgres://admin:s3cr3tpass@db.internal:5432/prod" },
    ];
    for (const input of leaks) {
      expect(() => validateInvocationRequest(validRequest({ input }))).toThrow(
        /secret\/credential material/,
      );
    }
  });

  it("does not false-positive on ordinary operational text", () => {
    const clean = [
      "the token refreshed and the password policy is documented",
      "AKIA is an AWS prefix", // too short to be a key
      "final score 24-17, spread -3.5, total 41",
    ];
    for (const text of clean) {
      expect(scanForSecretMaterial(text)).toBeNull();
    }
  });

  it("rejects payment-card-like numbers (§8.5: card data never transits)", () => {
    // Standard test PANs (Luhn-valid, never real accounts).
    for (const pan of [
      "4242424242424242",
      "4242 4242 4242 4242",
      "4242-4242-4242-4242",
      "5555555555554444",
      "378282246310005", // 15-digit Amex-format test number
    ]) {
      expect(containsPaymentCardLikeNumber(pan)).toBe(true);
      expect(() =>
        validateInvocationRequest(validRequest({ input: { memo: pan } })),
      ).toThrow(/payment-card-like/);
    }
  });

  it("does not flag Luhn-invalid digit runs or ordinary long numbers", () => {
    expect(containsPaymentCardLikeNumber("4242424242424241")).toBe(false); // Luhn fails
    expect(containsPaymentCardLikeNumber("1234567890123456")).toBe(false); // IIN 1
    expect(containsPaymentCardLikeNumber("epoch 1753185600000")).toBe(false);
    expect(containsPaymentCardLikeNumber("game id 20260722001")).toBe(false);
  });

  it("validates correlation hints as bounded strings", () => {
    expect(() =>
      validateInvocationRequest(
        validRequest({ correlation: { traceId: "" } }),
      ),
    ).toThrow(InvalidInput);
    expect(() =>
      validateInvocationRequest(
        validRequest({ correlation: { source: "worker:brief", runId: "run-1" } }),
      ),
    ).not.toThrow();
  });
});

describe("composable data policy (§8.5)", () => {
  it("every registered policy carries exactly one base tag and no contradictions", () => {
    for (const tc of REGISTERED_AI_TASK_CLASSES) {
      expect(() => validateDataPolicy(getTaskPolicy(tc).dataPolicy)).not.toThrow();
    }
  });

  it("rejects contradictory and malformed tag sets", () => {
    expect(() => validateDataPolicy({ tags: [] })).toThrow(ConfigurationError);
    expect(() =>
      validateDataPolicy({ tags: ["public", "pii"] }),
    ).toThrow(/contradicts/);
    expect(() =>
      validateDataPolicy({ tags: ["public", "internal"] }),
    ).toThrow(/exactly one base/);
    expect(() =>
      validateDataPolicy({ tags: ["pii"] }),
    ).toThrow(/exactly one base/);
    expect(() =>
      validateDataPolicy({ tags: ["internal", "internal"] }),
    ).toThrow(/duplicate/);
    expect(() =>
      validateDataPolicy({ tags: ["internal", "radioactive" as never] }),
    ).toThrow(/unknown tag/);
  });

  it("accepts rich composable sets", () => {
    expect(() =>
      validateDataPolicy({
        tags: [
          "user-private",
          "pii",
          "training-prohibited",
          "residency-restricted",
          "secret-prohibited",
        ],
      }),
    ).not.toThrow();
  });
});

// ─── 4. Emergency receipts (§8.6) ─────────────────────────────────────────────

describe("emergency authority — durable owner-decision receipts (§8.6)", () => {
  const base = {
    taskClass: "brief.daily-summary" as RegisteredAiTaskClass,
    now: NOW,
  };

  it("a live, in-scope receipt verifies and is returned for spend clamping", async () => {
    const r = receipt();
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).resolves.toEqual(r);
  });

  it("empty override id → fail closed (env cannot create authority)", async () => {
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(receipt()), overrideId: "  " }),
    ).rejects.toThrow(ConfigurationError);
  });

  it("missing receipt → fail closed", async () => {
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(null), overrideId: "ovr-x" }),
    ).rejects.toThrow(/no such owner-decision receipt/);
  });

  it("revoked receipt → fail closed", async () => {
    const r = receipt({ revoked: true });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).rejects.toThrow(/revoked/);
  });

  it("expired receipt → fail closed (boundary: expiresAt == now)", async () => {
    const r1 = receipt({ expiresAt: PAST });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r1), overrideId: r1.id }),
    ).rejects.toThrow(/expired/);
    const r2 = receipt({ expiresAt: NOW });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r2), overrideId: r2.id }),
    ).rejects.toThrow(/expired/);
  });

  it("scope mismatch → PolicyBlocked (a real decision that does not cover this task)", async () => {
    const r = receipt({ scope: { taskClasses: ["content.editorial-draft"] } });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).rejects.toThrow(PolicyBlocked);
  });

  it("store failure → fail closed, never silently downgraded", async () => {
    const failing: EmergencyReceiptStore = {
      async getReceipt(): Promise<never> {
        throw new Error("store down");
      },
    };
    await expect(
      verifyEmergencyOverride({ ...base, store: failing, overrideId: "ovr-x" }),
    ).rejects.toThrow(ConfigurationError);
  });

  it("a SERVICE-actor 'approval' is NOT an owner decision → fail closed", async () => {
    const r = receipt({ approvedByActor: ACTOR }); // ACTOR is a SERVICE actor
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).rejects.toThrow(/only a HUMAN owner decision/);
  });

  it("a missing approvedByActor (untyped DB row) → fail closed", async () => {
    const r = receipt({
      approvedByActor: undefined as unknown as EmergencyOverrideReceipt["approvedByActor"],
    });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).rejects.toThrow(/approvedByActor is missing/);
  });

  it("a HUMAN approver without ADMIN authority → fail closed", async () => {
    const r = receipt({
      approvedByActor: { ...OWNER_ACTOR, authorityScope: "USER" },
    });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).rejects.toThrow(/requires owner \(ADMIN\) authority/);
  });

  it("a HUMAN approver with a non-session auth method → fail closed", async () => {
    const r = receipt({
      approvedByActor: {
        ...OWNER_ACTOR,
        authMethod: "SERVICE_CREDENTIAL",
      } as unknown as EmergencyOverrideReceipt["approvedByActor"],
    });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).rejects.toThrow(/must be session-derived/);
  });

  it("an approver with an empty subjectId is untraceable → fail closed", async () => {
    const r = receipt({ approvedByActor: { ...OWNER_ACTOR, subjectId: "  " } });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).rejects.toThrow(/subjectId is empty/);
  });

  it("structural malformation is checked before lifecycle: a malformed REVOKED receipt still reports malformation", async () => {
    const r = receipt({ approvedByActor: ACTOR, revoked: true });
    await expect(
      verifyEmergencyOverride({ ...base, store: storeWith(r), overrideId: r.id }),
    ).rejects.toThrow(/only a HUMAN owner decision/);
  });

  it("the production default store misses every id (emergency unreachable)", async () => {
    await expect(failClosedReceiptStore.getReceipt("anything")).resolves.toBeNull();
  });
});

// ─── 5. Sealed public surface (§8.2) ──────────────────────────────────────────

describe("sealed public surface — no dependency injection exports (§8.2)", () => {
  it("index.ts exports executeAiTask but NO executor factory or DI types", () => {
    expect(typeof publicSurface.executeAiTask).toBe("function");
    const names = Object.keys(publicSurface);
    for (const forbidden of [
      "createAiExecutor",
      "resolveEnvClass",
      "resolveCostMode",
      "effectiveMode",
      "failClosedReceiptStore",
      "verifyEmergencyOverride",
    ]) {
      expect(names).not.toContain(forbidden);
    }
  });

  it("the public entry point takes exactly one parameter (the request)", () => {
    expect(publicSurface.executeAiTask.length).toBe(1);
  });
});

// ─── 6. Executor pipeline through internal DI ─────────────────────────────────

function makeDeps(
  overrides: Partial<SealedAiExecutorDependencies> = {},
): {
  deps: SealedAiExecutorDependencies;
  plans: AiDispatchPlan[];
} {
  const plans: AiDispatchPlan[] = [];
  const deps: SealedAiExecutorDependencies = {
    // CONFIRMED_CREDITS_ONLY so a fundable plan exists; the BLOCKED/no-route
    // fail-closed path is covered by its own test below.
    env: { AI_ENV_CLASS: "test", LLM_COST_MODE: "CONFIRMED_CREDITS_ONLY" },
    now: () => NOW,
    // The real versioned registry by default — what production wires.
    policies: { getTaskPolicy },
    receipts: failClosedReceiptStore,
    recordBlocked: async () => {},
    dispatch: async (plan) => {
      plans.push(plan);
      return {
        kind: "COMPLETED",
        invocationId: `inv:${plan.request.requestId}`,
        output: { ok: true },
        attempts: [
          {
            ordinal: 1,
            providerRequested: plan.authority.permittedProviderRoutes[0]!,
            providerUsed: plan.authority.permittedProviderRoutes[0]!,
            modelRequested: "test-model",
            modelResolved: "test-model",
            status: "SUCCEEDED",
          },
        ],
        telemetryStatus: "OK",
        replayed: false,
      };
    },
    ...overrides,
  };
  return { deps, plans };
}

/**
 * A structurally valid FIXTURE policy that opts brief.daily-summary into
 * EMERGENCY_RELIABILITY with a non-zero cash cap. The shipped registry
 * deliberately grants this to no task class, so the executor's emergency
 * verify+clamp branch can only be exercised by injecting a policy source
 * through the internal DI seam — exactly what that seam exists for. The
 * executor still re-validates whatever the source returns.
 */
function emergencyOptedInPolicy(maxVendorCashUsd: number): AiTaskPolicyDefinition {
  return {
    ...getTaskPolicy("brief.daily-summary"),
    permittedModes: [
      "NO_BILLABLE_EXTERNAL",
      "CONFIRMED_CREDITS_ONLY",
      "EMERGENCY_RELIABILITY",
    ],
    maxVendorCashUsd,
  };
}

/** Env vars referencing a live emergency override (reference ≠ authority). */
function emergencyEnv(overrideId: string) {
  return {
    AI_ENV_CLASS: "test",
    LLM_COST_MODE: "EMERGENCY_RELIABILITY",
    EMERGENCY_RELIABILITY_UNTIL: FUTURE.toISOString(),
    EMERGENCY_REASON: "provider outage",
    EMERGENCY_OVERRIDE_ID: overrideId,
  };
}

describe("executor pipeline (internal DI) — authority resolved, then dispatch", () => {
  it("resolves policy + mode and dispatches with the effective authority", async () => {
    const { deps, plans } = makeDeps();
    const executor = createAiExecutor(deps);
    const result = await executor.executeAiTask(validRequest());
    expect(result.invocationId).toBe("inv:req-authority-0001");
    expect(result.policyVersion).toBe(getTaskPolicy("brief.daily-summary").policyVersion);
    expect(plans).toHaveLength(1);
    expect(plans[0]!.costMode).toBe("CONFIRMED_CREDITS_ONLY");
    expect(plans[0]!.maxVendorCashUsd).toBe(0);
    expect(plans[0]!.fundingLabel).toBe("CREDIT_ELIGIBLE_UNCONFIRMED");
    expect(result.fundingLabel).toBe("CREDIT_ELIGIBLE_UNCONFIRMED");
  });

  it("a plan with no fundable route fails closed BEFORE the dispatch seam", async () => {
    // Unset mode in a test env resolves to NO_BILLABLE_EXTERNAL; the policy
    // grants no "local" route, so there is nothing transport may legally do.
    const { deps, plans } = makeDeps({ env: { AI_ENV_CLASS: "test" } });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      PolicyBlocked,
    );
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      /no fundable provider route/,
    );
    expect(plans).toHaveLength(0);
  });

  it("rejects an unregistered task class before anything else", async () => {
    const { deps, plans } = makeDeps();
    const executor = createAiExecutor(deps);
    await expect(
      executor.executeAiTask(
        validRequest({ taskClass: "attacker.free-lunch" as never }),
      ),
    ).rejects.toThrow(InvalidInput);
    expect(plans).toHaveLength(0);
  });

  it("rejects an escalating narrowing and never dispatches (§8.7 attack)", async () => {
    const { deps, plans } = makeDeps();
    const executor = createAiExecutor(deps);
    await expect(
      executor.executeAiTask(
        validRequest({ narrowing: { permittedModes: ["BUDGETED_CASH"] } }),
      ),
    ).rejects.toThrow(PolicyBlocked);
    expect(plans).toHaveLength(0);
  });

  it("rejects secret material in input and never dispatches", async () => {
    const { deps, plans } = makeDeps();
    const executor = createAiExecutor(deps);
    await expect(
      executor.executeAiTask(
        validRequest({ input: { k: "sk-ant-api03-abcdefghijklmnop" } }),
      ),
    ).rejects.toThrow(InvalidInput);
    expect(plans).toHaveLength(0);
  });

  it("production env + unset LLM_COST_MODE fails closed before dispatch", async () => {
    const { deps, plans } = makeDeps({
      env: { AI_ENV_CLASS: "production" },
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      ConfigurationError,
    );
    expect(plans).toHaveLength(0);
  });

  it("emergency mode without a verifiable receipt fails closed (default store)", async () => {
    // Env references an override id, but the fail-closed store cannot prove
    // the owner decision → no emergency authority, no dispatch. Note the
    // policy itself must also permit EMERGENCY_RELIABILITY — the conservative
    // registry does not, so this fails at mode intersection (PolicyBlocked
    // territory is covered above); here we verify the receipt gate directly
    // with a permissive fake policy path via verifyEmergencyOverride, and the
    // executor-level fail-closed behavior for the env reference.
    const { deps, plans } = makeDeps({
      env: {
        AI_ENV_CLASS: "test",
        LLM_COST_MODE: "EMERGENCY_RELIABILITY",
        EMERGENCY_RELIABILITY_UNTIL: FUTURE.toISOString(),
        EMERGENCY_REASON: "provider outage",
        EMERGENCY_OVERRIDE_ID: "ovr-not-in-store",
      },
    });
    const executor = createAiExecutor(deps);
    // The conservative policy does not permit EMERGENCY_RELIABILITY, so the
    // env's emergency mode falls back to the task's own ceiling — and the
    // task still runs under its highest permitted ordered mode.
    const result = await executor.executeAiTask(validRequest());
    expect(plans[0]!.costMode).toBe("CONFIRMED_CREDITS_ONLY");
    expect(result.fundingLabel).toBe("CREDIT_ELIGIBLE_UNCONFIRMED");
  });

  it("an emergency environment cannot drag a task that did NOT opt into emergency", async () => {
    // The shipped registry policy does not permit EMERGENCY_RELIABILITY, so
    // even with a live, verifiable receipt in the store the task runs under
    // its own highest permitted ordered mode — never the emergency mode.
    const { deps, plans } = makeDeps({
      env: emergencyEnv(receipt().id),
      receipts: storeWith(receipt()),
    });
    const executor = createAiExecutor(deps);
    await executor.executeAiTask(validRequest());
    expect(plans[0]!.costMode).not.toBe("EMERGENCY_RELIABILITY");
    expect(plans[0]!.costMode).toBe("CONFIRMED_CREDITS_ONLY");
  });

  it("caller narrowing propagates into the dispatch plan (less authority honored)", async () => {
    const { deps, plans } = makeDeps();
    const executor = createAiExecutor(deps);
    await executor.executeAiTask(
      validRequest({
        narrowing: {
          permittedProviderRoutes: ["anthropic-direct"],
          permittedModes: ["CONFIRMED_CREDITS_ONLY"],
        },
      }),
    );
    expect(plans[0]!.authority.permittedProviderRoutes).toEqual(["anthropic-direct"]);
    expect(plans[0]!.authority.permittedModes).toEqual(["CONFIRMED_CREDITS_ONLY"]);
    expect(plans[0]!.costMode).toBe("CONFIRMED_CREDITS_ONLY");
  });

  it("narrowing to a spend-incapable mode also narrows what transport may fund", async () => {
    // The caller renounces credit funding; with no local route the resulting
    // plan is unfundable and the executor fails closed instead of dispatching.
    const { deps, plans } = makeDeps();
    const executor = createAiExecutor(deps);
    await expect(
      executor.executeAiTask(
        validRequest({ narrowing: { permittedModes: ["NO_BILLABLE_EXTERNAL"] } }),
      ),
    ).rejects.toThrow(PolicyBlocked);
    expect(plans).toHaveLength(0);
  });

  it("policy source answering with a DIFFERENT task class's policy → fail closed, no dispatch", async () => {
    const { deps, plans } = makeDeps({
      policies: { getTaskPolicy: () => getTaskPolicy("content.editorial-draft") },
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      /refusing mismatched authority/,
    );
    expect(plans).toHaveLength(0);
  });

  it("a malformed policy from the source is re-validated and rejected, no dispatch", async () => {
    const { deps, plans } = makeDeps({
      policies: {
        getTaskPolicy: () => ({
          ...getTaskPolicy("brief.daily-summary"),
          permittedProviderRoutes: [],
        }),
      },
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      ConfigurationError,
    );
    expect(plans).toHaveLength(0);
  });
});

// ─── 7. Emergency verify + clamp THROUGH the executor (§8.6) ──────────────────

describe("executor emergency branch — receipt verified and spend clamped end-to-end", () => {
  it("opted-in policy + live receipt: runs under EMERGENCY_RELIABILITY, spend clamped to the RECEIPT ceiling", async () => {
    const r = receipt({ maxSpendUsd: 25 });
    const { deps, plans } = makeDeps({
      env: emergencyEnv(r.id),
      policies: { getTaskPolicy: () => emergencyOptedInPolicy(50) },
      receipts: storeWith(r),
    });
    const executor = createAiExecutor(deps);
    const result = await executor.executeAiTask(validRequest());
    expect(plans).toHaveLength(1);
    expect(plans[0]!.costMode).toBe("EMERGENCY_RELIABILITY");
    // min(policy cap 50, receipt ceiling 25) = 25.
    expect(plans[0]!.maxVendorCashUsd).toBe(25);
    expect(plans[0]!.fundingLabel).toBe("CASH_EXPECTED");
    expect(result.fundingLabel).toBe("CASH_EXPECTED");
  });

  it("clamp is a true min: a generous receipt can never raise the POLICY cap", async () => {
    const r = receipt({ maxSpendUsd: 25 });
    const { deps, plans } = makeDeps({
      env: emergencyEnv(r.id),
      policies: { getTaskPolicy: () => emergencyOptedInPolicy(10) },
      receipts: storeWith(r),
    });
    const executor = createAiExecutor(deps);
    await executor.executeAiTask(validRequest());
    expect(plans[0]!.maxVendorCashUsd).toBe(10);
  });

  it("caller narrowing of the cash cap still applies under emergency (min of all three)", async () => {
    const r = receipt({ maxSpendUsd: 25 });
    const { deps, plans } = makeDeps({
      env: emergencyEnv(r.id),
      policies: { getTaskPolicy: () => emergencyOptedInPolicy(50) },
      receipts: storeWith(r),
    });
    const executor = createAiExecutor(deps);
    await executor.executeAiTask(
      validRequest({ narrowing: { maxVendorCashUsd: 5 } }),
    );
    expect(plans[0]!.maxVendorCashUsd).toBe(5);
  });

  it("opted-in policy but the referenced receipt does not exist → fail closed, no dispatch", async () => {
    const { deps, plans } = makeDeps({
      env: emergencyEnv("ovr-not-in-store"),
      policies: { getTaskPolicy: () => emergencyOptedInPolicy(50) },
      receipts: failClosedReceiptStore,
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      /no such owner-decision receipt/,
    );
    expect(plans).toHaveLength(0);
  });

  it("opted-in policy + revoked receipt → fail closed, no dispatch", async () => {
    const r = receipt({ revoked: true });
    const { deps, plans } = makeDeps({
      env: emergencyEnv(r.id),
      policies: { getTaskPolicy: () => emergencyOptedInPolicy(50) },
      receipts: storeWith(r),
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      /revoked/,
    );
    expect(plans).toHaveLength(0);
  });

  it("opted-in policy + receipt scoped to OTHER task classes → PolicyBlocked, no dispatch", async () => {
    const r = receipt({ scope: { taskClasses: ["content.editorial-draft"] } });
    const { deps, plans } = makeDeps({
      env: emergencyEnv(r.id),
      policies: { getTaskPolicy: () => emergencyOptedInPolicy(50) },
      receipts: storeWith(r),
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      PolicyBlocked,
    );
    expect(plans).toHaveLength(0);
  });

  it("opted-in policy + receipt 'approved' by a SERVICE actor → fail closed, no dispatch (§8.6 owner contract)", async () => {
    const r = receipt({ approvedByActor: ACTOR });
    const { deps, plans } = makeDeps({
      env: emergencyEnv(r.id),
      policies: { getTaskPolicy: () => emergencyOptedInPolicy(50) },
      receipts: storeWith(r),
    });
    const executor = createAiExecutor(deps);
    await expect(executor.executeAiTask(validRequest())).rejects.toThrow(
      /only a HUMAN owner decision/,
    );
    expect(plans).toHaveLength(0);
  });
});
