import { describe, expect, it } from "vitest";
import { usageSummary, type PlatformUsageEvent } from "./usage-meter";

const events: PlatformUsageEvent[] = [
  { at: new Date("2026-07-01T00:00:00Z"), provider: "aws", metric: "lambda-invocations", quantity: 100, unitCostProxyUsd: 1.5 },
  { at: new Date("2026-07-02T00:00:00Z"), provider: "aws", metric: "lambda-invocations", quantity: 50, unitCostProxyUsd: 0.75 },
  { at: new Date("2026-07-01T00:00:00Z"), provider: "anthropic", metric: "input-tokens", quantity: 20000, unitCostProxyUsd: 3.2 },
  { at: new Date("2026-07-03T00:00:00Z"), provider: "vercel", metric: "edge-requests", quantity: 500 }, // no unitCostProxyUsd
];

describe("usageSummary", () => {
  it("filters and sums quantity/estUsd per provider", () => {
    expect(usageSummary(events, "aws")).toEqual({
      provider: "aws",
      quantity: 150,
      estUsd: 2.25,
    });
  });

  it("treats a missing unitCostProxyUsd as 0, not NaN", () => {
    expect(usageSummary(events, "vercel")).toEqual({
      provider: "vercel",
      quantity: 500,
      estUsd: 0,
    });
  });

  it("returns zeros, not undefined/NaN, for a provider with zero events", () => {
    expect(usageSummary(events, "gcp")).toEqual({
      provider: "gcp",
      quantity: 0,
      estUsd: 0,
    });
  });

  it("returns zeros for an empty events array", () => {
    expect(usageSummary([], "cloudflare")).toEqual({
      provider: "cloudflare",
      quantity: 0,
      estUsd: 0,
    });
  });

  it("aggregates a single-event provider correctly", () => {
    expect(usageSummary(events, "anthropic")).toEqual({
      provider: "anthropic",
      quantity: 20000,
      estUsd: 3.2,
    });
  });
});
