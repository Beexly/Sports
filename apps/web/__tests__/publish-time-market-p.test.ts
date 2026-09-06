import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MIN_BOOKMAKERS } from "@sports/prediction-engine";
import {
  PUBLISH_TIME_MARKET_P_METHOD,
  isRealBookmakerKey,
  latestH2hRowPerBookmaker,
  pickedSide,
  publishTimeMarketP,
  publishTimeMarketPSource,
  resolvePublishTimeMarketP,
  type OddsRowForMarketP,
  type PickForMarketP,
} from "@/lib/calibration/publish-time-market-p";
import {
  emptyOddsTableMarketPStats,
  loadPublishTimeMarketPResolver,
  marketPSourcesFromBySource,
  oddsTableCandidate,
  oddsTableStatsNote,
  resolverSourceForPSource,
  type OddsTableDb,
} from "@/lib/calibration/publish-time-market-p-loader";
import {
  MARKET_ANCHORED_P_BASIS,
  picksToMarketAnchoredCalibrationSamples,
  type PickForLiveCal,
} from "@/lib/calibration/live-calibration-p";
import {
  buildDurableMetricsFromSamples,
  picksToCalibrationSamples,
} from "@/lib/ops/compute-live-calibration-metrics";

/**
 * WP-28: publish-time market probability from the append-only odds table for
 * settled MONEYLINE picks with no receipt and no factor-breakdown market fair.
 * Expected values below were computed independently (plain arithmetic, not the
 * module under test): implied p = 100/(o+100) for o > 0, |o|/(|o|+100) for
 * o < 0; mean per side across books; proportional de-vig home/(home+away).
 *   draftkings -150/+130, fanduel -145/+125, espn_public -155/+135
 *     -> home 0.579712, away 0.420288
 *   draftkings -160/+140 replacing -150/+130 -> home 0.585182
 * C-110 single book (one real book stored at or before generatedAt, same
 * de-vig on that book alone, tagged market_p_single_book):
 *   draftkings -150/+130 alone -> home 0.579832, away 0.420168
 *   fanduel -145/+125 alone    -> home 0.571116, away 0.428884
 */

const HOME = "Kansas City Chiefs";
const AWAY = "Baltimore Ravens";
const T_OLD = new Date("2026-09-01T15:30:00Z");
const T0 = new Date("2026-09-01T15:45:00Z");
const GENERATED_AT = new Date("2026-09-01T16:00:00Z");
const T_LATE = new Date("2026-09-01T16:15:00Z");
const SETTLED = new Date("2026-09-02T04:00:00Z");

function row(
  gameId: string,
  bookmaker: string,
  homePrice: number | null,
  awayPrice: number | null,
  fetchedAt: Date,
  market: string | null = "H2H",
): OddsRowForMarketP {
  return { gameId, bookmaker, market, homePrice, awayPrice, fetchedAt };
}

function threeBooks(gameId = "g1", at = T0): OddsRowForMarketP[] {
  return [
    row(gameId, "draftkings", -150, 130, at),
    row(gameId, "fanduel", -145, 125, at),
    row(gameId, "espn_public", -155, 135, at),
  ];
}

const homePick: PickForMarketP = {
  id: "p1",
  gameId: "g1",
  generatedAt: GENERATED_AT,
  selection: `${HOME} ML (-150)`,
  homeTeamName: HOME,
  awayTeamName: AWAY,
};
const awayPick: PickForMarketP = { ...homePick, id: "p2", selection: `${AWAY} ML (+130)` };

describe("publishTimeMarketP: pure recompute with the receipt's de-vig", () => {
  it("three bookmaker rows yield the picked side's mean-implied proportional de-vig", () => {
    const res = resolvePublishTimeMarketP(homePick, threeBooks());
    expect(res.status).toBe("resolved");
    if (res.status !== "resolved") return;
    expect(res.p).toBeCloseTo(0.579712, 6);
    expect(res.side).toBe("home");
    expect(res.bookCount).toBe(3);
    expect(res.pSource).toBe("market_p_from_odds_table");
    expect(res.bookmakers).toEqual(["draftkings", "espn_public", "fanduel"]);
    expect(res.snapshotAt.getTime()).toBe(T0.getTime());
    expect(res.oldestBookAt.getTime()).toBe(T0.getTime());
    expect(res.method).toBe(PUBLISH_TIME_MARKET_P_METHOD);

    const away = publishTimeMarketP(awayPick, threeBooks());
    expect(away).toBeCloseTo(0.420288, 6);
    expect((away ?? 0) + res.p).toBeCloseTo(1, 6);
  });

  it("C-110: one real book resolves with that book's de-vig and the distinct source market_p_single_book", () => {
    expect(MIN_BOOKMAKERS).toBe(2);
    const oneBook = threeBooks().slice(0, 1); // draftkings -150/+130 alone
    const res = resolvePublishTimeMarketP(homePick, oneBook);
    expect(res.status).toBe("resolved");
    if (res.status !== "resolved") return;
    expect(res.pSource).toBe("market_p_single_book");
    expect(res.p).toBeCloseTo(0.579832, 6);
    expect(res.side).toBe("home");
    expect(res.bookCount).toBe(1);
    expect(res.bookmakers).toEqual(["draftkings"]);
    expect(res.snapshotAt.getTime()).toBe(T0.getTime());
    expect(res.oldestBookAt.getTime()).toBe(T0.getTime());
    expect(res.method).toBe(PUBLISH_TIME_MARKET_P_METHOD);
    // Picked side flips the same book's pair; the two sides still sum to one.
    const away = publishTimeMarketP(awayPick, oneBook);
    expect(away).toBeCloseTo(0.420168, 6);
    expect((away ?? 0) + res.p).toBeCloseTo(1, 6);

    // The tag is decided against the engine's own book floor, never a literal.
    expect(publishTimeMarketPSource(1)).toBe("market_p_single_book");
    expect(publishTimeMarketPSource(MIN_BOOKMAKERS)).toBe("market_p_from_odds_table");
    expect(publishTimeMarketPSource(MIN_BOOKMAKERS + 1)).toBe("market_p_from_odds_table");
    // Exactly MIN_BOOKMAKERS books keeps the two-or-more tag.
    const twoBooks = resolvePublishTimeMarketP(homePick, threeBooks().slice(0, MIN_BOOKMAKERS));
    expect(twoBooks.status).toBe("resolved");
    if (twoBooks.status === "resolved") expect(twoBooks.pSource).toBe("market_p_from_odds_table");
  });

  it("zero usable books stays unresolved: no_rows when nothing is stored, no_usable_book when only non-book rows are", () => {
    expect(publishTimeMarketP(homePick, [])).toBeNull();
    expect(resolvePublishTimeMarketP(homePick, [])).toEqual({ status: "unresolved", reason: "no_rows", bookCount: 0 });
    // Rows for another game only: nothing stored for this one.
    expect(resolvePublishTimeMarketP(homePick, threeBooks("g2"))).toEqual({ status: "unresolved", reason: "no_rows", bookCount: 0 });
    // Rows exist for the game but none is a real two-sided book.
    const unusable = [
      row("g1", "rundown_default", -150, 130, T0),
      row("g1", "pinnacle", -150, null, T0),
      row("g1", "betmgm", -150, 130, T0, "SPREADS"),
    ];
    expect(publishTimeMarketP(homePick, unusable)).toBeNull();
    expect(resolvePublishTimeMarketP(homePick, unusable)).toEqual({ status: "unresolved", reason: "no_usable_book", bookCount: 0 });
    // A one-sided row and a non-H2H row alone are "stored, unusable"; the reason never invents a book.
    expect(resolvePublishTimeMarketP(homePick, [row("g1", "pinnacle", -150, null, T0)])).toEqual({ status: "unresolved", reason: "no_usable_book", bookCount: 0 });
    expect(resolvePublishTimeMarketP(homePick, [row("g1", "betmgm", -150, 130, T0, "SPREADS")])).toEqual({ status: "unresolved", reason: "no_rows", bookCount: 0 });
  });

  it("rows fetched after generatedAt are ignored: the probability is fixed at publish time", () => {
    const rows = [
      ...threeBooks(),
      row("g1", "betmgm", -170, 150, T_LATE),
      row("g1", "draftkings", -200, 170, T_LATE),
    ];
    const res = resolvePublishTimeMarketP(homePick, rows);
    expect(res.status).toBe("resolved");
    if (res.status !== "resolved") return;
    expect(res.p).toBeCloseTo(0.579712, 6);
    expect(res.bookmakers).toEqual(["draftkings", "espn_public", "fanduel"]);

    // Every row after the pick was generated: nothing to read.
    const early = { ...homePick, generatedAt: new Date(T0.getTime() - 1) };
    expect(resolvePublishTimeMarketP(early, rows)).toEqual({ status: "unresolved", reason: "no_rows", bookCount: 0 });
  });

  it("takes the latest row per bookmaker at or before generatedAt and reports the snapshot spread", () => {
    const rows = [
      row("g1", "draftkings", -140, 120, T_OLD),
      row("g1", "draftkings", -160, 140, T0),
      row("g1", "fanduel", -145, 125, T_OLD),
      row("g1", "espn_public", -155, 135, T0),
    ];
    const latest = latestH2hRowPerBookmaker(rows, "g1", GENERATED_AT);
    expect(latest.map((r) => [r.bookmaker, r.homePrice])).toEqual([
      ["draftkings", -160],
      ["espn_public", -155],
      ["fanduel", -145],
    ]);
    const res = resolvePublishTimeMarketP(homePick, rows);
    expect(res.status).toBe("resolved");
    if (res.status !== "resolved") return;
    expect(res.p).toBeCloseTo(0.585182, 6);
    expect(res.snapshotAt.getTime()).toBe(T0.getTime());
    expect(res.oldestBookAt.getTime()).toBe(T_OLD.getTime());
  });

  it("only real, two-sided H2H rows for the pick's game count toward the book minimum", () => {
    expect(isRealBookmakerKey("draftkings")).toBe(true);
    expect(isRealBookmakerKey("espn_public")).toBe(true);
    expect(isRealBookmakerKey("rundown_7")).toBe(true);
    expect(isRealBookmakerKey("rundown_default")).toBe(false);
    expect(isRealBookmakerKey("")).toBe(false);
    expect(isRealBookmakerKey(null)).toBe(false);

    const twoReal = threeBooks().slice(0, 2);
    const padded = [
      ...twoReal,
      row("g1", "rundown_default", -150, 130, T0),
      row("g1", "rundown_default", -148, 128, T0),
      row("g1", "betmgm", -150, 130, T0, "SPREADS"),
      row("g1", "pinnacle", -150, null, T0),
      row("g2", "caesars", -150, 130, T0),
    ];
    expect(MIN_BOOKMAKERS).toBe(2);
    // Two real books is exactly MIN_BOOKMAKERS: resolved on those two alone.
    const res = resolvePublishTimeMarketP(homePick, padded);
    expect(res.status).toBe("resolved");
    if (res.status !== "resolved") return;
    expect(res.pSource).toBe("market_p_from_odds_table");
    expect(res.bookmakers).toEqual(["draftkings", "fanduel"]);
    expect(res.p).toBeCloseTo(0.575471, 6);
    // Drop one real book: the padding rows never make up the count, so the
    // remaining fanduel row resolves alone and is tagged as a single book.
    const single = resolvePublishTimeMarketP(homePick, padded.slice(1));
    expect(single.status).toBe("resolved");
    if (single.status !== "resolved") return;
    expect(single.pSource).toBe("market_p_single_book");
    expect(single.bookCount).toBe(1);
    expect(single.bookmakers).toEqual(["fanduel"]);
    expect(single.p).toBeCloseTo(0.571116, 6);
    // Drop both real books: padding alone is no usable book.
    expect(resolvePublishTimeMarketP(homePick, padded.slice(2))).toEqual({
      status: "unresolved",
      reason: "no_usable_book",
      bookCount: 0,
    });
  });

  it("the side comes from the engine's boundary-aware resolver; an undeterminable side yields null", () => {
    expect(pickedSide(homePick)).toBe("home");
    expect(pickedSide(awayPick)).toBe("away");
    expect(pickedSide({ selection: "Somebody Else ML (-110)", homeTeamName: HOME, awayTeamName: AWAY })).toBeNull();
    // Substring collision: home "Jets", away "Winnipeg Jets".
    expect(pickedSide({ selection: "Winnipeg Jets ML (-120)", homeTeamName: "Jets", awayTeamName: "Winnipeg Jets" })).toBe("away");
    expect(pickedSide({ selection: "Jets ML (+100)", homeTeamName: "Jets", awayTeamName: "Winnipeg Jets" })).toBe("home");
    // Spaced-prefix collision: home "Jets", away "Jets Metro" (most specific wins).
    expect(pickedSide({ selection: "Jets Metro ML (-105)", homeTeamName: "Jets", awayTeamName: "Jets Metro" })).toBe("away");

    const noSide = { ...homePick, selection: "Somebody Else ML (-110)" };
    expect(publishTimeMarketP(noSide, threeBooks())).toBeNull();
    expect(resolvePublishTimeMarketP(noSide, threeBooks())).toEqual({ status: "unresolved", reason: "no_side", bookCount: 3 });
  });

  it("is deterministic under row order", () => {
    const rows = [
      row("g1", "draftkings", -140, 120, T_OLD),
      row("g1", "draftkings", -160, 140, T0),
      row("g1", "fanduel", -145, 125, T0),
      row("g1", "espn_public", -155, 135, T0),
      row("g1", "betmgm", -170, 150, T_LATE),
    ];
    const a = resolvePublishTimeMarketP(homePick, rows);
    const b = resolvePublishTimeMarketP(homePick, [...rows].reverse());
    const c = resolvePublishTimeMarketP(homePick, [rows[2]!, rows[4]!, rows[0]!, rows[3]!, rows[1]!]);
    expect(a).toEqual(b);
    expect(a).toEqual(c);
  });
});

function mlPick(overrides: Partial<PickForLiveCal> & { readonly id: string; readonly gameId: string }): PickForLiveCal {
  return {
    confidence: 70,
    result: "WIN",
    pickType: "MONEYLINE",
    factorBreakdown: {},
    proofReceipt: null,
    modelVersion: "v5.2.7",
    settledAt: SETTLED,
    sportKey: "americanfootball_nfl",
    generatedAt: GENERATED_AT,
    selection: `${HOME} ML (-150)`,
    homeTeamName: HOME,
    awayTeamName: AWAY,
    ...overrides,
  };
}

type FindManyArgs = Parameters<OddsTableDb["odds"]["findMany"]>[0];

function mockOddsDb(rows: readonly OddsRowForMarketP[]) {
  const findMany = vi.fn(async (args: FindManyArgs) =>
    rows.filter(
      (r) =>
        args.where.gameId.in.includes(r.gameId) &&
        args.where.market === "H2H" &&
        r.fetchedAt.getTime() <= args.where.fetchedAt.lte.getTime(),
    ),
  );
  const db: OddsTableDb = { odds: { findMany } };
  return { db, findMany };
}

describe("loadPublishTimeMarketPResolver: one read-only query for N picks", () => {
  it("a soccer moneyline is never a candidate and is never resolved from the odds table", async () => {
    const soccer = mlPick({ id: "s1", gameId: "gs", sportKey: "soccer_usa_mls" });
    expect(oddsTableCandidate(soccer)).toBeNull();

    const { db, findMany } = mockOddsDb(threeBooks("gs"));
    const load = await loadPublishTimeMarketPResolver(db, [soccer]);
    expect(findMany).toHaveBeenCalledTimes(0);
    expect(load.stats).toEqual(emptyOddsTableMarketPStats());
    expect(load.resolveMarketP(soccer)).toBeNull();

    const built = picksToMarketAnchoredCalibrationSamples([soccer], { resolveMarketP: load.resolveMarketP });
    expect(built.included).toBe(0);
    expect(built.excluded).toEqual({ three_way_market: 1, no_market_probability: 0, non_moneyline_market: 0 });
  });

  it("issues exactly one odds query for N picks, bounded by their gameIds and latest generatedAt", async () => {
    const later = new Date(GENERATED_AT.getTime() + 3_600_000);
    const picks: PickForLiveCal[] = [
      mlPick({ id: "a", gameId: "g1" }),
      mlPick({ id: "b", gameId: "g2", generatedAt: later, selection: `${AWAY} ML (+130)` }),
      mlPick({ id: "c", gameId: "g1", result: "LOSS" }),
      // Already market-anchored: not a candidate, its game is not queried.
      mlPick({ id: "d", gameId: "g9", proofReceipt: { marketFairProb: 0.63 } }),
      // Not a moneyline: not a candidate.
      mlPick({ id: "e", gameId: "g8", pickType: "SPREAD" }),
      // Missing identity: not a candidate.
      mlPick({ id: "f", gameId: "g7", selection: null }),
    ];
    const rows = [...threeBooks("g1"), ...threeBooks("g2"), ...threeBooks("g9"), row("g2", "betmgm", -170, 150, T_LATE)];
    const { db, findMany } = mockOddsDb(rows);

    const load = await loadPublishTimeMarketPResolver(db, picks);

    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0]![0];
    expect(args.where.gameId.in).toEqual(["g1", "g2"]);
    expect(args.where.market).toBe("H2H");
    expect(args.where.fetchedAt.lte.getTime()).toBe(later.getTime());
    expect(args.select).toEqual({ gameId: true, bookmaker: true, homePrice: true, awayPrice: true, fetchedAt: true });

    expect(load.stats.candidates).toBe(3);
    expect(load.stats.gamesQueried).toBe(2);
    expect(load.stats.queries).toBe(1);
    expect(load.stats.oddsRows).toBe(7);
    expect(load.stats.resolved).toBe(3);
    expect(load.stats.resolvedSingleBook).toBe(0);
    expect(load.stats.unresolved).toEqual({ no_rows: 0, no_usable_book: 0, insufficient_books: 0, no_side: 0 });
    expect(load.stats.note).toBeNull();

    expect(load.resolveMarketP(picks[0]!)).toEqual({ p: 0.579712, source: "resolver" });
    expect(load.resolveMarketP(picks[2]!)).toEqual({ p: 0.579712, source: "resolver" });
    // Pick b was generated after betmgm's late row, so all four g2 books count.
    const pB = load.resolveMarketP(picks[1]!);
    expect(pB).not.toBeNull();
    expect(typeof pB === "object" && pB !== null ? pB.p : null).not.toBeCloseTo(0.420288, 6);
    expect(load.resolveMarketP(picks[3]!)).toBeNull();
    expect(load.resolveMarketP({ ...picks[0]!, id: null })).toBeNull();
  });

  it("C-110: a candidate whose game has one stored book resolves as resolver_single_book and is counted apart", async () => {
    const picks: PickForLiveCal[] = [
      mlPick({ id: "one", gameId: "g1" }),
      mlPick({ id: "two", gameId: "g2" }),
      mlPick({ id: "oneAway", gameId: "g1", selection: `${AWAY} ML (+130)` }),
    ];
    // g1: draftkings alone (plus a non-book row that never counts); g2: two real books.
    const rows = [...threeBooks("g1").slice(0, 1), row("g1", "rundown_default", -150, 130, T0), ...threeBooks("g2").slice(0, 2)];
    const { db, findMany } = mockOddsDb(rows);
    const load = await loadPublishTimeMarketPResolver(db, picks);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(load.stats.resolved).toBe(3);
    expect(load.stats.resolvedSingleBook).toBe(2);
    expect(load.stats.unresolved).toEqual({ no_rows: 0, no_usable_book: 0, insufficient_books: 0, no_side: 0 });
    expect(load.resolveMarketP(picks[0]!)).toEqual({ p: 0.579832, source: "resolver_single_book" });
    expect(load.resolveMarketP(picks[2]!)).toEqual({ p: 0.420168, source: "resolver_single_book" });
    expect(load.resolveMarketP(picks[1]!)).toEqual({ p: 0.575471, source: "resolver" });
    expect(resolverSourceForPSource("market_p_single_book")).toBe("resolver_single_book");
    expect(resolverSourceForPSource("market_p_from_odds_table")).toBe("resolver");
    expect(oddsTableStatsNote(load.stats)).toContain("resolved 3 (single book 2)");
  });

  it("counts unresolved candidates by reason and never invents a probability", async () => {
    const picks: PickForLiveCal[] = [
      mlPick({ id: "a", gameId: "g1" }),
      mlPick({ id: "b", gameId: "g2" }),
      mlPick({ id: "c", gameId: "g3", selection: "Somebody Else ML (-110)" }),
    ];
    // g1: only a non-book row (no usable book); g2: nothing stored; g3: books but no side.
    const rows = [row("g1", "rundown_default", -150, 130, T0), ...threeBooks("g3")];
    const { db, findMany } = mockOddsDb(rows);
    const load = await loadPublishTimeMarketPResolver(db, picks);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(load.stats.resolved).toBe(0);
    expect(load.stats.resolvedSingleBook).toBe(0);
    // insufficient_books is retired (a lone book resolves) and stays 0 for readers of older artifacts.
    expect(load.stats.unresolved).toEqual({ no_rows: 1, no_usable_book: 1, insufficient_books: 0, no_side: 1 });
    for (const p of picks) expect(load.resolveMarketP(p)).toBeNull();
    expect(oddsTableStatsNote(load.stats)).toContain("resolved 0");
    expect(oddsTableStatsNote(load.stats)).toContain("no_usable_book 1");
    expect(oddsTableStatsNote(load.stats)).toContain("insufficient_books 0");
  });

  it("fails soft when the odds table cannot be read: null resolver, note set, no throw", async () => {
    const findMany = vi.fn(async (_args: FindManyArgs): Promise<OddsRowForMarketP[]> => {
      throw new Error("connection refused");
    });
    const db: OddsTableDb = { odds: { findMany } };
    const pick = mlPick({ id: "a", gameId: "g1" });
    const load = await loadPublishTimeMarketPResolver(db, [pick]);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(load.resolveMarketP(pick)).toBeNull();
    expect(load.stats.note).toBe("odds table unavailable: connection refused");
    expect(load.stats.resolved).toBe(0);
    expect(oddsTableStatsNote(load.stats)).toContain("odds table unavailable");
  });

  it("feeds the shared builder; two-or-more books report as market_p_from_odds_table, one book as market_p_single_book", async () => {
    const picks = [
      mlPick({ id: "r", gameId: "g9", proofReceipt: { marketFairProb: 0.63 } }),
      mlPick({ id: "o", gameId: "g1", result: "LOSS" }),
      mlPick({ id: "s", gameId: "g6", result: "WIN" }),
      mlPick({ id: "x", gameId: "g5" }),
    ];
    // g1: three books; g6: fanduel alone; g5: nothing stored.
    const { db } = mockOddsDb([...threeBooks("g1"), row("g6", "fanduel", -145, 125, T0)]);
    const load = await loadPublishTimeMarketPResolver(db, picks);
    expect(load.stats.resolved).toBe(2);
    expect(load.stats.resolvedSingleBook).toBe(1);

    const built = picksToCalibrationSamples(picks, { resolveMarketP: load.resolveMarketP });
    expect(built.samples).toHaveLength(3);
    expect(built.exclusions).toEqual({ three_way_market: 0, no_market_probability: 1, non_moneyline_market: 0 });
    expect(built.bySource).toEqual({ proof_receipt: 1, resolver: 1, resolver_single_book: 1 });
    expect(built.taggedSamples[1]).toEqual({
      p: 0.579712,
      y: 0,
      sportKey: "americanfootball_nfl",
      modelVersion: "v5.2.7",
      pickType: "MONEYLINE",
    });
    expect(built.taggedSamples[2]).toEqual({
      p: 0.571116,
      y: 1,
      sportKey: "americanfootball_nfl",
      modelVersion: "v5.2.7",
      pickType: "MONEYLINE",
    });

    expect(marketPSourcesFromBySource(built.bySource)).toEqual({
      factor_breakdown: 0,
      proof_receipt: 1,
      market_p_from_odds_table: 1,
      market_p_single_book: 1,
    });
    // A bySource with no single-book rows still reports the key, at 0.
    expect(marketPSourcesFromBySource({ proof_receipt: 2 }).market_p_single_book).toBe(0);

    const payload = buildDurableMetricsFromSamples({
      samples: built.samples,
      taggedSamples: built.taggedSamples,
      exclusions: built.exclusions,
      bySource: built.bySource,
      marketPFromOddsTable: load.stats,
      modelVersions: built.modelVersions,
      settledFrom: built.settledFrom,
      settledTo: built.settledTo,
    });
    // C-110 changed the sample definition, so the streak basis tag moved to v2.
    expect(MARKET_ANCHORED_P_BASIS).toBe("market_anchored_v2");
    expect(payload.pBasis).toBe("market_anchored_v2");
    expect(payload.pSources).toEqual({ factor_breakdown: 0, proof_receipt: 1, market_p_from_odds_table: 1, market_p_single_book: 1 });
    expect(payload.marketPFromOddsTable).toEqual(load.stats);
    expect(payload.marketPFromOddsTable?.queries).toBe(1);
    expect(payload.marketPFromOddsTable?.resolvedSingleBook).toBe(1);
    expect(payload.marketPFromOddsTable?.unresolved.no_rows).toBe(1);
    expect(payload.marketPFromOddsTable?.unresolved.insufficient_books).toBe(0);
    expect(payload.notes?.some((n) => /market_p_single_book/.test(n))).toBe(true);
  });
});

describe("wiring: both canonical loaders run the odds-table resolver and the surface exposes provenance", () => {
  const root = resolve(__dirname, "..");
  const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

  it("the calibration-metrics cron selects the identity fields and injects the resolver", () => {
    const src = read("app/api/cron/calibration-metrics/route.ts");
    for (const field of ["id", "gameId", "generatedAt", "selection", "homeTeamName", "awayTeamName"]) {
      expect(src).toMatch(new RegExp(`${field}:\\s*true`));
    }
    expect(src).toMatch(/loadPublishTimeMarketPResolver\(db,\s*rows\)/);
    expect(src).toMatch(/resolveMarketP:\s*oddsTable\.resolveMarketP/);
    expect(src).toMatch(/pSources:\s*marketPSourcesFromBySource\(honest\.bySource\)/);
    expect(src).toMatch(/marketPFromOddsTable:\s*oddsTable\.stats/);
    // The basis tag is the shared constant (v2 since C-110), never a stale literal.
    expect(src).toMatch(/pBasis:\s*MARKET_ANCHORED_P_BASIS/);
    expect(src).not.toMatch(/pBasis:\s*"market_anchored"/);
  });

  it("the shared metrics builder writes the v2 basis tag through the constant", () => {
    const src = read("lib/ops/compute-live-calibration-metrics.ts");
    expect(src).toMatch(/pBasis:\s*MARKET_ANCHORED_P_BASIS/);
    expect(src).not.toMatch(/pBasis:\s*"market_anchored"/);
  });

  it("the durable seed path selects the identity fields and injects the resolver", () => {
    const src = read("lib/ops/calibration-eligibility-durable.ts");
    for (const field of ["id", "gameId", "generatedAt", "selection", "homeTeamName", "awayTeamName"]) {
      expect(src).toMatch(new RegExp(`${field}:\\s*true`));
    }
    expect(src).toMatch(/loadPublishTimeMarketPResolver\(db,\s*rows\)/);
    expect(src).toMatch(/resolveMarketP:\s*oddsTable\.resolveMarketP/);
    expect(src).toMatch(/bySource:\s*built\.bySource/);
    expect(src).toMatch(/marketPFromOddsTable:\s*oddsTable\.stats/);
  });

  it("public-surface-truth exposes pSources and the odds-table coverage as plain fields", () => {
    const src = read("app/api/ops/public-surface-truth/route.ts");
    expect(src).toMatch(/pSources:\s*calibrationMetricsArtifact\?\.pSources\s*\?\?\s*null/);
    expect(src).toMatch(/marketPFromOddsTable:\s*calibrationMetricsArtifact\?\.marketPFromOddsTable\s*\?\?\s*null/);
  });

  it("the pure module imports the book minimum from the engine and uses no literal threshold", () => {
    const src = read("lib/calibration/publish-time-market-p.ts");
    expect(src).toMatch(/MIN_BOOKMAKERS/);
    expect(src).not.toMatch(/books\.length\s*<\s*\d/);
    expect(src).toMatch(/americanToImpliedProbability/);
    expect(src).toMatch(/removeVig/);
    expect(src).not.toMatch(/consensusNoVig\(/);
  });
});
