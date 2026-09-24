import { describe, it, expect } from "vitest";
import {
  COMMENCE_TOLERANCE_HOURS,
  PRICE_KEYS,
  withinHours,
  joinSituationToMarketQuote,
  findSituationForQuote,
} from "../situation-join";

const abbr = {
  BUF: "Buffalo Bills",
  KC: "Kansas City Chiefs",
  SF: "San Francisco 49ers",
  LAR: "Los Angeles Rams",
};

const snap = {
  sport: "americanfootball_nfl",
  eventId: null as string | null,
  home: "Buffalo Bills",
  away: "Kansas City Chiefs",
  homeAbbr: "BUF",
  awayAbbr: "KC",
  commenceTime: "2025-09-21T16:25:00Z",
  nflverseGameId: "2025_03_KC_BUF",
  source: "nflverse_schedules",
};

describe("situation-join", () => {
  it("documents ±12h default", () => {
    expect(COMMENCE_TOLERANCE_HOURS).toBe(12);
  });

  it("withinHours inclusive at 12h", () => {
    expect(withinHours("2025-09-21T16:00:00Z", "2025-09-21T04:00:00Z", 12)).toBe(true);
    expect(withinHours("2025-09-21T16:00:00Z", "2025-09-21T03:00:00Z", 12)).toBe(false);
  });

  it("withinHours fail-closed when either time missing or invalid", () => {
    expect(withinHours(undefined, "2025-09-21T16:00:00Z", 12)).toBe(false);
    expect(withinHours("2025-09-21T16:00:00Z", undefined, 12)).toBe(false);
    expect(withinHours("", "2025-09-21T16:00:00Z", 12)).toBe(false);
    expect(withinHours("not-a-date", "2025-09-21T16:00:00Z", 12)).toBe(false);
  });

  it("match fills eventId from quote", () => {
    const { snapshot, matched } = joinSituationToMarketQuote(
      snap,
      {
        sport: "americanfootball_nfl",
        eventId: "odds_evt_001",
        home: "Buffalo Bills",
        away: "Kansas City Chiefs",
        commenceTime: "2025-09-21T16:25:00Z",
      },
      abbr
    );
    expect(matched).toBe(true);
    expect(snapshot?.eventId).toBe("odds_evt_001");
    expect(snapshot?.nflverseGameId).toBe("2025_03_KC_BUF");
  });

  it("never invents eventId when quote has none", () => {
    const { snapshot, matched } = joinSituationToMarketQuote(
      snap,
      { home: "BUF", away: "KC", commenceTime: snap.commenceTime },
      abbr
    );
    expect(matched).toBe(true);
    expect(snapshot?.eventId).toBeNull();
  });

  it("no match when quote commenceTime missing", () => {
    const { snapshot, matched, reason } = joinSituationToMarketQuote(
      snap,
      { home: "BUF", away: "KC", eventId: "orphan" },
      abbr
    );
    expect(matched).toBe(false);
    expect(snapshot).toBeNull();
    expect(reason).toMatch(/commenceTime missing or invalid/);
  });

  it("never copies prices from quote into snapshot", () => {
    const { snapshot } = joinSituationToMarketQuote(
      snap,
      {
        eventId: "e2",
        home: snap.home,
        away: snap.away,
        commenceTime: snap.commenceTime,
        consensusDeviggedProbHome: 0.58,
        bookCount: 11,
        home_moneyline: -130,
        spread_line: -3.5,
        total_line: 47.5,
      } as never,
      abbr
    );
    expect(snapshot?.eventId).toBe("e2");
    for (const k of PRICE_KEYS) {
      expect(k in (snapshot ?? {})).toBe(false);
    }
  });

  it("ambiguous findSituationForQuote → null", () => {
    const twin = { ...snap, nflverseGameId: "dup" };
    const hit = findSituationForQuote([snap, twin], {
      sport: "americanfootball_nfl",
      home: "BUF",
      away: "KC",
      commenceTime: snap.commenceTime,
      eventId: "x",
    }, abbr);
    expect(hit).toBeNull();
  });

  it("unique find fills eventId", () => {
    const hit = findSituationForQuote([snap], {
      sport: "americanfootball_nfl",
      home: "BUF",
      away: "KC",
      commenceTime: snap.commenceTime,
      eventId: "unique_evt",
    }, abbr);
    expect(hit?.eventId).toBe("unique_evt");
  });
});
