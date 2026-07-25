/**
 * Turning PRODUCTION picks into gate rows — the join, and the flag that guards it.
 *
 * `gate-rows.ts` maps a row once it is in hand. This module is about getting it
 * in hand truthfully, which is a different risk: the shape of the join decides
 * which price becomes `q`, and the wrong price produces a confident wrong edge
 * that looks exactly like a right one.
 *
 * THE FLAG. `/board/gate` renders illustrative rows by default. Reading the live
 * slate requires `LIVE_BOARD_GATE_SLATE=1`, explicitly, in the environment.
 * Default-off is not timidity: until the join is proven against real data on
 * staging, a page whose entire argument is "we do not publish what we cannot
 * substantiate" must not be the first thing to publish an unverified join.
 *
 * WHAT THIS MODULE REFUSES TO DO. It never invents provenance. A pick with no
 * signal snapshot is not assumed eligible; a bootstrap pick is not quietly
 * promoted. Those decisions live in `isLearningAdmissible`, and this module's
 * job is only to carry the fields across honestly so that function can apply
 * them.
 */

import { db, isStubMode } from "@sports/db";
import {
  buildCalibrationRows,
  buildCandidateRows,
  PRODUCTION_CALIBRATION_OPTS,
  type BuiltRows,
  type RawPickRow,
} from "./gate-rows";

/**
 * Is the live slate switched on?
 *
 * Read at call time, not module load, so a test can set the variable without
 * fighting module caching. Exactly `"1"` — no truthy-string coercion, because
 * `LIVE_BOARD_GATE_SLATE=0` or `=false` must not turn a public surface on.
 *
 * Typed as a minimal record rather than the full `NodeJS.ProcessEnv`, following
 * `isWatchlistAlertsEnabled` — the repo's other default-off founder flag — so a
 * test can pass a bare object without satisfying every required env key.
 */
export function isLiveGateSlateEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env["LIVE_BOARD_GATE_SLATE"] === "1";
}

/**
 * The Prisma `include` the loader needs, kept next to the normalizer that
 * consumes it so the two cannot drift.
 *
 * `signalSnapshot` is selected for `eligibleForLearning`. It is optional in the
 * schema, so it may come back null — which the admissibility rule treats as
 * "unproven", never as "eligible".
 */
/**
 * How many recent odds rows to pull per game.
 *
 * `Odds` is append-only, with one row per (game, bookmaker, market) per
 * ingestion cycle — so a single game accumulates books × 3 markets × cycles.
 * Taking one row would return an arbitrary market (rows from the same cycle
 * even share `fetchedAt`), so we pull a window and pick the market we need.
 */
const ODDS_WINDOW = 120;

export const GATE_SLATE_INCLUDE = {
  game: {
    select: {
      sport: { select: { name: true } },
      // The DENORMALIZED name columns, not the `homeTeam`/`awayTeam` relations.
      // `Game.homeTeamId`/`awayTeamId` are optional and the production ingestion
      // path (process-sport.ts) never assigns them — it writes only
      // homeTeamName/awayTeamName, which the schema marks "denormalized for
      // speed". Selecting the relations would return null for every ingested
      // game and classify the entire live slate as undescribable.
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      status: true,
      odds: {
        orderBy: { fetchedAt: "desc" },
        take: ODDS_WINDOW,
        select: {
          market: true,
          // Selected, not merely ordered on: which snapshot a `q` came from is
          // part of whether the number can be trusted, and a staleness question
          // that cannot be asked later is a claim nobody can check.
          fetchedAt: true,
          // The quoted handicap, so it can be checked against the pick's line.
          spread: true,
          homePrice: true,
          awayPrice: true,
          drawPrice: true,
          homeSpreadPrice: true,
          awaySpreadPrice: true,
        },
      },
    },
  },
  signalSnapshot: { select: { eligibleForLearning: true } },
} as const;

/** Which `OddsMarket` prices a pick type. */
const MARKET_FOR_PICK_TYPE: Record<string, string> = {
  SPREAD: "SPREADS",
  MONEYLINE: "H2H",
  TOTAL: "TOTALS",
};

/**
 * How old a candidate's odds may be before it is refused as stale.
 *
 * `STALE_DATA` is already a first-class No-Bet factor in the engine, so firing
 * against a line from yesterday would contradict a rule the product already
 * enforces elsewhere. Six hours is deliberately generous — the point is to
 * refuse the pathological case (ingestion stopped, rows retained forever),
 * not to second-guess a normal refresh cadence.
 */
export const MAX_CANDIDATE_ODDS_AGE_MS = 6 * 60 * 60 * 1000;

/** The subset of an odds row the normalizer reads. */
export interface GateSlateOdds {
  readonly market: string;
  readonly fetchedAt?: Date;
  /** Home-perspective handicap (negative = home favored), per clv-capture. */
  readonly spread?: number | null;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly drawPrice: number | null;
  readonly homeSpreadPrice: number | null;
  readonly awaySpreadPrice: number | null;
}

/**
 * The latest odds row for the market this pick actually trades in.
 *
 * Rows arrive newest-first, so the first market match is the freshest. Choosing
 * by `fetchedAt` alone would hand a SPREAD pick an H2H row whose spread prices
 * are null — silently excluding a perfectly good pick for want of a field that
 * was never on that row. `clv-capture.ts` filters odds by market for the same
 * reason.
 */
export function selectOddsForPick(
  pickType: string,
  rows: readonly GateSlateOdds[],
): GateSlateOdds | undefined {
  const market = MARKET_FOR_PICK_TYPE[pickType];
  if (!market) return undefined;
  return rows.find((r) => r.market === market);
}

/** The shape `fetchGateSlate` returns, per pick — structural, not Prisma-typed. */
export interface GateSlatePick {
  readonly id: string;
  readonly selection: string;
  readonly confidence: number;
  readonly pickType: string;
  readonly result: string;
  /** Home-perspective handicap the pick was published at. */
  readonly line: number;
  readonly isBootstrap: boolean;
  readonly modelVersion: string | null;
  readonly signalSnapshot: { readonly eligibleForLearning: boolean } | null;
  readonly game: {
    readonly sport: { readonly name: string } | null;
    readonly homeTeamName: string | null;
    readonly awayTeamName: string | null;
    readonly commenceTime?: Date | null;
    readonly status?: string | null;
    readonly odds: readonly GateSlateOdds[];
  } | null;
}

export interface NormalizeOptions {
  /**
   * Enforce the freshness budget and the handicap match. Applied to CANDIDATES
   * only: for settled calibration rows the game is over, so "stale" is
   * meaningless and the historical price is exactly what we want.
   */
  readonly liveCandidate?: boolean;
  /** Injected so tests are deterministic and never depend on wall-clock. */
  readonly now?: Date;
  readonly maxOddsAgeMs?: number;
}

const PICK_TYPES = new Set(["SPREAD", "MONEYLINE", "TOTAL"]);
const RESULTS = new Set(["PENDING", "WIN", "LOSS", "PUSH", "VOID"]);

/**
 * Pick the two-sided prices that belong to THIS pick's market.
 *
 * The bug this exists to prevent: `Odds` stores moneyline prices in
 * `homePrice`/`awayPrice` and spread prices in
 * `homeSpreadPrice`/`awaySpreadPrice`. De-vigging a SPREAD pick against the
 * moneyline pair produces a plausible number that is the fair probability of a
 * completely different bet — an outright win rather than a win against the
 * handicap. On a heavy favourite the two diverge enormously, and nothing
 * downstream could detect it.
 *
 * Returns nulls when the matching pair is absent, which `toGateRow` reports as
 * a missing input rather than a refusal.
 */
export function pricesForPickType(
  pickType: string,
  odds: GateSlateOdds | undefined,
): { homePrice: number | null; awayPrice: number | null; drawPrice: number | null } {
  if (!odds) return { homePrice: null, awayPrice: null, drawPrice: null };

  if (pickType === "SPREAD") {
    return {
      homePrice: odds.homeSpreadPrice,
      awayPrice: odds.awaySpreadPrice,
      // A handicap market is two-way; a draw price on the H2H row says nothing
      // about it and must not be carried across as a three-way signal.
      drawPrice: null,
    };
  }

  if (pickType === "MONEYLINE") {
    return {
      homePrice: odds.homePrice,
      awayPrice: odds.awayPrice,
      drawPrice: odds.drawPrice,
    };
  }

  // TOTAL is over/under, not home/away. Left null so the mapper excludes it by
  // its own rule rather than being handed a mismatched pair here.
  return { homePrice: null, awayPrice: null, drawPrice: null };
}

/**
 * Normalize one production pick into a `RawPickRow`.
 *
 * Returns null when a row cannot be described without guessing — an absent
 * sport, team, or an unrecognised enum value. Dropping here is safe in a way it
 * is NOT safe downstream: these rows cannot be rendered as a decision at all,
 * so counting them as refusals would invent judgements. The count of dropped
 * rows is returned by `partitionGateSlate` so the omission stays visible.
 */
export function normalizeGateSlatePick(
  pick: GateSlatePick,
  options: NormalizeOptions = {},
): RawPickRow | null {
  const sportName = pick.game?.sport?.name;
  const homeTeamName = pick.game?.homeTeamName;
  const awayTeamName = pick.game?.awayTeamName;
  if (!sportName || !homeTeamName || !awayTeamName) return null;
  if (!PICK_TYPES.has(pick.pickType) || !RESULTS.has(pick.result)) return null;

  const odds = selectOddsForPick(pick.pickType, pick.game?.odds ?? []);
  const prices = pricesForPickType(pick.pickType, odds);
  const inputProblems: string[] = [];

  if (options.liveCandidate && odds) {
    // Stale odds. Retained rows do not expire on their own, so without this a
    // pick could fire against a line from hours or days ago — contradicting the
    // STALE_DATA refusal the engine already applies elsewhere.
    const fetchedAt = odds.fetchedAt;
    const maxAge = options.maxOddsAgeMs ?? MAX_CANDIDATE_ODDS_AGE_MS;
    const now = options.now ?? new Date();
    if (!fetchedAt) {
      inputProblems.push("odds freshness (no fetch timestamp on the quote)");
    } else if (now.getTime() - fetchedAt.getTime() > maxAge) {
      inputProblems.push("fresh odds (the latest quote for this market is stale)");
    }

    // The handicap must be the one the pick was taken at. Both `Pick.line` and
    // `Odds.spread` are home-perspective, so this compares like with like.
    // Without it, a home -3.5 pick can be priced off a -6.5 quote after line
    // movement and receive a materially wrong edge.
    if (pick.pickType === "SPREAD") {
      if (odds.spread === null || odds.spread === undefined) {
        inputProblems.push("quoted handicap (spread absent from the quote)");
      } else if (odds.spread !== pick.line) {
        inputProblems.push(
          `matching handicap (pick taken at ${pick.line}, market now quotes ${odds.spread})`,
        );
      }
    }
  }

  return {
    ...(inputProblems.length > 0 ? { inputProblems } : {}),
    id: pick.id,
    selection: pick.selection,
    confidence: pick.confidence,
    pickType: pick.pickType as RawPickRow["pickType"],
    result: pick.result as RawPickRow["result"],
    sportName,
    homeTeamName,
    awayTeamName,
    homePrice: prices.homePrice,
    awayPrice: prices.awayPrice,
    drawPrice: prices.drawPrice,
    isBootstrap: pick.isBootstrap,
    // Carried across exactly. A missing snapshot stays `undefined` — the
    // admissibility rule reads that as unproven, which is the honest reading.
    eligibleForLearning: pick.signalSnapshot?.eligibleForLearning,
    modelVersion: pick.modelVersion,
  };
}

export interface GateSlatePartition {
  readonly calibration: BuiltRows;
  readonly candidates: BuiltRows;
  /** Rows too incomplete to describe at all. Surfaced so they are not silent. */
  readonly undescribable: number;
}

/**
 * Split a production slate into calibration and candidate rows.
 *
 * Settled rows go through the STRICT calibration path — provenance must prove
 * learning eligibility. Pending rows are candidates and carry no provenance
 * requirement, because nothing is being learned from them; they are the thing
 * being judged.
 */
export function partitionGateSlate(
  picks: readonly GateSlatePick[],
  options: NormalizeOptions = {},
): GateSlatePartition {
  const rows: RawPickRow[] = [];
  let undescribable = 0;

  for (const p of picks) {
    // Freshness and handicap-match apply to live candidates only. A settled
    // pick's game is over, so its historical quote is exactly the right one.
    const row = normalizeGateSlatePick(p, {
      ...options,
      liveCandidate: p.result === "PENDING",
    });
    if (row === null) undescribable += 1;
    else rows.push(row);
  }

  const settled = rows.filter((r) => r.result !== "PENDING");
  const pending = rows.filter((r) => r.result === "PENDING");

  return {
    calibration: buildCalibrationRows(settled, PRODUCTION_CALIBRATION_OPTS),
    candidates: buildCandidateRows(pending),
    undescribable,
  };
}

/**
 * Read the live slate from the database and partition it.
 *
 * Returns null — meaning "no live slate, use the illustrative rows" — unless the
 * flag is on AND a real database is configured. Both conditions are checked
 * here rather than at the call site, so a caller cannot reach production data by
 * forgetting a guard. In stub mode every query returns empty, and an empty
 * result rendered as a live slate would be a page confidently showing nothing.
 *
 * NOT YET EXERCISED AGAINST PRODUCTION DATA. The query shape is typed and unit
 * tested, but a join is only really proven by running it against real rows;
 * that is the staging step, and the flag stays off until it passes.
 */
export async function fetchGateSlate(
  options: {
    /** Restrict to these sports by name. Omit for every sport. */
    readonly sportKeys?: readonly string[];
    /** Only settled history at or after this instant. Omit for all of it. */
    readonly settledSince?: Date;
    readonly candidateLimit?: number;
    readonly settledLimit?: number;
  } = {},
): Promise<GateSlatePartition | null> {
  if (!isLiveGateSlateEnabled() || isStubMode()) return null;

  const now = new Date();
  const settledLimit = options.settledLimit ?? 5000;
  const candidateLimit = options.candidateLimit ?? 200;
  const sportFilter: { game?: { sport: { name: { in: string[] } } } } =
    options.sportKeys && options.sportKeys.length > 0
      ? { game: { sport: { name: { in: [...options.sportKeys] } } } }
      : {};

  // Two queries rather than one, because the ordering that matters differs:
  // calibration wants the most recent SETTLED history, candidates want the
  // upcoming board. A single query ordered one way would starve the other.
  const [settled, pending] = await Promise.all([
    db.pick.findMany({
      where: {
        ...sportFilter,
        ...(options.settledSince ? { settledAt: { gte: options.settledSince } } : {}),
        isPublished: true,
        result: { in: ["WIN", "LOSS"] },
        // Pre-filtered in SQL as well as in the mapper. The mapper is the
        // authority — it fails closed on absent provenance, which SQL cannot
        // express as cleanly — but filtering here keeps the row count sane.
        isBootstrap: false,
        signalSnapshot: { eligibleForLearning: true },
      },
      orderBy: { settledAt: "desc" },
      take: settledLimit,
      include: GATE_SLATE_INCLUDE,
    }),
    db.pick.findMany({
      where: {
        ...sportFilter,
        isPublished: true,
        result: "PENDING",
        // Only games that have not started. Settlement can lag, so PENDING
        // outlives kickoff; without this the gate could return FIRE for a wager
        // that is no longer obtainable — a recommendation nobody could act on,
        // presented as a live one.
        game: {
          ...(sportFilter.game ?? {}),
          status: "SCHEDULED",
          commenceTime: { gt: now },
        },
      },
      orderBy: { generatedAt: "desc" },
      take: candidateLimit,
      include: GATE_SLATE_INCLUDE,
    }),
  ]);

  return partitionGateSlate(
    [
      ...(settled as unknown as GateSlatePick[]),
      ...(pending as unknown as GateSlatePick[]),
    ],
    { now },
  );
}
