/**
 * Anonymous moderation report route (directive 4.1).
 *
 * Acceptance coverage:
 *   - feature gate default OFF (404);
 *   - anonymous-fingerprint SPOOF: a caller-supplied fingerprint (body field
 *     or header) can neither be accepted nor rotate the rate key — the key is
 *     derived server-side from the platform-observed IP;
 *   - CROSS-INSTANCE limiter: two PostgresDurableRateLimiter instances sharing
 *     one store enforce a single shared quota (a cold start / second instance
 *     no longer resets limits);
 *   - PRODUCTION fail-closed: missing durable limiter → 503; a non-durable
 *     (in-memory) limiter in production → 503, never a silent fallback;
 *   - missing/short HMAC secret → 503 (config failure, no literal fallback);
 *   - per-target and payload-dedup dimensions enforce;
 *   - raw IP is NEVER persisted and never appears in any rate key;
 *   - reporterUserId is ALWAYS null on the anonymous path.
 */
import { describe, it, expect } from "vitest";

import {
  createAnonymousReportHandler,
  deriveTrustedSourceIp,
  type AnonymousReportHandlerDeps,
  type AnonymousReportPersistInput,
} from "@/lib/community/anonymous-report-handler";
import {
  InMemoryDurableRateLimiter,
  PostgresDurableRateLimiter,
  RateLimitStoreUnavailableError,
  type RateLimitSqlClient,
} from "@/lib/community/durable-rate-limiter";
import { ANONYMOUS_REPORT_LIMITS } from "@/lib/community/report-abuse-policy";

// ─── Shared fake store with the EXACT single-statement upsert semantics ───────
//
// Emulates the atomic `INSERT .. ON CONFLICT DO UPDATE .. WHERE count < limit
// RETURNING count` contract keyed on (scope, key, window_start). Two limiter
// instances constructed over ONE FakeSharedStore behave like two app instances
// sharing the real Postgres table.

class FakeSharedStore implements RateLimitSqlClient {
  readonly rows = new Map<string, number>();
  readonly consumesSeen: Array<{ scope: string; key: string }> = [];

  keysInScope(scope: string): Set<string> {
    return new Set(this.consumesSeen.filter((c) => c.scope === scope).map((c) => c.key));
  }

  async $queryRawUnsafe(query: string, ...values: Array<string | number | Date>): Promise<unknown> {
    if (query.startsWith("DELETE")) {
      const cutoff = values[0] as Date;
      for (const k of [...this.rows.keys()]) {
        const windowStart = Number(k.split("|")[2]);
        if (windowStart < cutoff.getTime()) this.rows.delete(k);
      }
      return [];
    }
    expect(query).toContain("ON CONFLICT");
    const [scope, key, windowStart, limit] = values as [string, string, Date, number];
    this.consumesSeen.push({ scope: String(scope), key: String(key) });
    const mapKey = `${scope}|${key}|${windowStart.getTime()}`;
    const current = this.rows.get(mapKey);
    if (current === undefined) {
      this.rows.set(mapKey, 1);
      return [{ count: 1 }];
    }
    if (current >= limit) return [];
    this.rows.set(mapKey, current + 1);
    return [{ count: current + 1 }];
  }
}

// ─── Test harness ─────────────────────────────────────────────────────────────

const ENABLED_ENV = {
  ANONYMOUS_MODERATION_REPORTS_ENABLED: "true",
  MODERATION_REPORT_HMAC_SECRET: "test-secret-of-adequate-length",
  NODE_ENV: "test",
  // Vercel deployment marker: the platform overwrites x-real-ip / XFF, which
  // is the precondition for trusting them (see deriveTrustedSourceIp).
  VERCEL: "1",
} as const;

interface Harness {
  handler: (request: Request) => Promise<Response>;
  store: FakeSharedStore;
  persisted: AnonymousReportPersistInput[];
}

function buildHarness(overrides: Partial<AnonymousReportHandlerDeps> = {}): Harness {
  const store = new FakeSharedStore();
  const persisted: AnonymousReportPersistInput[] = [];
  const handler = createAnonymousReportHandler({
    env: ENABLED_ENV,
    resolveLimiter: () => new PostgresDurableRateLimiter(store),
    persistReport: async (input) => {
      persisted.push(input);
    },
    ...overrides,
  });
  return { handler, store, persisted };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/moderation/anonymous-report", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.7", ...headers },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  targetUserId: "target-1",
  contentRef: "message:m1",
  surface: "sunday_couch",
  reason: "HARASSMENT",
};

// ─── Feature gate ─────────────────────────────────────────────────────────────

describe("feature gate", () => {
  it("is OFF by default: no env flag → 404 and nothing consumed or persisted", async () => {
    const { handler, store, persisted } = buildHarness({
      env: { MODERATION_REPORT_HMAC_SECRET: ENABLED_ENV.MODERATION_REPORT_HMAC_SECRET },
    });
    const res = await handler(post(VALID_BODY));
    expect(res.status).toBe(404);
    expect(store.consumesSeen).toHaveLength(0);
    expect(persisted).toHaveLength(0);
  });

  it('any value other than exactly "true" stays OFF', async () => {
    const { handler } = buildHarness({
      env: { ...ENABLED_ENV, ANONYMOUS_MODERATION_REPORTS_ENABLED: "TRUE" },
    });
    expect((await handler(post(VALID_BODY))).status).toBe(404);
  });
});

// ─── Fingerprint spoofing ─────────────────────────────────────────────────────

describe("anonymous-fingerprint spoof resistance", () => {
  it("REJECTS a body-supplied clientFingerprint outright (strict contract, 400)", async () => {
    const { handler, persisted } = buildHarness();
    const res = await handler(post({ ...VALID_BODY, clientFingerprint: "fp-i-chose" }));
    expect(res.status).toBe(400);
    expect(persisted).toHaveLength(0);
  });

  it("rotating client-claimed headers does NOT rotate the rate key — the same IP stays one bucket", async () => {
    const { handler, store } = buildHarness();
    const limit = ANONYMOUS_REPORT_LIMITS.perSourcePerHour;
    for (let i = 0; i < limit; i++) {
      const res = await handler(
        post(
          { ...VALID_BODY, contentRef: `message:m${i}` }, // vary payload to isolate the source dimension
          {
            "user-agent": `rotating-agent-${i}`,
            "x-client-fingerprint": `spoof-${i}`,
            "x-device-id": `device-${i}`,
          }
        )
      );
      expect(res.status).toBe(202);
    }
    const res = await handler(
      post({ ...VALID_BODY, contentRef: "message:m-final" }, { "user-agent": "yet-another" })
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    // The derived source key is exactly ONE HMAC digest for the IP — not one
    // per spoofed header value.
    expect(store.keysInScope("anon-report:source").size).toBe(1);
  });

  it("a DIFFERENT platform-observed IP is a different bucket (limits are per source, not global lockout)", async () => {
    const { handler } = buildHarness();
    const limit = ANONYMOUS_REPORT_LIMITS.perSourcePerHour;
    for (let i = 0; i < limit; i++) {
      expect(
        (await handler(post({ ...VALID_BODY, contentRef: `message:a${i}` }))).status
      ).toBe(202);
    }
    // First IP exhausted…
    expect((await handler(post({ ...VALID_BODY, contentRef: "message:ax" }))).status).toBe(429);
    // …but another IP still passes.
    const res = await handler(
      post({ ...VALID_BODY, contentRef: "message:b0" }, { "x-real-ip": "198.51.100.9" })
    );
    expect(res.status).toBe(202);
  });

  it("no derivable source identity → 400 fail closed, nothing persisted", async () => {
    const { handler, persisted } = buildHarness();
    const req = new Request("https://example.com/api/moderation/anonymous-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    expect(persisted).toHaveLength(0);
  });

  it("ON Vercel: deriveTrustedSourceIp prefers x-real-ip and falls back to the first x-forwarded-for hop", () => {
    const env = { VERCEL: "1" };
    const withBoth = new Request("https://x.test", {
      headers: { "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1, 10.0.0.1" },
    });
    expect(deriveTrustedSourceIp(withBoth, env)).toBe("203.0.113.7");
    const xffOnly = new Request("https://x.test", {
      headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" },
    });
    expect(deriveTrustedSourceIp(xffOnly, env)).toBe("198.51.100.1");
    expect(deriveTrustedSourceIp(new Request("https://x.test"), env)).toBeNull();
  });

  it("OFF Vercel with no trusted-header config: forwarding headers are NOT trusted (spoofable first hop rejected)", () => {
    const env = {}; // no VERCEL, no MODERATION_REPORT_TRUSTED_IP_HEADER
    const spoofable = new Request("https://x.test", {
      headers: { "x-real-ip": "6.6.6.6", "x-forwarded-for": "6.6.6.1, 10.0.0.1" },
    });
    expect(deriveTrustedSourceIp(spoofable, env)).toBeNull();
  });

  it("OFF Vercel with x-forwarded-for declared trusted: the LAST hop (trusted-proxy-appended) is used, never the client-controlled first hop", () => {
    const env = { MODERATION_REPORT_TRUSTED_IP_HEADER: "x-forwarded-for" };
    const appended = new Request("https://x.test", {
      headers: { "x-forwarded-for": "attacker-chosen, 203.0.113.9" },
    });
    expect(deriveTrustedSourceIp(appended, env)).toBe("203.0.113.9");
  });

  it("OFF Vercel with a proxy-overwritten header declared trusted: its value is used verbatim", () => {
    const env = { MODERATION_REPORT_TRUSTED_IP_HEADER: "x-real-ip" };
    const req = new Request("https://x.test", {
      headers: { "x-real-ip": "203.0.113.10", "x-forwarded-for": "attacker-chosen" },
    });
    expect(deriveTrustedSourceIp(req, env)).toBe("203.0.113.10");
  });

  it("OFF Vercel unconfigured, the HANDLER fails closed with 400 — per-source quota cannot be rotated away", async () => {
    const { handler, persisted } = buildHarness({
      env: {
        ANONYMOUS_MODERATION_REPORTS_ENABLED: "true",
        MODERATION_REPORT_HMAC_SECRET: ENABLED_ENV.MODERATION_REPORT_HMAC_SECRET,
        NODE_ENV: "test",
        // no VERCEL, no trusted-header declaration
      },
    });
    const res = await handler(post(VALID_BODY, { "x-forwarded-for": "rotating-1, 10.0.0.1" }));
    expect(res.status).toBe(400);
    expect(persisted).toHaveLength(0);
  });
});

// ─── Cross-instance limiter ───────────────────────────────────────────────────

describe("cross-instance durable limiter", () => {
  it("two limiter instances sharing one store enforce ONE quota (no cold-start reset)", async () => {
    const store = new FakeSharedStore();
    const persisted: AnonymousReportPersistInput[] = [];
    const deps = (n: number): AnonymousReportHandlerDeps => ({
      env: ENABLED_ENV,
      // Each "instance" constructs its OWN limiter object — only the store is shared.
      resolveLimiter: () => new PostgresDurableRateLimiter(store),
      persistReport: async (input) => {
        persisted.push(input);
      },
      now: () => new Date(1_700_000_000_000 + n),
    });
    const instanceA = createAnonymousReportHandler(deps(0));
    const instanceB = createAnonymousReportHandler(deps(1));

    const limit = ANONYMOUS_REPORT_LIMITS.perSourcePerHour;
    let accepted = 0;
    for (let i = 0; i < limit + 3; i++) {
      const handler = i % 2 === 0 ? instanceA : instanceB;
      const res = await handler(post({ ...VALID_BODY, contentRef: `message:x${i}` }));
      if (res.status === 202) accepted++;
      else expect(res.status).toBe(429);
    }
    expect(accepted).toBe(limit);
    expect(persisted).toHaveLength(limit);
  });

  it("the underlying limiter is atomic under concurrent consumes across instances", async () => {
    const store = new FakeSharedStore();
    const a = new PostgresDurableRateLimiter(store);
    const b = new PostgresDurableRateLimiter(store);
    const now = new Date(1_700_000_000_000);
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 === 0 ? a : b).consume({
          scope: "test:concurrent",
          key: "same-key",
          limit: 7,
          windowMs: 60_000,
          now,
        })
      )
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(7);
  });
});

// ─── Production fail-closed ───────────────────────────────────────────────────

describe("production fail-closed (no durable limiter → 503)", () => {
  it("returns 503 when no durable limiter is available in production", async () => {
    const persisted: AnonymousReportPersistInput[] = [];
    const handler = createAnonymousReportHandler({
      env: { ...ENABLED_ENV, NODE_ENV: "production" },
      resolveLimiter: () => null,
      persistReport: async (input) => {
        persisted.push(input);
      },
    });
    const res = await handler(post(VALID_BODY));
    expect(res.status).toBe(503);
    expect(persisted).toHaveLength(0);
  });

  it("REJECTS a non-durable (in-memory) limiter in production — never a silent fallback", async () => {
    const handler = createAnonymousReportHandler({
      env: { ...ENABLED_ENV, NODE_ENV: "production" },
      // NODE_ENV given to the limiter ctor is non-production so it constructs;
      // the handler must still refuse it because durable === false.
      resolveLimiter: () => new InMemoryDurableRateLimiter({ NODE_ENV: "test" }),
      persistReport: async () => undefined,
    });
    const res = await handler(post(VALID_BODY));
    expect(res.status).toBe(503);
  });

  it("the in-memory limiter refuses to even construct in production", () => {
    expect(() => new InMemoryDurableRateLimiter({ NODE_ENV: "production" })).toThrow(
      RateLimitStoreUnavailableError
    );
  });

  it("returns 503 when the limiter store fails mid-request (never allows)", async () => {
    const failingStore: RateLimitSqlClient = {
      async $queryRawUnsafe() {
        throw new Error("connection refused");
      },
    };
    const { handler, persisted } = buildHarness({
      resolveLimiter: () => new PostgresDurableRateLimiter(failingStore),
    });
    const res = await handler(post(VALID_BODY));
    expect(res.status).toBe(503);
    expect(persisted).toHaveLength(0);
  });

  it("returns 503 when the HMAC secret is missing or too short", async () => {
    const missing = buildHarness({
      env: { ...ENABLED_ENV, MODERATION_REPORT_HMAC_SECRET: undefined },
    });
    expect((await missing.handler(post(VALID_BODY))).status).toBe(503);
    const short = buildHarness({
      env: { ...ENABLED_ENV, MODERATION_REPORT_HMAC_SECRET: "short" },
    });
    expect((await short.handler(post(VALID_BODY))).status).toBe(503);
  });
});

// ─── Quota dimensions ─────────────────────────────────────────────────────────

describe("quota dimensions", () => {
  it("per-target limit stops brigading one target from many sources", async () => {
    const { handler } = buildHarness();
    const limit = ANONYMOUS_REPORT_LIMITS.perTargetPerHour;
    let status = 202;
    for (let i = 0; i < limit + 1; i++) {
      const res = await handler(
        post(
          { ...VALID_BODY, contentRef: `message:t${i}` },
          { "x-real-ip": `203.0.113.${10 + i}` } // rotate sources
        )
      );
      status = res.status;
    }
    expect(status).toBe(429);
  });

  it("payload dedup: the same source resubmitting an IDENTICAL report is deduplicated", async () => {
    const { handler, persisted } = buildHarness();
    expect((await handler(post(VALID_BODY))).status).toBe(202);
    expect((await handler(post(VALID_BODY))).status).toBe(429);
    expect(persisted).toHaveLength(1);
  });

  it("the same payload from a DIFFERENT source is NOT suppressed (corroboration preserved)", async () => {
    const { handler, persisted } = buildHarness();
    expect((await handler(post(VALID_BODY))).status).toBe(202);
    expect(
      (await handler(post(VALID_BODY, { "x-real-ip": "198.51.100.44" }))).status
    ).toBe(202);
    expect(persisted).toHaveLength(2);
  });
});

// ─── Persistence contract ─────────────────────────────────────────────────────

describe("persistence contract", () => {
  it("persists reporter-less data only — reporterUserId is not even part of the persist input", async () => {
    const { handler, persisted } = buildHarness();
    const res = await handler(post({ ...VALID_BODY, notes: "context" }));
    expect(res.status).toBe(202);
    expect(persisted).toEqual([
      {
        targetUserId: "target-1",
        contentRef: "message:m1",
        surface: "sunday_couch",
        reason: "HARASSMENT",
        notes: "context",
      },
    ]);
  });

  it("the raw IP never reaches the persisted row NOR any rate-limit key", async () => {
    const { handler, store, persisted } = buildHarness();
    await handler(post(VALID_BODY));
    const persistedJson = JSON.stringify(persisted);
    expect(persistedJson).not.toContain("203.0.113.7");
    for (const consume of store.consumesSeen) {
      expect(consume.key).not.toContain("203.0.113.7");
    }
  });

  it("does not disclose the report id (202 { accepted: true })", async () => {
    const { handler } = buildHarness();
    const res = await handler(post(VALID_BODY));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: true });
  });

  it("persist failure → 503, not a fake success", async () => {
    const { handler } = buildHarness({
      persistReport: async () => {
        throw new Error("db down");
      },
    });
    expect((await handler(post(VALID_BODY))).status).toBe(503);
  });

  it("invalid reason and malformed JSON are 400s", async () => {
    const { handler } = buildHarness();
    expect((await handler(post({ ...VALID_BODY, reason: "NOT_A_REASON" }))).status).toBe(400);
    const badJson = new Request("https://example.com/api/moderation/anonymous-report", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "203.0.113.7" },
      body: "{not json",
    });
    expect((await handler(badJson)).status).toBe(400);
  });
});

// ─── Route wiring source pins ─────────────────────────────────────────────────

describe("route wiring", () => {
  it("the route file wires the production deps and exports POST only", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(__dirname, "../app/api/moderation/anonymous-report/route.ts"),
      "utf8"
    );
    expect(src).toContain("createAnonymousReportHandler");
    expect(src).toContain("PostgresDurableRateLimiter");
    expect(src).toContain("isStubMode");
    expect(src).toContain("reporterUserId: null");
    expect(src).toContain('export const POST');
    expect(src).not.toMatch(/export const GET|export async function GET/);
    // Secret comes from env only — no literal fallback anywhere in the wiring.
    expect(src).not.toMatch(/MODERATION_REPORT_HMAC_SECRET\s*(\?\?|\|\|)/);
  });
});
