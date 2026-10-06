import { describe, expect, it } from "vitest";
import { playToRecord, type Play } from "./cv-play.js";

function basePlay(): Play {
  return {
    playId: "play_g1_1",
    gameId: "g1",
    snapT: 100,
    endT: 106,
    preSnapT: 98,
    snapKind: "set",
    scoreBug: {
      quarter: 4,
      clockSec: 154,
      down: 3,
      distanceYd: 7,
      yardLine: { team: "KC", yard: 32 },
      homeTeam: "PHI",
      homeScore: 17,
      awayTeam: "KC",
      awayScore: 24,
      possession: "KC",
      rawText: "Q4 2:34 3rd & 7 KC 24 PHI 17 KC 32",
      confidence: 0.9,
    },
    formation: {
      backfield: "shotgun",
      personnel: "11",
      wrLeft: 1,
      wrRight: 3,
      teCount: 1,
      rbCount: 1,
      distribution: "trips-right",
      empty: false,
      confidence: 0.85,
      notes: "test",
    },
    routes: [
      {
        trackletId: "wr1",
        route: "go",
        confidence: 0.8,
        breakPoint: null,
        depthYards: 12,
        releaseT: 100,
      },
      {
        trackletId: "wr2",
        route: "slant",
        confidence: 0.75,
        breakPoint: null,
        depthYards: 7,
        releaseT: 100,
      },
    ],
    separation: [],
    commentary: null,
    playType: "pass",
    resultYards: 14,
    confidence: 0.8,
  };
}

describe("playToRecord", () => {
  it("flattens a play into the database shape", () => {
    const r = playToRecord(basePlay());
    expect(r.playId).toBe("play_g1_1");
    expect(r.qtr).toBe(4);
    expect(r.down).toBe(3);
    expect(r.distanceYd).toBe(7);
    expect(r.yardLineOwn).toBe(32); // KC's own 32
    expect(r.scoreDiff).toBe(7); // KC 24 - PHI 17
    expect(r.personnel).toBe("11");
    expect(r.distribution).toBe("trips-right");
    expect(r.routeCombo).toBe("go+slant"); // canonical sorted order
    expect(r.playType).toBe("pass");
    expect(r.epa).toBeNull();
  });

  it("mirrors the yard line when the opponent's side is named", () => {
    const p = basePlay();
    const r = playToRecord({
      ...p,
      scoreBug: { ...p.scoreBug!, yardLine: { team: "PHI", yard: 40 } },
    });
    expect(r.yardLineOwn).toBe(60); // PHI's 40 = KC's 60
  });

  it("tolerates missing perception layers", () => {
    const r = playToRecord({
      ...basePlay(),
      scoreBug: null,
      formation: null,
      routes: [],
    });
    expect(r.qtr).toBeNull();
    expect(r.routeCombo).toBeNull();
    expect(r.personnel).toBeNull();
  });
});
