/**
 * Persist the engine's own pick beside the legacy pick, and arbitrate between
 * them WITHOUT ever changing what publishes.
 *
 * THE CONTRACT (founder-ordered, 2026-10-01)
 *  1. SHADOW FIRST. The engine derives a pick; the legacy lane still publishes.
 *     Both are recorded. Which one publishes is unchanged by this module.
 *  2. A disagreement goes to an independent arbiter. That adapter is being built
 *     in another lane, so it is imported LAZILY and DEFENSIVELY: absent module,
 *     module that throws, module that returns nonsense, and module that hangs
 *     are all handled, and in every case the answer is the legacy pick.
 *  3. Arbitration failure must NEVER change a published pick. An arbiter outage
 *     degrades to "we compared and kept the legacy pick", which is exactly what
 *     happens today with no arbiter at all.
 *  4. Both picks and the arbitration outcome are persisted, so the arbiter's own
 *     accuracy becomes measurable later. Recording only the winner would make
 *     every disagreement unscoreable.
 *
 * WHERE IT PERSISTS, AND WHY NOT `gate_decisions`
 * `shadow_signals` (model ShadowSignal). Its own schema comment says "NOT
 * picks: nothing here is published, priced, or shown to a user ... the single
 * source of truth for offline evaluation ... before any traffic is ever routed
 * to it". That is precisely this module's job.
 *
 * `gate_decisions` was rejected after reading all three of its readers:
 * `lib/board/passes.ts` filters `status: "GATED"`, and `lib/board/state.ts`
 * maps any non-PUBLISHED status onto a CUSTOMER-FACING lane (SCORING_NOW), and
 * `lib/engine/load-engine-story.ts` counts every row into a published/declined
 * tally. A shadow row written there would have appeared to a subscriber as "we
 * passed on this" and would have corrupted the engine's own gate statistics.
 *
 * WRITE-ONCE DISCIPLINE
 * The upsert keys on (gameId, modelVersion) and carries the engine version in
 * `modelVersion`, so the engine's record can never overwrite the existing shadow
 * lane's rows for the same fixture, and a re-run updates rather than appends
 * (a repeated observation would overweight whatever got re-scored). Both picks
 * and the verdict ride in `modelProbs`, which is the column already reserved for
 * the raw per-model values behind the blended probability and which nothing else
 * reads.
 *
 * READ-ONLY WITH RESPECT TO PICKS
 * This module never writes `picks`, never flips `isPublished`, and never touches
 * `MODEL_VERSION`. It cannot change what a customer sees.
 */

import { db } from "@sports/db";
import type { EnginePick, EnginePickType } from "./engine-pick.js";

/** What the legacy lane chose. Recorded so the two can be compared. */
export interface LegacyPickSummary {
  readonly selection: string;
  readonly line: number;
  readonly pickType: EnginePickType;
  /** The published confidence, 0-100. */
  readonly confidence: number;
  readonly pickId: string;
}

export type ArbitrationVerdict =
  | "AGREE"
  | "ENGINE_PREFERRED"
  | "LEGACY_PREFERRED"
  | "ARBITER_UNAVAILABLE"
  | "ARBITER_FAILED";

export interface ArbitrationOutcome {
  readonly verdict: ArbitrationVerdict;
  /** The arbiter's own words, when it produced any. Null otherwise. */
  readonly rationale: string | null;
  /**
   * The pick that would have published had the shadow been promoted. ALWAYS the
   * legacy pick, and it is a field rather than a local so a future promotion
   * path has to read the recorded decision instead of recomputing one.
   */
  readonly publishedWinner: "LEGACY";
  /** True when the arbiter module was missing, threw, or returned junk. */
  readonly arbitrationFailed: boolean;
}

export interface EngineShadowRecord {
  readonly gameId: string;
  /** Distinguishes the engine lane from the existing shadow lane's rows. */
  readonly modelVersion: string;
  readonly engine: EnginePick | null;
  readonly legacy: LegacyPickSummary;
  readonly arbitration: ArbitrationOutcome;
  readonly recordedAt: string;
}

/** The shape `resolvePickDisagreement` must return to be usable. */
export interface ArbiterResult {
  readonly preferred?: unknown;
  readonly rationale?: unknown;
}

/**
 * The arbiter is resolved through an injectable loader rather than a static
 * import for two reasons: the module does not exist yet (another lane owns it),
 * and a static import would make this file fail to load at all if it never
 * arrives, taking the whole pick generator with it. A test can inject a
 * throwing loader and prove the pick still publishes.
 */
export type ArbiterLoader = () => Promise<unknown>;

let arbiterLoader: ArbiterLoader | null = null;

/**
 * The module this lane will try to load for the arbiter.
 *
 * Named rather than inline so the barrel export and the loader cannot drift,
 * and so whoever builds the arbiter can see from here what name to export.
 */
export const DEFAULT_ARBITER_MODULE = "@/lib/picks/resolve-pick-disagreement";

/** Default: look for the arbiter module, and treat absence as normal. */
const defaultArbiterLoader: ArbiterLoader = async () =>
  import(/* @vite-ignore */ DEFAULT_ARBITER_MODULE);

/** Test seam: install a loader, or pass null to restore the default. */
export function __setArbiterLoader(loader: ArbiterLoader | null): void {
  arbiterLoader = loader;
}

function arbiterFn(mod: unknown): ((a: unknown, b: unknown, c: unknown) => unknown) | null {
  if (mod == null || typeof mod !== "object") return null;
  const candidate = (mod as { resolvePickDisagreement?: unknown }).resolvePickDisagreement;
  return typeof candidate === "function"
    ? (candidate as (a: unknown, b: unknown, c: unknown) => unknown)
    : null;
}

/**
 * Ask the arbiter which pick it prefers. NEVER throws.
 *
 * Every failure mode resolves to the same place: keep the legacy pick. The
 * distinction between UNAVAILABLE (no module) and FAILED (module threw) is kept
 * because they mean different things to whoever reads the ledger later, and
 * collapsing them would hide an outage.
 */
export async function arbitrate(
  engine: EnginePick,
  legacy: LegacyPickSummary,
  context: unknown,
): Promise<ArbitrationOutcome> {
  const fail = (verdict: "ARBITER_UNAVAILABLE" | "ARBITER_FAILED", rationale: string) => ({
    verdict,
    rationale,
    publishedWinner: "LEGACY" as const,
    arbitrationFailed: true,
  });

  const load = arbiterLoader ?? defaultArbiterLoader;
  let mod: unknown;
  try {
    mod = await load();
  } catch (err) {
    return fail(
      "ARBITER_UNAVAILABLE",
      `arbiter module not loadable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const resolve = arbiterFn(mod);
  if (resolve === null) {
    return fail("ARBITER_UNAVAILABLE", "arbiter module present but exports no resolvePickDisagreement");
  }

  let raw: unknown;
  try {
    raw = await resolve(engine, legacy, context);
  } catch (err) {
    return fail("ARBITER_FAILED", `arbiter threw: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (raw == null || typeof raw !== "object") {
    return fail("ARBITER_FAILED", "arbiter returned a non-object result");
  }
  const result = raw as ArbiterResult;
  const rationale = typeof result.rationale === "string" ? result.rationale : null;

  // The arbiter's preference is RECORDED, never obeyed. A malformed preference
  // is still recorded as the legacy pick, because a disagreement we could not
  // read is not a disagreement we resolved.
  const preference = result.preferred;
  if (preference === "ENGINE" || preference === "engine") {
    return {
      verdict: "ENGINE_PREFERRED",
      rationale,
      publishedWinner: "LEGACY",
      arbitrationFailed: false,
    };
  }
  if (preference === "LEGACY" || preference === "legacy") {
    return {
      verdict: "LEGACY_PREFERRED",
      rationale,
      publishedWinner: "LEGACY",
      arbitrationFailed: false,
    };
  }
  if (
    engine.selection === legacy.selection &&
    engine.pickType === legacy.pickType
  ) {
    return {
      verdict: "AGREE",
      rationale,
      publishedWinner: "LEGACY",
      arbitrationFailed: false,
    };
  }
  return {
    verdict: "ARBITER_FAILED",
    rationale: rationale ?? "arbiter returned an unrecognized preference",
    publishedWinner: "LEGACY",
    arbitrationFailed: true,
  };
}

/**
 * The payload written to `modelProbs`. Carries BOTH picks and the verdict, so
 * the arbiter can be scored offline against settled outcomes without re-running
 * it and without reading anything the customer ever saw.
 */
function shadowPayload(record: EngineShadowRecord): Record<string, unknown> {
  const { engine, legacy, arbitration } = record;
  return {
    lane: "engine-derived-pick",
    recordedAt: record.recordedAt,
    legacy: {
      pickId: legacy.pickId,
      selection: legacy.selection,
      line: legacy.line,
      pickType: legacy.pickType,
      confidence: legacy.confidence,
    },
    engine: engine
      ? {
          selection: engine.selection,
          pickType: engine.pickType,
          homeWinProb: engine.homeWinProb,
          marketFairProb: engine.marketFairProb,
          // Signed to the SIDE the engine took. Sourced from `EnginePick.edge`,
          // the field that actually holds it; the previous `engine.edgeVsMarket`
          // read a name that does not exist and recorded `undefined` here.
          edgeVsMarket: engine.edge,
          homeLedgerScore: engine.homeLedgerScore,
          awayLedgerScore: engine.awayLedgerScore,
          homeSignalsUsed: engine.homeSignalsUsed,
          awaySignalsUsed: engine.awaySignalsUsed,
          homeTopKeys: [...engine.homeTopKeys],
          awayTopKeys: [...engine.awayTopKeys],
          ledgerSilent: engine.ledgerSilent,
          basis: engine.basis,
        }
      : null,
    arbitration: {
      verdict: arbitration.verdict,
      rationale: arbitration.rationale,
      publishedWinner: arbitration.publishedWinner,
      arbitrationFailed: arbitration.arbitrationFailed,
    },
  };
}

export interface RecordEngineShadowOptions {
  readonly record: EngineShadowRecord;
  /** Injectable for tests; defaults to the real Prisma client. */
  readonly db?: Pick<typeof db, "shadowSignal">;
}

/**
 * Write the engine pick, the legacy pick and the verdict. Fails open.
 *
 * Returns true when a row was written. A DB error returns false and is logged:
 * the shadow ledger is evaluation data, and losing it must never cost a pick.
 */
export async function recordEngineShadowPick(
  options: RecordEngineShadowOptions,
): Promise<boolean> {
  const { record } = options;
  const client = options.db ?? db;
  const payload = shadowPayload(record);

  // The engine lane writes its OWN probability into `shadowProb` (the column is
  // "the shadow engine's home-win probability") and the market anchor into
  // `marketProb`, which is the pair the existing offline scorer already reads.
  // With no engine pick there is nothing to record and no honest number to put
  // in a Float column, so the row is skipped rather than faked.
  if (record.engine === null) return false;

  const data = {
    shadowProb: record.engine.homeWinProb,
    marketProb: record.engine.marketFairProb ?? record.engine.homeWinProb,
    liveConfidence: record.legacy.confidence,
    modelProbs: payload as unknown as object,
  };

  try {
    await client.shadowSignal.upsert({
      where: {
        gameId_modelVersion: {
          gameId: record.gameId,
          modelVersion: record.modelVersion,
        },
      },
      create: {
        gameId: record.gameId,
        modelVersion: record.modelVersion,
        ...data,
      },
      update: data,
    });
    return true;
  } catch (err) {
    console.warn(
      "[engine-shadow-pick] shadow record failed for game " +
        `${record.gameId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}
