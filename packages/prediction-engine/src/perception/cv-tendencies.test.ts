import { describe, expect, it } from "vitest";
import {
  distanceBucket,
  downDistanceMatrix,
  routeCombinationFrequency,
  runPassTendency,
  targetShareByFormation,
} from "./cv-tendencies.js";
import type { PlayRecord } from "./cv-play.js";

function rec(partial: Partial<PlayRecord> & { playId: string }): PlayRecord {
  return {
    gameId: "g1",
    qtr: 2,
    clockSec: 300,
    down: 1,
    distanceYd: 10,
    yardLineOwn: 25,
    scoreDiff: 0,
    possession: "KC",
    personnel: "11",
    backfield: "shotgun",
    distribution: "trips-right",
    routeCombo: "go+out+slant",
    playType: "pass",
    resultYards: 8,
    epa: null,
    ...partial,
  };
}

function situationalCorpus(): PlayRecord[] {
  const rows: PlayRecord[] = [];
  let n = 0;
  const add = (p: Partial<PlayRecord> & { playId: string }) => {
    rows.push(rec({ ...p, playId: `p${n++}` }));
  };
  // 3rd & short: 8 runs, 2 passes. These rows use a different formation
  // family so they don't pollute the trips assertions below.
  for (let i = 0; i < 8; i++)
    add({ down: 3, distanceYd: 2, playType: "run", routeCombo: null, distribution: "2x2" });
  for (let i = 0; i < 2; i++)
    add({ down: 3, distanceYd: 2, playType: "pass", distribution: "2x2", routeCombo: "out+slant" });
  // 3rd & long: 1 run, 9 passes.
  for (let i = 0; i < 1; i++)
    add({ down: 3, distanceYd: 9, playType: "run", routeCombo: null, distribution: "2x2" });
  for (let i = 0; i < 9; i++)
    add({ down: 3, distanceYd: 9, playType: "pass", distribution: "2x2", routeCombo: "go+hitch" });
  // Trips route combos.
  for (let i = 0; i < 6; i++)
    add({ down: 2, distanceYd: 6, distribution: "trips-right", routeCombo: "go+out+slant", playType: "pass" });
  for (let i = 0; i < 4; i++)
    add({ down: 2, distanceYd: 6, distribution: "trips-right", routeCombo: "corner+dig+flat", playType: "pass" });
  return rows;
}

describe("distanceBucket", () => {
  it("buckets short/medium/long", () => {
    expect(distanceBucket(2)).toBe("short");
    expect(distanceBucket(5)).toBe("medium");
    expect(distanceBucket(12)).toBe("long");
    expect(distanceBucket(null)).toBeNull();
  });
});

describe("runPassTendency", () => {
  const plays = situationalCorpus();

  it("reads 80% run on 3rd & short", () => {
    const t = runPassTendency(plays, { team: "KC", down: 3, bucket: "short" })!;
    expect(t.n).toBe(10);
    expect(t.runRate).toBe(0.8);
    expect(t.passRate).toBe(0.2);
  });

  it("reads 90% pass on 3rd & long", () => {
    const t = runPassTendency(plays, { team: "KC", down: 3, bucket: "long" })!;
    expect(t.passRate).toBe(0.9);
  });

  it("returns null below the minimum sample", () => {
    expect(runPassTendency(plays, { team: "KC", down: 4, bucket: "long" })).toBeNull();
    expect(
      runPassTendency(plays, { team: "KC", down: 4, bucket: "long", minN: 1 }),
    ).toBeNull(); // no rows at all
  });

  it("respects the team filter", () => {
    expect(runPassTendency(plays, { team: "PHI", down: 3, bucket: "short" })).toBeNull();
  });
});

describe("routeCombinationFrequency", () => {
  it("ranks combos from trips", () => {
    const rows = routeCombinationFrequency(
      situationalCorpus(),
      { team: "KC", distribution: "trips-right" },
      5,
    );
    expect(rows[0]!.combo).toBe("go+out+slant");
    expect(rows[0]!.n).toBe(6);
    expect(rows[1]!.combo).toBe("corner+dig+flat");
  });
});

describe("targetShareByFormation", () => {
  it("computes per-route shares within a formation", () => {
    const rows = targetShareByFormation(situationalCorpus(), { team: "KC" });
    const trips = rows.filter((r) => r.formation === "trips-right");
    // 10 pass plays from trips: 6×(go,out,slant) + 4×(corner,dig,flat) = 30 route slots.
    const go = trips.find((r) => r.route === "go")!;
    expect(go.n).toBe(6);
    expect(go.share).toBeCloseTo(0.2, 3);
    const total = trips.reduce((a, r) => a + r.share, 0);
    expect(total).toBeCloseTo(1, 2);
  });
});

describe("downDistanceMatrix", () => {
  it("builds the full situational matrix", () => {
    const m = downDistanceMatrix(situationalCorpus(), "KC");
    const thirdShort = m.find((r) => r.down === 3 && r.bucket === "short")!;
    expect(thirdShort.runRate).toBe(0.8);
    const thirdLong = m.find((r) => r.down === 3 && r.bucket === "long")!;
    expect(thirdLong.passRate).toBe(0.9);
    // Sparse cells are omitted, not zero-filled.
    expect(m.find((r) => r.down === 4)).toBeUndefined();
  });
});
