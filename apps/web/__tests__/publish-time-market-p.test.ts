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
  type OddsTableDb,
} from "@/lib/calibration/publish-time-market-p-loader";
import {
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
    expect(res.bookmakers).toEqual(["draftkings", "espn_public", "fanduel"]);
    expect(res.snapshotAt.getTime()).toBe(T0.getTime());
    expect(res.oldestBookAt.getTime()).toBe(T0.getTime());
    expect(res.method).toBe(PUBLISH_TIME_MARKET_P_METHOD);

    const away = publishTimeMarketP(awayPick, threeBooks());
    expect(away).toBeCloseTo(0.420288, 6);
    expect((away ?? 0) + res.p).toBeCloseTo(1, 6);
  });

  it("fewer than MIN_BOOKMAKERS real books yields null (never a literal threshold)", () => {
    expect(MIN_BOOKMAKERS).toBeGreaterThan(1);
    const rows = threeBooks().slice(0, MIN_BOOKMAKERS - 1);
    expect(publishTimeMarketP(homePick, rows)).toBeNull();
    const res = resolvePublishTimeMarketP(homePick, rows);
    expect(res).toEqual({ status: "unresolved", reason: "insufficient_books", bookCount: MIN_BOOKMAKERS - 1 });
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
    expect(res.bookmakers).toEqual(["draftkings", "fanduel"]);
    expect(res.p).toBeCloseTo(0.575471, 6);
    // Drop one real book: the padding rows never make up the count.
    expect(resolvePublishTimeMarketP(homePick, padded.slice(1))).toEqual({
      status: "unresolved",
      reason: "insufficient_books",
      bookCount: 1,
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
    expect(load.stats.unresolved).toEqual({ no_rows: 0, insufficient_books: 0, no_side: 0 });
    expect(load.stats.note).toBeNull();

    expect(load.resolveMarketP(picks[0]!)).toBeCloseTo(0.579712, 6);
    expect(load.resolveMarketP(picks[2]!)).toBeCloseTo(0.579712, 6);
    // Pick b was generated after betmgm's late row, so all four g2 books count.
    const pB = load.resolveMarketP(picks[1]!);
    expect(pB).not.toBeNull();
    expect(pB).not.toBeCloseTo(0.420288, 6);
    expect(load.resolveMarketP(picks[3]!)).toBeNull();
    expect(load.resolveMarketP({ ...picks[0]!, id: null })).toBeNull();
  });

  it("counts unresolved candidates by reason and never invents a probability", async () => {
    const picks: PickForLiveCal[] = [
      mlPick({ id: "a", gameId: "g1" }),
      mlPick({ id: "b", gameId: "g2" }),
      mlPick({ id: "c", gameId: "g3", selection: "Somebody Else ML (-110)" }),
    ];
    const rows = [...threeBooks("g1").slice(0, 1), ...threeBooks("g3")];
    const { db, findMany } = mockOddsDb(rows);
    const load = await loadPublishTimeMarketPResolver(db, picks);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(load.stats.resolved).toBe(0);
    expect(load.stats.unresolved).toEqual({ no_rows: 1, insufficient_books: 1, no_side: 1 });
    for (const p of picks) expect(load.resolveMarketP(p)).toBeNull();
    expect(oddsTableStatsNote(load.stats)).toContain("resolved 0");
    expect(oddsTableStatsNote(load.stats)).toContain("insufficient_books 1");
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

  it("feeds the shared builder and is reported as market_p_from_odds_table alongside the receipts", async () => {
    const picks = [
      mlPick({ id: "r", gameId: "g9", proofReceipt: { marketFairProb: 0.63 } }),
      mlPick({ id: "o", gameId: "g1", result: "LOSS" }),
      mlPick({ id: "x", gameId: "g5" }),
    ];
    const { db } = mockOddsDb(threeBooks("g1"));
    const load = await loadPublishTimeMarketPResolver(db, picks);

    const built = picksToCalibrationSamples(picks, { resolveMarketP: load.resolveMarketP });
    expect(built.samples).toHaveLength(2);
    expect(built.exclusions).toEqual({ three_way_market: 0, no_market_probability: 1, non_moneyline_market: 0 });
    expect(built.bySource).toEqual({ proof_receipt: 1, resolver: 1 });
    expect(built.taggedSamples[1]).toEqual({
      p: 0.579712,
      y: 0,
      sportKey: "americanfootball_nfl",
      modelVersion: "v5.2.7",
      pickType: "MONEYLINE",
    });

    expect(marketPSourcesFromBySource(built.bySource)).toEqual({
      factor_breakdown: 0,
      proof_receipt: 1,
      market_p_from_odds_table: 1,
    });

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
    expect(payload.pBasis).toBe("market_anchored");
    expect(payload.pSources).toEqual({ factor_breakdown: 0, proof_receipt: 1, market_p_from_odds_table: 1 });
    expect(payload.marketPFromOddsTable).toEqual(load.stats);
    expect(payload.marketPFromOddsTable?.queries).toBe(1);
    expect(payload.marketPFromOddsTable?.unresolved.no_rows).toBe(1);
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
