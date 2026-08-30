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
import { averageAmericanPrices, selectGradingLine } from "@sports/prediction-engine";
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

/**
 * Absorbs IEEE-754 division noise from averaging spreads, nothing more.
 *
 * Deliberately tiny. A wider tolerance would let a genuinely-moved line slip
 * through undetected, which is the exact correctness risk this whole check
 * exists to catch — the fix here is comparing the RIGHT statistic (consensus
 * vs. consensus), not comparing loosely.
 */
const HANDICAP_MATCH_EPSILON = 1e-6;

/** The consensus spread AND the prices quoted alongside it — see `consensusSpreadForGame`. */
export interface SpreadConsensus {
  readonly spread: number;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
}

/**
 * Reconstruct the cross-book consensus for a game's SPREAD market, from its
 * freshest ingestion batch — the same statistic `clvLockLine` (or legacy
 * `line`) was computed as at generation time, so a candidate's current market
 * state can be compared to the locked state like with like.
 *
 * Averages the PRICES from the SAME batch alongside the spread, deliberately.
 * Averaging only the spread and then devigging `q` from some OTHER single
 * row's prices (whichever `selectOddsForPick` happened to match) would price
 * a bet at one book's specific handicap while validating a different,
 * averaged handicap — internally inconsistent, and worse than not averaging
 * at all: it would admit a row whose probability corresponds to a spread the
 * check never actually confirmed. Spread and price must come from the same
 * computation, or the validation says nothing about what `q` was priced at.
 *
 * Prices are averaged in PROBABILITY SPACE via `averageAmericanPrices`, never
 * as raw American numbers — American odds are discontinuous across ±100
 * (`avg(-102, +105) = +2` is not a price), the exact hazard `clv-capture.ts`
 * already documents for moneyline averaging. Spread prices sit close to even
 * (~-110) but are still American odds and can cross that boundary.
 *
 * "Batch" mirrors `clv-capture.ts`'s `deriveClosingSnapshotFromOdds`: all
 * `SPREADS` rows sharing the single latest `fetchedAt` timestamp among the
 * rows given (one ingestion cycle, potentially several bookmakers). Returns
 * null when no SPREADS row with a spread is present at all — the caller
 * reports that as a missing quote rather than treating it as zero movement.
 */
export function consensusSpreadForGame(rows: readonly GateSlateOdds[]): SpreadConsensus | null {
  const spreadRows = rows.filter(
    (r): r is GateSlateOdds & { fetchedAt: Date; spread: number } =>
      r.market === "SPREADS" && r.fetchedAt !== undefined && r.spread !== null && r.spread !== undefined,
  );
  if (spreadRows.length === 0) return null;

  const latestTs = Math.max(...spreadRows.map((r) => r.fetchedAt.getTime()));
  const batch = spreadRows.filter((r) => r.fetchedAt.getTime() === latestTs);

  const spread = batch.reduce((sum, r) => sum + r.spread, 0) / batch.length;
  const homePrices = batch
    .map((r) => r.homeSpreadPrice)
    .filter((p): p is number => p !== null && p !== undefined);
  const awayPrices = batch
    .map((r) => r.awaySpreadPrice)
    .filter((p): p is number => p !== null && p !== undefined);

  return {
    spread,
    homePrice: averageAmericanPrices(homePrices),
    awayPrice: averageAmericanPrices(awayPrices),
  };
}

/** The shape `fetchGateSlate` returns, per pick — structural, not Prisma-typed. */
export interface GateSlatePick {
  readonly id: string;
  readonly selection: string;
  readonly confidence: number;
  readonly pickType: string;
  readonly result: string;
  /**
   * Home-perspective handicap, MUTATED on every refresh cycle while the pick
   * is PENDING (`process-sport.ts`'s `pickUpdateData.line` — "Fields refreshed
   * on every cycle"). This is NOT the line the pick was published at; that is
   * `clvLockLine`. Kept as the founder-gated fallback for legacy rows that
   * predate `clvLockLine`, via `selectGradingLine` — never read directly for a
   * "what did we publish" question on a live candidate.
   */
  readonly line: number;
  /**
   * The immutable price/line snapshot captured ONCE at creation — `null` for
   * MONEYLINE picks (which lock via `clvLockPrice` instead) and for legacy
   * rows written before this field existed. The line a candidate's current
   * market state must be compared against; `line` above drifts and must not
   * be used for that comparison.
   */
  readonly clvLockLine: number | null;
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
  /**
   * Per-call candidate-odds age budget. May only ever TIGHTEN the window.
   *
   * Binding law: MAX_CANDIDATE_ODDS_AGE_MS (6h) must not be widened. That
   * constant is guarded by review and by every doc in docs/ops, but this
   * option was the one seam around it — an ungated per-call override that
   * could pass 24h and admit day-old quotes without touching the protected
   * line at all. Zero callers use it that way today, which is exactly when a
   * seam is cheapest to close.
   *
   * Values larger than the constant are CLAMPED DOWN to it rather than
   * rejected: the legitimate use is tightening in tests, so a throw would turn
   * a caller mistake into an outage while a clamp keeps the honest ceiling.
   * See resolveMaxOddsAgeMs.
   */
  readonly maxOddsAgeMs?: number;
}

/**
 * The effective candidate-odds age budget: never wider than the protected
 * constant, whatever a caller asks for. Non-finite or non-positive input falls
 * back to the constant rather than disabling the check.
 */
export function resolveMaxOddsAgeMs(requested?: number): number {
  if (requested === undefined) return MAX_CANDIDATE_ODDS_AGE_MS;
  if (!Number.isFinite(requested) || requested <= 0) return MAX_CANDIDATE_ODDS_AGE_MS;
  return Math.min(requested, MAX_CANDIDATE_ODDS_AGE_MS);
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
  // `let`, not `const`: the SPREAD-candidate branch below OVERRIDES this with
  // the consensus-batch prices once the handicap validates, so `q` stays
  // coupled to the same computation that confirmed the handicap — never a
  // decoupled single-book quote at a different spread. See that branch.
  let prices = pricesForPickType(pick.pickType, odds);
  const inputProblems: string[] = [];

  if (options.liveCandidate) {
    // Post-kickoff. Settlement lags, so PENDING outlives the game; a candidate
    // whose game has started is not a placeable wager, and FIRE on it would be
    // a recommendation nobody could act on presented as a live one.
    //
    // Enforced HERE as well as in the candidate query's where-clause. The SQL
    // filter is an optimization; this is the guarantee, because a caller using
    // `partitionGateSlate` directly would otherwise get no protection at all —
    // and it makes the exclusion measurable rather than invisible.
    const commenceTime = pick.game?.commenceTime;
    const now = options.now ?? new Date();
    if (commenceTime && commenceTime.getTime() <= now.getTime()) {
      inputProblems.push("placeable window (this game has already started)");
    }

    // Status, checked separately from kickoff time. A POSTPONED or CANCELED
    // game can still carry a FUTURE commenceTime, so the time check alone lets
    // it through — and a postponed game is not a placeable wager either. The
    // candidate query filters `status: SCHEDULED` in SQL; this is the guarantee,
    // for the same reason the kickoff rule lives here: a caller using
    // `partitionGateSlate` directly must not silently get a weaker rule than
    // the product's own query applies.
    const status = pick.game?.status;
    if (status && status !== "SCHEDULED") {
      inputProblems.push(
        `placeable window (game status is ${status}, not scheduled)`,
      );
    }
  }

  if (options.liveCandidate && odds) {
    // Stale odds. Retained rows do not expire on their own, so without this a
    // pick could fire against a line from hours or days ago — contradicting the
    // STALE_DATA refusal the engine already applies elsewhere.
    const fetchedAt = odds.fetchedAt;
    const maxAge = resolveMaxOddsAgeMs(options.maxOddsAgeMs);
    const now = options.now ?? new Date();
    if (!fetchedAt) {
      inputProblems.push("odds freshness (no fetch timestamp on the quote)");
    } else if (now.getTime() - fetchedAt.getTime() > maxAge) {
      inputProblems.push("fresh odds (the latest quote for this market is stale)");
    }

    // The handicap must be the one the pick was ACTUALLY taken at, and `q`
    // must be priced coherently with whatever spread that comparison confirms.
    // Two distinct hazards, both real, both fixed here together because
    // fixing only one leaves the other:
    //
    // HAZARD 1 — comparing against the wrong, MUTABLE target. `Pick.line` is
    // rewritten on every refresh cycle while a pick is PENDING
    // (`process-sport.ts`: "Fields refreshed on every cycle" —
    // `pickUpdateData.line: pick.line`). The immutable snapshot captured once
    // at publish is `clvLockLine`. Comparing against `line` compares "the
    // market now" against "the market now" (or very close to it, from the
    // last refresh) and can silently pass through real movement.
    // `selectGradingLine` — the same helper `settlement.ts` uses to GRADE
    // these picks — resolves this: `clvLockLine ?? line`, falling back only
    // for legacy rows with no lock.
    //
    // HAZARD 2 — comparing a MULTI-BOOK AVERAGE against a ONE-BOOK SPOT quote.
    // `clvLockLine` was captured as the mean spread across >= MIN_BOOKMAKERS
    // books (scoring.ts: `avgSpread`, `line: avgSpread`). `selectOddsForPick`
    // returns a SINGLE row — whichever bookmaker's SPREADS row `.find()`
    // matched first. Comparing an average to one book's spot price mismatches
    // almost every time even with ZERO real movement, since sportsbook spreads
    // are quantized to 0.5/1.0 increments and an average of several rarely is.
    // `consensusSpreadForGame` reconstructs the SAME statistic the lock line
    // was computed as — the same batch-average shape `clv-capture.ts`'s
    // `deriveClosingSnapshotFromOdds` already uses for CLV grading — rather
    // than inventing a second shape for the same idea.
    //
    // COUPLING — once the handicap validates, `prices` is OVERRIDDEN with
    // that SAME consensus batch's prices, replacing the single-row prices
    // `pricesForPickType` extracted above. Without this, `q` would still be
    // devigged from whichever single book `selectOddsForPick` happened to
    // match — which can quote a DIFFERENT spread than the one just validated
    // — pricing a "-3 spread" bet's probability while evaluating it as the
    // "-3.5" bet the check confirmed. Spread and price must come from the
    // same computation, or the validation says nothing about what `q` prices.
    if (pick.pickType === "SPREAD") {
      if (odds.spread === null || odds.spread === undefined) {
        inputProblems.push("quoted handicap (spread absent from the quote)");
      } else {
        const consensus = consensusSpreadForGame(pick.game?.odds ?? []);
        if (consensus === null) {
          // Unreachable in practice — `odds.spread` non-null implies at least
          // one SPREADS row with a spread exists, which is exactly what
          // `consensusSpreadForGame` requires. Excluded rather than trusted,
          // per this module's rule of never guessing past a contradiction.
          inputProblems.push("quoted handicap (spread absent from the quote)");
        } else {
          const lockedLine = selectGradingLine(pick);
          if (Math.abs(consensus.spread - lockedLine) > HANDICAP_MATCH_EPSILON) {
            inputProblems.push(
              `matching handicap (pick taken at ${lockedLine}, market now quotes ${consensus.spread})`,
            );
          } else {
            prices = { homePrice: consensus.homePrice, awayPrice: consensus.awayPrice, drawPrice: null };
          }
        }
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
