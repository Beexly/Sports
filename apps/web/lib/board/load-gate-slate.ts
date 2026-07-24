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
export const GATE_SLATE_INCLUDE = {
  game: {
    select: {
      sport: { select: { name: true } },
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      odds: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
        select: {
          market: true,
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

/** The subset of an odds row the normalizer reads. */
export interface GateSlateOdds {
  readonly market: string;
  readonly homePrice: number | null;
  readonly awayPrice: number | null;
  readonly drawPrice: number | null;
  readonly homeSpreadPrice: number | null;
  readonly awaySpreadPrice: number | null;
}

/** The shape `fetchGateSlate` returns, per pick — structural, not Prisma-typed. */
export interface GateSlatePick {
  readonly id: string;
  readonly selection: string;
  readonly confidence: number;
  readonly pickType: string;
  readonly result: string;
  readonly isBootstrap: boolean;
  readonly modelVersion: string | null;
  readonly signalSnapshot: { readonly eligibleForLearning: boolean } | null;
  readonly game: {
    readonly sport: { readonly name: string } | null;
    readonly homeTeam: { readonly name: string } | null;
    readonly awayTeam: { readonly name: string } | null;
    readonly odds: readonly GateSlateOdds[];
  } | null;
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
export function normalizeGateSlatePick(pick: GateSlatePick): RawPickRow | null {
  const sportName = pick.game?.sport?.name;
  const homeTeamName = pick.game?.homeTeam?.name;
  const awayTeamName = pick.game?.awayTeam?.name;
  if (!sportName || !homeTeamName || !awayTeamName) return null;
  if (!PICK_TYPES.has(pick.pickType) || !RESULTS.has(pick.result)) return null;

  const prices = pricesForPickType(pick.pickType, pick.game?.odds[0]);

  return {
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
): GateSlatePartition {
  const rows: RawPickRow[] = [];
  let undescribable = 0;

  for (const p of picks) {
    const row = normalizeGateSlatePick(p);
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
  options: { readonly candidateLimit?: number; readonly settledLimit?: number } = {},
): Promise<GateSlatePartition | null> {
  if (!isLiveGateSlateEnabled() || isStubMode()) return null;

  const settledLimit = options.settledLimit ?? 5000;
  const candidateLimit = options.candidateLimit ?? 200;

  // Two queries rather than one, because the ordering that matters differs:
  // calibration wants the most recent SETTLED history, candidates want the
  // upcoming board. A single query ordered one way would starve the other.
  const [settled, pending] = await Promise.all([
    db.pick.findMany({
      where: {
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
      where: { isPublished: true, result: "PENDING" },
      orderBy: { generatedAt: "desc" },
      take: candidateLimit,
      include: GATE_SLATE_INCLUDE,
    }),
  ]);

  return partitionGateSlate([
    ...(settled as unknown as GateSlatePick[]),
    ...(pending as unknown as GateSlatePick[]),
  ]);
}
