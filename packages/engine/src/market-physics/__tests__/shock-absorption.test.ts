import { describe, it, expect } from "vitest";
import { studyShock, ShockTimestampError, type MarketObservation, type ShockEvent } from "../shock-absorption.js";

const shock: ShockEvent = { type: "qb_status", timestamp: "2024-09-08T12:00:00Z", subject: "QB1" };
const decision = "2024-09-08T12:30:00Z";

// total moves (fast then slow book); a rush prop stays stale; one obs is post-decision.
function observations(): MarketObservation[] {
  return [
    { market: "total:OVER", book: "fast", point: 45, timestamp: "2024-09-08T11:55:00Z" },
    { market: "total:OVER", book: "slow", point: 45, timestamp: "2024-09-08T11:55:00Z" },
    { market: "total:OVER", book: "fast", point: 42, timestamp: "2024-09-08T12:05:00Z" }, // first mover
    { market: "total:OVER", book: "slow", point: 42, timestamp: "2024-09-08T12:20:00Z" },
    { market: "player_rush_yds:RB:OVER", book: "fast", point: 60, timestamp: "2024-09-08T11:55:00Z" },
    { market: "player_rush_yds:RB:OVER", book: "fast", point: 60, timestamp: "2024-09-08T12:25:00Z" }, // stale
    { market: "total:OVER", book: "fast", point: 41, timestamp: "2024-09-08T12:45:00Z" }, // POST-decision: ignored
  ];
}

describe("studyShock — validation (fail loudly)", () => {
  it("throws when the shock timestamp is missing", () => {
    expect(() => studyShock({ shock: { type: "injury_report", timestamp: "" }, decisionTime: decision, observations: [] })).toThrow(ShockTimestampError);
  });
  it("throws when the shock is after the decision time", () => {
    expect(() =>
      studyShock({ shock: { type: "injury_report", timestamp: "2024-09-08T13:00:00Z" }, decisionTime: decision, observations: [] }),
    ).toThrow(/AFTER the decision/);
  });
});

describe("studyShock — event study", () => {
  const r = studyShock({ shock, decisionTime: decision, observations: observations() });

  it("uses only pre-decision observations", () => {
    expect(r.ignoredPostDecision).toBe(1); // the 12:45 obs
  });

  it("measures the total's pre/post state, first mover, and half-life", () => {
    const total = r.paths.find((p) => p.market === "total:OVER")!;
    expect(total.preState).toBe(45);
    expect(total.postState).toBe(42);
    expect(total.magnitude).toBe(-3);
    expect(total.firstBookToMove).toBe("fast");
    expect(total.halfLifeMs).toBe(5 * 60_000); // consensus hits 43.5 at 12:05
  });

  it("flags the stale prop as a lagging market / underreaction", () => {
    expect(r.firstMarketToMove).toBe("total:OVER");
    expect(r.laggingMarkets).toContain("player_rush_yds:RB:OVER");
    const prop = r.paths.find((p) => p.market === "player_rush_yds:RB:OVER")!;
    expect(prop.magnitude).toBe(0);
    expect(prop.reaction).toBe("underreaction");
  });
});
