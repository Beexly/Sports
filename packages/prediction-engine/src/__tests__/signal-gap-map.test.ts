import { describe, expect, it } from "vitest";
import {
  SIGNAL_GAP_MAP,
  signalGapSummary,
  type SignalGapEntry,
} from "../signal-gap-map.js";

describe("signal gap map — no fake stubs", () => {
  it("covers the five ops-note candidates by name", () => {
    const keys = SIGNAL_GAP_MAP.map((e) => e.key);
    for (const required of [
      "opp_adj_epa_team",
      "expected_turnover_diff",
      "pressure_matchup",
      "qb_epa_cpoe",
      "market_clv_features",
    ]) {
      expect(keys).toContain(required);
    }
  });

  it("every entry carries a precise reason and a data-path verdict", () => {
    for (const e of SIGNAL_GAP_MAP) {
      expect(e.reason.length).toBeGreaterThan(40);
      expect(["CLEAR", "PARTIAL", "BLOCKED"]).toContain(e.dataPath);
    }
  });

  it("WIRED_FLAGGED entries name a real module, test, and default-off flag", () => {
    for (const e of SIGNAL_GAP_MAP.filter((x) => x.status === "WIRED_FLAGGED")) {
      expect(e.module).toBeTruthy();
      expect(e.test).toBeTruthy();
      expect(e.flag).toBeTruthy();
      expect(e.flag).toMatch(/default false/);
    }
  });

  it("CATALOG_ONLY entries never pretend to have a live module", () => {
    for (const e of SIGNAL_GAP_MAP.filter((x) => x.status === "CATALOG_ONLY" && x.key !== "strength.opp_adj_epa (frontier catalog)")) {
      expect(e.module).toBeNull();
      expect(e.test).toBeNull();
    }
  });

  it("IMPLEMENTED_NOT_WIRED points at a real file and refuses a fake flag", () => {
    for (const e of SIGNAL_GAP_MAP.filter((x) => x.status === "IMPLEMENTED_NOT_WIRED")) {
      expect(e.module).toBeTruthy();
      expect(e.flag).toBeNull();
    }
  });

  it("summary counts match the map", () => {
    const s = signalGapSummary();
    const count = (p: (e: SignalGapEntry) => boolean) => SIGNAL_GAP_MAP.filter(p).length;
    expect(s.wiredFlagged).toBe(count((e) => e.status === "WIRED_FLAGGED"));
    expect(s.implementedNotWired).toBe(count((e) => e.status === "IMPLEMENTED_NOT_WIRED"));
    expect(s.catalogOnly).toBe(count((e) => e.status === "CATALOG_ONLY"));
    expect(s.clearDataPath).toBe(count((e) => e.dataPath === "CLEAR"));
    // This PR wires exactly two flagged items and leaves the rest tracked.
    expect(s.wiredFlagged).toBe(2);
    expect(s.wiredFlagged + s.implementedNotWired + s.catalogOnly + s.wiredLive).toBe(
      SIGNAL_GAP_MAP.length,
    );
  });
});
