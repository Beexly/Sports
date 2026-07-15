import { describe, expect, it } from "vitest";
import {
  buildPickDeathClock,
  type OddsRowForClock,
  type PickForClock,
} from "@/lib/market/pick-death-clock";

/**
 * Pick Death Clock — price-space market movement since publish. Pins the
 * direction semantics per pick type and every honesty guard. No fair-prob,
 * no EV, no time-to-zero — those stay gated.
 */

const PUBLISH = new Date("2026-06-12T12:00:00Z");
const NOW = new Date("2026-06-12T15:00:00Z");

const basePick = {
  generatedAt: PUBLISH,
  homeTeamName: "Chiefs",
  awayTeamName: "Bills",
  sport: "NFL",
};

function spreadRow(
  bookmaker: string,
  spread: number,
  at: string,
): OddsRowForClock {
  return {
    bookmaker,
    market: "SPREADS",
    fetchedAt: new Date(at),
    spread,
    total: null,
    homePrice: null,
    awayPrice: null,
  };
}

function totalRow(bookmaker: string, total: number, at: string): OddsRowForClock {
  return {
    bookmaker,
    market: "TOTALS",
    fetchedAt: new Date(at),
    spread: null,
    total,
    homePrice: null,
    awayPrice: null,
  };
}

function h2hRow(
  bookmaker: string,
  homePrice: number,
  awayPrice: number,
  at: string,
): OddsRowForClock {
  return {
    bookmaker,
    market: "H2H",
    fetchedAt: new Date(at),
    spread: null,
    total: null,
    homePrice,
    awayPrice,
  };
}

describe("buildPickDeathClock — direction semantics", () => {
  it("home spread pick: line falling toward the home side reads toward_pick", () => {
    const pick: PickForClock = {
      ...basePick,
      pickType: "SPREAD",
      selection: "Chiefs -3.5",
    };
    const clock = buildPickDeathClock(
      pick,
      [
        spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("b", -3.5, "2026-06-12T11:30:00Z"),
        spreadRow("a", -4.5, "2026-06-12T14:00:00Z"),
        spreadRow("b", -4.0, "2026-06-12T14:30:00Z"),
      ],
      NOW,
    );
    expect(clock).not.toBeNull();
    if (!clock) return;
    expect(clock.metric).toBe("spread_points");
    expect(clock.atPublish).toBe(-3.5);
    expect(clock.latest).toBe(-4.5);
    expect(clock.referenceAtPublish).toBe(-3.5);
    expect(clock.referenceLatest).toBe(-4.25);
    expect(clock.delta).toBe(-0.75);
    expect(clock.direction).toBe("toward_pick");
    expect(clock.booksUsed).toBe(2);
    expect(clock.minutesSincePublish).toBe(180);
  });

  it("away spread pick reads the same move as away_from_pick", () => {
    const pick: PickForClock = {
      ...basePick,
      pickType: "SPREAD",
      selection: "Bills +3.5",
    };
    const clock = buildPickDeathClock(
      pick,
      [
        spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("b", -3.5, "2026-06-12T11:30:00Z"),
        spreadRow("a", -4.5, "2026-06-12T14:00:00Z"),
        spreadRow("b", -4.0, "2026-06-12T14:30:00Z"),
      ],
      NOW,
    );
    expect(clock!.direction).toBe("away_from_pick");
  });

  it("OVER pick: a rising total is toward_pick; UNDER reads it away", () => {
    const rows = [
      totalRow("a", 47.5, "2026-06-12T11:00:00Z"),
      totalRow("b", 47.5, "2026-06-12T11:00:00Z"),
      totalRow("a", 49.0, "2026-06-12T14:00:00Z"),
      totalRow("b", 48.5, "2026-06-12T14:00:00Z"),
    ];
    const over = buildPickDeathClock(
      { ...basePick, pickType: "TOTAL", selection: "OVER 47.5" },
      rows,
      NOW,
    );
    expect(over!.direction).toBe("toward_pick");
    expect(over!.delta).toBeCloseTo(1.25, 2);
    const under = buildPickDeathClock(
      { ...basePick, pickType: "TOTAL", selection: "UNDER 47.5" },
      rows,
      NOW,
    );
    expect(under!.direction).toBe("away_from_pick");
  });

  it("moneyline pick fails closed while its median reference is a probability unit", () => {
    const pick: PickForClock = {
      ...basePick,
      pickType: "MONEYLINE",
      selection: "Chiefs ML",
    };
    const clock = buildPickDeathClock(
      pick,
      [
        h2hRow("a", -120, +100, "2026-06-12T11:00:00Z"),
        h2hRow("b", -118, +100, "2026-06-12T11:00:00Z"),
        h2hRow("a", -140, +118, "2026-06-12T14:00:00Z"),
        h2hRow("b", -136, +114, "2026-06-12T14:00:00Z"),
      ],
      NOW,
    );
    expect(clock).toBeNull();
  });
});

describe("buildPickDeathClock — honesty guards", () => {
  const pick: PickForClock = {
    ...basePick,
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
  };

  it("refuses a one-book move — noise wearing a trend costume", () => {
    expect(
      buildPickDeathClock(
        pick,
        [
          spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
          spreadRow("a", -4.5, "2026-06-12T14:00:00Z"),
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it("only books present on BOTH sides of publish compare", () => {
    const clock = buildPickDeathClock(
      pick,
      [
        spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("b", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("a", -4.0, "2026-06-12T14:00:00Z"),
        spreadRow("b", -4.0, "2026-06-12T14:00:00Z"),
        spreadRow("c", -9.0, "2026-06-12T14:00:00Z"), // no pre-publish quote
      ],
      NOW,
    );
    expect(clock!.booksUsed).toBe(2);
    expect(clock!.latest).toBe(-4.0);
  });

  it("returns null when nothing was captured before publish", () => {
    expect(
      buildPickDeathClock(
        pick,
        [
          spreadRow("a", -4.0, "2026-06-12T14:00:00Z"),
          spreadRow("b", -4.0, "2026-06-12T14:00:00Z"),
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it("rejects wrong-unit prices and non-tradable point values", () => {
    const moneylinePick: PickForClock = {
      ...basePick,
      pickType: "MONEYLINE",
      selection: "Chiefs ML",
    };
    expect(buildPickDeathClock(
      moneylinePick,
      [
        h2hRow("a", -39, 105, "2026-06-12T11:00:00Z"),
        h2hRow("b", 1.91, 105, "2026-06-12T11:00:00Z"),
        h2hRow("a", -110, 100, "2026-06-12T14:00:00Z"),
        h2hRow("b", -110, 100, "2026-06-12T14:00:00Z"),
      ],
      NOW,
    )).toBeNull();
    expect(buildPickDeathClock(
      pick,
      [
        spreadRow("a", -3.2, "2026-06-12T11:00:00Z"),
        spreadRow("b", 8.954545454545455, "2026-06-12T11:00:00Z"),
        spreadRow("a", -3.5, "2026-06-12T14:00:00Z"),
        spreadRow("b", -3.5, "2026-06-12T14:00:00Z"),
      ],
      NOW,
    )).toBeNull();
  });

  it("uses an observed executable quote instead of an invented midpoint", () => {
    const clock = buildPickDeathClock(
      pick,
      [
        spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("b", -3, "2026-06-12T11:00:00Z"),
        spreadRow("a", -4.5, "2026-06-12T14:00:00Z"),
        spreadRow("b", -4, "2026-06-12T14:00:00Z"),
      ],
      NOW,
    );
    expect(clock?.atPublish).toBe(-3.5);
    expect(clock?.latest).toBe(-4.5);
    expect(clock?.referenceAtPublish).toBe(-3.25);
    expect(clock?.referenceLatest).toBe(-4.25);
    expect([-3.5, -3]).toContain(clock?.atPublish);
    expect([-4.5, -4]).toContain(clock?.latest);
  });

  it("reads flat when only the executable tie-break changes", () => {
    const clock = buildPickDeathClock(
      pick,
      [
        spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("b", -3, "2026-06-12T11:00:00Z"),
        spreadRow("a", -4, "2026-06-12T14:00:00Z"),
        spreadRow("b", -2.5, "2026-06-12T14:00:00Z"),
      ],
      NOW,
    );

    expect(clock?.atPublish).toBe(-3.5);
    expect(clock?.latest).toBe(-4);
    expect(clock?.referenceAtPublish).toBe(-3.25);
    expect(clock?.referenceLatest).toBe(-3.25);
    expect(clock?.delta).toBe(0);
    expect(clock?.direction).toBe("flat");
    expect(clock?.ratePerHour).toBe(0);
  });

  it("an unmoved market reads flat, not a direction", () => {
    const clock = buildPickDeathClock(
      pick,
      [
        spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("b", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("a", -3.5, "2026-06-12T14:00:00Z"),
        spreadRow("b", -3.5, "2026-06-12T14:00:00Z"),
      ],
      NOW,
    );
    expect(clock!.direction).toBe("flat");
    expect(clock!.ratePerHour).toBe(0);
  });

  it("a selection naming neither team yields null rather than a guess", () => {
    expect(
      buildPickDeathClock(
        { ...basePick, pickType: "SPREAD", selection: "Raiders -3.5" },
        [
          spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
          spreadRow("b", -3.5, "2026-06-12T11:00:00Z"),
          spreadRow("a", -4.0, "2026-06-12T14:00:00Z"),
          spreadRow("b", -4.0, "2026-06-12T14:00:00Z"),
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it("never speaks in fair-prob or EV terms", () => {
    // Source-level pin lives in audit-drawer-shape; here we pin the output
    // shape itself: only price-space fields exist.
    const clock = buildPickDeathClock(
      pick,
      [
        spreadRow("a", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("b", -3.5, "2026-06-12T11:00:00Z"),
        spreadRow("a", -4.0, "2026-06-12T14:00:00Z"),
        spreadRow("b", -4.0, "2026-06-12T14:00:00Z"),
      ],
      NOW,
    )!;
    const keys = Object.keys(clock).join(" ");
    expect(keys).not.toMatch(/fair|prob|ev|edge|kelly/i);
  });
});
