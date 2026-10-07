/**
 * SECURITY REGRESSION: /api/health disclosed deployment misconfiguration and
 * raw internal probe errors to any anonymous caller.
 *
 * `curl -s https://www.galaxysportsedge.com/api/health | jq` returned
 * `checks[].detail`, `capabilities[].reason`, `capabilityGraph` and
 * `schedulerLiveness` with no auth and no rate limit. Among the free-text
 * strings that crossed that boundary:
 *
 *   • "Stripe secret present but webhook secret missing — sessions may create
 *      without entitlements"  ← tells an anonymous caller that a subscription
 *      can be PAID FOR AND NOT DELIVERED, i.e. exactly when to attack billing.
 *   • "Stripe secret present; no STRIPE_*_PRICE_ID envs — checkout depends on
 *      lookup_key resolution"
 *   • `currency probe threw: ${err.message}` — RAW upstream error text, which
 *      routinely carries the upstream host/URL.
 *
 * Those strings reach the wire through TWO paths, and a fix that closed only
 * one would still leak: `capabilities[].reason` directly, and
 * `capabilityGraph[].reasons` because `provenanceReasons()` in
 * @sports/epistemic-twin's `op003ToOwnEvidence` pushes each leaf `reason`
 * VERBATIM into the composed evidence. Both are asserted below, and the
 * strongest assertions run against the WHOLE serialized anonymous body so no
 * future field can smuggle them back out.
 *
 * The posture the route now matches is /api/ops/daily-truth's: Bearer
 * CRON_SECRET or an ADMIN session. `ok`, `status` and `deployment.sha` stay
 * public because that IS the uptime-monitor contract.
 *
 * These tests EXECUTE the handler (apps/web/tsconfig.json EXCLUDES test files,
 * so a type-level assertion here would prove nothing) and assert on parsed JSON.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetNflverseTableCacheForTests } from "@sports/data-ingestion";

// ── The exact strings this fix exists to keep off the public wire ──────────
const STRIPE_PRICE_LEAK =
  "Stripe secret present; no STRIPE_*_PRICE_ID envs — checkout depends on lookup_key resolution";
const STRIPE_WEBHOOK_LEAK =
  "Stripe secret present but webhook secret missing — sessions may create without entitlements";
// A probe error whose message carries an internal host, as the real one does.
const RAW_PROBE_ERROR = "connect ECONNREFUSED github-releases.internal.gse:443/nflverse/pbp";

const CRON_SECRET = "cron-secret-for-health-disclosure-test";

const nflverseProbeMocks = vi.hoisted(() => ({
  probeNflverseSourceCurrency: vi.fn(),
}));

vi.mock("@sports/data-ingestion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/data-ingestion")>();
  return {
    ...actual,
    probeNflverseSourceCurrency: nflverseProbeMocks.probeNflverseSourceCurrency,
  };
});

const dbMocks = vi.hoisted(() => ({
  queryRaw: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  ingestionRunFindFirst:
    vi.fn<(args: unknown) => Promise<{ completedAt: Date | null } | null>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    $queryRaw: dbMocks.queryRaw,
    ingestionRun: { findFirst: dbMocks.ingestionRunFindFirst },
  },
  isStubMode: () => false,
}));

const authMocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMocks.auth }));

// Scheduler liveness carries an `operatorHint` and a "the scheduler is dead"
// verdict; stub it so the operator payload is deterministic.
vi.mock("@/lib/ops/scheduler-liveness", () => ({
  assessSchedulerLiveness: vi.fn(async () => ({
    status: "dead" as const,
    lastAnyIngestionSuccessAt: null,
    ageMinutes: 4321,
    tightestExpectedGapMinutes: 15,
    degradedThresholdMinutes: 60,
    deadThresholdMinutes: 180,
    operatorHint: "no ingestion run in 4321m — platform cron is not firing",
  })),
}));

// The traffic heartbeat is fire-and-forget background repair; keep it inert.
vi.mock("@/lib/ops/traffic-heartbeat", () => ({
  maybeRunTrafficHeartbeat: vi.fn(async () => undefined),
}));

/** The money-path env posture that produces BOTH Stripe leak strings. */
function stubBrokenMoneyPathEnv(): void {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_health_disclosure");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
  for (const key of [
    "STRIPE_PRO_MONTHLY_PRICE_ID",
    "STRIPE_PRO_ANNUAL_PRICE_ID",
    "STRIPE_PRO_PRICE_ID",
    "STRIPE_ELITE_MONTHLY_PRICE_ID",
    "STRIPE_ELITE_ANNUAL_PRICE_ID",
    "STRIPE_ELITE_PRICE_ID",
    "STRIPE_FANTASY_MONTHLY_PRICE_ID",
    "STRIPE_FANTASY_ANNUAL_PRICE_ID",
  ]) {
    vi.stubEnv(key, "");
  }
}

function anonymousRequest(): Request {
  return new Request("http://localhost/api/health");
}

function cronRequest(secret = CRON_SECRET): Request {
  return new Request("http://localhost/api/health", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

function cookieRequest(): Request {
  return new Request("http://localhost/api/health", {
    headers: { cookie: "next-auth.session-token=abc123" },
  });
}

async function callHealth(request?: Request) {
  const { GET } = await import("@/app/api/health/route");
  const res = await GET(request as never);
  const text = await res.text();
  return { res, body: JSON.parse(text) as Record<string, unknown>, text };
}

beforeEach(() => {
  vi.resetModules();
  dbMocks.queryRaw.mockReset();
  dbMocks.ingestionRunFindFirst.mockReset();
  dbMocks.queryRaw.mockResolvedValue([{ "?column?": 1 }]);
  dbMocks.ingestionRunFindFirst.mockResolvedValue({
    completedAt: new Date(Date.now() - 10 * 60 * 1000),
  });

  resetNflverseTableCacheForTests();
  nflverseProbeMocks.probeNflverseSourceCurrency.mockReset();
  // Throwing here is what produces the RAW `currency probe threw: …` reason.
  nflverseProbeMocks.probeNflverseSourceCurrency.mockRejectedValue(
    new Error(RAW_PROBE_ERROR),
  );

  authMocks.auth.mockReset();
  authMocks.auth.mockResolvedValue(null);

  vi.stubEnv("CRON_SECRET", CRON_SECRET);
  vi.stubEnv("CRON_SECRET_PREVIOUS", "");
  vi.stubEnv("CRON_REQUIRE_BEARER", "");
  stubBrokenMoneyPathEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetNflverseTableCacheForTests();
});

describe("/api/health — the leak, proven present for an authorized operator", () => {
  it("an operator DOES receive the Stripe misconfiguration strings and the raw probe error", async () => {
    // This is the control. If this case ever stops finding these strings the
    // anonymous assertions below become vacuous, and they would silently pass
    // against a route that had simply stopped producing them.
    const { text, body } = await callHealth(cronRequest());

    expect(body["detail"]).toBe("operator");
    expect(text).toContain(STRIPE_PRICE_LEAK);
    expect(text).toContain(STRIPE_WEBHOOK_LEAK);
    expect(text).toContain(RAW_PROBE_ERROR);
  });
});

describe("/api/health — anonymous caller", () => {
  it("still gets the full uptime-monitor contract: ok, status, deployment.sha", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "cafebabe1234");

    const { res, body } = await callHealth(anonymousRequest());

    expect(res.status).toBe(200);
    expect(body["ok"]).toBe(true);
    expect(body["status"]).toBe("healthy");
    expect((body["deployment"] as { sha: string }).sha).toBe("cafebabe1234");
    expect(body["detail"]).toBe("public");
  });

  it("NEVER receives the Stripe misconfiguration strings or raw probe error text", async () => {
    // Asserted against the WHOLE serialized body, not one field: these strings
    // reached the wire through capabilities[].reason AND capabilityGraph[].reasons
    // (provenanceReasons copies the leaf reason verbatim), so a field-scoped
    // assertion could pass while the other path stayed wide open.
    const { text } = await callHealth(anonymousRequest());

    expect(text).not.toContain(STRIPE_PRICE_LEAK);
    expect(text).not.toContain(STRIPE_WEBHOOK_LEAK);
    expect(text).not.toContain(RAW_PROBE_ERROR);
    // Nothing about the entitlement handoff, in any wording.
    expect(text).not.toContain("without entitlements");
    expect(text).not.toContain("currency probe threw");
    expect(text).not.toContain("STRIPE_");
  });

  it("receives no checks[].detail", async () => {
    const { body } = await callHealth(anonymousRequest());

    const checks = body["checks"] as Record<string, Record<string, unknown>>;
    expect(Object.keys(checks).length).toBeGreaterThan(0);
    for (const [name, check] of Object.entries(checks)) {
      expect(check, `checks.${name} must not carry detail`).not.toHaveProperty("detail");
    }
  });

  it("receives no capabilities[].reason", async () => {
    const { body } = await callHealth(anonymousRequest());

    const capabilities = body["capabilities"] as Record<string, unknown>[];
    expect(capabilities.length).toBeGreaterThan(0);
    for (const capability of capabilities) {
      expect(capability, `${String(capability["capabilityId"])} must not carry reason`)
        .not.toHaveProperty("reason");
    }
  });

  it("receives no capabilityGraph and no schedulerLiveness at all", async () => {
    const { body } = await callHealth(anonymousRequest());

    expect(body).not.toHaveProperty("capabilityGraph");
    expect(body).not.toHaveProperty("schedulerLiveness");
    // Absence, not a null placeholder — an omitted key asserts less.
    expect(body["capabilityGraph"]).toBeUndefined();
    expect(body["schedulerLiveness"]).toBeUndefined();
  });

  it("keeps the black-box freshness fields prod-probe.mjs contracts on", async () => {
    // scripts/prod-probe.mjs validateIngestionFreshness asserts, anonymously:
    //   checks.ingestion.status === "ok", typeof ageMinutes === "number",
    //   typeof lastSuccessAt === "string".
    // Redaction must not break the deploy-verification probe.
    const { body } = await callHealth(anonymousRequest());

    const ingestion = (body["checks"] as Record<string, Record<string, unknown>>)["ingestion"];
    expect(ingestion?.["status"]).toBe("ok");
    expect(typeof ingestion?.["ageMinutes"]).toBe("number");
    expect(typeof ingestion?.["lastSuccessAt"]).toBe("string");
  });

  it("keeps capability status enums (launch-preflight reads settlement anonymously)", async () => {
    const { body } = await callHealth(anonymousRequest());

    const capabilities = body["capabilities"] as { capabilityId: string; status: string }[];
    const settlement = capabilities.find((c) => c.capabilityId === "settlement");
    expect(settlement).toBeDefined();
    expect(typeof settlement?.status).toBe("string");
  });

  it("is marked no-store and Vary'd on credentials so no shared cache can replay an operator payload", async () => {
    const { res } = await callHealth(anonymousRequest());

    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const vary = res.headers.get("Vary") ?? "";
    expect(vary).toContain("Authorization");
    expect(vary).toContain("Cookie");
  });
});

describe("/api/health — operator caller", () => {
  it("CRON bearer receives checks[].detail, capabilities[].reason, capabilityGraph and schedulerLiveness", async () => {
    const { body } = await callHealth(cronRequest());

    expect(body["detail"]).toBe("operator");

    const checks = body["checks"] as Record<string, Record<string, unknown>>;
    expect(checks["ingestion"]).toHaveProperty("detail");

    const capabilities = body["capabilities"] as Record<string, unknown>[];
    expect(capabilities.every((c) => "reason" in c)).toBe(true);

    expect(Array.isArray(body["capabilityGraph"])).toBe(true);
    expect((body["capabilityGraph"] as unknown[]).length).toBe(15);
    expect(body["schedulerLiveness"]).toMatchObject({ status: "dead" });
  });

  it("an ADMIN session receives the operator payload", async () => {
    authMocks.auth.mockResolvedValue({ user: { role: "ADMIN" } });

    const { body, text } = await callHealth(cookieRequest());

    expect(body["detail"]).toBe("operator");
    expect(Array.isArray(body["capabilityGraph"])).toBe(true);
    expect(text).toContain(STRIPE_WEBHOOK_LEAK);
  });
});

describe("/api/health — fails CLOSED on every unresolvable privilege", () => {
  it("a NON-admin session gets the public payload", async () => {
    authMocks.auth.mockResolvedValue({ user: { role: "USER" } });

    const { body, text } = await callHealth(cookieRequest());

    expect(body["detail"]).toBe("public");
    expect(body).not.toHaveProperty("capabilityGraph");
    expect(text).not.toContain(STRIPE_WEBHOOK_LEAK);
  });

  it("a WRONG bearer gets the public payload", async () => {
    const { body, text } = await callHealth(cronRequest("not-the-cron-secret"));

    expect(body["detail"]).toBe("public");
    expect(text).not.toContain(STRIPE_WEBHOOK_LEAK);
  });

  it("a bearer with CRON_SECRET UNSET gets the public payload (refuse-default)", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("CRON_SECRET_PREVIOUS", "");

    const { body, text } = await callHealth(cronRequest("anything"));

    expect(body["detail"]).toBe("public");
    expect(text).not.toContain(STRIPE_WEBHOOK_LEAK);
  });

  it("a throwing auth() gets the public payload instead of 500-ing", async () => {
    authMocks.auth.mockRejectedValue(new Error("NEXTAUTH_SECRET missing"));

    const { res, body, text } = await callHealth(cookieRequest());

    expect(res.status).toBe(200);
    expect(body["detail"]).toBe("public");
    expect(text).not.toContain(STRIPE_WEBHOOK_LEAK);
  });

  it("no request object at all gets the public payload", async () => {
    // Defensive: a caller (or an older test) invoking GET() with no argument
    // must not throw and must not be handed the operator payload.
    const { res, body } = await callHealth(undefined);

    expect(res.status).toBe(200);
    expect(body["detail"]).toBe("public");
    expect(body).not.toHaveProperty("capabilityGraph");
  });
});

describe("redaction helpers — allowlist, not denylist", () => {
  it("a field added to a check or capability is NOT disclosed until allowlisted", async () => {
    const { redactHealthChecks, redactCapabilities } = await import(
      "@/lib/health/health-disclosure"
    );

    const redactedCheck = redactHealthChecks({
      database: {
        status: "error",
        detail: "postgres://gse:hunter2@db.internal:5432 unreachable",
        // A hypothetical future field. A `delete obj.detail` implementation
        // would happily ship this; an allowlist cannot.
        upstreamHost: "db.internal:5432",
      } as never,
    });
    expect(JSON.stringify(redactedCheck)).not.toContain("db.internal");
    expect(redactedCheck["database"]).toEqual({ status: "error" });

    const redactedCaps = redactCapabilities([
      {
        capabilityId: "revenue-checkout",
        status: "degraded",
        reason: STRIPE_WEBHOOK_LEAK,
        observedAt: "2026-08-25T00:00:00.000Z",
        evidence: "probe",
        stripeAccountId: "acct_1LeakedAccount",
      } as never,
    ]);
    expect(JSON.stringify(redactedCaps)).not.toContain("acct_1LeakedAccount");
    expect(redactedCaps[0]).toEqual({
      capabilityId: "revenue-checkout",
      status: "degraded",
      observedAt: "2026-08-25T00:00:00.000Z",
      evidence: "probe",
    });
  });
});
