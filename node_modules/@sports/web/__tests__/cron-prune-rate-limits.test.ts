/**
 * /api/cron/prune-rate-limits — the production caller that makes the 48h
 * rate-limit retention bound ENFORCED (previously pruneExpiredRateLimitCounters
 * had zero production callers, so retention was a documented contract only).
 *
 * Coverage:
 *   - bearer auth (401 unauthorized, 500 unconfigured secret);
 *   - stub DB → 503, never a fake success;
 *   - the prune runs under the governed "system:rate-limit-retention"
 *     principal with a CRON_BEARER credential and persists an ActorReceipt;
 *   - the DELETE cutoff honours RATE_COUNTER_MAX_RETENTION_MS (48h);
 *   - store failure → 503 (retryable next run);
 *   - schedule is declared in vercel.json (source pin).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

vi.mock("@sports/db", () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    actorReceipt: { create: vi.fn() },
  },
  isStubMode: vi.fn().mockReturnValue(false),
}));

import { db, isStubMode } from "@sports/db";
import { GET } from "@/app/api/cron/prune-rate-limits/route";
import { RATE_COUNTER_MAX_RETENTION_MS } from "@/lib/community/durable-rate-limiter";

const SECRET = "cron-secret-for-tests";

function request(auth?: string): Request {
  return new Request("https://example.com/api/cron/prune-rate-limits", {
    method: "GET",
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.mocked(isStubMode).mockReturnValue(false);
  vi.mocked(db.actorReceipt.create).mockResolvedValue({ id: "receipt-9" } as never);
  vi.mocked(db.$queryRawUnsafe).mockResolvedValue([] as never);
});

describe("authorization", () => {
  it("401 without the bearer secret; nothing pruned, no receipt", async () => {
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(db.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(db.actorReceipt.create).not.toHaveBeenCalled();
  });

  it("401 with a wrong bearer secret", async () => {
    expect((await GET(request("Bearer wrong"))).status).toBe(401);
  });

  it("500 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request(`Bearer ${SECRET}`))).status).toBe(500);
  });
});

describe("stub-mode fail-closed", () => {
  it("503 in stub mode — no fake success while nothing durable exists", async () => {
    vi.mocked(isStubMode).mockReturnValue(true);
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(db.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});

describe("governed prune", () => {
  it("prunes under system:rate-limit-retention with a CRON_BEARER credential and persists the receipt", async () => {
    const before = Date.now();
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(true);
    expect(body["actorReceiptId"]).toBe("receipt-9");
    expect(body["retentionMs"]).toBe(RATE_COUNTER_MAX_RETENTION_MS);

    // Receipt: governed principal, scoped operation, CRON_BEARER credential.
    expect(db.actorReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorType: "SYSTEM",
          subjectId: "system:rate-limit-retention",
          operation: "moderation:prune-rate-limits",
          credentialMethod: "CRON_BEARER",
          requestId: expect.stringContaining("cron-prune-rate-limits:"),
        }),
      })
    );

    // Prune: one DELETE with a cutoff exactly retentionMs in the past.
    expect(db.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, cutoff] = vi.mocked(db.$queryRawUnsafe).mock.calls[0] as [string, Date];
    expect(sql).toContain("DELETE FROM \"rate_limit_counters\"");
    expect(cutoff).toBeInstanceOf(Date);
    const expectedMin = before - RATE_COUNTER_MAX_RETENTION_MS;
    const expectedMax = Date.now() - RATE_COUNTER_MAX_RETENTION_MS;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("503 when the store fails (retryable; the receipt/prune never fake success)", async () => {
    vi.mocked(db.$queryRawUnsafe).mockRejectedValueOnce(new Error("connection refused"));
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
  });

  it("503 when receipt persistence fails — an unattributable prune does not run", async () => {
    vi.mocked(db.actorReceipt.create).mockRejectedValueOnce(new Error("receipt store down"));
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(db.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});

describe("schedule wiring (source pin)", () => {
  it("vercel.json declares the daily cron for /api/cron/prune-rate-limits", () => {
    const vercelJson = JSON.parse(
      readFileSync(resolve(__dirname, "../../../vercel.json"), "utf-8")
    ) as { crons?: Array<{ path: string; schedule: string }> };
    const entry = vercelJson.crons?.find((c) => c.path === "/api/cron/prune-rate-limits");
    expect(entry).toBeDefined();
    expect(entry?.schedule).toBeTruthy();
  });
});
