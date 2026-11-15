/**
 * Publication gate — fail-closed.
 *
 * Today a pick is public unless code explicitly says otherwise: `createPickData`
 * omits `isPublished` and `schema.prisma` defaults it to `true`. Four paths can
 * therefore publish without consulting any engine gate (the refresh-odds cron,
 * the founder-picks admin route, two raw-SQL Python scripts, and a backfill).
 * That is how 14 un-gated Week 10 picks reached the public board.
 *
 * This module inverts the default. A pick is unpublished unless every one of
 * these is true:
 *
 *   1. PUBLIC_PICKS_ENABLED is exactly "true" in the environment.
 *   2. A sealed pregame verdict exists for this game.
 *   3. That verdict is not MISSING_DATA, PASS or NO_BET.
 *   4. The walk-forward emission gate has passed.
 *
 * Condition 4 is false today (the gate reads `passed: false`), so this module
 * returns `allowed: false` for every pick. That is the intended behaviour: the
 * wiring makes runs possible, it does not open publication.
 */

export type SealedVerdict = "MISSING_DATA" | "PASS" | "NO_BET" | "SHADOW";

export interface SealedVerdictRef {
  readonly verdict: SealedVerdict;
  /** SHA-256 of the sealed bundle + outputs. */
  readonly hash: string;
  readonly sealedAt: string;
}

export interface PublicationInput {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly sealedVerdict?: SealedVerdictRef | null;
  readonly emissionGatePassed?: boolean;
}

export interface PublicationDecision {
  readonly allowed: boolean;
  readonly reason: string;
  readonly blockedBy: readonly string[];
}

const PUBLISHABLE_VERDICTS: ReadonlySet<SealedVerdict> = new Set<SealedVerdict>(["SHADOW"]);

/**
 * Decide whether a pick may be created published. Defaults to false on every
 * axis, including when the caller passes nothing at all.
 */
export function evaluatePublication(input: PublicationInput = {}): PublicationDecision {
  const env = input.env ?? process.env;
  const blockedBy: string[] = [];

  if (env.PUBLIC_PICKS_ENABLED !== "true") {
    blockedBy.push("PUBLIC_PICKS_ENABLED is not \"true\"");
  }

  const sealed = input.sealedVerdict ?? null;
  if (sealed === null) {
    blockedBy.push("no sealed pregame verdict for this game");
  } else {
    if (!PUBLISHABLE_VERDICTS.has(sealed.verdict)) {
      blockedBy.push(`sealed verdict is ${sealed.verdict}`);
    }
    if (typeof sealed.hash !== "string" || !/^[0-9a-f]{64}$/.test(sealed.hash)) {
      blockedBy.push("sealed verdict has no valid manifest hash");
    }
  }

  if (input.emissionGatePassed !== true) {
    blockedBy.push("walk-forward emission gate has not passed");
  }

  if (blockedBy.length > 0) {
    return {
      allowed: false,
      reason: `publication blocked: ${blockedBy.join("; ")}`,
      blockedBy,
    };
  }
  return { allowed: true, reason: "publication allowed", blockedBy: [] };
}

/** Convenience: the boolean a pick-creation call site needs. */
export function publicationAllowed(input: PublicationInput = {}): boolean {
  return evaluatePublication(input).allowed;
}

/**
 * WP-0 hard write gate (owner directive 2026-11-13).
 *
 * No INSERT/UPDATE may set isPublished=TRUE on a FUTURE-game pick unless its
 * factorBreakdown carries a fiveStageReceipt with schemaVersion
 * '2026-11-13-v1' AND the pick was generated at/after the freshness of the
 * game data it claims to use. This is the row-level companion to the
 * env/verdict gate above: even with PUBLIC_PICKS_ENABLED open and a sealed
 * verdict, an un-receipted future pick stays dark.
 *
 * Q3a exemption: past games (commenceTime <= now) are the historical record —
 * the gate never blocks them, so settlement history can never be unpublished
 * by this rule. An UNKNOWN kickoff fails closed (we cannot prove the
 * exemption).
 */
export const FIVE_STAGE_RECEIPT_SCHEMA_VERSION = "2026-11-13-v1";

export interface FuturePickPublishInput {
  /** pick.factorBreakdown (jsonb) — must carry fiveStageReceipt. */
  readonly factorBreakdown?: unknown;
  /** When the pick row is minted (creation uses the DB now() default). */
  readonly generatedAt?: Date | string | null;
  /** Freshness of the game data the pick was generated from. */
  readonly gameDataFreshnessAt?: Date | string | null;
  /** Scheduled kickoff of the pick's game. */
  readonly gameCommenceTime?: Date | string | null;
  readonly now?: Date;
}

function toEpochMs(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function evaluateFuturePickPublication(input: FuturePickPublishInput): PublicationDecision {
  const nowMs = (input.now ?? new Date()).getTime();
  const kickoffMs = toEpochMs(input.gameCommenceTime);
  if (kickoffMs !== null && kickoffMs <= nowMs) {
    return { allowed: true, reason: "past game — historical record exempt (Q3a)", blockedBy: [] };
  }

  const blockedBy: string[] = [];
  if (kickoffMs === null) {
    blockedBy.push("game commenceTime unknown — cannot prove historical exemption");
  }

  const fb = input.factorBreakdown;
  const receipt =
    fb !== null && typeof fb === "object"
      ? ((fb as Record<string, unknown>).fiveStageReceipt as Record<string, unknown> | undefined)
      : undefined;
  if (
    receipt === null ||
    typeof receipt !== "object" ||
    receipt.schemaVersion !== FIVE_STAGE_RECEIPT_SCHEMA_VERSION
  ) {
    blockedBy.push(`fiveStageReceipt.schemaVersion must be ${FIVE_STAGE_RECEIPT_SCHEMA_VERSION}`);
  }

  const generatedMs = toEpochMs(input.generatedAt);
  const freshnessMs = toEpochMs(input.gameDataFreshnessAt);
  if (generatedMs === null || freshnessMs === null) {
    blockedBy.push("generatedAt and gameDataFreshnessAt are both required");
  } else if (generatedMs < freshnessMs) {
    blockedBy.push("generatedAt < gameDataFreshnessAt — pick predates its own data");
  }

  if (blockedBy.length > 0) {
    return {
      allowed: false,
      reason: `future pick publication blocked: ${blockedBy.join("; ")}`,
      blockedBy,
    };
  }
  return { allowed: true, reason: "future pick publication allowed", blockedBy: [] };
}

/** Convenience: the boolean a future-pick write site needs. */
export function futurePickPublishable(input: FuturePickPublishInput): boolean {
  return evaluateFuturePickPublication(input).allowed;
}
