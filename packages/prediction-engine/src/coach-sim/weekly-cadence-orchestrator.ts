/**
 * Weekly Cadence Orchestrator — the production consumer that closes the
 * "ticket = null" wiring gap.
 *
 * Background. `call-sheet.ts` deliberately emits Call rows with `ticket: null`
 * because it has no market view; pricing belongs to the Class B comparison step.
 * `calibration-map.ts` ships `signCallSheetTickets()` to do that pricing, but
 * until this module existed nothing in production called it, so tickets stayed
 * null forever. This module is that caller.
 *
 * Pipeline
 * --------
 *   Tuesday 04:00 CT  generateTuesdayMasterLock()  -> v1.0 seal
 *   Wed/Thu/Fri       advanceWeeklyLockWithInjuries() -> v2.0/v3.0/v4.0 seals
 *
 * Invariants
 * ----------
 * 1. The coach mindset hash and the recovered tau are sealed at v1.0. An injury
 *    overlay may move execution weights (target shares, margin, total, win
 *    probability) but must leave both bit-identical. This module never
 *    re-estimates tau.
 * 2. A lock whose tau or frozen input no longer hashes to its sealed
 *    `coachMindsetHash` is refused before any overlay is applied. That is the
 *    guard the "refuses to advance a lock whose tau was mutated" test exercises.
 * 3. Call-sheet tickets are priced only when a market quote is supplied for the
 *    call's id. No quote means no ticket; the row is never given a placeholder
 *    price. See `signCallSheetTickets` for the edge gate (default 2.0%).
 *
 * What this module deliberately does not do
 * -----------------------------------------
 * It does not read the market. Market quotes are passed in by the caller so the
 * projection stays fenced from odds data at lock time. It does not invent target
 * distributions — rooms come from the caller's board. It does not mutate a
 * sealed tau under any circumstance.
 */
import {
  applyInjuryOverlay,
  computeCoachMindsetSha256,
  lockTuesdayCoachBaseline,
  type CadenceInjuryOverlayInput,
  type FourthDownDecisionSample,
  type TuesdayCoachBaselineLock,
  type TuesdayTargetRooms,
} from "./locked-projection.js";
import {
  signCallSheetTickets,
  type MarketQuoteForCall,
  type SignedCall,
} from "../public-baseline/calibration-map.js";
import type { Call } from "../public-baseline/call-sheet.js";
import type { CadenceVersion } from "../public-baseline/cadence.js";

// --------------------------------------------------------------------------- //
// Inputs
// --------------------------------------------------------------------------- //

/**
 * One game on the weekly card. Everything the orchestrator needs to seal a
 * coach baseline and build a personnel call row.
 *
 * `marketSpreadHome` / `marketTotal` are carried for the Class B comparison
 * step and are *not* passed into `lockTuesdayCoachBaseline`, which is fenced
 * from market data by design.
 */
export interface WeeklyGameInput {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly coachSupport: number;
  readonly neutralPassRate?: number;
  readonly staffAggression?: number;
  readonly staffAggressionAway?: number;
  /** Closing/opening spread, home perspective. Class B only. */
  readonly marketSpreadHome?: number;
  /** Closing/opening total. Class B only. */
  readonly marketTotal?: number;
  /** Sealed target rooms for both sides. */
  readonly rooms: TuesdayTargetRooms;
  /** Observed 4th-down go/kick decisions for the coach risk-preference fit. */
  readonly fourthDownDecisions?: readonly FourthDownDecisionSample[];
}

/** Market quotes keyed by the Call row id the quote applies to. */
export type MarketQuotesByCallId = Readonly<Record<string, MarketQuoteForCall>>;

export interface GenerateTuesdayMasterLockInput {
  readonly season: number;
  readonly week: number;
  /** ISO timestamp of the seal. Passed explicitly so tests are deterministic. */
  readonly lockedAtIso: string;
  readonly games: readonly WeeklyGameInput[];
  /**
   * Optional market quotes. When supplied, call-sheet tickets are priced and
   * the lock carries `signedCalls`. When omitted, no call rows are emitted and
   * the lock carries only the sealed coach baselines.
   */
  readonly marketQuotes?: MarketQuotesByCallId;
  /** Minimum edge in percentage points required to sign a ticket. */
  readonly minEdgePct?: number;
}

export interface AdvanceInjuryInput {
  readonly version: Exclude<CadenceVersion, "v1.0">;
  readonly recordedAtIso: string;
  readonly byGameId: Readonly<
    Record<
      string,
      {
        readonly inactivePlayerIds: readonly string[];
        readonly homeInjuryPointsDelta?: number;
        readonly awayInjuryPointsDelta?: number;
      }
    >
  >;
}

// --------------------------------------------------------------------------- //
// Outputs
// --------------------------------------------------------------------------- //

export interface WeeklyGameLock {
  readonly gameId: string;
  readonly coachLock: TuesdayCoachBaselineLock;
}

export interface TuesdayMasterLock {
  readonly version: CadenceVersion;
  readonly season: number;
  readonly week: number;
  readonly lockedAtIso: string;
  readonly games: readonly WeeklyGameLock[];
  /**
   * Priced call-sheet rows. Present only when `marketQuotes` was supplied to
   * `generateTuesdayMasterLock`. Rows whose quote is absent or whose edge is
   * below the gate carry `ticket: null` and `signedTicket: null`.
   */
  readonly signedCalls?: readonly SignedCall[];
}

// --------------------------------------------------------------------------- //
// Call-row construction
// --------------------------------------------------------------------------- //

/**
 * Canonical id for a team's personnel-group call row. Single source of truth
 * for the `${team}-personnel` format: buildPersonnelCalls mints ids here and
 * the injury-advance invalidator resolves them here. Nothing parses the id
 * back into a team name, so a team whose name contains "-personnel" or a regex
 * metacharacter cannot be mis-read.
 */
export function personnelCallId(team: string): string {
  return `${team}-personnel`;
}

/**
 * Build one personnel-group call row per team from its sealed target rooms.
 *
 * The id is `personnelCallId(team)`, which is the key a caller uses to supply a
 * market quote for that team's personnel grouping. Per-player prop rows are a
 * downstream concern (they need prop markets and player-level projections this
 * module does not hold), so they are not fabricated here.
 */
export function buildPersonnelCalls(games: readonly WeeklyGameInput[]): Call[] {
  const calls: Call[] = [];
  for (const game of games) {
    const sides: ReadonlyArray<readonly [string, TuesdayTargetRooms["homeTargets"]]> = [
      [game.homeTeam, game.rooms.homeTargets],
      [game.awayTeam, game.rooms.awayTargets],
    ];
    for (const [team, targets] of sides) {
      if (targets.length === 0) continue;
      const totalShare = targets.reduce((sum, target) => sum + target.baseShare, 0);
      calls.push({
        id: personnelCallId(team),
        install: `${team} personnel group: ${targets.length} targets, ${(totalShare * 100).toFixed(1)}% base share`,
        expectation: null,
        alert: `${team} target distribution`,
        willNot: "",
      });
    }
  }
  return calls;
}

// --------------------------------------------------------------------------- //
// Tuesday seal
// --------------------------------------------------------------------------- //

/**
 * Seal the Tuesday 04:00 CT baseline for every game on the card, then price
 * call-sheet tickets when market quotes are supplied.
 *
 * The coach projection is produced before any market number is read. When
 * `marketQuotes` is present, the returned lock also carries priced call rows;
 * when absent, no call rows are fabricated.
 */
export function generateTuesdayMasterLock(
  input: GenerateTuesdayMasterLockInput,
): TuesdayMasterLock {
  const games: WeeklyGameLock[] = input.games.map((game) => {
    const coachLock = lockTuesdayCoachBaseline(
      {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        week: game.week,
        coachSupport: game.coachSupport,
        neutralPassRate: game.neutralPassRate,
        staffAggression: game.staffAggression,
        staffAggressionAway: game.staffAggressionAway,
        fourthDownDecisions: game.fourthDownDecisions,
      },
      game.rooms,
      input.lockedAtIso,
    );
    return { gameId: game.gameId, coachLock };
  });

  const sealed: TuesdayMasterLock = {
    version: "v1.0",
    season: input.season,
    week: input.week,
    lockedAtIso: input.lockedAtIso,
    games,
  };

  if (input.marketQuotes === undefined) return sealed;

  const signedCalls = signCallSheetTickets(
    buildPersonnelCalls(input.games),
    input.marketQuotes,
    input.minEdgePct ?? 2.0,
  );
  return { ...sealed, signedCalls };
}

// --------------------------------------------------------------------------- //
// Mid-week injury advance
// --------------------------------------------------------------------------- //

/**
 * Advance a sealed lock through an injury update.
 *
 * Order of operations matters:
 *   1. Re-verify each game's seal *before* touching it. If tau or the frozen
 *      coach input no longer hashes to the sealed `coachMindsetHash`, refuse.
 *   2. Apply the overlay through `applyInjuryOverlay`, which runs its own tau
 *      seal assertion and hash recomputation and throws on any movement.
 *
 * Games with no injury entry are carried through unchanged. The returned lock
 * keeps the original `coachMindsetHash` and `coachTau` for every game.
 *
 * Ticket invalidation. A signed ticket is a priced claim computed from the
 * projection as it stood when the quote was read. An injury overlay moves the
 * projection (margin, total, win probability), so any ticket minted for an
 * affected game is stale and must not survive the advance — carrying it
 * forward would advertise an edge computed from superseded availability. This
 * function drops `signedCalls` whose team belongs to an advanced game and
 * leaves unaffected games' tickets intact. Re-price via `priceSealedLock`
 * against fresh quotes. tau and the mindset hash are never touched here.
 */
export function advanceWeeklyLockWithInjuries(
  lock: TuesdayMasterLock,
  advance: AdvanceInjuryInput,
): TuesdayMasterLock {
  const games: WeeklyGameLock[] = lock.games.map((game) => {
    const { coachLock } = game;

    // SEAL GUARD: the frozen coach input plus the carried tau must reproduce
    // the sealed mindset hash. A mismatch means the tau or the input was
    // mutated after the v1.0 seal; refuse before applying anything.
    const recomputed = computeCoachMindsetSha256(
      coachLock.frozenCoachInput,
      coachLock.coachTau,
    );
    if (recomputed !== coachLock.coachMindsetHash) {
      throw new Error(
        `sealed coach tau/mindset mutated for game ${game.gameId}: refusing to advance`,
      );
    }

    const injury = advance.byGameId[game.gameId];
    if (injury === undefined) return game;

    const overlay: CadenceInjuryOverlayInput = {
      version: advance.version,
      recordedAtIso: advance.recordedAtIso,
      inactivePlayerIds: injury.inactivePlayerIds,
      homeInjuryPointsDelta: injury.homeInjuryPointsDelta,
      awayInjuryPointsDelta: injury.awayInjuryPointsDelta,
    };
    return { gameId: game.gameId, coachLock: applyInjuryOverlay(coachLock, overlay) };
  });

  // Invalidate tickets for advanced games. A ticket is a priced claim against
  // the projection at quote time; the overlay just moved that projection. Only
  // drop rows whose team belongs to an advanced game — unaffected games keep
  // their tickets. Ids are minted by personnelCallId(), so the comparison is an
  // exact string match against the canonical id rather than a regex parse of
  // the row's id back into a team name.
  const affectedCallIds = new Set<string>();
  for (const game of lock.games) {
    if (advance.byGameId[game.gameId] === undefined) continue;
    affectedCallIds.add(personnelCallId(game.coachLock.frozenCoachInput.homeTeam));
    affectedCallIds.add(personnelCallId(game.coachLock.frozenCoachInput.awayTeam));
  }
  const signedCalls =
    lock.signedCalls === undefined
      ? undefined
      : lock.signedCalls.filter((call) => !affectedCallIds.has(call.id));

  return {
    ...lock,
    version: advance.version,
    lockedAtIso: advance.recordedAtIso,
    games,
    signedCalls,
  };
}

// --------------------------------------------------------------------------- //
// Convenience: seal-and-price in one call
// --------------------------------------------------------------------------- //

/**
 * Price an already-sealed master lock's call rows against fresh market quotes
 * without re-sealing the coach baseline. Useful when the Tuesday lock was
 * produced without a market view and quotes arrive later in the day.
 */
export function priceSealedLock(
  lock: TuesdayMasterLock,
  games: readonly WeeklyGameInput[],
  marketQuotes: MarketQuotesByCallId,
  minEdgePct = 2.0,
): TuesdayMasterLock {
  const signedCalls = signCallSheetTickets(
    buildPersonnelCalls(games),
    marketQuotes,
    minEdgePct,
  );
  return { ...lock, signedCalls };
}
