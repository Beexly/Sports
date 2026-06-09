/**
 * Edge Board — the cross-dataset divergence scan, at scale.
 *
 * Every other intelligence surface answers ONE question against ONE lens. The
 * Edge Board answers the meta-question: across EVERY dataset we ingest, where do
 * the signals DISAGREE the loudest? Disagreement is where the market hasn't
 * caught up — it is the entire product thesis, surfaced as one ranked list.
 *
 * It does not re-derive anything. It COMPOSES the already-computed, already-honest
 * signals from the canonical loaders and fuses them into a single board:
 *   • player-model        → GSE Rating (process) ≫ production  → buy-low
 *                            production ≫ process               → sell-high
 *   • expected-points     → expected PPR ≫ actual               → buy-low (xFP)
 *                            actual ≫ expected                  → sell-high (xFP)
 *   • edge-signals (NGS)  → tracking (separation/YAC+/-/air-share) ≫ box score
 *   • opportunity-transfer→ a ruled-OUT starter vacates volume   → role inheritor
 *   • snap-share          → an elevated workload share the box score lags
 *
 * Each edge carries: player, team, position, a typed label, a 0–100 MAGNITUDE
 * (normalized across all edge types so a WOPR gap and a vacated-volume cascade
 * rank on one axis), and a one-line REAL-DRIVER reason quoting the underlying
 * number. The board is sorted by magnitude — the strongest divergences on top.
 *
 * INTEGRITY (non-negotiable, inherited from every source loader):
 *   • No fabrication. Each edge is built only from a value a loader actually
 *     returned. A missing dataset contributes zero rows, never invented ones.
 *   • No forward projections. These are reads on settled data, exactly like the
 *     loaders they fuse; canPublishProjections stays false.
 *   • The graded-pool MODEL is untouched — we consume processGrade/signal as-is.
 *   • Honest empty + source-error states: if every source fails we say so; if
 *     sources load but nothing diverges we return an empty board, not noise.
 *
 * Pure builder (buildEdgeBoard) + an async composer (loadEdgeBoard). The builder
 * is exercisable offline with fixture loader-results — no network in the unit.
 */

import { loadPlayerModel, type PlayerModel } from "./player-model";
import { loadExpectedPoints, type ExpectedPoints } from "./expected-points";
import { loadNflverseEdgeSignals, type NflverseEdgeSignals } from "@/lib/nflverse/edge-signals";
import { loadOpportunityTransfer, type OpportunityTransfer } from "./opportunity-transfer";
import { loadNflverseSnapShare, type NflverseSnapShare } from "@/lib/nflverse/snap-share";
import type { SignalTone } from "./colors";

/**
 * The kind of divergence an edge represents. Each maps to a distinct cross-dataset
 * disagreement; the union is the legend the board renders.
 */
export type EdgeType =
  | "process-buy" // GSE Rating (process) ≫ production
  | "process-sell" // production ≫ GSE Rating (process)
  | "xfp-buy" // expected points ≫ actual production
  | "xfp-sell" // actual production ≫ expected points
  | "tracking-buy" // NGS tracking signal ≫ box score
  | "tracking-sell" // box score ≫ NGS tracking signal
  | "vacated-role" // a ruled-OUT starter's volume transfers to a beneficiary
  | "snap-surge"; // an elevated snap share the box score hasn't paid out

/** The directional read an edge carries — drives tone + the buy/sell framing. */
export type EdgeDirection = "buy" | "sell" | "role";

export interface EdgeRow {
  /** Stable key for React lists: `${type}:${playerId|name}`. */
  readonly key: string;
  readonly playerId: string;
  readonly player: string;
  readonly team: string;
  readonly position: string;
  readonly type: EdgeType;
  readonly direction: EdgeDirection;
  /** Short human label for the SignalChip, e.g. "Buy-low · Rating". */
  readonly label: string;
  /**
   * 0–100 magnitude, normalized ACROSS edge types so heterogeneous gaps share one
   * ranking axis. Higher = a louder divergence.
   */
  readonly magnitude: number;
  /**
   * Signed driver value for the DivergingBar (the raw gap behind the edge, in the
   * edge's own units). Buy reads positive, sell reads negative, by convention.
   */
  readonly signed: number;
  /** Domain (half-range) for the DivergingBar so the bar scales sensibly per type. */
  readonly signedDomain: number;
  /** One-line, real-number driver. Never generic — always quotes the gap. */
  readonly reason: string;
  /** Which loader this edge came from — surfaced as a provenance tag. */
  readonly source: string;
  readonly tone: SignalTone;
}

export interface EdgeBoard {
  readonly generatedAt: string;
  /** live when at least one source loaded; source-error only when ALL failed. */
  readonly status: "live" | "source-error";
  readonly season: number | null;
  readonly throughWeek: number | null;
  /** Ranked edges, strongest divergence first. */
  readonly edges: readonly EdgeRow[];
  /** Count of edges per type — drives the legend / summary chips. */
  readonly countsByType: Readonly<Record<EdgeType, number>>;
  /** Which underlying sources loaded vs. errored, for an honest provenance line. */
  readonly sources: readonly EdgeSourceStatus[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly error: string | null;
}

export interface EdgeSourceStatus {
  readonly key: string;
  readonly label: string;
  readonly status: "live" | "source-error";
  readonly contributed: number;
}

/** Inputs to the pure builder — the resolved results of each source loader. */
export interface EdgeBoardInputs {
  readonly playerModel: PlayerModel;
  readonly expectedPoints: ExpectedPoints;
  readonly edgeSignals: NflverseEdgeSignals;
  readonly opportunityTransfer: OpportunityTransfer;
  readonly snapShare: NflverseSnapShare;
}

const EDGE_TYPES: readonly EdgeType[] = [
  "process-buy",
  "process-sell",
  "xfp-buy",
  "xfp-sell",
  "tracking-buy",
  "tracking-sell",
  "vacated-role",
  "snap-surge",
];

const EMPTY_COUNTS: Record<EdgeType, number> = {
  "process-buy": 0,
  "process-sell": 0,
  "xfp-buy": 0,
  "xfp-sell": 0,
  "tracking-buy": 0,
  "tracking-sell": 0,
  "vacated-role": 0,
  "snap-surge": 0,
};

/** Human label for each edge type — used by the legend and the chip. */
export const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  "process-buy": "Buy-low · Rating",
  "process-sell": "Sell-high · Rating",
  "xfp-buy": "Buy-low · xFP",
  "xfp-sell": "Sell-high · xFP",
  "tracking-buy": "Buy-low · Tracking",
  "tracking-sell": "Sell-high · Tracking",
  "vacated-role": "Vacated role",
  "snap-surge": "Snap surge",
};

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}
function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
function toneFor(direction: EdgeDirection): SignalTone {
  if (direction === "buy") return "good";
  if (direction === "sell") return "bad";
  return "neutral";
}

/**
 * Snap-share leaders threshold for the "surge" lens: a player commanding a heavy
 * share of his team's snaps is an elevated-workload tell the box score lags. We
 * do not have a week-over-week delta in the snap leaders aggregate, so we surface
 * the HIGHEST snap-share skill players honestly as "elevated role" rather than
 * claim a trend we cannot measure.
 */
const SNAP_SURGE_FLOOR = 0.8; // 80%+ of team snaps = a bell-cow / every-down role
const SNAP_SURGE_TOP = 8; // cap so the board stays a curated edge list, not a dump

/**
 * Build the ranked Edge Board from resolved loader results. Pure + deterministic
 * (no Date, no fetch, no randomness) so the test drives it with fixtures.
 *
 * Magnitude is normalized PER edge type to 0–100 against that type's expected
 * domain, so a WOPR-driven process gap and a vacated-volume cascade can be ranked
 * on one axis without one family dominating purely because its raw units are big.
 */
export function buildEdgeBoard(inputs: EdgeBoardInputs): {
  edges: EdgeRow[];
  season: number | null;
  throughWeek: number | null;
} {
  const { playerModel, expectedPoints, edgeSignals, opportunityTransfer, snapShare } = inputs;
  const edges: EdgeRow[] = [];

  // ── 1) player-model: GSE Rating (process) vs production ────────────────────
  // The loader already computed signal + the process/production percentiles; the
  // gap is processGrade − productionPct. We rank by |gap| (the divergence size).
  if (playerModel.status === "live") {
    for (const p of playerModel.profiles) {
      if (p.signal === "in-line") continue;
      const gap = p.processGrade - p.productionPct; // +buy / −sell, in percentile pts
      const buy = p.signal === "buy-low";
      const type: EdgeType = buy ? "process-buy" : "process-sell";
      const magnitude = clamp((Math.abs(gap) / 60) * 100, 0, 100); // 60pts gap = max
      edges.push({
        key: `${type}:${p.playerId}`,
        playerId: p.playerId,
        player: p.name,
        team: p.team,
        position: p.position,
        type,
        direction: buy ? "buy" : "sell",
        label: EDGE_TYPE_LABEL[type],
        magnitude: round(magnitude),
        signed: gap,
        signedDomain: 60,
        reason: buy
          ? `GSE Rating ${p.processGrade} but production only ${p.productionPct}th pct — a ${Math.abs(gap)}-point process edge the box score hasn't paid yet.`
          : `Production ${p.productionPct}th pct on a ${p.processGrade} GSE Rating — ${Math.abs(gap)} points of output the underlying process doesn't support.`,
        source: "GSE Rating",
        tone: toneFor(buy ? "buy" : "sell"),
      });
    }
  }

  // ── 2) expected-points: expected PPR vs actual ─────────────────────────────
  // The loader emits diff (actual − expected) and a buy/sell signal. Expected ≫
  // actual is a buy (positive edge for the player); actual ≫ expected is a sell.
  if (expectedPoints.status === "live") {
    for (const r of expectedPoints.rows) {
      if (r.signal === "in-line") continue;
      const buy = r.signal === "buy-low";
      const type: EdgeType = buy ? "xfp-buy" : "xfp-sell";
      // The percentile gap drives the divergence; diff is the points the read is about.
      const gapPct = r.xfpPct - r.prodPct; // +buy / −sell
      const magnitude = clamp((Math.abs(gapPct) / 60) * 100, 0, 100);
      // signed in POINTS, oriented so buy reads positive (under-rewarded) / sell negative.
      const signed = buy ? Math.abs(r.diff) : -Math.abs(r.diff);
      edges.push({
        key: `${type}:${r.playerId}`,
        playerId: r.playerId,
        player: r.name,
        team: r.team,
        position: r.position,
        type,
        direction: buy ? "buy" : "sell",
        label: EDGE_TYPE_LABEL[type],
        magnitude: round(magnitude),
        signed: round(signed),
        signedDomain: 40,
        reason: buy
          ? `Earned ${round(r.xfpPerGame)} expected PPR/game but the box score paid less (${round(r.diff)} pts vs expected) — volume the market is under-pricing.`
          : `Outscored his expected points by ${round(r.diff)} — production running ahead of the opportunity that drives it.`,
        source: "Expected Points",
        tone: toneFor(buy ? "buy" : "sell"),
      });
    }
  }

  // ── 3) edge-signals (NGS tracking) vs box score ────────────────────────────
  // Already split into buyLow / sellHigh with a standardized z gap (underlying −
  // production). We map the z gap onto the shared 0–100 axis (z of ~3 = max).
  if (edgeSignals.status === "live") {
    const pushTracking = (rows: readonly NflverseEdgeSignals["buyLow"][number][], buy: boolean): void => {
      for (const r of rows) {
        const type: EdgeType = buy ? "tracking-buy" : "tracking-sell";
        const magnitude = clamp((Math.abs(r.gap) / 3) * 100, 0, 100);
        edges.push({
          key: `${type}:${r.playerId}`,
          playerId: r.playerId,
          player: r.playerName,
          team: r.team,
          position: r.position,
          type,
          direction: buy ? "buy" : "sell",
          label: EDGE_TYPE_LABEL[type],
          magnitude: round(magnitude),
          signed: round(r.gap, 2),
          signedDomain: 3,
          reason: buy
            ? `Tracking runs hot (${r.avgSeparation} yds separation, ${r.yacAboveExpectation} YAC+/-) but only ${r.pprPerGame} PPR/game — the underlying outpaces the box score.`
            : `${r.pprPerGame} PPR/game on cooler tracking (${r.avgSeparation} yds separation, ${r.yacAboveExpectation} YAC+/-) — production ahead of the underlying signal.`,
          source: "NGS Tracking",
          tone: toneFor(buy ? "buy" : "sell"),
        });
      }
    };
    pushTracking(edgeSignals.buyLow, true);
    pushTracking(edgeSignals.sellHigh, false);
  }

  // ── 4) opportunity-transfer: a ruled-OUT starter's vacated volume ──────────
  // The single least-priced edge: volume vacated BEFORE the replacement produced.
  // The loader names the beneficiary and the vacated targets+carries per game.
  if (opportunityTransfer.status === "live") {
    for (const r of opportunityTransfer.rows) {
      const vacated = r.vacatedTargets + r.vacatedCarries;
      if (vacated <= 0 || !r.beneficiary) continue; // honest: no measured volume or no inheritor → no edge
      const magnitude = clamp((vacated / 20) * 100, 0, 100); // 20 t+c/game = max
      edges.push({
        key: `vacated-role:${r.team}-${r.position}-${r.beneficiary}`,
        playerId: "",
        player: r.beneficiary,
        team: r.team,
        position: r.position,
        type: "vacated-role",
        direction: "role",
        label: EDGE_TYPE_LABEL["vacated-role"],
        magnitude: round(magnitude),
        signed: round(vacated),
        signedDomain: 20,
        reason: `${r.outPlayer} is OUT, vacating ${round(vacated)} targets+carries/game; ${r.beneficiary} is the next ${r.position} up on ${r.team} — opportunity the market hasn't repriced.`,
        source: "Opportunity Transfer",
        tone: "neutral",
      });
    }
  }

  // ── 5) snap-share: an elevated every-down workload the box score lags ───────
  // No week-over-week delta in the aggregate leaders, so we honestly surface the
  // HIGHEST snap-share skill players as an elevated-role tell (not a fabricated
  // "surge" trend). Capped + floored so it stays a curated edge, not a leaderboard.
  if (snapShare.status === "live") {
    const skillLeaders = [
      ...snapShare.leaders.RB,
      ...snapShare.leaders.WR,
      ...snapShare.leaders.TE,
    ]
      .filter((l) => l.snapSharePct >= SNAP_SURGE_FLOOR)
      .sort((a, b) => b.snapSharePct - a.snapSharePct)
      .slice(0, SNAP_SURGE_TOP);
    for (const l of skillLeaders) {
      const pct = Math.round(l.snapSharePct * 100);
      // Magnitude scaled within the surge band [floor..1.0] so 100% reads loudest.
      const magnitude = clamp(((l.snapSharePct - SNAP_SURGE_FLOOR) / (1 - SNAP_SURGE_FLOOR)) * 100, 0, 100);
      edges.push({
        key: `snap-surge:${l.playerId}`,
        playerId: l.playerId,
        player: l.playerName,
        team: l.team,
        position: l.position,
        type: "snap-surge",
        direction: "role",
        label: EDGE_TYPE_LABEL["snap-surge"],
        magnitude: round(magnitude),
        signed: l.snapSharePct,
        signedDomain: 1,
        reason: `On ${pct}% of ${l.team}'s offensive snaps (${l.snapsPerGame}/game) — an every-down role that anchors floor and target volume.`,
        source: "Snap Share",
        tone: "neutral",
      });
    }
  }

  // Strongest divergence on top. Stable tiebreak by player so the order is
  // deterministic for the same inputs (the test relies on this).
  edges.sort((a, b) => b.magnitude - a.magnitude || a.player.localeCompare(b.player));

  // Anchor season/week to whatever the loaded sources agree on (first live source).
  const season =
    (playerModel.status === "live" && playerModel.season) ||
    (expectedPoints.status === "live" && expectedPoints.season) ||
    (edgeSignals.status === "live" && edgeSignals.season) ||
    (opportunityTransfer.status === "live" && opportunityTransfer.season) ||
    (snapShare.status === "live" && snapShare.season) ||
    null;
  const throughWeek =
    (playerModel.status === "live" && playerModel.throughWeek) ||
    (expectedPoints.status === "live" && expectedPoints.throughWeek) ||
    null;

  return { edges, season: season || null, throughWeek: throughWeek || null };
}

/**
 * Compose the Edge Board from the canonical loaders. Each loader is awaited
 * independently and a failure is tolerated (it simply contributes no edges and is
 * marked source-error in the provenance line). The board is only fully
 * source-error when EVERY source failed — partial data still yields a real board.
 */
export async function loadEdgeBoard({
  season,
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: (input: string, init?: RequestInit) => Promise<Response> } = {}): Promise<EdgeBoard> {
  const opts = season === undefined ? { timeoutMs, fetcher } : { season, timeoutMs, fetcher };

  // Tolerate per-source failure: a rejected loader becomes a synthetic
  // source-error result so one dead dataset never takes the whole board down.
  const [playerModel, expectedPoints, edgeSignals, opportunityTransfer, snapShare] = await Promise.all([
    loadPlayerModel(opts).catch((e): PlayerModel => playerModelError(e)),
    loadExpectedPoints(opts).catch((e): ExpectedPoints => expectedPointsError(e)),
    loadNflverseEdgeSignals(opts).catch((e): NflverseEdgeSignals => edgeSignalsError(e)),
    loadOpportunityTransfer(opts).catch((e): OpportunityTransfer => opportunityTransferError(e)),
    loadNflverseSnapShare(opts).catch((e): NflverseSnapShare => snapShareError(e)),
  ]);

  const { edges, season: resolvedSeason, throughWeek } = buildEdgeBoard({
    playerModel,
    expectedPoints,
    edgeSignals,
    opportunityTransfer,
    snapShare,
  });

  const countsByType: Record<EdgeType, number> = { ...EMPTY_COUNTS };
  for (const e of edges) countsByType[e.type] += 1;

  const contributed = (type: readonly EdgeType[]): number =>
    edges.filter((e) => type.includes(e.type)).length;

  const sources: EdgeSourceStatus[] = [
    { key: "player-model", label: "GSE Rating", status: playerModel.status, contributed: contributed(["process-buy", "process-sell"]) },
    { key: "expected-points", label: "Expected Points", status: expectedPoints.status, contributed: contributed(["xfp-buy", "xfp-sell"]) },
    { key: "edge-signals", label: "NGS Tracking", status: edgeSignals.status, contributed: contributed(["tracking-buy", "tracking-sell"]) },
    { key: "opportunity-transfer", label: "Opportunity Transfer", status: opportunityTransfer.status, contributed: contributed(["vacated-role"]) },
    { key: "snap-share", label: "Snap Share", status: snapShare.status, contributed: contributed(["snap-surge"]) },
  ];

  const allFailed = sources.every((s) => s.status === "source-error");

  return {
    generatedAt: new Date().toISOString(),
    status: allFailed ? "source-error" : "live",
    season: resolvedSeason,
    throughWeek,
    edges,
    countsByType,
    sources,
    canPublishProjections: false,
    note: allFailed
      ? "Every underlying source is unavailable right now, so the Edge Board is intentionally empty — we never fabricate divergences."
      : "Where our datasets disagree the loudest — ranked. Each edge fuses real, settled signals across the data we ingest; nothing here is a projection or a pick.",
    error: allFailed ? "all sources unavailable" : null,
  };
}

// ── Synthetic source-error results (used only when a loader rejects outright) ──
// Each mirrors that loader's own source-error shape so the builder treats it as a
// dataset that simply contributed nothing — the same honest-empty path the
// loaders use internally when they reach their source but it returns no rows.

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "UNKNOWN";
}
function playerModelError(e: unknown): PlayerModel {
  return {
    generatedAt: new Date().toISOString(), status: "source-error", season: 0, throughWeek: null,
    sourceRows: 0, metricsPerPlayer: 0, profiles: [], canPublishProjections: false,
    note: "unavailable", sourceUrl: "", error: msg(e),
  };
}
function expectedPointsError(e: unknown): ExpectedPoints {
  return {
    generatedAt: new Date().toISOString(), status: "source-error", season: 0, throughWeek: null,
    sourceRows: 0, rows: [], canPublishProjections: false, note: "unavailable", sourceUrl: "", error: msg(e),
  };
}
function edgeSignalsError(e: unknown): NflverseEdgeSignals {
  return {
    generatedAt: new Date().toISOString(), status: "source-error", season: 0, seasonType: "REG",
    qualifiedPlayers: 0, buyLow: [], sellHigh: [], canPublishPicks: false, blockReason: "unavailable",
    sourceUrls: { playerStats: "", ngsReceiving: "" }, error: msg(e),
  };
}
function opportunityTransferError(e: unknown): OpportunityTransfer {
  return {
    generatedAt: new Date().toISOString(), status: "source-error", season: 0, week: null,
    sourceRows: 0, rows: [], canPublishProjections: false, note: "unavailable", sourceUrl: "", error: msg(e),
  };
}
function snapShareError(e: unknown): NflverseSnapShare {
  return {
    generatedAt: new Date().toISOString(), status: "source-error", season: 0, seasonType: "REG",
    sourceRows: 0,
    leaders: { RB: [], WR: [], TE: [] },
    defense: { DL: [], LB: [], CB: [], S: [] },
    offensiveLine: { T: [], G: [], C: [] },
    specialTeams: [],
    canPublishProjections: false, blockReason: "unavailable", sourceUrl: "", error: msg(e),
  };
}

/** Exported for callers that want to render the legend in a stable order. */
export const EDGE_TYPE_ORDER = EDGE_TYPES;
