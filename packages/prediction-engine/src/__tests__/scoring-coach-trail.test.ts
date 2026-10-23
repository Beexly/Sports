/**
 * The trail must LEAD with coach signals, not the market.
 *
 * Regression pin for 2026-10-23: `coach-trail.ts` existed on the remote with zero
 * call sites and the published string never contained L0/L1/L2. These fail against
 * that old behaviour by construction — they assert on the rendered string.
 */
import { describe, expect, it } from "vitest";
import { impliedProbabilityToAmerican, scoreGame, type OddsInput } from "../scoring";
import type { InjuryRow } from "../engine/availability-factors";
import type { UsageShift } from "../engine/usage-factors";

const AT = new Date("2026-10-23T12:00:00Z");
const COMMENCE = new Date("2026-10-25T17:00:00Z");

function game(injuries: InjuryRow[] = [], usageShifts: UsageShift[] = [], week = 7): OddsInput {
  return {
    gameId: "401873012",
    homeTeam: "Baltimore Ravens",
    awayTeam: "Cincinnati Bengals",
    commenceTime: COMMENCE,
    sport: "NFL",
    bookmakerOdds: ["dk", "fd", "mgm", "cz", "pb", "b365", "wy", "espn"].map((bookmaker, i) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: i < 6 ? -3.5 : 3.5,
      homeSpreadPrice: impliedProbabilityToAmerican(0.55 * 1.03),
      awaySpreadPrice: impliedProbabilityToAmerican(0.45 * 1.03),
    })),
    context: {
      openingSpread: -1.5,
      currentSpread: -3.5,
      restDaysHome: 7,
      restDaysAway: 14,
      homeAtsForm: { wins: 4, losses: 2, pushes: 0, sampleSize: 6 },
      homeAtsFormAtHome: { wins: 2, losses: 1, pushes: 0, sampleSize: 3 },
      headToHeadForm: { wins: 3, losses: 1, pushes: 0, sampleSize: 4 },
      scheduleDensityHome: 2,
      scheduleDensityAway: 1,
      dataFreshnessMinutes: 2,
    },
    coachTrail: { week, injuries, usageShifts },
  };
}

const flowerOut: InjuryRow = {
  team: "Baltimore Ravens",
  week: 7,
  fullName: "Zay Flowers",
  position: "WR",
  status: "Out",
  primaryInjury: "Ankle",
  source: "ESPN summary injuries",
  fetchedAt: "2026-10-23T11:41:00Z",
};

const chaseDrop: UsageShift = {
  team: "Cincinnati Bengals",
  player: "J.Chase",
  role: "WR1",
  priorShare: 24.5,
  recentShare: 15.5,
  delta: -0.09,
  situation: "targets, weeks 1-3 v 4-5",
  source: "nflverse pbp receiver_player_name",
  fetchedAt: "2026-10-23T11:52:00Z",
};

describe("the trail leads with the coach layer", () => {
  it("renders the named outage with its source", () => {
    const pick = scoreGame(game([flowerOut]), AT)[0];
    expect(pick?.reasoning).toContain("Zay Flowers (WR, Baltimore Ravens) is Out");
    expect(pick?.reasoning).toContain("ESPN summary injuries");
  });

  it("renders the named usage shift with its source and the actual shares", () => {
    const pick = scoreGame(game([flowerOut], [chaseDrop]), AT)[0];
    expect(pick?.reasoning).toContain("J.Chase");
    expect(pick?.reasoning).toMatch(/24\.50 → 15\.50/);
    expect(pick?.reasoning).toContain("nflverse pbp receiver_player_name");
  });

  it("puts the coach note BEFORE the market clause", () => {
    const pick = scoreGame(game([flowerOut]), AT)[0]!;
    expect(pick.reasoning.indexOf("Zay Flowers")).toBeLessThan(pick.reasoning.indexOf("Market fair"));
  });

  it("names the gap instead of inventing a read when the packet is empty", () => {
    const pick = scoreGame(game(), AT)[0];
    expect(pick?.reasoning).toContain("No material usage shifts");
    expect(pick?.reasoning).toContain("Source: none");
  });

  it("ignores rows for the wrong week rather than carrying them over", () => {
    const pick = scoreGame(game([flowerOut], [], 9), AT)[0];
    expect(pick?.reasoning).toContain("No material outages");
  });
});
