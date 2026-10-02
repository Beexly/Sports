import { describe, expect, it } from "vitest";
import { buildEdgeBoard, type EdgeBoardInputs } from "./edge-board";
import type { PlayerModel } from "./player-model";
import type { ExpectedPoints } from "./expected-points";
import type { NflverseEdgeSignals } from "@/lib/nflverse/edge-signals";
import type { OpportunityTransfer } from "./opportunity-transfer";
import type { NflverseSnapShare } from "@/lib/nflverse/snap-share";

/**
 * The Edge Board shipped with ZERO tests. 493 lines compose five loaders into
 * one ranked list that is now a customer-visible PREMIUM engine, and a build
 * board with no unit coverage means a regression in the ranking, the sign
 * convention, or the magnitude normalization would be invisible until a customer
 * saw it.
 *
 * The shapes below mirror the loaders' own source-error fallbacks exactly, so a
 * fixture is a real loader result rather than a convenient stub.
 */

const NOW = "2026-10-01T12:00:00.000Z";

const pmErr: PlayerModel = {
  generatedAt: NOW, status: "source-error", season: 0, throughWeek: null,
  sourceRows: 0, metricsPerPlayer: 0, profiles: [], canPublishProjections: false,
  note: "unavailable", sourceUrl: "", error: "down",
};
const xfpErr: ExpectedPoints = {
  generatedAt: NOW, status: "source-error", season: 0, throughWeek: null,
  sourceRows: 0, rows: [], record: null, canPublishProjections: false,
  attribution: { name: "", url: "", note: "" }, note: "unavailable", sourceUrl: "", error: "down",
};
const ngsErr: NflverseEdgeSignals = {
  generatedAt: NOW, status: "source-error", season: 0, seasonType: "REG",
  qualifiedPlayers: 0, buyLow: [], sellHigh: [], canPublishPicks: false,
  blockReason: "unavailable", sourceUrls: { playerStats: "", ngsReceiving: "" }, error: "down",
};
const otErr: OpportunityTransfer = {
  generatedAt: NOW, status: "source-error", season: 0, week: null,
  sourceRows: 0, rows: [], canPublishProjections: false, note: "unavailable", sourceUrl: "", error: "down",
};
const snapErr: NflverseSnapShare = {
  generatedAt: NOW, status: "source-error", season: 0, seasonType: "REG",
  sourceRows: 0, leaders: { RB: [], WR: [], TE: [] },
  canPublishProjections: false, blockReason: "unavailable", sourceUrl: "", error: "down",
};

const allDown = (over: Partial<EdgeBoardInputs> = {}): EdgeBoardInputs => ({
  playerModel: pmErr, expectedPoints: xfpErr, edgeSignals: ngsErr,
  opportunityTransfer: otErr, snapShare: snapErr, ...over,
});

/** One live player-model profile, buy-low: rating 90, production 30. */
const buyProfile = {
  playerId: "p1", name: "Test Buy", team: "CLE", position: "WR",
  processGrade: 90, productionPct: 30, signal: "buy-low" as const,
  metrics: {}, splits: [],
};

const livePm = (profiles: unknown[]): PlayerModel => ({
  generatedAt: NOW, status: "live", season: 2026, throughWeek: 3,
  sourceRows: 100, metricsPerPlayer: 7, profiles, canPublishProjections: false,
  note: "", sourceUrl: "", error: null,
});

describe("buildEdgeBoard", () => {
  it("emits a buy-low edge when the rating runs ahead of production", () => {
    const { edges } = buildEdgeBoard(allDown({ playerModel: livePm([buyProfile]) }));
    const e = edges.find((x) => x.type === "process-buy");
    expect(e).toBeDefined();
    expect(e?.player).toBe("Test Buy");
    expect(e?.direction).toBe("buy");
    // signed is the raw gap in percentile points, positive for buy
    expect(e?.signed).toBe(60);
    // 60pt gap is the documented full-scale magnitude
    expect(e?.magnitude).toBe(100);
  });

  it("signs a sell-high edge negative, so buy and sell never share a direction", () => {
    const { edges } = buildEdgeBoard(
      allDown({ playerModel: livePm([{ ...buyProfile, processGrade: 30, productionPct: 90, signal: "sell-high" }]) }),
    );
    const e = edges.find((x) => x.type === "process-sell");
    expect(e?.direction).toBe("sell");
    expect(e?.signed).toBeLessThan(0);
    expect(e?.magnitude).toBe(100);
  });

  it("emits NOTHING for an in-line player, where the inputs agree", () => {
    const { edges } = buildEdgeBoard(
      allDown({ playerModel: livePm([{ ...buyProfile, processGrade: 50, productionPct: 50, signal: "in-line" }]) }),
    );
    expect(edges).toEqual([]);
  });

  it("ranks the loudest divergence first", () => {
    const quiet = { ...buyProfile, playerId: "p2", name: "Quiet", processGrade: 40, productionPct: 30 };
    const loud = { ...buyProfile, playerId: "p3", name: "Loud" };
    const { edges } = buildEdgeBoard(allDown({ playerModel: livePm([quiet, loud]) }));
    expect(edges.length).toBeGreaterThanOrEqual(2);
    const mags = edges.map((e) => e.magnitude);
    expect([...mags].sort((a, b) => b - a)).toEqual(mags);
    expect(edges[0]?.magnitude).toBeGreaterThanOrEqual(edges[edges.length - 1]!.magnitude);
  });

  it("quotes the underlying numbers in the reason, never a generic claim", () => {
    const { edges } = buildEdgeBoard(allDown({ playerModel: livePm([buyProfile]) }));
    const e = edges.find((x) => x.type === "process-buy");
    expect(e?.reason).toContain("90");
    expect(e?.reason).toContain("30");
    // the provenance tag names the loader the edge came from
    expect(e?.source).toBeTruthy();
  });

  it("produces an EMPTY board when every source errored, rather than throwing", () => {
    const out = buildEdgeBoard(allDown());
    expect(out.edges).toEqual([]);
    expect(out.season).toBeNull();
  });

  it("keeps magnitude inside 0-100 even for an absurd gap", () => {
    const wild = { ...buyProfile, processGrade: 100, productionPct: 0 };
    const { edges } = buildEdgeBoard(allDown({ playerModel: livePm([wild]) }));
    for (const e of edges) {
      expect(e.magnitude).toBeGreaterThanOrEqual(0);
      expect(e.magnitude).toBeLessThanOrEqual(100);
    }
  });

  it("gives every edge a stable, unique key for React lists", () => {
    const { edges } = buildEdgeBoard(
      allDown({ playerModel: livePm([buyProfile, { ...buyProfile, playerId: "p9", name: "Other" }]) }),
    );
    const keys = edges.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
