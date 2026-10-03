/**
 * Verifiable publication coin — the exogenous randomness that CEPT Part II
 * (docs/research/cept/HONEST_CEPT.md §8, Theorem 9) requires, built so that a
 * third party can verify after the fact that the platform never peeked.
 *
 * WHY VERIFIABLE. Theorem 9's validity needs Z_t exogenous with KNOWN pi_t.
 * A product that grades itself has every incentive to fudge the coin, and a
 * skeptical reader should not have to trust us. So the coin is committed in
 * advance and auditable in arrears:
 *
 *   1. Before an epoch (calendar month) begins, the operator generates a
 *      32-byte secret seed and publishes COMMITMENT = SHA-256(seed || epoch)
 *      in the repository. Git timestamps the commitment.
 *   2. Each day's draw is u = HMAC-SHA256(seed, "publication-coin:v1:" + date)
 *      mapped to [0,1) from its first 8 bytes. Baseline slate is published
 *      when u < EPSILON_BASELINE; candidate otherwise. Nothing about the day's
 *      games, lines, or forecasts enters the HMAC, so the draw is independent
 *      of outcomes by construction.
 *   3. After the epoch ends, the seed is revealed. Anyone recomputes the
 *      commitment and every daily draw and checks them against the published
 *      record. A platform that altered even one day's arm is caught.
 *
 * The seed being known to the operator does NOT break exogeneity: validity
 * needs Z_t independent of the day's potential outcomes given history, which
 * a pre-committed function of the calendar date alone satisfies. What the
 * commitment scheme adds is that *observers* can verify this held.
 *
 * PARAMETERS ARE DECISIONS, NOT KNOBS (ADR-009): EPSILON_BASELINE = 0.15,
 * so pi_t = 0.85 constant. Changing either mid-epoch would invalidate the
 * epoch's audit trail; new values require a new epoch and a new ADR entry.
 */

import { createHash, createHmac } from "node:crypto";

/** Fraction of days the BASELINE (market-mirror) slate is published. */
export const EPSILON_BASELINE = 0.15;

/** pi_t = P(candidate published) — constant by ADR-009. */
export const CANDIDATE_PI = 1 - EPSILON_BASELINE;

const HMAC_CONTEXT = "publication-coin:v1:";
const SEED_HEX_LENGTH = 64; // 32 bytes
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EPOCH_PATTERN = /^\d{4}-\d{2}$/;

export interface PublicationDraw {
  /** ISO date the draw governs. */
  readonly date: string;
  /** Uniform draw in [0,1), deterministic in (seed, date). */
  readonly u: number;
  /** True iff the candidate slate is the one to publish (u >= epsilon). */
  readonly publishedCandidate: boolean;
  /** The known randomization probability for the e-process ledger. */
  readonly pi: number;
}

export interface EpochVerification {
  readonly ok: boolean;
  /** Empty when ok; otherwise every discrepancy found. */
  readonly problems: readonly string[];
}

/** SHA-256 commitment to publish BEFORE the epoch begins. */
export function commitSeed(seedHex: string, epoch: string): string {
  assertSeed(seedHex);
  if (!EPOCH_PATTERN.test(epoch)) {
    throw new RangeError(`epoch must look like YYYY-MM, got ${epoch}`);
  }
  return createHash("sha256")
    .update(Buffer.from(seedHex, "hex"))
    .update(epoch, "utf8")
    .digest("hex");
}

/** The day's draw. Depends on nothing but the committed seed and the date. */
export function drawPublicationCoin(
  seedHex: string,
  date: string
): PublicationDraw {
  assertSeed(seedHex);
  if (!DATE_PATTERN.test(date)) {
    throw new RangeError(`date must look like YYYY-MM-DD, got ${date}`);
  }
  const digest = createHmac("sha256", Buffer.from(seedHex, "hex"))
    .update(HMAC_CONTEXT + date, "utf8")
    .digest();
  // First 8 bytes as an unsigned big-endian integer over 2^64 -> [0,1).
  const u = Number(digest.readBigUInt64BE(0)) / 2 ** 64;
  return {
    date,
    u,
    publishedCandidate: u >= EPSILON_BASELINE,
    pi: CANDIDATE_PI,
  };
}

/**
 * Third-party audit of a finished epoch: the revealed seed must reproduce the
 * published commitment AND every recorded day's arm.
 */
export function verifyEpoch(
  seedHex: string,
  epoch: string,
  publishedCommitment: string,
  record: ReadonlyArray<{ readonly date: string; readonly publishedCandidate: boolean }>
): EpochVerification {
  const problems: string[] = [];
  const commitment = commitSeed(seedHex, epoch);
  if (commitment !== publishedCommitment) {
    problems.push(
      `commitment mismatch: revealed seed hashes to ${commitment}, published was ${publishedCommitment}`
    );
  }
  for (const day of record) {
    const draw = drawPublicationCoin(seedHex, day.date);
    if (draw.publishedCandidate !== day.publishedCandidate) {
      problems.push(
        `arm mismatch on ${day.date}: coin says ${draw.publishedCandidate ? "candidate" : "baseline"}, record says ${day.publishedCandidate ? "candidate" : "baseline"}`
      );
    }
  }
  return { ok: problems.length === 0, problems };
}

function assertSeed(seedHex: string): void {
  if (
    seedHex.length !== SEED_HEX_LENGTH ||
    !/^[0-9a-f]+$/.test(seedHex)
  ) {
    throw new RangeError(
      `seed must be ${SEED_HEX_LENGTH} lowercase hex chars (32 bytes)`
    );
  }
}
