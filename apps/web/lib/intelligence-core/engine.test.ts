import { describe, expect, it } from "vitest";
import { runIntelligence, wireEverything, buildSituationalContext, runSlate, type GameBundle } from "./engine";
import type { InjuryRow, NgsRow, TeamEfficiencyRow, GameSignalRow } from "./signal-adapters";

const NOW = new Date("2026-09-25T12:00:00Z");

const injury: InjuryRow = {
  playerName: "Ja'Marr Chase",
  team: "CIN",
  position: "WR",
  reportStatus: "Out",
  primaryInjury: "hamstring",
  season: 2026,
  week: 4,
  fetchedAt: "2026-09-24T18:00:00Z",
  sourceId: "nflverse",
};

const ngs: NgsRow = {
  playerName: "Joe Burrow",
  team: "CIN",
  position: "QB",
  statType: "passing",
  season: 2026,
  week: 4,
  cpoe: 5.1,
  fetchedAt: "2026-09-24T12:00:00Z",
  sourceId: "nflverse",
};

const ratings: TeamEfficiencyRow = {
  team: "CIN",
  opponent: "BAL",
  isHome: true,
  plays: 65,
  offEpaPerPlay: 0.18,
  offSuccess: 0.52,
  defEpaPerPlay: -0.05,
  defSuccess: 0.42,
  season: 2026,
  week: 4,
  fetchedAt: "2026-09-24T12:00:00Z",
  sourceId: "nflverse",
};

const weather: GameSignalRow = {
  sourceCategory: "WEATHER",
  sourceName: "open-meteo",
  signalKey: "wind_mph",
  signalValue: 18,
  trustLevel: 0.9,
  fetchedAt: "2026-09-25T06:00:00Z",
};

const bundle: GameBundle = {
  gameId: "g1",
  sport: "americanfootball_nfl",
  selection: "CIN -2.5",
  pickType: "SPREAD",
  commenceTime: "2026-09-28T17:00:00Z",
  homeTeam: "CIN",
  awayTeam: "BAL",
  market: { market: "spread", fairProb: 0.52, line: -2.5, bookmakerCount: 8, consensusPct: 0.8 },
  situation: { restDaysHome: 7, restDaysAway: 4 },
  homeInjuries: [injury],
  homeNgs: [ngs],
  homeRatings: [ratings],
  weather: [weather],
  modelVersion: "v5.2.7",
  statedConfidence: 62,
  grade: "SOLID_PLAY",
  now: NOW,
};

describe("master engine — wireEverything", () => {
  it("wires every surface into one SituationalContext", () => {
    const ctx = buildSituationalContext(bundle);
    expect(ctx.observations.length).toBeGreaterThanOrEqual(4);
    const fams = new Set(ctx.observations.map((o) => o.family));
    expect(fams.has("INJURY_AVAILABILITY")).toBe(true);
    expect(fams.has("PLAY_CHARTING")).toBe(true);
    expect(fams.has("MARKET")).toBe(true);
    expect(fams.has("WEATHER_TRAVEL")).toBe(true);
  });

  it("runIntelligence returns calibrated prob, six questions, and publish state", () => {
    const r = runIntelligence(bundle);
    expect(r.calibratedProb).toBeGreaterThan(0.3);
    expect(r.calibratedProb).toBeLessThan(0.85);
    expect(r.calibratedProb).not.toBe(0.62);
    expect(r.sixQuestions.what).toMatch(/Chase|Burrow|CIN/);
    expect(r.sixQuestions.when).toMatch(/\d{4}-/);
    expect(r.sixQuestions.where).toMatch(/nflverse|open-meteo/);
    expect(r.sixQuestions.reliability).toMatch(/trust/);
    expect(r.sixQuestions.marketBelieves).toMatch(/Market/);
    expect(["SHADOW", "WITHHOLD", "CANDIDATE"]).toContain(r.publishState);
    expect(r.observationCount).toBeGreaterThanOrEqual(4);
  });

  it("wireEverything is the same engine under the doctrine name", () => {
    const a = runIntelligence(bundle);
    const b = wireEverything(bundle);
    expect(b.calibratedProb).toBeCloseTo(a.calibratedProb, 5);
    expect(b.modelProb).toBeCloseTo(a.modelProb, 5);
  });

  it("modelProb is populated for proof receipts (the 0-row gap)", () => {
    const r = runIntelligence(bundle);
    expect(r.modelProb).toBeGreaterThan(0.05);
    expect(r.modelProb).toBeLessThan(0.95);
    expect(Number.isFinite(r.modelProb)).toBe(true);
  });

  it("signal presence reports injury/NGS/ratings/weather as wired", () => {
    const r = runIntelligence(bundle);
    expect(r.presence.hadInjurySignal).toBe(true);
    expect(r.presence.hadNgsSignal).toBe(true);
    expect(r.presence.hadRatingsSignal).toBe(true);
    expect(r.presence.hadWeatherSignal).toBe(true);
  });

  it("handles an empty bundle without throwing — empty state is honest", () => {
    const empty: GameBundle = {
      gameId: "g2",
      sport: "baseball_mlb",
      selection: "LAD ML",
      pickType: "MONEYLINE",
      commenceTime: "2026-09-28T20:00:00Z",
      homeTeam: "LAD",
      awayTeam: "SF",
      market: { market: "h2h", fairProb: 0.58, line: null, bookmakerCount: 6, consensusPct: 0.7 },
      modelVersion: "v5.2.7",
      statedConfidence: 70,
      now: NOW,
    };
    const r = runIntelligence(empty);
    expect(r.calibratedProb).toBeGreaterThan(0);
    expect(r.observationCount).toBe(0);
    expect(r.whyNot.length).toBeGreaterThan(0); // honest about missing context
  });

  it("runSlate processes every game on the slate", () => {
    const results = runSlate([
      bundle,
      { ...bundle, gameId: "g3", selection: "BAL +2.5", statedConfidence: 48, pickType: "SPREAD" },
    ]);
    expect(results).toHaveLength(2);
    // Different stated confidence → different calibrated probability
    expect(results[0].calibratedProb).not.toBe(results[1].calibratedProb);
  });

  it("withholds when grade is ELITE_PLAY (historically worst)", () => {
    const r = runIntelligence({ ...bundle, grade: "ELITE_PLAY" });
    expect(r.withholdReasons.some((x) => /ELITE/i.test(x))).toBe(true);
  });

  it("summary is customer-safe: no guarantees, no bare 100%", () => {
    const r = runIntelligence(bundle);
    expect(r.summary).toMatch(/calibrated P/);
    expect(r.summary).not.toMatch(/guarantee/i);
    expect(r.summary).not.toMatch(/\b100%\b/);
    expect(r.summary).not.toMatch(/lock of the/i);
  });
});
