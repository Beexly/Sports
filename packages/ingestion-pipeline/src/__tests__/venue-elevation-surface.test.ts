import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

const NFL = { sportKey: "americanfootball_nfl", now: () => new Date("2026-10-01T21:00:00Z") };

async function vote(id: string, home: string, away: string, kickoff: string) {
  const tilt = await applyContinuousSignalTilt(0.5, SIGNAL_REGISTRY, {
    ...NFL,
    homeTeam: home,
    awayTeam: away,
    commenceTime: new Date(kickoff),
    env: {},
  } as never);
  return { tilt, found: tilt.votes.find((v) => v.signalId === id) };
}

describe("measured elevation and surface mismatch", () => {
  it("moves a Denver home game from measured feet above 4000, and does not call the fatigue kernel", async () => {
    const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_high_altitude_fatigue");
    const reading = await signal!.evaluate!({
      ...NFL,
      homeTeam: "Denver Broncos",
      awayTeam: "Buffalo Bills",
      commenceTime: new Date("2026-10-04T20:00:00Z"),
      env: {},
    } as never);
    expect(reading).toBeTruthy();
    expect(reading!.value).toBeCloseTo(1.1949, 3);
    expect(reading!.metadata?.basis).toBe("usgs feet above 4000, fatigue kernel not called");
    const { tilt, found } = await vote(
      "nfl_high_altitude_fatigue",
      "Denver Broncos",
      "Buffalo Bills",
      "2026-10-04T20:00:00Z",
    );
    expect(found, "elevation must reach the tilt").toBeTruthy();
    expect(found!.rawValue).toBeCloseTo(1.1949, 3);
    expect(tilt.adjustedHomeP).not.toBe(0.5);
  });

  it("abstains below 4000 feet and when the home coordinate was never queried", async () => {
    const greenBay = await vote(
      "nfl_high_altitude_fatigue",
      "Green Bay Packers",
      "Chicago Bears",
      "2026-10-04T17:00:00Z",
    );
    expect(greenBay.found).toBeUndefined();
    const sanFrancisco = await vote(
      "nfl_high_altitude_fatigue",
      "San Francisco 49ers",
      "Dallas Cowboys",
      "2026-10-04T20:00:00Z",
    );
    expect(sanFrancisco.found).toBeUndefined();
  });

  it("votes when the visitor's home surface differs, and abstains when it does not", async () => {
    const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_turf_surface_fatigue");
    const reading = await signal!.evaluate!({
      ...NFL,
      homeTeam: "Denver Broncos",
      awayTeam: "Buffalo Bills",
      commenceTime: new Date("2026-10-04T20:00:00Z"),
      env: {},
    } as never);
    expect(reading?.metadata?.basis).toContain("turf kernel not called");
    const mismatch = await vote(
      "nfl_turf_surface_fatigue",
      "Denver Broncos",
      "Buffalo Bills",
      "2026-10-04T20:00:00Z",
    );
    expect(mismatch.found, "surface mismatch must reach the tilt").toBeTruthy();
    expect(mismatch.found!.rawValue).toBe(1);
    const same = await vote(
      "nfl_turf_surface_fatigue",
      "Green Bay Packers",
      "Chicago Bears",
      "2026-10-04T17:00:00Z",
    );
    expect(same.found).toBeUndefined();
  });

  it("abstains the week-4 neutral site instead of using either club's stadium", async () => {
    const elevation = await vote(
      "nfl_high_altitude_fatigue",
      "Indianapolis Colts",
      "Washington Commanders",
      "2026-10-04T13:30:00Z",
    );
    const surface = await vote(
      "nfl_turf_surface_fatigue",
      "Indianapolis Colts",
      "Washington Commanders",
      "2026-10-04T13:30:00Z",
    );
    expect(elevation.found).toBeUndefined();
    expect(surface.found).toBeUndefined();
  });
});
