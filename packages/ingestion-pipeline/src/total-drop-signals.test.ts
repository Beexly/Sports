import { describe, expect, it } from "vitest";
import { planTotalDropSignals } from "./total-drop-signals.js";

describe("planTotalDropSignals", () => {
  const confirmed = new Set(["g1", "g2"]);

  it("upserts a TOTAL drop and deletes when that game published a TOTAL", () => {
    const plans = planTotalDropSignals(
      [{ gameId: "g1" }, { gameId: "g2" }],
      [
        { picks: [], dropReasons: [{ market: "TOTAL", reason: "fewer_than_min_books" }] },
        { picks: [{ pickType: "TOTAL" }], dropReasons: [] },
      ],
      confirmed,
    );
    expect(plans).toEqual([
      { gameId: "g1", action: "upsert", reason: "fewer_than_min_books" },
      { gameId: "g2", action: "delete" },
    ]);
  });

  it("skips games the fixture guard did not confirm", () => {
    const plans = planTotalDropSignals(
      [{ gameId: "ghost" }],
      [{ picks: [], dropReasons: [{ market: "TOTAL", reason: "confidence_below_floor" }] }],
      confirmed,
    );
    expect(plans).toEqual([]);
  });

  it("does not treat a SPREAD drop as a TOTAL label", () => {
    const plans = planTotalDropSignals(
      [{ gameId: "g1" }],
      [{ picks: [{ pickType: "SPREAD" }], dropReasons: [{ market: "SPREAD", reason: "unpublished" }] }],
      confirmed,
    );
    expect(plans).toEqual([{ gameId: "g1", action: "delete" }]);
  });
});
