import { describe, expect, it } from "vitest";
import { noVigFromAmericanPrices } from "@sports/prediction-engine/src/market-read.js";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

const NFL = { sportKey: "americanfootball_nfl" } as const;

async function vote(id: string, home: string, away: string, kickoff: string) {
  const signal = SIGNAL_REGISTRY.find((s) => s.id === id);
  expect(signal, id).toBeTruthy();
  const tilt = await applyContinuousSignalTilt(0.5, [signal!], {
    ...NFL,
    homeTeam: home,
    awayTeam: away,
    commenceTime: new Date(kickoff),
    env: {},
  } as never);
  return { tilt, found: tilt.votes.find((v) => v.signalId === id) };
}

describe("pregame market anchor", () => {
  it("moves a week-4 home favorite from the de-vigged line and abstains when the game is not in the table", async () => {
    const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_pregame_market_anchor");
    const reading = await signal!.evaluate!({
      ...NFL,
      homeTeam: "Minnesota Vikings",
      awayTeam: "Miami Dolphins",
      commenceTime: new Date("2026-10-04T17:00:00Z"),
      env: {},
    } as never);
    const fair = noVigFromAmericanPrices([-700, 500])!.fairProbabilities[0]!;
    expect(reading).toBeTruthy();
    expect(reading!.value).toBeCloseTo(fair - 0.5, 6);
    expect(reading!.metadata?.basis).toContain("not a close");
    expect(reading!.metadata?.vintage).toBe("unstated");

    const { tilt, found } = await vote(
      "nfl_pregame_market_anchor",
      "Minnesota Vikings",
      "Miami Dolphins",
      "2026-10-04T17:00:00Z",
    );
    expect(found).toBeTruthy();
    expect(found!.rawValue).toBeGreaterThan(0.2);
    expect(tilt.adjustedHomeP).toBeGreaterThan(0.5);

    const missing = await vote(
      "nfl_pregame_market_anchor",
      "Denver Broncos",
      "Chicago Bears",
      "2026-10-04T17:00:00Z",
    );
    expect(missing.found).toBeUndefined();
  });
});
