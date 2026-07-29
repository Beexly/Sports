import { describe, expect, it } from "vitest";
import {
  buildDefaultRouting,
  createCompositeProvider,
  prefixMatch,
  resolveProviderId,
} from "../providers/registry.js";
import { getMetricById } from "../catalog.js";

describe("provider registry", () => {
  it("routes nfl.* to nflverse provider", async () => {
    const calls: string[] = [];
    const entries = buildDefaultRouting({
      nflverse: async (m) => {
        calls.push(m.id);
        return 1;
      },
      demo: async () => 0,
    });
    const composite = createCompositeProvider(entries);
    const metric = getMetricById("nfl.box.pass_yds");
    expect(metric).toBeTruthy();
    const v = await composite(metric!, "p1", "2025-11-01T00:00:00.000Z");
    expect(v).toBe(1);
    expect(calls[0]).toContain("nfl.box");
  });

  it("prefixMatch works", () => {
    expect(prefixMatch("nfl.")("nfl.box.x")).toBe(true);
    expect(prefixMatch("nfl.")("mlb.x")).toBe(false);
  });

  it("resolveProviderId", () => {
    const entries = buildDefaultRouting({
      odds: async () => 0.5,
    });
    const m = getMetricById("mkt.consensus.spread.novig");
    expect(m).toBeTruthy();
    expect(resolveProviderId(m!, entries)).toBe("odds");
  });
});
