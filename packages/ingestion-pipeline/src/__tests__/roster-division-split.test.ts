import { describe, expect, it } from "vitest";
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

const NFL = { sportKey: "americanfootball_nfl", now: () => new Date("2026-10-01T21:00:00Z") };

async function vote(
  id: string,
  home: string,
  away: string,
  kickoff: string,
  env: Record<string, string> = {},
) {
  const tilt = await applyContinuousSignalTilt(0.5, SIGNAL_REGISTRY, {
    ...NFL,
    homeTeam: home,
    awayTeam: away,
    commenceTime: new Date(kickoff),
    env,
  } as never);
  return tilt.votes.find((v) => v.signalId === id);
}

describe("official roster age, division, and home/road split", () => {
  it("moves a week-4 short-rest game from equal-weight active age, and names that basis", async () => {
    const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_age_conditioned_rest");
    const reading = await signal!.evaluate!({
      ...NFL,
      homeTeam: "Cleveland Browns",
      awayTeam: "Kansas City Chiefs",
      commenceTime: new Date("2026-10-04T17:00:00Z"),
      env: { HOME_REST_DAYS: "7", AWAY_REST_DAYS: "4" },
    } as never);
    expect(reading).toBeTruthy();
    if (!reading || !("value" in reading)) throw new Error("expected a continuous value");
    expect(reading.metadata?.ageBasis).toBe("equal-weight active roster, not snap-weighted");
    expect(reading.value).toBeGreaterThan(0);
    const found = await vote(
      "nfl_age_conditioned_rest",
      "Cleveland Browns",
      "Kansas City Chiefs",
      "2026-10-04T17:00:00Z",
      { HOME_REST_DAYS: "7", AWAY_REST_DAYS: "4" },
    );
    expect(found, "age must reach the tilt").toBeTruthy();
  });

  it("abstains when the roster was not pulled, and when the kickoff is a later week", async () => {
    const missing = await vote(
      "nfl_age_conditioned_rest",
      "Chicago Bears",
      "Kansas City Chiefs",
      "2026-10-04T17:00:00Z",
      { HOME_REST_DAYS: "7", AWAY_REST_DAYS: "4" },
    );
    expect(missing).toBeUndefined();
    const later = await vote(
      "nfl_age_conditioned_rest",
      "Cleveland Browns",
      "Kansas City Chiefs",
      "2026-10-11T17:00:00Z",
      { HOME_REST_DAYS: "7", AWAY_REST_DAYS: "4" },
    );
    expect(later).toBeUndefined();
  });

  it("reads division from the club list when the env flag was never set", async () => {
    const signal = SIGNAL_REGISTRY.find((s) => s.id === "nfl_short_week_road_deficit");
    const reading = await signal!.evaluate!({
      ...NFL,
      homeTeam: "Pittsburgh Steelers",
      awayTeam: "Cleveland Browns",
      commenceTime: new Date("2026-10-04T17:00:00Z"),
      env: { HOME_REST_DAYS: "7", AWAY_REST_DAYS: "4" },
    } as never);
    expect(reading).toBeTruthy();
    expect(reading!.metadata?.rivalryKnown).toBe(true);
    expect(String(reading!.metadata?.explanation)).toContain("division rivalry known");
  });

  it("votes home form against the visitor's road form", async () => {
    const found = await vote(
      "nfl_home_road_split",
      "Buffalo Bills",
      "New England Patriots",
      "2026-10-04T17:00:00Z",
    );
    expect(found, "home/road split must reach the tilt").toBeTruthy();
  });
});
