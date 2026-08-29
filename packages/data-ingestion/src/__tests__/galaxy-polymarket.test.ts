import { describe, expect, it } from "vitest";
import { polymarketEventsToOddsApi } from "../galaxy-polymarket.js";

describe("polymarketEventsToOddsApi — Galaxy keyless Gamma (no CLOB)", () => {
  it("parses JSON-encoded outcomes/prices like the Python feed", () => {
    const events = polymarketEventsToOddsApi(
      [
        {
          id: "e1",
          startDate: "2026-09-07T17:00:00Z",
          markets: [
            {
              conditionId: "c1",
              question: "NFL: Will the Falcons beat the Panthers by more than 3.5 points?",
              outcomes: '["Yes","No"]',
              outcomePrices: '["0.12","0.88"]',
            },
          ],
        },
      ],
      "2026-08-27T00:00:00Z",
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.bookmakers[0]?.key).toBe("polymarket_consensus");
    const o = events[0]?.bookmakers[0]?.markets[0]?.outcomes ?? [];
    expect(o[0]?.fair_prob).toBe(0.12);
    expect(o[1]?.fair_prob).toBe(0.88);
    expect(o[0]?.price).toBeUndefined();
  });
  it("skips non-NFL questions", () => {
    expect(
      polymarketEventsToOddsApi(
        [{ markets: [{ question: "Fed rate hike?", outcomes: '["Yes","No"]', outcomePrices: '["0.5","0.5"]' }] }],
        "2026-08-27T00:00:00Z",
      ),
    ).toEqual([]);
  });
});
