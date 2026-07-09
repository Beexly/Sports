import { describe, expect, it, vi } from "vitest";
import { getCreditPoolBreakdown, type CreditPoolStoreDb } from "./credit-pool-store";

function fakeDb(rows: unknown[]): CreditPoolStoreDb {
  return {
    claudeApiCallRecord: {
      groupBy: vi.fn(async () => rows as never),
    },
  } as unknown as CreditPoolStoreDb;
}

describe("getCreditPoolBreakdown", () => {
  it("groups by model via groupBy and attributes spend to the right credit pools", async () => {
    const client = fakeDb([
      { modelName: "anthropic.claude-3-5-sonnet-20241022-v2:0", _count: { _all: 12 }, _sum: { estimatedCostUsd: "4.20", inputTokens: 1000, outputTokens: 400 } },
      { modelName: "us.anthropic.claude-3-haiku-20240307-v1:0", _count: { _all: 30 }, _sum: { estimatedCostUsd: 0.9, inputTokens: 500, outputTokens: 100 } },
      { modelName: "claude-sonnet-4-6", _count: { _all: 3 }, _sum: { estimatedCostUsd: 1.1, inputTokens: 200, outputTokens: 90 } },
    ]);

    const pools = await getCreditPoolBreakdown(new Date("2026-07-08T00:00:00Z"), client);

    // AWS Activate merges the two Bedrock model ids: 4.20 + 0.9 = 5.10, 42 calls
    const aws = pools.find((p) => p.pool === "aws_activate")!;
    expect(aws.calls).toBe(42);
    expect(aws.estimatedCostUsd).toBe(5.1);
    expect(aws.inputTokens).toBe(1500);
    expect(aws.creditEligible).toBe(true);

    const anthropic = pools.find((p) => p.pool === "anthropic_direct")!;
    expect(anthropic.calls).toBe(3);
    expect(anthropic.estimatedCostUsd).toBe(1.1);

    // sorted biggest-burn-first
    expect(pools[0]?.pool).toBe("aws_activate");
  });

  it("passes the month window to the groupBy where-clause and returns [] when empty", async () => {
    const groupBy = vi.fn(async () => [] as never);
    const client = { claudeApiCallRecord: { groupBy } } as unknown as CreditPoolStoreDb;

    const result = await getCreditPoolBreakdown(new Date("2026-07-08T12:00:00Z"), client);
    expect(result).toEqual([]);

    const arg = (groupBy.mock.calls[0] as unknown as [{ where: { observedAt: { gte: Date; lt: Date } } }])[0];
    expect(arg.where.observedAt.gte.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(arg.where.observedAt.lt.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("tolerates a plain-number _count and null _sum fields", async () => {
    const client = fakeDb([
      { modelName: "claude-3-5-sonnet-v2@20241022", _count: 5, _sum: { estimatedCostUsd: null, inputTokens: null, outputTokens: null } },
    ]);
    const pools = await getCreditPoolBreakdown(new Date("2026-07-08T00:00:00Z"), client);
    expect(pools).toHaveLength(1);
    expect(pools[0]?.pool).toBe("vertex_partner");
    expect(pools[0]?.calls).toBe(5);
    expect(pools[0]?.estimatedCostUsd).toBe(0);
  });
});
