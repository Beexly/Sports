import { describe, it, expect } from "vitest";
import {
  resolveFreeSettlementScores,
  normalizeTeamForMatch,
  COMMENCE_TOLERANCE_MS,
  type PendingGameForMatch,
} from "./settlement-score-resolver";
import type { NormalizedScore } from "./score-provider";

// ── Builders ──────────────────────────────────────────────────────────────────

function freeScore(overrides: Partial<NormalizedScore> = {}): NormalizedScore {
  return {
    gameKey: "espn-401",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Buffalo Bills",
    homeScore: 27,
    awayScore: 20,
    completed: true,
    commenceTime: "2026-06-10T17:00:00.000Z",
    ...overrides,
  };
}

function pendingGame(overrides: Partial<PendingGameForMatch> = {}): PendingGameForMatch {
  return {
    externalId: "odds-api-abc123",
    homeTeamName: "Kansas City Chiefs",
    awayTeamName: "Buffalo Bills",
    commenceTime: new Date("2026-06-10T17:00:00.000Z"),
    ...overrides,
  };
}

describe("normalizeTeamForMatch", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeTeamForMatch("  Kansas   City  Chiefs ")).toBe("kansas city chiefs");
  });

  it("strips punctuation and diacritics deterministically", () => {
    expect(normalizeTeamForMatch("Montréal Canadiens")).toBe("montreal canadiens");
    expect(normalizeTeamForMatch("St. Louis Blues")).toBe("st louis blues");
    expect(normalizeTeamForMatch("San Francisco 49ers")).toBe("san francisco 49ers");
  });

  it("collapses a punctuation-only / empty string to empty", () => {
    expect(normalizeTeamForMatch("   ")).toBe("");
    expect(normalizeTeamForMatch("--.--")).toBe("");
  });

  it("equates case/spacing variants of the same name", () => {
    expect(normalizeTeamForMatch("kansas city chiefs")).toBe(
      normalizeTeamForMatch("Kansas City Chiefs"),
    );
  });
});

describe("resolveFreeSettlementScores", () => {
  it("exact match → re-keys the free score onto the DB externalId", () => {
    const out = resolveFreeSettlementScores([freeScore()], [pendingGame()]);
    expect(out).toEqual([
      { externalId: "odds-api-abc123", homeScore: 27, awayScore: 20, completed: true },
    ]);
  });

  it("name variant (case/spacing/punctuation) still matches", () => {
    const score = freeScore({
      homeTeam: "kansas city  chiefs",
      awayTeam: "BUFFALO BILLS",
    });
    const out = resolveFreeSettlementScores([score], [pendingGame()]);
    expect(out).toHaveLength(1);
    expect(out[0]!.externalId).toBe("odds-api-abc123");
  });

  it("wrong team → no match, emits nothing", () => {
    const score = freeScore({ homeTeam: "Denver Broncos" });
    expect(resolveFreeSettlementScores([score], [pendingGame()])).toEqual([]);
  });

  it("SWAPPED orientation (home/away flipped) is NOT a match — never re-orients", () => {
    const score = freeScore({
      homeTeam: "Buffalo Bills", // swapped
      awayTeam: "Kansas City Chiefs",
    });
    expect(resolveFreeSettlementScores([score], [pendingGame()])).toEqual([]);
  });

  it("same UTC calendar date but different clock time → matches", () => {
    const score = freeScore({ commenceTime: "2026-06-10T01:30:00.000Z" });
    const game = pendingGame({ commenceTime: new Date("2026-06-10T23:45:00.000Z") });
    expect(resolveFreeSettlementScores([score], [game])).toHaveLength(1);
  });

  it("different date but within ±18h → matches", () => {
    const game = pendingGame({ commenceTime: new Date("2026-06-10T20:00:00.000Z") });
    // 10 hours earlier, previous calendar day in UTC.
    const score = freeScore({ commenceTime: "2026-06-10T10:00:00.000Z" });
    expect(resolveFreeSettlementScores([score], [game])).toHaveLength(1);
  });

  it("date too far (> ±18h and different day) → no match", () => {
    const game = pendingGame({ commenceTime: new Date("2026-06-10T17:00:00.000Z") });
    const score = freeScore({ commenceTime: "2026-06-12T17:00:00.000Z" }); // 2 days later
    expect(resolveFreeSettlementScores([score], [game])).toEqual([]);
  });

  it("just inside the ±18h boundary matches; just outside does not", () => {
    const base = new Date("2026-06-10T12:00:00.000Z");
    const game = pendingGame({ commenceTime: base });
    // +18h exactly, on the next UTC day so the same-date shortcut does not apply.
    const inside = freeScore({
      commenceTime: new Date(base.getTime() + COMMENCE_TOLERANCE_MS).toISOString(),
    });
    const outside = freeScore({
      commenceTime: new Date(base.getTime() + COMMENCE_TOLERANCE_MS + 60_000).toISOString(),
    });
    expect(resolveFreeSettlementScores([inside], [game])).toHaveLength(1);
    expect(resolveFreeSettlementScores([outside], [game])).toEqual([]);
  });

  it("null free commenceTime → no match (cannot confirm the window)", () => {
    const score = freeScore({ commenceTime: null });
    expect(resolveFreeSettlementScores([score], [pendingGame()])).toEqual([]);
  });

  it("incomplete score (completed=false) → emits nothing", () => {
    const score = freeScore({ completed: false });
    expect(resolveFreeSettlementScores([score], [pendingGame()])).toEqual([]);
  });

  it("null home or away score → emits nothing (leaves pick PENDING)", () => {
    expect(resolveFreeSettlementScores([freeScore({ homeScore: null })], [pendingGame()])).toEqual([]);
    expect(resolveFreeSettlementScores([freeScore({ awayScore: null })], [pendingGame()])).toEqual([]);
  });

  it("non-integer (fractional) score → rejected as not a genuine final", () => {
    const score = freeScore({ homeScore: 27.5 });
    expect(resolveFreeSettlementScores([score], [pendingGame()])).toEqual([]);
  });

  it("DOUBLE-MATCH ambiguity (one score matches two pending games) → drops the score", () => {
    const score = freeScore();
    const g1 = pendingGame({ externalId: "ext-1" });
    const g2 = pendingGame({ externalId: "ext-2" }); // identical teams + time
    expect(resolveFreeSettlementScores([score], [g1, g2])).toEqual([]);
  });

  it("empty inputs → empty output (both directions)", () => {
    expect(resolveFreeSettlementScores([], [pendingGame()])).toEqual([]);
    expect(resolveFreeSettlementScores([freeScore()], [])).toEqual([]);
    expect(resolveFreeSettlementScores([], [])).toEqual([]);
  });

  it("empty team name on either side never anchors a match", () => {
    const score = freeScore({ homeTeam: "   " });
    expect(resolveFreeSettlementScores([score], [pendingGame()])).toEqual([]);
    const game = pendingGame({ awayTeamName: "" });
    expect(resolveFreeSettlementScores([freeScore()], [game])).toEqual([]);
  });

  it("two distinct games each match their own score (independent re-keying)", () => {
    const sA = freeScore({
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Buffalo Bills",
      homeScore: 27,
      awayScore: 20,
    });
    const sB = freeScore({
      homeTeam: "Dallas Cowboys",
      awayTeam: "New York Giants",
      homeScore: 14,
      awayScore: 10,
      commenceTime: "2026-06-11T17:00:00.000Z",
    });
    const gA = pendingGame({ externalId: "ext-A" });
    const gB = pendingGame({
      externalId: "ext-B",
      homeTeamName: "Dallas Cowboys",
      awayTeamName: "New York Giants",
      commenceTime: new Date("2026-06-11T17:00:00.000Z"),
    });
    const out = resolveFreeSettlementScores([sA, sB], [gA, gB]);
    expect(out).toEqual([
      { externalId: "ext-A", homeScore: 27, awayScore: 20, completed: true },
      { externalId: "ext-B", homeScore: 14, awayScore: 10, completed: true },
    ]);
  });

  it("a second free score for an already-claimed game is dropped (game claimed once)", () => {
    const first = freeScore({ homeScore: 27, awayScore: 20 });
    const dup = freeScore({ homeScore: 31, awayScore: 17 }); // same matchup, different score
    const out = resolveFreeSettlementScores([first, dup], [pendingGame()]);
    // Only the first claim wins; the duplicate cannot re-settle the same game.
    expect(out).toEqual([
      { externalId: "odds-api-abc123", homeScore: 27, awayScore: 20, completed: true },
    ]);
  });

  it("a 0-0 final is a valid integer result and settles", () => {
    const score = freeScore({ homeScore: 0, awayScore: 0 });
    const out = resolveFreeSettlementScores([score], [pendingGame()]);
    expect(out).toEqual([
      { externalId: "odds-api-abc123", homeScore: 0, awayScore: 0, completed: true },
    ]);
  });
});
