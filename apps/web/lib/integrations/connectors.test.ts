import { describe, it, expect } from "vitest";
import {
  CONNECTORS,
  connectorsByStatus,
  connectorByKey,
  connectorSummary,
} from "./connectors";

describe("connector registry", () => {
  it("marks Sleeper live with no setup path", () => {
    const sleeper = connectorByKey("sleeper");
    expect(sleeper?.status).toBe("live");
    expect(sleeper?.path).toBeNull();
  });

  it("keeps closed platforms honestly unavailable with a stated reason", () => {
    for (const key of ["espn", "underdog", "prizepicks", "dabble"]) {
      const c = connectorByKey(key);
      expect(c, key).not.toBeNull();
      expect(c?.status, key).toBe("unavailable");
      expect((c?.path ?? "").length, key).toBeGreaterThan(0);
    }
  });

  it("routes DFS books (FanDuel/DraftKings) to the licensed feed, not scraping", () => {
    expect(connectorByKey("fanduel")?.status).toBe("licensed-feed");
    expect(connectorByKey("draftkings")?.status).toBe("licensed-feed");
    expect(connectorByKey("draftkings")?.why.toLowerCase()).toContain("terms of use");
  });

  it("gates Yahoo behind official OAuth", () => {
    const yahoo = connectorByKey("yahoo");
    expect(yahoo?.status).toBe("oauth-gated");
    expect(yahoo?.path?.toLowerCase()).toContain("oauth");
  });

  it("groups by status in display order (live first) with no empty groups", () => {
    const groups = connectorsByStatus();
    expect(groups[0]?.status).toBe("live");
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
    const flattened = groups.flatMap((g) => g.items);
    expect(flattened).toHaveLength(CONNECTORS.length);
  });

  it("summarizes live vs gated counts", () => {
    const s = connectorSummary();
    expect(s.total).toBe(CONNECTORS.length);
    expect(s.live).toBeGreaterThanOrEqual(1);
    expect(s.live + s.gated).toBeLessThanOrEqual(s.total);
  });
});
