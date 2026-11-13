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
