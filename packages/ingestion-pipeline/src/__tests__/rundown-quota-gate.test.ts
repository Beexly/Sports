import { describe, expect, it } from "vitest";
import {
  checkRundownQuotaGate,
  recordRundownRateLimited,
  RUNDOWN_QUOTA_KEY,
  RUNDOWN_QUOTA_SCOPE,
  type RundownQuotaSqlClient,
} from "../rundown-quota-gate.js";

/**
 * Fake client mimicking the real `rate_limit_counters` table with exactly
 * the two statements this module issues — enough to exercise the gate's
 * logic without a real database, mirroring the pattern already used for
 * apps/web/lib/community/durable-rate-limiter.ts's own tests.
 */
function makeFakeClient(): RundownQuotaSqlClient & { rows: Map<string, number> } {
  const rows = new Map<string, number>();
  return {
    rows,
    async $queryRawUnsafe(query: string, ...values: Array<string | Date>) {
      if (query.startsWith("SELECT")) {
        const [scope, key, windowStart] = values as [string, string, Date];
        const rowKey = `${scope}|${key}|${(windowStart as Date).toISOString()}`;
        const count = rows.get(rowKey);
        return count === undefined ? [] : [{ count }];
      }
      // INSERT ... ON CONFLICT DO UPDATE
      const [scope, key, windowStart] = values as [string, string, Date];
      const rowKey = `${scope}|${key}|${(windowStart as Date).toISOString()}`;
      rows.set(rowKey, (rows.get(rowKey) ?? 0) + 1);
      return [];
    },
  };
}

describe("rundown-quota-gate", () => {
  it("allows calls when no 429 has been recorded today", async () => {
    const client = makeFakeClient();
    const decision = await checkRundownQuotaGate(client, new Date("2026-09-06T12:00:00Z"));
    expect(decision.allowed).toBe(true);
    expect(decision.seenCount).toBe(0);
  });

  it("refuses further calls the same UTC day after a 429 is recorded", async () => {
    const client = makeFakeClient();
    const now = new Date("2026-09-06T15:00:00Z");
    await recordRundownRateLimited(client, now);

    const decision = await checkRundownQuotaGate(client, new Date("2026-09-06T23:59:00Z"));
    expect(decision.allowed).toBe(false);
    expect(decision.seenCount).toBe(1);
    expect(decision.reason).toMatch(/429/);
  });

  it("resets at UTC midnight — a 429 yesterday does not block today", async () => {
    const client = makeFakeClient();
    await recordRundownRateLimited(client, new Date("2026-09-05T23:00:00Z"));

    const decision = await checkRundownQuotaGate(client, new Date("2026-09-06T00:05:00Z"));
    expect(decision.allowed).toBe(true);
  });

  it("accumulates a count across multiple recorded 429s in the same window", async () => {
    const client = makeFakeClient();
    const day = new Date("2026-09-06T10:00:00Z");
    await recordRundownRateLimited(client, day);
    await recordRundownRateLimited(client, new Date("2026-09-06T18:00:00Z"));

    const decision = await checkRundownQuotaGate(client, new Date("2026-09-06T20:00:00Z"));
    expect(decision.allowed).toBe(false);
    expect(decision.seenCount).toBe(2);
  });

  it("fails OPEN when the store throws on the check — never blocks the free path on a store error", async () => {
    const client: RundownQuotaSqlClient = {
      async $queryRawUnsafe() {
        throw new Error("connection refused");
      },
    };
    const decision = await checkRundownQuotaGate(client);
    expect(decision.allowed).toBe(true);
  });

  it("uses the reserved scope/key so it never collides with other rate-limit consumers", async () => {
    expect(RUNDOWN_QUOTA_SCOPE).toBe("rundown-quota");
    expect(RUNDOWN_QUOTA_KEY).toBe("429-seen-utc-day");
  });
});
