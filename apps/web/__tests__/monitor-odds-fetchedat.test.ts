import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above these declarations, so the doubles must be created
// inside vi.hoisted() to exist by the time the factories run.
const { aggregate, pingHealthcheck } = vi.hoisted(() => ({
  aggregate: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  pingHealthcheck: vi.fn<(...args: unknown[]) => Promise<void>>(),
}));

vi.mock("@sports/db", () => ({
  db: { odds: { aggregate } },
}));

vi.mock("@/lib/data-reliability/healthcheck-ping", () => ({
  pingHealthcheck,
}));

import { monitorOddsFetchedAt } from "@/lib/data-reliability/monitor-odds-fetchedat";

const NOW = new Date("2026-07-28T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

beforeEach(() => {
  aggregate.mockReset();
  pingHealthcheck.mockReset();
});

describe("monitorOddsFetchedAt", () => {
  it("is always global_max scoped — a healthy result is an ops signal, not gate clearance", async () => {
    aggregate.mockResolvedValue({ _max: { fetchedAt: minutesAgo(5) } });
    const r = await monitorOddsFetchedAt(undefined, NOW);
    expect(r.freshness.scope).toBe("global_max");
    expect(r.freshness.status).toBe("ok");
    expect(r.freshness.summary).toMatch(/not a per-candidate gate clearance/i);
  });

  it("is a complete no-op ping-wise until the env URL is set", async () => {
    aggregate.mockResolvedValue({ _max: { fetchedAt: minutesAgo(5) } });
    const r = await monitorOddsFetchedAt(undefined, NOW);
    expect(r.pinged).toBe("none");
    expect(pingHealthcheck).not.toHaveBeenCalled();
  });

  it("pings success when fresh", async () => {
    aggregate.mockResolvedValue({ _max: { fetchedAt: minutesAgo(5) } });
    const r = await monitorOddsFetchedAt("https://hc.example/abc", NOW);
    expect(r.pinged).toBe("success");
    expect(pingHealthcheck).toHaveBeenCalledWith("https://hc.example/abc", "success");
  });

  it("pings fail when the global max is stale enough to alert", async () => {
    aggregate.mockResolvedValue({ _max: { fetchedAt: minutesAgo(300) } });
    const r = await monitorOddsFetchedAt("https://hc.example/abc", NOW);
    expect(r.freshness.status).toBe("stale");
    expect(r.pinged).toBe("fail");
    expect(pingHealthcheck).toHaveBeenCalledWith("https://hc.example/abc", "fail");
  });

  it("no rows at all reports 'unknown' and alerts — absence of evidence is not health", async () => {
    aggregate.mockResolvedValue({ _max: { fetchedAt: null } });
    const r = await monitorOddsFetchedAt("https://hc.example/abc", NOW);
    expect(r.freshness.status).toBe("unknown");
    expect(r.pinged).toBe("fail");
  });

  it("NEVER throws to the caller when the query fails — it must not take down the cron it watches", async () => {
    aggregate.mockRejectedValue(new Error("connection refused"));
    await expect(monitorOddsFetchedAt("https://hc.example/abc", NOW)).resolves.toBeDefined();
  });

  it("a query failure is reported as unmeasured ('unknown'), never as measured-and-fine", async () => {
    aggregate.mockRejectedValue(new Error("connection refused"));
    const r = await monitorOddsFetchedAt(undefined, NOW);
    expect(r.freshness.status).toBe("unknown");
    expect(r.freshness.summary).toMatch(/Failed to query odds\.fetchedAt.*connection refused/);
    expect(r.freshness.ageMinutes).toBeNull();
  });

  it("a query failure with a ping URL pings fail", async () => {
    aggregate.mockRejectedValue(new Error("boom"));
    const r = await monitorOddsFetchedAt("https://hc.example/abc", NOW);
    expect(r.pinged).toBe("fail");
    expect(pingHealthcheck).toHaveBeenCalledWith("https://hc.example/abc", "fail");
  });

  it("a query failure without a ping URL still returns cleanly", async () => {
    aggregate.mockRejectedValue(new Error("boom"));
    const r = await monitorOddsFetchedAt(undefined, NOW);
    expect(r.pinged).toBe("none");
    expect(pingHealthcheck).not.toHaveBeenCalled();
  });
});
