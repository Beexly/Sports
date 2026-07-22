/**
 * Service/system actor governance + audit receipts (directive 4.2 / 4.3).
 *
 * Acceptance coverage:
 *   - unauthorized (non-allowlisted) service principal is refused;
 *   - missing / invalid credential context is refused;
 *   - operation-scope denial (allowlisted principal, out-of-scope operation);
 *   - SERVICE/SYSTEM actors REQUIRE a runId or requestId;
 *   - audit-receipt completeness: EVERY enumerable field of a minted actor
 *     appears in the persisted receipt record — nothing silently discarded;
 *   - receipt persistence fails closed with a typed error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@sports/db", () => ({
  db: {
    actorReceipt: { create: vi.fn() },
  },
}));

import {
  resolveServiceActor,
  requireSessionActor,
  UnknownServicePrincipalError,
  InvalidServiceCredentialError,
  InvalidActorError,
  ForbiddenError,
  ACTOR_POLICY_VERSION,
  type ResolveServiceActorParams,
  type ServicePrincipalId,
  type VerifiedCredentialContext,
} from "@/lib/auth/actor";
import {
  ActorReceiptUnavailableError,
  persistActorReceipt,
  toActorReceiptRecord,
} from "@/lib/auth/actor-receipt";
import { db } from "@sports/db";

const CRED: VerifiedCredentialContext = {
  method: "TEST_HARNESS",
  verifiedBy: "__tests__/actor-governance",
  verifiedAt: new Date(),
};

function params(overrides: Partial<ResolveServiceActorParams> = {}): ResolveServiceActorParams {
  return {
    principalId: "service:settlement-worker",
    verifiedCredentialContext: CRED,
    operation: "settlement:run",
    runId: "run-1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.actorReceipt.create).mockResolvedValue({ id: "receipt-1" } as never);
});

// ─── Allowlist ────────────────────────────────────────────────────────────────

describe("resolveServiceActor allowlist", () => {
  it("refuses a principal that is not in the registry (unauthorized service principal)", () => {
    expect(() =>
      resolveServiceActor(params({ principalId: "service:evil-worker" as ServicePrincipalId }))
    ).toThrow(UnknownServicePrincipalError);
  });

  it("resolves an allowlisted SERVICE principal with the registry id as subjectId", () => {
    const actor = resolveServiceActor(params());
    expect(actor.actorType).toBe("SERVICE");
    expect(actor.subjectId).toBe("service:settlement-worker");
    expect(actor.authMethod).toBe("SERVICE_CREDENTIAL");
    expect(actor.operation).toBe("settlement:run");
    expect(actor.credentialMethod).toBe("TEST_HARNESS");
    expect(actor.policyVersion).toBe(ACTOR_POLICY_VERSION);
  });

  it("resolves a SYSTEM principal as a SYSTEM actor", () => {
    const actor = resolveServiceActor(
      params({
        principalId: "system:invariant-sweep",
        operation: "system:invariant-sweep",
      })
    );
    expect(actor.actorType).toBe("SYSTEM");
    expect(actor.authMethod).toBe("SYSTEM_INVARIANT");
    expect(actor.authorityScope).toBe("SYSTEM");
  });
});

// ─── Credential context ───────────────────────────────────────────────────────

describe("resolveServiceActor credential context", () => {
  it("refuses a missing credential context", () => {
    expect(() =>
      resolveServiceActor(
        params({ verifiedCredentialContext: undefined as unknown as VerifiedCredentialContext })
      )
    ).toThrow(InvalidServiceCredentialError);
  });

  it("refuses an unrecognised credential method", () => {
    expect(() =>
      resolveServiceActor(
        params({
          verifiedCredentialContext: { ...CRED, method: "TRUST_ME" as VerifiedCredentialContext["method"] },
        })
      )
    ).toThrow(InvalidServiceCredentialError);
  });

  it("refuses an empty verifiedBy", () => {
    expect(() =>
      resolveServiceActor(params({ verifiedCredentialContext: { ...CRED, verifiedBy: "  " } }))
    ).toThrow(InvalidServiceCredentialError);
  });

  it("refuses an invalid verifiedAt", () => {
    expect(() =>
      resolveServiceActor(
        params({ verifiedCredentialContext: { ...CRED, verifiedAt: new Date("nope") } })
      )
    ).toThrow(InvalidServiceCredentialError);
  });

  it("REFUSES the TEST_HARNESS method in production (enforced, not documentation-only)", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(() => resolveServiceActor(params())).toThrow(InvalidServiceCredentialError);
      expect(() => resolveServiceActor(params())).toThrow(/TEST_HARNESS.*forbidden in production/);
      // A genuine production credential method still resolves.
      const actor = resolveServiceActor(
        params({
          verifiedCredentialContext: {
            method: "CRON_BEARER",
            verifiedBy: "lib/cron/authorize",
            verifiedAt: new Date(),
          },
        })
      );
      expect(actor.credentialMethod).toBe("CRON_BEARER");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

// ─── Operation scope ──────────────────────────────────────────────────────────

describe("resolveServiceActor operation scope", () => {
  it("denies an allowlisted principal an operation outside its registered scope", () => {
    expect(() =>
      // outbox-delivery is scoped to outbox:deliver only — settlement:run is
      // an authority escalation and must be refused.
      resolveServiceActor(
        params({ principalId: "service:outbox-delivery", operation: "settlement:run" })
      )
    ).toThrow(ForbiddenError);
  });

  it("permits an operation inside the registered scope", () => {
    const actor = resolveServiceActor(
      params({ principalId: "service:outbox-delivery", operation: "outbox:deliver" })
    );
    expect(actor.operation).toBe("outbox:deliver");
  });
});

// ─── Correlation identity ─────────────────────────────────────────────────────

describe("resolveServiceActor correlation identity", () => {
  it("refuses when BOTH runId and requestId are absent", () => {
    expect(() =>
      resolveServiceActor(params({ runId: undefined, requestId: undefined }))
    ).toThrow(InvalidActorError);
  });

  it("refuses when both are empty/whitespace", () => {
    expect(() => resolveServiceActor(params({ runId: "  ", requestId: "" }))).toThrow(
      InvalidActorError
    );
  });

  it("accepts requestId alone", () => {
    const actor = resolveServiceActor(params({ runId: undefined, requestId: "req-9" }));
    expect(actor.requestId).toBe("req-9");
    expect(actor.runId).toBeNull();
  });
});

// ─── Audit-receipt completeness (directive 4.3) ───────────────────────────────

describe("actor receipt completeness", () => {
  it("captures EVERY enumerable field of a governed SERVICE actor — nothing silently discarded", () => {
    const actor = resolveServiceActor(params());
    const record = toActorReceiptRecord(actor) as unknown as Record<string, unknown>;
    for (const key of Object.keys(actor)) {
      expect(record, `receipt is missing actor field "${key}"`).toHaveProperty(key);
      expect(record[key], `receipt field "${key}" diverges from the actor`).toEqual(
        (actor as unknown as Record<string, unknown>)[key]
      );
    }
  });

  it("captures EVERY enumerable field of a session-derived HUMAN actor", async () => {
    mockAuth.mockResolvedValue({ user: { id: "human-1", email: "h@example.com", role: "USER" } });
    const actor = await requireSessionActor({ requestId: "req-1" });
    const record = toActorReceiptRecord(actor) as unknown as Record<string, unknown>;
    for (const key of Object.keys(actor)) {
      expect(record, `receipt is missing actor field "${key}"`).toHaveProperty(key);
      expect(record[key]).toEqual((actor as unknown as Record<string, unknown>)[key]);
    }
    // HUMAN actors have no service operation/credential — recorded as null,
    // not omitted.
    expect(record["operation"]).toBeNull();
    expect(record["credentialMethod"]).toBeNull();
  });

  it("persistActorReceipt writes the full record and returns the row id", async () => {
    const actor = resolveServiceActor(params());
    const id = await persistActorReceipt(actor);
    expect(id).toBe("receipt-1");
    const call = vi.mocked(db.actorReceipt.create).mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(call.data["subjectId"]).toBe("service:settlement-worker");
    expect(call.data["operation"]).toBe("settlement:run");
    expect(call.data["credentialMethod"]).toBe("TEST_HARNESS");
    expect(call.data["policyVersion"]).toBe(ACTOR_POLICY_VERSION);
  });

  it("persistActorReceipt fails CLOSED with the typed error on store failure", async () => {
    vi.mocked(db.actorReceipt.create).mockRejectedValue(new Error("down"));
    const actor = resolveServiceActor(params());
    await expect(persistActorReceipt(actor)).rejects.toThrow(ActorReceiptUnavailableError);
  });
});
