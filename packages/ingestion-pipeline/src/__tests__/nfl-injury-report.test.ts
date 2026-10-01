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
  return tilt.votes.find((v) => v.signalId === id);
}

describe("official NFL injury report", () => {
  it("votes a week-4 kickoff that is after the report was observed", async () => {
    const found = await vote(
      "nfl_practice_dnp_skill",
      "Cleveland Browns",
      "Kansas City Chiefs",
      "2026-10-04T17:00:00Z",
    );
    expect(found, "practice absences must reach the tilt").toBeTruthy();
  });

  it("refuses the same clubs in week 5, and a club the report did not list", async () => {
    const later = await vote(
      "nfl_practice_dnp_skill",
      "Kansas City Chiefs",
      "Pittsburgh Steelers",
      "2026-10-11T17:00:00Z",
    );
    expect(later).toBeUndefined();
    const missing = await vote(
      "nfl_official_out_skill",
      "Atlanta Falcons",
      "Kansas City Chiefs",
      "2026-10-04T17:00:00Z",
    );
    expect(missing).toBeUndefined();
    const record = await vote(
      "nfl_espn_entering_record",
      "Buffalo Bills",
      "New England Patriots",
      "2026-10-04T17:00:00Z",
    );
    expect(record, "ESPN entering record must vote").toBeTruthy();
    expect(record!.rawValue).toBeGreaterThan(0);
  });
});
