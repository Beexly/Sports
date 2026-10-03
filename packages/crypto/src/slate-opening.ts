/**
 * Slate commitment OPENING — the pure, refuse-by-default planner (Phase 0.5b).
 *
 * Phase 0.5 shipped the commit side: every frozen slate mints a Pedersen
 * aggregate over its published edge scores and `/api/verify/slate` publishes the
 * hex. That hex, on its own, proves nothing to a customer. A commitment is only
 * evidence once someone can OPEN it — recompute C = [v]G + [r]H from a disclosed
 * (value, blinding) and check it equals the hex that was published before the
 * first kickoff. Until then it is a number no one has been shown how to check.
 *
 * This module decides WHETHER an opening may be disclosed. It is deliberately
 * DB-free and side-effect-free so the decision — which is the entire security
 * boundary — is testable without a database and reviewable in one screen.
 *
 * REFUSE IS THE DEFAULT. Every path that is not affirmatively safe returns
 * REFUSE with a stated reason. There is no throw: an unopenable slate is an
 * ordinary answer, not an exception.
 *
 * The three refusals, and why each is not optional:
 *
 *   1. NOT SETTLED — any covered pick is still PENDING. This is the boundary
 *      the whole layer exists for. Opening early reveals the slate's total
 *      claimed edge while its outcome is still live, which is exactly the
 *      information the pre-kickoff seal exists to withhold. A partially settled
 *      slate is NOT partially openable: the aggregate is one number over the
 *      whole population, so disclosing it discloses the unsettled part too.
 *
 *   2. NO OPENER — the columns are null. Slates frozen before Phase 0.5 have no
 *      aggregate at all. That is honest history, not corruption, and it must
 *      read as "this slate has nothing to open", never as a failure.
 *
 *   3. SELF-CHECK FAILED — the stored opener does not reproduce the stored hex.
 *      Refusing here is the least obvious and most important rule: publishing an
 *      opener that does not open would look precisely like a product that forged
 *      its own commitment. Whatever the cause (a bad migration, a truncated
 *      write, an operator edit), the honest response is to withhold and say the
 *      check failed — never to emit numbers that fail in the customer's hands.
 *
 * WHAT AN OPENING DOES NOT MEAN. It proves the published aggregate is the one
 * committed to before kickoff. It says nothing about whether the picks were
 * good, whether the edge was real, or whether the slate was profitable. It is a
 * binding check, not a performance claim.
 *
 * LANGUAGE. This is a classical Pedersen commitment over secp256k1: perfectly
 * hiding, computationally binding under DLOG. It is NOT zero-knowledge and NOT
 * post-quantum, and nothing here may be described as either.
 */

import { openCommitment } from "./pedersen-ledger.js";

/** Why an opening was refused. Stated, never inferred from an empty result. */
export type SlateOpeningRefusal =
  | "not_settled"
  | "no_opener"
  | "self_check_failed"
  | "malformed_opener"
  | "malformed_input";

export interface SlateOpeningInput {
  readonly slateKey: string;
  /** Published sealed aggregate (compressed hex), or null on a pre-0.5 slate. */
  readonly aggregateHex: string | null;
  /** Decimal-string bigint: the fixed-point encoded sum. Server-side secret. */
  readonly aggregateValue: string | null;
  /** Decimal-string bigint: the summed blinding r. Server-side secret. */
  readonly blindingSum: string | null;
  /**
   * Number of picks the commitment pre-registered (the frozen denominator).
   * Callers MUST source this from the commitment's own `count`, not from a live
   * re-query — the population is fixed at freeze and a later count could drift.
   */
  readonly coveredPickCount: number;
  /**
   * How many of those covered picks still have no terminal result. Callers MUST
   * compute this over EXACTLY the covered set (the receipts stamped with this
   * slateKey); counting a wider set would let an unrelated pending pick block a
   * settled slate, and a narrower one would open a live slate early.
   */
  readonly pendingPickCount: number;
}

/** The disclosed opening. Only ever produced when all three checks pass. */
export interface SlateOpening {
  readonly slateKey: string;
  readonly aggregateHex: string;
  /** Decimal-string bigint — safe to disclose ONLY alongside this plan's ALLOW. */
  readonly value: string;
  /** Decimal-string bigint — likewise. */
  readonly blindingSum: string;
}

export type SlateOpeningPlan =
  | { readonly action: "REVEAL"; readonly opening: SlateOpening }
  | { readonly action: "REFUSE"; readonly reason: SlateOpeningRefusal; readonly detail: string };

function refuse(reason: SlateOpeningRefusal, detail: string): SlateOpeningPlan {
  return { action: "REFUSE", reason, detail };
}

/**
 * Parse a decimal-string bigint. Returns null on anything else — including
 * empty string, whitespace, hex, exponent notation, and a leading "+" — because
 * the column contract is a plain decimal integer and a lenient parse here would
 * silently accept a value the commit path could never have written.
 */
function parseDecimalBigInt(raw: string): bigint | null {
  if (!/^-?\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

/**
 * Decide whether this slate's Pedersen aggregate may be opened.
 *
 * Total function: never throws, for any input. Returns REVEAL only when the
 * slate is fully settled, an opener exists, and that opener verifiably
 * reproduces the published hex.
 */
export function planSlateOpening(input: SlateOpeningInput): SlateOpeningPlan {
  const { slateKey, aggregateHex, aggregateValue, blindingSum } = input;
  const { coveredPickCount, pendingPickCount } = input;

  // Nonsensical counts are refused rather than coerced. A negative or
  // non-integer pending count means the caller's query is wrong, and guessing
  // which direction it is wrong in is how a live slate gets opened early.
  if (!Number.isInteger(coveredPickCount) || coveredPickCount < 0) {
    return refuse("malformed_input", `coveredPickCount must be a non-negative integer (got ${coveredPickCount})`);
  }
  if (!Number.isInteger(pendingPickCount) || pendingPickCount < 0) {
    return refuse("malformed_input", `pendingPickCount must be a non-negative integer (got ${pendingPickCount})`);
  }
  if (pendingPickCount > coveredPickCount) {
    return refuse(
      "malformed_input",
      `pendingPickCount (${pendingPickCount}) exceeds coveredPickCount (${coveredPickCount}) — the pending set is not a subset of the covered set`,
    );
  }

  // (1) Settlement. Checked BEFORE the opener is even parsed, so no code path
  // that touches the secret runs while the slate is still live.
  if (pendingPickCount > 0) {
    return refuse(
      "not_settled",
      `${pendingPickCount} of ${coveredPickCount} covered picks are still pending; the aggregate covers the whole slate, so no part of it may be opened yet`,
    );
  }

  // (2) Opener present. A pre-0.5 slate has nothing to open — history, not error.
  if (aggregateHex === null || aggregateValue === null || blindingSum === null) {
    return refuse(
      "no_opener",
      `slate ${slateKey} carries no Pedersen aggregate (frozen before Phase 0.5, or the mint failed open)`,
    );
  }

  const value = parseDecimalBigInt(aggregateValue);
  const blinding = parseDecimalBigInt(blindingSum);
  if (value === null || blinding === null) {
    return refuse(
      "malformed_opener",
      `slate ${slateKey} has a non-decimal opener column; refusing to disclose an opener that cannot be parsed`,
    );
  }

  // (2b) Mint-contract bound on the value. THIS IS A REAL CHECK, not a sanity
  // assert. Pedersen binding is only mod n: the commitment commit(v, r) is
  // reproduced by EVERY v + k·CURVE_ORDER, because the scalar multiply reduces
  // mod n. So without an upper bound, a corrupted opener column holding
  // `v + n` — a 78-digit number claiming an absurd total edge — passes the
  // self-check below and gets disclosed as a cryptographically confirmed total.
  // That is exactly the "corrupted opener" case the self_check_failed rationale
  // promises to withhold, slipping through the one gap where the check is blind.
  //
  // The mint side encodes each pick's edge as encodeFixedPoint(e, 0, 100), i.e.
  // a value in [0, 100 * SCALE], and sums over the covered picks. So the only
  // legitimate value is in [0, coveredPickCount * 100 * SCALE], which is < 2^60
  // for any real slate and far below n (~2^256). Anything above that band did
  // not come from the mint path — including every v + k·n alias — and is
  // withheld. (Found by adversarial review; verified: v + n REVEALed before
  // this bound, refused after.)
  const SCALE = 1_000_000n;
  const MAX_EDGE = 100n;
  const maxLegitimateValue = BigInt(coveredPickCount) * MAX_EDGE * SCALE;
  if (value < 0n || value > maxLegitimateValue) {
    return refuse(
      "malformed_opener",
      `slate ${slateKey}: opener value ${aggregateValue} is outside the mint-contract range [0, ${maxLegitimateValue}] for ${coveredPickCount} covered pick(s). A value this size cannot have come from the encoder; withholding rather than disclosing an alias that would still verify mod n.`,
    );
  }

  // (3) Self-check. Recompute the commitment and compare POINTS (openCommitment
  // decodes both sides, so a non-canonical but equivalent hex still opens).
  if (!openCommitment(aggregateHex, value, blinding)) {
    return refuse(
      "self_check_failed",
      `slate ${slateKey}: the stored opener does NOT reproduce the published aggregate. Withholding — disclosing it would fail in the customer's hands and read as a forged commitment.`,
    );
  }

  return {
    action: "REVEAL",
    opening: { slateKey, aggregateHex, value: aggregateValue, blindingSum },
  };
}
