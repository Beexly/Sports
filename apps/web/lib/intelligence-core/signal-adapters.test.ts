import { describe, expect, it } from "vitest";
import {
  injuryObservations,
  ngsObservations,
  playerStatObservations,
  ratingsObservations,
  weatherObservations,
  gameSignalObservations,
  snapCountObservations,
  allObservations,
  computeModelProb,
  signalPresence,
  injuryLean,
  type InjuryRow,
  type NgsRow,
  type PlayerGameStatRow,
  type TeamEfficiencyRow,
  type GameSignalRow,
  type SnapCountRow,
} from "./signal-adapters";
import { reason, type SituationalContext } from "./reasoning";

const NOW = new Date("2026-09-25T12:00:00Z");

function injury(over: Partial<InjuryRow> = {}): InjuryRow {
  return {
    playerName: "Ja'Marr Chase",
    team: "CIN",
    position: "WR",
    reportStatus: "Out",
    primaryInjury: "hamstring",
    season: 2026,
    week: 4,
    sourceId: "nflverse",
    fetchedAt: "2026-09-24T18:00:00Z",
    ...over,
  };
}

function ngs(over: Partial<NgsRow> = {}): NgsRow {
  return {
    playerName: "Joe Burrow",
    team: "CIN",
    position: "QB",
    statType: "passing",
    season: 2026,
    week: 4,
    cpoe: 4.2,
    completionPct: 68,
    expectedCompletionPct: 62,
    sourceId: "nflverse",
    fetchedAt: "2026-09-24T12:00:00Z",
    ...over,
  };
}

describe("signal adapters — the all-knowing wiring", () => {
  it("turns injury rows into situationally-aware observations with position-weighted lean", () => {
    const obs = injuryObservations([injury()], "home", NOW);
    expect(obs).toHaveLength(1);
    expect(obs[0].family).toBe("INJURY_AVAILABILITY");
    expect(obs[0].fact).toMatch(/Chase/);
    expect(obs[0].fact).toMatch(/Out/);
    expect(obs[0].tier).toBe(1);
    expect(obs[0].rights).toBe("use-with-caution");
    // Out WR should lean against the home side (negative for home)
    expect(obs[0].lean).toBeLessThan(0);
    // Away side flips the sign
    const away = injuryObservations([injury()], "away", NOW);
    expect(away[0].lean).toBeGreaterThan(0);
  });

  it("injuryLean: out/doubtful hurt more than questionable; QB weighs more", () => {
    const out = injuryLean("Out", "WR");
    const q = injuryLean("Questionable", "WR");
    const qb = injuryLean("Out", "QB");
    expect(Math.abs(out)).toBeGreaterThan(Math.abs(q));
    expect(Math.abs(qb)).toBeGreaterThan(Math.abs(out));
  });

  it("turns NGS rows into charting observations with performance lean", () => {
    const obs = ngsObservations([ngs()], "home", NOW);
    expect(obs).toHaveLength(1);
    expect(obs[0].family).toBe("PLAY_CHARTING");
    expect(obs[0].key).toMatch(/^ngs:/);
    expect(obs[0].fact).toMatch(/CPOE/);
    // Positive CPOE → positive lean for home
    expect(obs[0].lean).toBeGreaterThan(0);
  });

  it("turns player stats into scheme-tendency observations", () => {
    const row: PlayerGameStatRow = {
      team: "CIN",
      opponent: "BAL",
      season: 2026,
      week: 4,
      targetShare: 0.28,
      fantasyPointsPpr: 18.5,
      receivingEpa: 3.2,
      fetchedAt: "2026-09-24T12:00:00Z",
      sourceId: "nflverse",
    };
    const obs = playerStatObservations([row], "home", NOW);
    expect(obs[0].family).toBe("SCHEME_TENDENCY");
    expect(obs[0].fact).toMatch(/tgt share/);
    expect(obs[0].lean).toBeGreaterThan(0);
  });

  it("turns team efficiency into ratings observations", () => {
    const row: TeamEfficiencyRow = {
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
    const obs = ratingsObservations([row], "home", NOW);
    expect(obs[0].family).toBe("MARKET");
    expect(obs[0].key).toMatch(/^ratings:/);
    // net EPA positive → positive lean
    expect(obs[0].lean).toBeGreaterThan(0);
  });

  it("separates weather signals from other game signals", () => {
    const rows: GameSignalRow[] = [
      {
        sourceCategory: "WEATHER",
        sourceName: "open-meteo",
        signalKey: "wind_mph",
        signalValue: 22,
        trustLevel: 0.9,
        fetchedAt: "2026-09-25T06:00:00Z",
      },
      {
        sourceCategory: "SCHEDULE",
        sourceName: "schedule-internal",
        signalKey: "schedule_density_7d_home",
        signalValue: 3,
        trustLevel: 1,
        fetchedAt: "2026-09-25T06:00:00Z",
      },
    ];
    const w = weatherObservations(rows, NOW);
    const g = gameSignalObservations(rows, NOW);
    expect(w).toHaveLength(1);
    expect(w[0].family).toBe("WEATHER_TRAVEL");
    expect(w[0].lean).toBeLessThan(0); // high wind leans unders
    expect(g).toHaveLength(1);
    expect(g[0].family).toBe("SCHEDULE_DENSITY");
  });

  it("turns snap counts into scheme observations", () => {
    const row: SnapCountRow = {
      playerName: "Ja'Marr Chase",
      team: "CIN",
      position: "WR",
      offensePct: 92,
      season: 2026,
      week: 4,
      fetchedAt: "2026-09-24T12:00:00Z",
      sourceId: "nflverse",
    };
    const obs = snapCountObservations([row], "home", NOW);
    expect(obs[0].fact).toMatch(/snap share 92/);
    expect(obs[0].lean).toBeGreaterThan(0);
  });

  it("allObservations wires every surface — nothing deferred", () => {
    const obs = allObservations({
      homeInjuries: [injury()],
      awayInjuries: [injury({ playerName: "Lamar Jackson", team: "BAL", position: "QB", reportStatus: "Questionable" })],
      homeNgs: [ngs()],
      awayNgs: [],
      homePlayerStats: [
        {
          team: "CIN",
          opponent: "BAL",
          season: 2026,
          week: 4,
          targetShare: 0.25,
          fetchedAt: "2026-09-24T12:00:00Z",
        },
      ],
      homeRatings: [
        {
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
        },
      ],
      weather: [
        {
          sourceCategory: "WEATHER",
          sourceName: "open-meteo",
          signalKey: "wind_mph",
          signalValue: 18,
          fetchedAt: "2026-09-25T06:00:00Z",
        },
      ],
      gameSignals: [
        {
          sourceCategory: "SCHEDULE",
          sourceName: "schedule-internal",
          signalKey: "schedule_density_7d_home",
          signalValue: 2,
          fetchedAt: "2026-09-25T06:00:00Z",
        },
      ],
      homeSnaps: [
        {
          playerName: "Joe Mixon",
          team: "CIN",
          position: "RB",
          offensePct: 78,
          season: 2026,
          week: 4,
          fetchedAt: "2026-09-24T12:00:00Z",
        },
      ],
      now: NOW,
    });
    // 2 injuries + 1 NGS + 1 player + 1 ratings + 1 weather + 1 game signal + 1 snap = 8
    expect(obs.length).toBe(8);
    const families = new Set(obs.map((o) => o.family));
    expect(families.has("INJURY_AVAILABILITY")).toBe(true);
    expect(families.has("PLAY_CHARTING")).toBe(true);
    expect(families.has("SCHEME_TENDENCY")).toBe(true);
    expect(families.has("MARKET")).toBe(true);
    expect(families.has("WEATHER_TRAVEL")).toBe(true);
    expect(families.has("SCHEDULE_DENSITY")).toBe(true);
  });

  it("signalPresence reports the coverage flags so pick_signal_snapshots stop showing zeros", () => {
    const obs = allObservations({
      homeInjuries: [injury()],
      homeNgs: [ngs()],
      homeRatings: [
        {
          team: "CIN",
          opponent: "BAL",
          isHome: true,
          plays: 65,
          offEpaPerPlay: 0.1,
          offSuccess: 0.5,
          defEpaPerPlay: 0,
          defSuccess: 0.45,
          season: 2026,
          week: 4,
          fetchedAt: "2026-09-24T12:00:00Z",
        },
      ],
      weather: [
        {
          sourceCategory: "WEATHER",
          sourceName: "open-meteo",
          signalKey: "wind_mph",
          signalValue: 12,
          fetchedAt: "2026-09-25T06:00:00Z",
        },
      ],
      now: NOW,
    });
    const p = signalPresence(obs);
    expect(p.hadInjurySignal).toBe(true);
    expect(p.hadNgsSignal).toBe(true);
    expect(p.hadRatingsSignal).toBe(true);
    expect(p.hadWeatherSignal).toBe(true);
    expect(p.hadPlayerSignal).toBe(false);
  });

  it("computeModelProb stays in (0,1) and never invents certainty", () => {
    expect(computeModelProb(0.56, 0)).toBeGreaterThan(0.4);
    expect(computeModelProb(0.56, 0)).toBeLessThan(0.7);
    expect(computeModelProb(0.95, 0.2)).toBeLessThanOrEqual(0.95);
    expect(computeModelProb(0.05, -0.2)).toBeGreaterThanOrEqual(0.05);
    expect(computeModelProb(Number.NaN, 0)).toBeGreaterThanOrEqual(0.05);
    expect(computeModelProb(Number.NaN, 0)).toBeLessThanOrEqual(0.95);
  });

  it("plugs into reason(): wired injuries/NGS change the six questions and the shift", () => {
    const obs = allObservations({
      homeInjuries: [injury()],
      homeNgs: [ngs()],
      homeRatings: [
        {
          team: "CIN",
          opponent: "BAL",
          isHome: true,
          plays: 65,
          offEpaPerPlay: 0.2,
          offSuccess: 0.55,
          defEpaPerPlay: -0.08,
          defSuccess: 0.4,
          season: 2026,
          week: 4,
          fetchedAt: "2026-09-24T12:00:00Z",
        },
      ],
      now: NOW,
    });
    const ctx: SituationalContext = {
      gameId: "g1",
      sport: "americanfootball_nfl",
      selection: "CIN -2.5",
      pickType: "SPREAD",
      commenceTime: "2026-09-28T17:00:00Z",
      observations: obs,
      market: { market: "spread", fairProb: 0.52, line: -2.5, bookmakerCount: 8, consensusPct: 0.8 },
      situation: { restDaysHome: 7, restDaysAway: 6 },
      modelVersion: "v5.2.7",
      statedConfidence: 62,
      grade: "SOLID_PLAY",
    };
    const r = reason(ctx);
    // Injury + NGS + ratings must appear in the why/why-not spine
    expect(r.why.length + r.whyNot.length).toBeGreaterThan(0);
    expect(r.sixQuestions.what).toMatch(/Chase|Burrow|CIN/);
    expect(r.sixQuestions.where).toMatch(/nflverse|injuries|next_gen|team_game/);
    // Calibrated prob is NOT the raw stated 62
    expect(r.calibratedProb).not.toBe(0.62);
    expect(r.evidenceHealth).toBeGreaterThan(0);
  });
});
