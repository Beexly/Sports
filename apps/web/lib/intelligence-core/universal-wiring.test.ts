import { describe, expect, it } from "vitest";
import {
  wireEverything,
  coverageReport,
  nflObservations,
  fantasyObservations,
  marketObservations,
  contextObservations,
  intelObservations,
  filmObservations,
  narrativeObservations,
  sourceObservations,
  type UniversalSignals,
} from "./universal-wiring";
import { reason, type SituationalContext } from "./reasoning";

const NOW = new Date("2026-09-25T12:00:00Z");

function fullSignals(): UniversalSignals {
  return {
    now: NOW,
    nfl: {
      gamePredictor: { winProb: 0.62, projectedScoreHome: 24, projectedScoreAway: 17 },
      contractValue: [{ player: "Patrick Mahomes", valuePerDollar: 2.8, label: "surplus" }],
      fourthDown: [{ grade: "A", wpLost: 0 }],
      offensiveCoordinator: [{ formation: "Shotgun", playType: "play-action", expectedEPA: 0.18 }],
      exploitFinder: [{ situation: "play-action", epaAllowed: 0.35, percentile: 12 }],
    },
    fantasy: {
      tradeAnalyzer: { verdict: "wins", valueDeltaPct: 0.08 },
      draftCopilot: { player: "Bijan Robinson", projectedPoints: 280, tier: 1 },
      dfsOptimizer: { projectedPoints: 22, ownership: 0.12 },
    },
    market: {
      consensus: { line: -3.5, total: 47.5, books: 8 },
      lineMovement: { spreadDelta: 1.0, totalDelta: -1.5 },
      clv: { value: 0.12, verdict: "positive" },
      devig: { homeProb: 0.58, awayProb: 0.42 },
    },
    context: {
      weather: { temp: 72, wind: 18, precip: 20 },
      travel: { timezoneShift: 2, distanceMiles: 1200 },
      rest: { homeDays: 7, awayDays: 4 },
      pace: { playsPerGame: 68, secondsPerPlay: 27 },
    },
    intel: {
      calibration: { brier: 0.21, ece: 0.035, n: 3263 },
      expectedPoints: { ep: 2.4, wp: 0.62 },
      scoringZone: { redZoneRate: 0.58, goalLineRate: 0.72 },
      playerModel: { projection: 18.5, ceiling: 28, floor: 8 },
      qbConsensus: { qbEpa: 0.22, cpoe: 4.5 },
    },
    film: {
      highlightDetector: [{ type: "TD", confidence: 0.92 }],
      coverageAnalyzer: { preSnap: "Cover 3", postSnap: "Cover 1 Man", disguised: true },
      ftnCharting: { motionRate: 0.42, paRate: 0.28, blitzRate: 0.32, pressureRate: 0.38 },
    },
    narrative: {
      injuries: [{ player: "Ja'Marr Chase", status: "Out", position: "WR" }],
      news: [{ headline: "Star WR ruled out for Sunday", sentiment: -0.6, source: "rotowire-rss" }],
      jarvisMemory: [{ title: "Team historically struggles vs Cover 2", confidence: 70, tier: 5 }],
    },
    source: {
      sourceRegistry: { cleared: 45, paid: 12, forbidden: 8 },
      freshness: { avgAgeHours: 4.2, staleCount: 3 },
    },
  };
}

describe("universal wiring â€” EVERY module feeds the engine", () => {
  it("wires all 8 signal families into one observation list", () => {
    const obs = wireEverything(fullSignals());
    const cov = coverageReport(obs);
    expect(cov.total).toBeGreaterThan(15);
    expect(cov.familiesCovered).toBe(10); // all 10 families
    expect(cov.familiesMissing).toHaveLength(0);
  });

  it("NFL module produces MARKET, CALIBRATION_HISTORY, SCHEME_TENDENCY observations", () => {
    const obs = nflObservations(fullSignals().nfl ?? {}, NOW);
    const fams = new Set(obs.map((o) => o.family));
    expect(fams.has("MARKET")).toBe(true);
    expect(fams.has("CALIBRATION_HISTORY")).toBe(true);
    expect(fams.has("SCHEME_TENDENCY")).toBe(true);
    expect(obs.length).toBeGreaterThan(4);
  });

  it("fantasy module produces FANTASY_DFS observations", () => {
    const obs = fantasyObservations(fullSignals().fantasy ?? {}, NOW);
    expect(obs.every((o) => o.family === "FANTASY_DFS")).toBe(true);
    expect(obs.length).toBeGreaterThanOrEqual(3);
  });

  it("market module produces MARKET + CALIBRATION_HISTORY observations", () => {
    const obs = marketObservations(fullSignals().market ?? {}, NOW);
    const fams = new Set(obs.map((o) => o.family));
    expect(fams.has("MARKET")).toBe(true);
    expect(fams.has("CALIBRATION_HISTORY")).toBe(true);
  });

  it("context module produces WEATHER_TRAVEL + SCHEDULE_DENSITY + SCHEME_TENDENCY", () => {
    const obs = contextObservations(fullSignals().context ?? {}, NOW);
    const fams = new Set(obs.map((o) => o.family));
    expect(fams.has("WEATHER_TRAVEL")).toBe(true);
    expect(fams.has("SCHEDULE_DENSITY")).toBe(true);
    expect(fams.has("SCHEME_TENDENCY")).toBe(true);
  });

  it("intel module produces CALIBRATION_HISTORY + MARKET + SCHEME_TENDENCY + PLAY_CHARTING", () => {
    const obs = intelObservations(fullSignals().intel ?? {}, NOW);
    const fams = new Set(obs.map((o) => o.family));
    expect(fams.has("CALIBRATION_HISTORY")).toBe(true);
    expect(fams.has("MARKET")).toBe(true);
    expect(fams.has("PLAY_CHARTING")).toBe(true);
  });

  it("film module produces PLAY_CHARTING observations", () => {
    const obs = filmObservations(fullSignals().film ?? {}, NOW);
    expect(obs.every((o) => o.family === "PLAY_CHARTING")).toBe(true);
    expect(obs.length).toBeGreaterThanOrEqual(3);
  });

  it("narrative module produces INJURY_AVAILABILITY + NARRATIVE_SOCIAL (tier 5 = cockpit-only)", () => {
    const obs = narrativeObservations(fullSignals().narrative ?? {}, NOW);
    const fams = new Set(obs.map((o) => o.family));
    expect(fams.has("INJURY_AVAILABILITY")).toBe(true);
    expect(fams.has("NARRATIVE_SOCIAL")).toBe(true);
    const tier5 = obs.filter((o) => o.tier === 5);
    expect(tier5.length).toBeGreaterThan(0); // jarvis memory is tier 5
  });

  it("source module produces SOURCE_TRUST observations", () => {
    const obs = sourceObservations(fullSignals().source ?? {}, NOW);
    expect(obs.every((o) => o.family === "SOURCE_TRUST")).toBe(true);
  });

  it("plugs into reason(): fully wired observations answer the six questions", () => {
    const obs = wireEverything(fullSignals());
    const ctx: SituationalContext = {
      gameId: "g1", sport: "americanfootball_nfl", selection: "CIN -3.5",
      pickType: "SPREAD", commenceTime: "2026-09-28T17:00:00Z",
      observations: obs,
      market: { market: "spread", fairProb: 0.58, line: -3.5, bookmakerCount: 8, consensusPct: 0.8 },
      situation: { restDaysHome: 7, restDaysAway: 4, weatherImpact: -0.02, injuryImpact: -0.05 },
      modelVersion: "v5.2.7", statedConfidence: 65, grade: "SOLID_PLAY",
    };
    const r = reason(ctx);
    expect(r.calibratedProb).not.toBe(0.65); // recalibrated
    expect(r.sixQuestions.what.length).toBeGreaterThan(5);
    expect(r.sixQuestions.where).toMatch(/ethandojo|contract|fourth|offensive|exploit|injuries|calibration|ftn|consensus|weather/);
    expect(r.evidenceHealth).toBeGreaterThan(0);
    expect(r.why.length + r.whyNot.length).toBeGreaterThan(1);
    expect(["SHADOW", "WITHHOLD", "CANDIDATE"]).toContain(r.publishState);
  });

  it("empty signals produce zero observations (honest empty state)", () => {
    const obs = wireEverything({ now: NOW });
    expect(obs).toHaveLength(0);
    const cov = coverageReport(obs);
    expect(cov.total).toBe(0);
    expect(cov.familiesMissing.length).toBe(10);
  });

  it("coverageReport identifies missing families", () => {
    const obs = marketObservations({ consensus: { line: -3, total: 45, books: 6 } }, NOW);
    const cov = coverageReport(obs);
    expect(cov.familiesCovered).toBe(1);
    expect(cov.familiesMissing).toContain("INJURY_AVAILABILITY");
    expect(cov.familiesMissing).toContain("WEATHER_TRAVEL");
    expect(cov.familiesCovered + cov.familiesMissing.length).toBe(10);
  });
});

