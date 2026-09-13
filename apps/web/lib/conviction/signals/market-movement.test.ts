import { describe, it, expect } from "vitest";

import type { GateCandidate } from "@/lib/conviction/gate-contract";

import {
  createMarketMovementSignal,
  readMarketMovement,
  MARKET_MOVEMENT_BASIS,
  POINT_NOISE_FLOOR,
  PROBABILITY_NOISE_FLOOR,
  type MarketSnapshot,
} from "./market-movement";

// Fixed dates, passed in. No Date.now(), no network, no database.
const T0 = new Date("2026-09-13T12:00:00.000Z");
const T1 = new Date("2026-09-13T15:00:00.000Z");
const T2 = new Date("2026-09-13T18:00:00.000Z");
const T3 = new Date("2026-09-13T21:00:00.000Z");
const T4 = new Date("2026-09-14T00:00:00.000Z");

function snap(
  capturedAt: Date,
  fields: { line?: number | null; price?: number | null; bookmakerCount?: number },
): MarketSnapshot {
  return {
    capturedAt,
    bookmakerCount: fields.bookmakerCount ?? 3,
    price: fields.price ?? null,
    line: fields.line ?? null,
  };
}

function candidate(overrides: Partial<GateCandidate> = {}): GateCandidate {
  return {
    gameId: "game-1",
    sportKey: "americanfootball_nfl",
    homeTeamName: "Carolina Panthers",
    awayTeamName: "Atlanta Falcons",
    commenceTime: T4,
    pickType: "SPREAD",
    selection: "Carolina Panthers -3.5",
    side: "home",
    line: -3.5,
    ...overrides,
  };
}

describe("readMarketMovement — spreads", () => {
  it("CONFIRMS when our team's number moves down (market gets on our side)", () => {
    const reading = readMarketMovement("SPREAD", "home", [
      snap(T0, { line: -3.5 }),
      snap(T2, { line: -5 }),
    ]);
    expect(reading?.verdict).toBe("CONFIRMS");
    expect(reading?.towardUs).toBeCloseTo(1.5, 10);
    expect(reading?.unit).toBe("points");
  });

  it("CONTRADICTS when our team's number moves up (market walks off our side)", () => {
    const reading = readMarketMovement("SPREAD", "home", [
      snap(T0, { line: -3.5 }),
      snap(T2, { line: -2 }),
    ]);
    expect(reading?.verdict).toBe("CONTRADICTS");
    expect(reading?.towardUs).toBeCloseTo(-1.5, 10);
  });

  it("reads the away side off its own posted number", () => {
    // We took the away team at +7; the market shortens it to +6 -> toward us.
    const toward = readMarketMovement("SPREAD", "away", [
      snap(T0, { line: 7 }),
      snap(T2, { line: 6 }),
    ]);
    expect(toward?.verdict).toBe("CONFIRMS");

    const against = readMarketMovement("SPREAD", "away", [
      snap(T0, { line: 7 }),
      snap(T2, { line: 8.5 }),
    ]);
    expect(against?.verdict).toBe("CONTRADICTS");
  });

  it("NEUTRAL inside the noise floor", () => {
    const reading = readMarketMovement("SPREAD", "home", [
      snap(T0, { line: -3.5 }),
      snap(T2, { line: -3.75 }),
    ]);
    expect(reading?.verdict).toBe("NEUTRAL");
    expect(Math.abs(reading?.towardUs ?? 0)).toBeLessThan(POINT_NOISE_FLOOR);
  });

  it("NEUTRAL at EXACTLY the noise floor, in both directions", () => {
    const toward = readMarketMovement("SPREAD", "home", [
      snap(T0, { line: -3.5 }),
      snap(T2, { line: -3.5 - POINT_NOISE_FLOOR }),
    ]);
    expect(toward?.towardUs).toBeCloseTo(POINT_NOISE_FLOOR, 10);
    expect(toward?.verdict).toBe("NEUTRAL");

    const against = readMarketMovement("SPREAD", "home", [
      snap(T0, { line: -3.5 }),
      snap(T2, { line: -3.5 + POINT_NOISE_FLOOR }),
    ]);
    expect(against?.towardUs).toBeCloseTo(-POINT_NOISE_FLOOR, 10);
    expect(against?.verdict).toBe("NEUTRAL");
  });

  it("CONFIRMS just past the noise floor", () => {
    const reading = readMarketMovement("SPREAD", "home", [
      snap(T0, { line: -3.5 }),
      snap(T2, { line: -4.01 }),
    ]);
    expect(reading?.verdict).toBe("CONFIRMS");
  });

  it("compares earliest to latest, not input order", () => {
    const reading = readMarketMovement("SPREAD", "home", [
      snap(T2, { line: -5 }),
      snap(T0, { line: -3.5 }),
      snap(T1, { line: -4 }),
    ]);
    expect(reading?.verdict).toBe("CONFIRMS");
    expect(reading?.towardUs).toBeCloseTo(1.5, 10);
    expect(reading?.snapshotsUsed).toBe(3);
  });
});

describe("readMarketMovement — totals", () => {
  it("CONFIRMS an OVER when the number rises, CONTRADICTS when it falls", () => {
    const up = readMarketMovement("TOTAL", "over", [
      snap(T0, { line: 44.5 }),
      snap(T2, { line: 46.5 }),
    ]);
    expect(up?.verdict).toBe("CONFIRMS");

    const down = readMarketMovement("TOTAL", "over", [
      snap(T0, { line: 44.5 }),
      snap(T2, { line: 42.5 }),
    ]);
    expect(down?.verdict).toBe("CONTRADICTS");
  });

  it("CONFIRMS an UNDER when the number falls, CONTRADICTS when it rises", () => {
    const down = readMarketMovement("TOTAL", "under", [
      snap(T0, { line: 44.5 }),
      snap(T2, { line: 42.5 }),
    ]);
    expect(down?.verdict).toBe("CONFIRMS");

    const up = readMarketMovement("TOTAL", "under", [
      snap(T0, { line: 44.5 }),
      snap(T2, { line: 46.5 }),
    ]);
    expect(up?.verdict).toBe("CONTRADICTS");
  });
});

describe("readMarketMovement — moneylines", () => {
  it("CONFIRMS when our side's price shortens", () => {
    const reading = readMarketMovement("MONEYLINE", "home", [
      snap(T0, { price: -110 }),
      snap(T2, { price: -150 }),
    ]);
    expect(reading?.verdict).toBe("CONFIRMS");
    expect(reading?.unit).toBe("probability");
    expect(reading?.towardUs).toBeGreaterThan(PROBABILITY_NOISE_FLOOR);
  });

  it("CONTRADICTS when our side's price drifts out", () => {
    const reading = readMarketMovement("MONEYLINE", "home", [
      snap(T0, { price: -150 }),
      snap(T2, { price: 120 }),
    ]);
    expect(reading?.verdict).toBe("CONTRADICTS");
    expect(reading?.towardUs).toBeLessThan(-PROBABILITY_NOISE_FLOOR);
  });

  it("NEUTRAL when the price barely moves", () => {
    const reading = readMarketMovement("MONEYLINE", "home", [
      snap(T0, { price: -110 }),
      snap(T2, { price: -111 }),
    ]);
    expect(reading?.verdict).toBe("NEUTRAL");
    expect(Math.abs(reading?.towardUs ?? 0)).toBeLessThan(PROBABILITY_NOISE_FLOOR);
  });
});

describe("readMarketMovement — absent data returns null, never NEUTRAL", () => {
  it("returns null on a single snapshot (absent data is not a flat line)", () => {
    expect(readMarketMovement("SPREAD", "home", [snap(T0, { line: -3.5 })])).toBeNull();
  });

  it("returns null on zero snapshots", () => {
    expect(readMarketMovement("SPREAD", "home", [])).toBeNull();
  });

  it("returns null when the side is null", () => {
    expect(
      readMarketMovement("SPREAD", null, [snap(T0, { line: -3.5 }), snap(T2, { line: -5 })]),
    ).toBeNull();
  });

  it("returns null when the snapshots carry no usable price", () => {
    expect(
      readMarketMovement("MONEYLINE", "home", [
        snap(T0, { price: 0 }),
        snap(T1, { price: Number.NaN }),
        snap(T2, { price: 50 }), // |price| < 100 is not a real American quote
        snap(T3, { price: null }),
      ]),
    ).toBeNull();
  });

  it("returns null when the snapshots carry no usable line", () => {
    expect(
      readMarketMovement("TOTAL", "over", [snap(T0, { line: null }), snap(T2, { line: null })]),
    ).toBeNull();
  });

  it("drops unusable rows but still reads when two usable ones remain", () => {
    const reading = readMarketMovement("MONEYLINE", "away", [
      snap(T0, { price: -110 }),
      snap(T1, { price: null }),
      snap(T2, { price: -150 }),
    ]);
    expect(reading?.verdict).toBe("CONFIRMS");
    expect(reading?.snapshotsUsed).toBe(2);
  });

  it("returns null when the side does not fit the market", () => {
    expect(
      readMarketMovement("SPREAD", "over", [snap(T0, { line: -3.5 }), snap(T2, { line: -5 })]),
    ).toBeNull();
  });
});

describe("completeness scales with how many snapshots backed the read", () => {
  it("maps 2 -> 0.5, 3 -> 0.667, 4 -> 0.833, 5+ -> 1.0", () => {
    const rows: ReadonlyArray<{ readonly at: Date; readonly line: number }> = [
      { at: T0, line: -3.5 },
      { at: T1, line: -3.75 },
      { at: T2, line: -4 },
      { at: T3, line: -4.25 },
      { at: T4, line: -4.5 },
      { at: new Date("2026-09-14T03:00:00.000Z"), line: -4.75 },
    ];
    const completenessAt = (count: number): number | undefined =>
      readMarketMovement(
        "SPREAD",
        "home",
        rows.slice(0, count).map((row) => snap(row.at, { line: row.line })),
      )?.completeness;

    expect(completenessAt(2)).toBeCloseTo(0.5, 10);
    expect(completenessAt(3)).toBeCloseTo(2 / 3, 10);
    expect(completenessAt(4)).toBeCloseTo(5 / 6, 10);
    expect(completenessAt(5)).toBeCloseTo(1, 10);
    expect(completenessAt(6)).toBeCloseTo(1, 10);
  });
});

describe("createMarketMovementSignal", () => {
  const deps = (snapshots: readonly MarketSnapshot[]) => ({
    loadSnapshots: async (): Promise<readonly MarketSnapshot[]> => snapshots,
  });

  it("returns a plain-English CONTRADICTS read naming the side", async () => {
    const signal = createMarketMovementSignal(
      deps([snap(T0, { line: -3.5, bookmakerCount: 4 }), snap(T2, { line: -2, bookmakerCount: 4 })]),
    );
    const read = await signal(candidate());
    expect(read).not.toBeNull();
    expect(read?.key).toBe("market-movement");
    expect(read?.verdict).toBe("CONTRADICTS");
    expect(read?.basis).toBe(MARKET_MOVEMENT_BASIS);
    expect(read?.reason).toBe(
      "The market has moved 1.5 points away from Carolina Panthers since we posted this, across 4 books.",
    );
    expect(read?.completeness).toBeCloseTo(0.5, 10);
  });

  it("names the over/under rather than a team on a total", async () => {
    const signal = createMarketMovementSignal(
      deps([snap(T0, { line: 44.5 }), snap(T2, { line: 46.5 })]),
    );
    const read = await signal(
      candidate({ pickType: "TOTAL", side: "over", selection: "Over 44.5", line: 44.5 }),
    );
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.reason).toBe(
      "The market has moved 2 points toward the over since we posted this, across 3 books.",
    );
  });

  it("describes a moneyline move in points of implied probability", async () => {
    const signal = createMarketMovementSignal(
      deps([snap(T0, { price: -110, bookmakerCount: 2 }), snap(T2, { price: -150, bookmakerCount: 2 })]),
    );
    const read = await signal(candidate({ pickType: "MONEYLINE", selection: "Carolina Panthers ML" }));
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.reason).toBe(
      "The market is coming our way — the price on Carolina Panthers has shortened 7.6 points since we posted this, across 2 books.",
    );
  });

  it("does not call the loader when the side is null", async () => {
    let calls = 0;
    const signal = createMarketMovementSignal({
      loadSnapshots: async (): Promise<readonly MarketSnapshot[]> => {
        calls += 1;
        return [];
      },
    });
    expect(await signal(candidate({ side: null }))).toBeNull();
    expect(calls).toBe(0);
  });

  it("returns null when the archive has only one snapshot", async () => {
    const signal = createMarketMovementSignal(deps([snap(T0, { line: -3.5 })]));
    expect(await signal(candidate())).toBeNull();
  });

  it("passes the gameId and pickType through to the loader", async () => {
    const seen: Array<[string, string]> = [];
    const signal = createMarketMovementSignal({
      loadSnapshots: async (gameId: string, pickType: string): Promise<readonly MarketSnapshot[]> => {
        seen.push([gameId, pickType]);
        return [snap(T0, { line: -3.5 }), snap(T2, { line: -5 })];
      },
    });
    await signal(candidate({ gameId: "game-77" }));
    expect(seen).toEqual([["game-77", "SPREAD"]]);
  });
});
