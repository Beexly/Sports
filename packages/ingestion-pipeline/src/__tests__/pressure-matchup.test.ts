import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

const NFL = { sportKey: "americanfootball_nfl" } as const;

async function vote(home: string, away: string, kickoff: string) {
  const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_pressure_matchup");
  expect(signal).toBeTruthy();
  const tilt = await applyContinuousSignalTilt(0.5, [signal!], {
    ...NFL,
    homeTeam: home,
    awayTeam: away,
    commenceTime: new Date(kickoff),
    env: {},
  } as never);
  return { tilt, found: tilt.votes.find((v) => v.signalId === "nfl_pressure_matchup") };
}

describe("week-4 pressure matchup", () => {
  it("moves the home side from counts that stop before this week, and abstains any other week", async () => {
    const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_pressure_matchup");
    const reading = await signal!.evaluate!({
      ...NFL,
      homeTeam: "Seattle Seahawks",
      awayTeam: "Los Angeles Chargers",
      commenceTime: new Date("2026-10-04T20:00:00Z"),
      env: {},
    } as never);
    expect(reading!.value).toBeCloseTo(0.092766, 6);
    expect(reading!.metadata?.fourthDownNotVoted).toBe(true);

    const { tilt, found } = await vote("Seattle Seahawks", "Los Angeles Chargers", "2026-10-04T20:00:00Z");
    expect(found!.rawValue).toBeCloseTo(0.092766, 6);
    expect(tilt.adjustedHomeP).toBeGreaterThan(0.5);

    const against = await vote("San Francisco 49ers", "Denver Broncos", "2026-10-04T20:00:00Z");
    expect(against.found!.rawValue).toBeLessThan(0);
    expect(against.tilt.adjustedHomeP).toBeLessThan(0.5);

    const early = await vote("Seattle Seahawks", "Los Angeles Chargers", "2026-09-27T20:00:00Z");
    expect(early.found).toBeUndefined();
  });
});
