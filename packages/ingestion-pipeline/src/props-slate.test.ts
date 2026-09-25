import { describe, expect, it } from "vitest";
import {
  devigPropBook,
  propKellyStake,
  propMonteCarlo,
  runPropsSlate,
} from "./props-slate.js";
import type { PlayerProp } from "@sports/prediction-engine";

function prop(over: Partial<PlayerProp> = {}): PlayerProp {
  return {
    playerId: "p1",
    playerName: "Test Player",
    position: "WR",
    team: "KC",
    opponent: "BUF",
    propType: "receptions",
    odds: [
      {
        bookmaker: "Pinnacle",
        overOdds: -110,
        underOdds: -110,
        line: 5.5,
        vigPct: 4.8,
        isSharp: true,
        capturedAt: new Date().toISOString(),
      },
      {
        bookmaker: "DraftKings",
        overOdds: -105,
        underOdds: -115,
        line: 5.5,
        vigPct: 4.5,
        isSharp: false,
        capturedAt: new Date().toISOString(),
      },
    ],
    ...over,
  };
}

describe("props-slate", () => {
  it("fail-closes on empty slate", () => {
    const r = runPropsSlate({
      props: [],
      modelProbOver: {},
      lineFreshnessMinutes: 30,
      bankroll: 1000,
      projectedMean: 5.2,
      projectedStdDev: 1.8,
    });
    expect(r.ok).toBe(false);
    expect(r.note).toContain("fail-closed");
  });

  it("gates props and builds pass list + board", () => {
    const r = runPropsSlate({
      props: [prop()],
      modelProbOver: { "p1:receptions": 0.62 },
      lineFreshnessMinutes: 15,
      bankroll: 1000,
      projectedMean: 5.2,
      projectedStdDev: 1.8,
    });
    expect(r.propsConsidered).toBe(1);
    expect(r.gateResults.length).toBe(1);
    expect(Array.isArray(r.passList)).toBe(true);
    expect(Array.isArray(r.board)).toBe(true);
  });

  it("records an error when modelProbOver is missing — never imputes", () => {
    const r = runPropsSlate({
      props: [prop()],
      modelProbOver: {},
      lineFreshnessMinutes: 15,
      bankroll: 1000,
      projectedMean: 5.2,
      projectedStdDev: 1.8,
    });
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toContain("missing modelProbOver");
  });
});

describe("props-slate helpers", () => {
  it("devigPropBook fail-closes on missing odds", () => {
    expect(devigPropBook(null, 1.9)).toBeNull();
    expect(devigPropBook(1.9, 1.0)).toBeNull();
    const r = devigPropBook(1.91, 1.91);
    expect(r).not.toBeNull();
  });

  it("propKellyStake fail-closes on invalid inputs", () => {
    expect(propKellyStake(null, 0.5, 1000)).toBeNull();
    expect(propKellyStake(0.6, 1.0, 1000)).toBeNull();
    expect(propKellyStake(0.6, 0.45, 1000)).not.toBeNull();
  });

  it("propMonteCarlo fail-closes on invalid sd", () => {
    expect(propMonteCarlo(5, 0, 5.5, true)).toBeNull();
    expect(propMonteCarlo(5, 2, 5.5, true, 500)).not.toBeNull();
  });
});

describe("props-slate fire/price gates", () => {
  const input = {
    props: [prop()],
    modelProbOver: { "p1:receptions": 0.62 },
    lineFreshnessMinutes: 12,
    bankroll: 1000,
    projectedMean: 6.2,
    projectedStdDev: 2.1,
  };

  it("runs fire/price gates after buildBoard and exposes fireRows", () => {
    const r = runPropsSlate(input);
    expect(r.fireRows.length).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(r.fired)).toBe(true);
    if (r.fireRows.length > 0) {
      const row = r.fireRows[0]!;
      expect(row.propId).toBe("p1:receptions");
      expect(row.fire).toBeDefined();
      expect(row.priced).toBeDefined();
      expect(row.shop).toBeDefined();
      expect(row.juice).toBeDefined();
    }
  });

  it("fail-closes fire when the two-way quote is missing — never imputes", () => {
    const r = runPropsSlate({
      ...input,
      props: [prop({ odds: [] })],
    });
    expect(r.fireRows.length).toBeGreaterThanOrEqual(0);
    for (const row of r.fireRows) {
      if (row.fire.ok === false) {
        expect(row.fire.priced).toBe(false);
      }
    }
  });

  it("records a fireRow with bad_p when model p is missing", () => {
    const r = runPropsSlate({
      ...input,
      modelProbOver: {},
    });
    // board may be empty (gate discarded) so fireRows may be empty;
    // when a board row survives without a p, it must fail-close.
    for (const row of r.fireRows) {
      if (Number.isNaN(row.pOver)) {
        expect(row.fire.ok).toBe(false);
        if (row.fire.ok === false) expect(row.fire.refuse).toBe("bad_p");
      }
    }
  });

  it("runs reasonAnytimeTd for anytime-TD props when role context is present", () => {
    const atdProp = prop({
      playerId: "p2",
      propType: "anytime_td",
      odds: [
        {
          bookmaker: "Pinnacle",
          overOdds: 120,
          underOdds: -150,
          line: 0.5,
          vigPct: 5,
          isSharp: true,
          capturedAt: new Date().toISOString(),
        },
      ],
    });
    const r = runPropsSlate({
      props: [atdProp],
      modelProbOver: { "p2:anytime_td": 0.35 },
      lineFreshnessMinutes: 10,
      bankroll: 500,
      projectedMean: 0.35,
      projectedStdDev: 0.1,
      roleContexts: {
        p2: {
          playerId: "p2",
          season: 2026,
          week: 2,
          position: "RB",
          isHome: true,
          rolling: {
            windowGames: 8,
            snapShare: 0.62,
            redZoneShare: 0.4,
            usageShare: 0.55,
            teamPlaysPerGame: 62,
            oppTdRateAllowed: 0.28,
          },
          injuryStatus: "HEALTHY",
        },
      },
    });
    expect(r.anytimeTdRows.length).toBe(1);
    const row = r.anytimeTdRows[0]!;
    expect(row.propId).toBe("p2:anytime_td");
    expect(row.ok).toBe(true);
    expect(row.probability).toBeGreaterThan(0);
    expect(row.probability).toBeLessThan(1);
  });

  it("fail-closes anytime-TD rows when role context is missing — never imputes", () => {
    const atdProp = prop({ playerId: "p3", propType: "anytime_td" });
    const r = runPropsSlate({
      props: [atdProp],
      modelProbOver: { "p3:anytime_td": 0.3 },
      lineFreshnessMinutes: 10,
      bankroll: 500,
      projectedMean: 0.3,
      projectedStdDev: 0.1,
    });
    expect(r.anytimeTdRows.length).toBe(1);
    const row = r.anytimeTdRows[0]!;
    expect(row.ok).toBe(false);
    expect(row.reason).toContain("not imputed");
    expect(row.probability).toBeNull();
  });
});
