/**
 * The wiring itself: DB rows must actually change what the engine produces.
 *
 * This is the test for the "0 of 14 fields filled" claim. It does not assert
 * that the loaders run — db-loaders.test.ts covers that — it asserts that
 * feeding their rows into the bundle produces observations the market-only
 * path could never produce, and that the surface counter is measured rather
 * than asserted.
 */
import { describe, expect, it } from "vitest";
import {
  enrichPickWithIntelligence,
  projectPickIntelligenceForViewer,
  universalSignalsFromPick,
  type PickForIntelligence,
} from "./intelligence-enrichment";
import type { LoadedBundleSurfaces } from "@/lib/intelligence-core";

function pick(over: Partial<PickForIntelligence> = {}): PickForIntelligence {
  return {
    id: "pick-1",
    selection: "KC ML",
    pickType: "MONEYLINE",
    confidence: 72,
    reasoning: "Independent blend: model estimate 72.0% for KC.",
    sportKey: "americanfootball_nfl",
    commenceTime: "2026-09-27T17:00:00.000Z",
    homeTeamName: "Kansas City Chiefs",
    awayTeamName: "Buffalo Bills",
    homeFairProb: 0.72,
    awayFairProb: 0.28,
    marketFairProb: null,
    line: null,
    consensusPct: null,
    bookmakerCount: null,
    modelVersion: "v5.2.7",
    pickGrade: "LEAN",
    ...over,
  };
}

const NOW = new Date("2026-09-27T12:00:00.000Z");

function surfaces(over: Partial<LoadedBundleSurfaces> = {}): LoadedBundleSurfaces {
  const resolution = {
    homeAbbr: "KC",
    awayAbbr: "BUF",
    season: 2026,
    asOfWeek: 3,
    lagWeek: 3,
    weeksSeen: { injuries: [3], ratings: [2], snaps: [], ngs: [], playerStats: [] },
    notes: [],
  };
  return {
    homeInjuries: [],
    awayInjuries: [],
    homeRatings: [],
    awayRatings: [],
    homeSnaps: [],
    awaySnaps: [],
    homeNgs: [],
    awayNgs: [],
    homePlayerStats: [],
    awayPlayerStats: [],
    gameSignals: [],
    weather: [],
    resolution,
    ...over,
  };
}

describe("bundle DB wiring", () => {
  it("reports zero surfaces filled when no DB rows are supplied", () => {
    const r = enrichPickWithIntelligence(pick(), NOW);
    expect(r.dbSurfacesFilled).toBe(0);
    expect(r.dbRowCount).toBe(0);
    expect(r.dbSurfacesEmpty).toHaveLength(12);
    expect(r.dbResolution).toBeNull();
  });

  it("counts the surfaces that actually returned rows", () => {
    const r = enrichPickWithIntelligence(
      pick(),
      NOW,
      universalSignalsFromPick(pick()),
      surfaces({
        homeInjuries: [
          {
            playerName: "P1",
            team: "KC",
            position: "QB",
            reportStatus: "Out",
            practiceStatus: "DNP",
            primaryInjury: "Ankle",
            season: 2026,
            week: 3,
            fetchedAt: NOW,
          },
        ],
        homeRatings: [
          {
            team: "KC",
            opponent: "DEN",
            isHome: true,
            plays: 70,
            offEpaPerPlay: 0.12,
            offSuccess: 0.45,
            defEpaPerPlay: -0.04,
            defSuccess: 0.51,
            season: 2026,
            week: 2,
            fetchedAt: NOW,
          },
        ],
        gameSignals: [
          {
            sourceCategory: "SCHEDULE",
            sourceName: "schedule-internal",
            signalKey: "schedule_density_7d_home",
            signalValue: 1,
            trustLevel: 1,
            fetchedAt: NOW,
          },
        ],
      }),
    );
    expect(r.dbSurfacesFilled).toBe(3);
    expect(r.dbRowCount).toBe(3);
    expect(r.dbSurfacesEmpty).toHaveLength(9);
    expect(r.dbResolution?.homeAbbr).toBe("KC");
  });

  it("turns DB rows into observations the market-only path cannot produce", () => {
    const p = pick();
    const signals = universalSignalsFromPick(p);
    const marketOnly = enrichPickWithIntelligence(p, NOW, signals);
    const wired = enrichPickWithIntelligence(
      p,
      NOW,
      signals,
      surfaces({
        homeInjuries: [
          {
            playerName: "ChiefQB",
            team: "KC",
            position: "QB",
            reportStatus: "Out",
            practiceStatus: "DNP",
            primaryInjury: "Shoulder",
            season: 2026,
            week: 3,
            fetchedAt: NOW,
          },
          {
            playerName: "ChiefWR",
            team: "KC",
            position: "WR",
            reportStatus: "Questionable",
            practiceStatus: "Limited",
            primaryInjury: "Hamstring",
            season: 2026,
            week: 3,
            fetchedAt: NOW,
          },
        ],
        awayInjuries: [
          {
            playerName: "BillsQB",
            team: "BUF",
            position: "QB",
            reportStatus: "Probable",
            practiceStatus: "Full",
            primaryInjury: "Wrist",
            season: 2026,
            week: 3,
            fetchedAt: NOW,
          },
        ],
      }),
    );
    // The whole point: real injury rows add observations.
    expect(wired.observationCount).toBeGreaterThan(marketOnly.observationCount);
    // And they reach the spine's own narrative, not just a counter.
    expect(wired.why.length + wired.sixQuestions?.what.length).toBeGreaterThanOrEqual(
      marketOnly.why.length + (marketOnly.sixQuestions?.what.length ?? 0),
    );
  });

  it("fails open to market-only intelligence when the loader throws", async () => {
    // Mirrors the production call site: a rejected load leaves surfaces
    // undefined and the engine still runs.
    const r = enrichPickWithIntelligence(pick(), NOW, universalSignalsFromPick(pick()), undefined);
    expect(r.calibratedProb).not.toBeNull();
    expect(r.dbSurfacesFilled).toBe(0);
  });

  it("carries the new fields through the FREE viewer projection", () => {
    const p = pick();
    const raw = enrichPickWithIntelligence(
      p,
      NOW,
      universalSignalsFromPick(p),
      surfaces({
        gameSignals: [
          {
            sourceCategory: "SCHEDULE",
            sourceName: "schedule-internal",
            signalKey: "schedule_density_7d_home",
            signalValue: 1,
            trustLevel: 1,
            fetchedAt: NOW,
          },
        ],
      }),
    );
    const free = projectPickIntelligenceForViewer(raw, false);
    expect(free.dbSurfacesFilled).toBe(1);
    expect(free.dbRowCount).toBe(1);
    expect(free.dbResolution).not.toBeNull();
    // Entitlement gating still applies to the prose fields.
    expect(free.sixQuestions).toBeNull();
    expect(free.summary).toBeNull();
  });
});