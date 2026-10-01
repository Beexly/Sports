/**
 * The engine's OWN pick, in the pick generator.
 *
 * THE GAP THIS CLOSES
 * `process-sport.ts` is the pick generator. Measured on origin/main
 * 13f84dcee: the code path reaching `db.pick.create` calls
 * `buildIndependentFairValues` and a confidence heuristic, and contains ZERO
 * calls to the reasoning engine. The engine read picks AFTER they were written
 * and had never influenced one. `composeLedger` itself had no production caller
 * outside its own test. This is that caller.
 *
 * WHY THE COMPOSITION IS HERE AND THE REASONING IS NOT
 * The reasoning spine lives in `apps/web/lib/intelligence-core`, and the
 * dependency between the two packages runs the other way: `apps/web` imports
 * `@sports/ingestion-pipeline`, so the pipeline cannot import the spine. So the
 * split is:
 *
 *  - THIS MODULE: read the persisted ledger rows, compose each side with the
 *    production composer, and hand the composed result to a `reasoner` the
 *    CALLER supplies. The composer is imported directly and is the real one.
 *  - `apps/web/lib/intelligence-core/engine-derived-pick.ts`: run the real
 *    spine and the real recommender over what this module composed.
 *
 * A caller with no `reasoner` gets a null pick rather than a fabricated one.
 * That is the only correct degradation: a pick assembled without the engine's
 * own reasoning is not an engine pick.
 *
 * THE MARKET IS A COMPARISON INPUT ONLY
 * `marketFairProb` is passed through to be compared against. It is never
 * averaged into the engine's own probability anywhere in this module, so there
 * is no path by which a market move can flip the engine's side. The
 * do-not-beat-the-book doctrine is held structurally, not by convention.
 *
 * WHAT IT IS NOT
 * This never publishes. It returns a value; the caller records it beside the
 * legacy pick in `shadow_signals` (see engine-shadow-pick.ts). The legacy pick
 * is what publishes, until a human compares them on settled games.
 *
 * DETERMINISM
 * `now` is REQUIRED and injected, never defaulted. `composeLedger` reads the
 * wall clock when `now` is omitted, which would make the recorded probability
 * depend on when the cron happened to run. Two runs over the same rows must
 * produce byte-identical output or the shadow ledger cannot be scored.
 *
 * LEAKAGE
 * Rows are read strictly lagged by the loader, matching every other lagged
 * surface in the platform: a stat describing a game that has not been played is
 * not information a pre-game pick may use.
 */

import { composeLedger, type LedgerSignalRow } from "@sports/prediction-engine";

/** One persisted `signals` row, as this module needs it. */
export interface LedgerRow {
  readonly entityId: string;
  readonly key: string;
  /** Already on the shared normalized scale. Never re-normalized here. */
  readonly value: number;
  readonly weight: number;
  readonly confidence: number;
  readonly capturedAt: Date | string;
}

export type EnginePickType = "SPREAD" | "TOTAL" | "MONEYLINE";

/** What the engine concluded. NO_BET is a conclusion, not a failure. */
export type EngineVerdict = "PICK" | "NO_BET";

/** What the spine says about whether it will stand behind a call. */
export type EnginePublishState = "SHADOW" | "WITHHOLD" | "CANDIDATE";

/** A side's composed ledger reading, as the reasoner receives it. */
export interface ComposedSide {
  readonly score: number;
  readonly signalsUsed: number;
  readonly topKeys: readonly string[];
}

/**
 * The engine's own pick.
 *
 * `selection` is null on a NO_BET, and `verdict` is the discriminator. A NO_BET
 * still carries a real `homeWinProb` and a real `publishState`, so a caller that
 * checks the verdict can always see WHY there was no call. That is deliberate,
 * and it is why the verdict is a literal field rather than something inferred
 * from a null score.
 */
export interface EnginePick {
  readonly gameId: string;
  readonly pickType: EnginePickType;
  readonly verdict: EngineVerdict;
  /** The engine's call, e.g. "BUF -3.5". Null exactly on NO_BET. */
  readonly selection: string | null;
  /** +1 home, -1 away, 0 for no bet. */
  readonly side: 1 | -1 | 0;
  /** The engine's own home probability, whatever it decided. */
  readonly homeWinProb: number;
  /** De-vigged market home probability. Comparison only. */
  readonly marketFairProb: number | null;
  /** Engine minus market, signed to the side. Null when the market is unusable. */
  readonly edge: number | null;
  readonly publishState: EnginePublishState;
  readonly withholdReasons: readonly string[];
  /** Present exactly on NO_BET. */
  readonly noBetReason: string | null;
  readonly homeLedgerScore: number;
  readonly awayLedgerScore: number;
  readonly homeSignalsUsed: number;
  readonly awaySignalsUsed: number;
  readonly homeTopKeys: readonly string[];
  readonly awayTopKeys: readonly string[];
  /**
   * False when the ledger actually moved the composition, true when it read
   * clean but contributed nothing weighted. Distinguishes "the engine weighed
   * the ledger and it was neutral" from "the engine had no signal", which the
   * arbiter scores very differently.
   */
  readonly ledgerSilent: boolean;
  /** One line: what moved the number. No em dash. */
  readonly basis: string;
}

export interface EngineReasonerInput {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly pickType: EnginePickType;
  readonly line: number;
  readonly marketFairProb: number | null;
  /** ISO instant. Injected so the run is replayable. */
  readonly now: string;
  readonly modelVersion: string;
  readonly sportKey: string | null;
  /** Composed per side, so the reasoner never composes a second time. */
  readonly home: ComposedSide;
  readonly away: ComposedSide;
}

export interface EngineReasonerResult {
  readonly homeWinProb: number;
  readonly verdict: EngineVerdict;
  readonly selection: string | null;
  readonly side: 1 | -1 | 0;
  readonly edge: number | null;
  readonly publishState: EnginePublishState;
  readonly withholdReasons: readonly string[];
  readonly noBetReason: string | null;
  readonly basis: string;
}

/** The app-layer half: runs the real spine and the real recommender. */
export type EngineReasoner = (input: EngineReasonerInput) => EngineReasonerResult | null;

export interface EnginePickInput {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly pickType: EnginePickType;
  readonly line: number;
  readonly marketFairProb: number | null;
  readonly homeLedger: readonly LedgerRow[];
  readonly awayLedger: readonly LedgerRow[];
  /** ISO instant. REQUIRED: an omitted value would read the wall clock. */
  readonly now: string;
  readonly halfLifeDays?: number;
  readonly modelVersion: string;
  readonly sportKey?: string | null;
  /**
   * Runs the real spine. Omitted means this host cannot reason, and the answer
   * is a null pick rather than a number invented here.
   */
  readonly reasoner?: EngineReasoner;
}

/** Rows blended per side. Bounds the blend, not the DB read. */
const MAX_LEDGER_ROWS_PER_SIDE = 400;

function toComposerRow(r: LedgerRow): LedgerSignalRow {
  return {
    key: r.key,
    value: r.value,
    weight: r.weight,
    confidence: r.confidence,
    capturedAt:
      typeof r.capturedAt === "string" ? r.capturedAt : r.capturedAt.toISOString(),
  };
}

function composeSide(
  rows: readonly LedgerRow[],
  now: string,
  halfLifeDays: number | undefined,
): ComposedSide {
  if (rows.length === 0) return { score: 0, signalsUsed: 0, topKeys: [] };
  const composed = composeLedger(
    rows.slice(0, MAX_LEDGER_ROWS_PER_SIDE).map(toComposerRow),
    { now, ...(halfLifeDays != null ? { halfLifeDays } : {}) },
  );
  return {
    score: composed.score,
    signalsUsed: composed.signalsUsed,
    topKeys: composed.contributions.slice(0, 3).map((c) => c.key),
  };
}

/**
 * Compose the ledger for each side, then let the caller's spine decide.
 *
 * Returns null when the inputs cannot support a call at all: no `reasoner` on
 * this host, a non-finite line, a reasoner that declined, or a ledger with no
 * weighted row on either side. The last of those matters most. "The engine had
 * nothing to say" is NOT "the engine agrees with the legacy pick", and a
 * comparison record that cannot tell those apart is worth nothing.
 */
export function deriveEnginePick(input: EnginePickInput): EnginePick | null {
  if (input.reasoner === undefined) return null;
  if (!Number.isFinite(input.line)) return null;

  const home = composeSide(input.homeLedger, input.now, input.halfLifeDays);
  const away = composeSide(input.awayLedger, input.now, input.halfLifeDays);
  if (home.signalsUsed === 0 && away.signalsUsed === 0) return null;

  const reasoned = input.reasoner({
    gameId: input.gameId,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    pickType: input.pickType,
    line: input.line,
    marketFairProb: input.marketFairProb,
    now: input.now,
    modelVersion: input.modelVersion,
    sportKey: input.sportKey ?? null,
    home,
    away,
  });
  if (reasoned === null) return null;

  const basis =
    `${reasoned.basis}; composed ${home.signalsUsed} weighted home and ` +
    `${away.signalsUsed} weighted away ledger rows`;

  return {
    gameId: input.gameId,
    pickType: input.pickType,
    verdict: reasoned.verdict,
    selection: reasoned.selection,
    side: reasoned.side,
    homeWinProb: reasoned.homeWinProb,
    marketFairProb: input.marketFairProb,
    edge: reasoned.edge,
    publishState: reasoned.publishState,
    withholdReasons: reasoned.withholdReasons,
    noBetReason: reasoned.noBetReason,
    homeLedgerScore: home.score,
    awayLedgerScore: away.score,
    homeSignalsUsed: home.signalsUsed,
    awaySignalsUsed: away.signalsUsed,
    homeTopKeys: home.topKeys,
    awayTopKeys: away.topKeys,
    ledgerSilent: home.signalsUsed === 0 && away.signalsUsed === 0,
    basis,
  };
}
