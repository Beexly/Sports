/**
 * Glass Ledger — the append-only, hash-chained pick store (handoff §2 P2:
 * "append-only chain linkage + external anchor + open recompute.ts").
 *
 * `freeze-slate-commitments.ts` + `pick-proof-receipt.ts` already prove two
 * things: a pick's committed fields weren't edited after the fact (per-pick
 * content hash), and a slate's population wasn't curated after the fact (the
 * Merkle root over the whole day's receipts). This module extends that
 * doctrine one step further: instead of one root per slate, EVERY entry
 * (pick or settlement) links to the one before it via `prevHash`, forming a
 * single hash chain across the whole ledger's history. Tampering with any
 * past entry — not just swapping the published set, but rewriting a single
 * field of a single pick after the fact — breaks the chain at that entry and
 * every entry after it, and `verifyChain` names exactly where.
 *
 * PURE MODULE: no I/O, no DB, no Date.now(). The chain is an ordinary
 * immutable array (`LedgerChain`); `appendPick` / `appendSettlement` return a
 * NEW array with one more (frozen) entry — there is no update/delete path in
 * this API. Callers (a future ingestion-pipeline wiring, mirroring
 * freeze-slate-commitments.ts's own DB-adapter pattern) own persistence;
 * this module owns the chain math.
 *
 * Hashing is reused, not reinvented: `canonicalJson` + `sha256Hex` from
 * `./provenance.ts` (same @noble/hashes primitive as the rest of edge-lab
 * and packages/crypto's Pedersen ledger). `entryHash` for any entry is
 * `sha256Hex(canonicalJson(<all fields of the entry except entryHash itself>))`.
 *
 * THE PUBLISH-BEFORE-KICKOFF INVARIANT: a pick recorded after its own
 * kickoff can never enter the ledger. This is the same pre-registration
 * principle `planSlateCommitment` enforces at the slate level ("only
 * committed while the whole slate is still pre-result"), applied per pick:
 * `decisionAt` must strictly precede `kickoffAt`, checked both on append and
 * on every `verifyChain` replay (so a chain reconstructed from storage is
 * re-audited, not just trusted because it was once accepted).
 */

import { canonicalJson, sha256Hex, type Canonical } from "./provenance.js";

// ───────────────────────────── entry shapes ─────────────────────────────

export interface LedgerPickEntry {
  /** 0-based, strictly increasing across the WHOLE chain (picks + settlements share one counter). */
  readonly seq: number;
  /** 64-hex entryHash of the previous entry in the chain; GENESIS_HASH for seq 0. */
  readonly prevHash: string;
  readonly pickId: string;
  readonly sport: string;
  /** SPREAD | MONEYLINE | TOTAL | PROP */
  readonly market: string;
  readonly selection: string;
  /** Price at decision time, decimal odds (> 1). */
  readonly priceDecimal: number;
  readonly book: string;
  /** ISO UTC — MUST strictly precede kickoffAt (publish-before-kickoff invariant). */
  readonly decisionAt: string;
  /** ISO UTC. */
  readonly kickoffAt: string;
  readonly modelVersion: string;
  /** 64-hex — a provenance stamp's inputsHash/outputHash (feature snapshot binding). */
  readonly featureSnapshotHash: string;
  /** sha256 of canonical JSON of ALL fields above (excluding entryHash itself). */
  readonly entryHash: string;
}

export interface LedgerSettlement {
  readonly seq: number;
  readonly pickId: string;
  readonly settledAt: string;
  readonly outcome: "WIN" | "LOSS" | "PUSH" | "VOID";
  /** Devigged-close-derived price; null when no closing line was captured. */
  readonly closingPriceDecimal: number | null;
  /** Per-play CLV in basis points (see computeClvBps); null when no closing price. */
  readonly clvBps: number | null;
  readonly prevHash: string;
  /** Settlements chain in the SAME chain as picks — one seq/prevHash counter. */
  readonly entryHash: string;
}

export type LedgerEntry = LedgerPickEntry | LedgerSettlement;

/** The ledger itself: an ordinary immutable array. Append-only by API shape, not by convention. */
export type LedgerChain = readonly LedgerEntry[];

/** What a caller supplies to append a pick — everything except the derived entryHash. */
export type PickEntryInput = Omit<LedgerPickEntry, "entryHash">;

/** What a caller supplies to append a settlement — everything except the derived entryHash. */
export type SettlementEntryInput = Omit<LedgerSettlement, "entryHash">;

/** True for a settlement entry — the discriminant is the `outcome` field, unique to settlements. */
export function isSettlement(entry: LedgerEntry): entry is LedgerSettlement {
  return "outcome" in entry;
}

// ───────────────────────────── genesis + errors ─────────────────────────────

/** The literal seed of the chain — every ledger's seq-0 entry points here. */
const GENESIS_SEED = "GSE-GLASS-LEDGER-GENESIS";

/** sha256Hex of the literal string "GSE-GLASS-LEDGER-GENESIS". */
export const GENESIS_HASH = sha256Hex(GENESIS_SEED);

/**
 * Thrown for any violation of the ledger's append-only integrity contract:
 * a seq gap, a prevHash mismatch, a decisionAt/kickoffAt ordering violation,
 * or a settlement referencing a pick that isn't in the chain. The API
 * exposes no mutate/delete — this error is how a caller learns their
 * proposed append cannot be honest history.
 */
export class LedgerIntegrityError extends Error {
  constructor(
    message: string,
    readonly code:
      | "BAD_SEQ"
      | "SEQ_GAP"
      | "PREV_HASH_MISMATCH"
      | "DECISION_AFTER_KICKOFF"
      | "UNKNOWN_PICK",
    readonly seq?: number,
  ) {
    super(message);
    this.name = "LedgerIntegrityError";
  }
}

// ───────────────────────────── field validation ─────────────────────────────

const HEX64 = /^[0-9a-f]{64}$/i;
const OUTCOMES = new Set(["WIN", "LOSS", "PUSH", "VOID"]);

function assertNonEmptyString(name: string, v: unknown): asserts v is string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new TypeError(`ledger-chain: ${name} must be a non-empty string, got ${JSON.stringify(v)}`);
  }
}

function assertHex64(name: string, v: unknown): asserts v is string {
  if (typeof v !== "string" || !HEX64.test(v)) {
    throw new TypeError(`ledger-chain: ${name} must be a 64-hex sha256 digest, got ${JSON.stringify(v)}`);
  }
}

function assertFiniteNumber(name: string, v: unknown): asserts v is number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new TypeError(`ledger-chain: ${name} must be a finite number, got ${JSON.stringify(v)}`);
  }
}

function assertDecimalPrice(name: string, v: unknown): asserts v is number {
  assertFiniteNumber(name, v);
  if ((v as number) <= 1) {
    throw new RangeError(`ledger-chain: ${name} must be > 1 (decimal odds), got ${v}`);
  }
}

function assertIsoInstant(name: string, v: unknown): asserts v is string {
  if (typeof v !== "string" || !Number.isFinite(Date.parse(v))) {
    throw new RangeError(`ledger-chain: ${name} must be a valid ISO-8601 UTC instant, got ${JSON.stringify(v)}`);
  }
}

function assertSeqShape(seq: unknown): asserts seq is number {
  if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 0) {
    throw new LedgerIntegrityError(
      `seq must be a non-negative integer, got ${JSON.stringify(seq)}`,
      "BAD_SEQ",
      typeof seq === "number" ? seq : undefined,
    );
  }
}

// ───────────────────────────── canonical field sets ─────────────────────────────

/** The exact fields a pick entry's hash commits to (all of LedgerPickEntry minus entryHash). */
function pickCommittedFields(p: PickEntryInput): Canonical {
  return {
    seq: p.seq,
    prevHash: p.prevHash,
    pickId: p.pickId,
    sport: p.sport,
    market: p.market,
    selection: p.selection,
    priceDecimal: p.priceDecimal,
    book: p.book,
    decisionAt: p.decisionAt,
    kickoffAt: p.kickoffAt,
    modelVersion: p.modelVersion,
    featureSnapshotHash: p.featureSnapshotHash,
  };
}

/** The exact fields a settlement entry's hash commits to (all of LedgerSettlement minus entryHash). */
function settlementCommittedFields(s: SettlementEntryInput): Canonical {
  return {
    seq: s.seq,
    pickId: s.pickId,
    settledAt: s.settledAt,
    outcome: s.outcome,
    closingPriceDecimal: s.closingPriceDecimal,
    clvBps: s.clvBps,
    prevHash: s.prevHash,
  };
}

// ───────────────────────────── linkage helper ─────────────────────────────

export interface ChainLinkage {
  readonly seq: number;
  readonly prevHash: string;
}

/** The (seq, prevHash) an honest next append must carry, derived from the chain's current tip. */
export function nextLinkage(chain: LedgerChain): ChainLinkage {
  if (chain.length === 0) return { seq: 0, prevHash: GENESIS_HASH };
  const tip = chain[chain.length - 1]!;
  return { seq: chain.length, prevHash: tip.entryHash };
}

/**
 * Canonical JSON of a pick's committed fields — the exact preimage
 * `entryHash` covers. Persistence stores this string as `payload`.
 */
export function pickCommittedPayload(p: PickEntryInput): string {
  return canonicalJson(pickCommittedFields(p));
}

/**
 * Canonical JSON of a settlement's committed fields — the exact preimage
 * `entryHash` covers. Persistence stores this string as `payload`.
 */
export function settlementCommittedPayload(s: SettlementEntryInput): string {
  return canonicalJson(settlementCommittedFields(s));
}

/**
 * Validate a pick's field shape + publish-before-kickoff, compute entryHash.
 * Does NOT check seq/prevHash against a chain — that is `appendPick` /
 * the durable store's linkage step. Split so a DB adapter can mint from
 * a tail row without synthesizing a phantom in-memory chain.
 */
export function mintPickEntry(pick: PickEntryInput): LedgerPickEntry {
  assertNonEmptyString("pickId", pick.pickId);
  assertNonEmptyString("sport", pick.sport);
  assertNonEmptyString("market", pick.market);
  assertNonEmptyString("selection", pick.selection);
  assertNonEmptyString("book", pick.book);
  assertNonEmptyString("modelVersion", pick.modelVersion);
  assertHex64("featureSnapshotHash", pick.featureSnapshotHash);
  assertDecimalPrice("priceDecimal", pick.priceDecimal);
  assertIsoInstant("decisionAt", pick.decisionAt);
  assertIsoInstant("kickoffAt", pick.kickoffAt);
  assertSeqShape(pick.seq);
  assertHex64("prevHash", pick.prevHash);

  if (Date.parse(pick.decisionAt) >= Date.parse(pick.kickoffAt)) {
    throw new LedgerIntegrityError(
      `publish-before-kickoff invariant violated for pick ${pick.pickId}: decisionAt (${pick.decisionAt}) ` +
        `must strictly precede kickoffAt (${pick.kickoffAt}) — a pick recorded after kickoff can never enter the ledger`,
      "DECISION_AFTER_KICKOFF",
      pick.seq,
    );
  }

  const entryHash = sha256Hex(pickCommittedPayload(pick));
  return Object.freeze({ ...pick, entryHash });
}

/**
 * Validate a settlement's field shape and the paired closing/CLV contract,
 * compute entryHash. Does NOT check seq/prevHash or UNKNOWN_PICK — those
 * stay on `appendSettlement` / the durable store.
 */
export function mintSettlementEntry(settlement: SettlementEntryInput): LedgerSettlement {
  assertNonEmptyString("pickId", settlement.pickId);
  assertIsoInstant("settledAt", settlement.settledAt);
  if (!OUTCOMES.has(settlement.outcome)) {
    throw new TypeError(
      `ledger-chain: outcome must be one of WIN|LOSS|PUSH|VOID, got ${JSON.stringify(settlement.outcome)}`,
    );
  }
  if ((settlement.closingPriceDecimal === null) !== (settlement.clvBps === null)) {
    throw new TypeError(
      `ledger-chain: closingPriceDecimal and clvBps must be present together or both null ` +
        `(got closingPriceDecimal=${String(settlement.closingPriceDecimal)}, clvBps=${String(settlement.clvBps)}) ` +
        `for settlement of pick ${settlement.pickId}`,
    );
  }
  if (settlement.closingPriceDecimal !== null) {
    assertDecimalPrice("closingPriceDecimal", settlement.closingPriceDecimal);
  }
  if (settlement.clvBps !== null) {
    assertFiniteNumber("clvBps", settlement.clvBps);
  }
  assertSeqShape(settlement.seq);
  assertHex64("prevHash", settlement.prevHash);

  const entryHash = sha256Hex(settlementCommittedPayload(settlement));
  return Object.freeze({ ...settlement, entryHash });
}

// ───────────────────────────── append API ─────────────────────────────

/**
 * Append a pick entry. Validates field shape, verifies seq/prevHash linkage
 * against the chain's current tip, enforces the publish-before-kickoff
 * invariant, computes entryHash, and returns a NEW chain (the old one is
 * untouched — there is no in-place mutation anywhere in this module).
 */
export function appendPick(chain: LedgerChain, pick: PickEntryInput): LedgerChain {
  const entry = mintPickEntry(pick);
  const expected = nextLinkage(chain);
  if (pick.seq !== expected.seq) {
    throw new LedgerIntegrityError(
      `seq gap: the chain's next entry must be seq ${expected.seq}, got ${pick.seq} for pick ${pick.pickId}`,
      "SEQ_GAP",
      pick.seq,
    );
  }
  if (pick.prevHash !== expected.prevHash) {
    throw new LedgerIntegrityError(
      `prevHash mismatch at seq ${pick.seq}: expected ${expected.prevHash}, got ${pick.prevHash}`,
      "PREV_HASH_MISMATCH",
      pick.seq,
    );
  }
  return Object.freeze([...chain, entry]);
}

/**
 * Append a settlement entry. Same linkage/shape verification as appendPick,
 * plus: the settlement's pickId must already reference a pick entry earlier
 * in this same chain (settlements and picks share one seq/prevHash counter —
 * there is no separate settlements chain).
 */
export function appendSettlement(chain: LedgerChain, settlement: SettlementEntryInput): LedgerChain {
  const entry = mintSettlementEntry(settlement);
  const expected = nextLinkage(chain);
  if (settlement.seq !== expected.seq) {
    throw new LedgerIntegrityError(
      `seq gap: the chain's next entry must be seq ${expected.seq}, got ${settlement.seq} ` +
        `for settlement of pick ${settlement.pickId}`,
      "SEQ_GAP",
      settlement.seq,
    );
  }
  if (settlement.prevHash !== expected.prevHash) {
    throw new LedgerIntegrityError(
      `prevHash mismatch at seq ${settlement.seq}: expected ${expected.prevHash}, got ${settlement.prevHash}`,
      "PREV_HASH_MISMATCH",
      settlement.seq,
    );
  }

  const knownPick = chain.some((e) => !isSettlement(e) && e.pickId === settlement.pickId);
  if (!knownPick) {
    throw new LedgerIntegrityError(
      `settlement references pickId "${settlement.pickId}" which is not in the chain`,
      "UNKNOWN_PICK",
      settlement.seq,
    );
  }
  return Object.freeze([...chain, entry]);
}

// ───────────────────────────── verification ─────────────────────────────

export interface ChainVerification {
  readonly valid: boolean;
  /** seq of the first entry found broken, when valid === false. */
  readonly brokenAt?: number;
  readonly reason?: string;
}

/**
 * Recompute every entry's hash and linkage from scratch and confirm the
 * chain is exactly what it claims to be. This is the check a skeptic (or a
 * loader that just pulled rows back out of storage) runs — it trusts
 * NOTHING about the input array beyond what it can re-derive:
 *   - seq is contiguous from 0,
 *   - prevHash equals the previous entry's entryHash (GENESIS_HASH at seq 0),
 *   - entryHash matches a fresh sha256Hex(canonicalJson(...)) of the entry's
 *     own committed fields (this is what catches a mutated field — ANY
 *     field, on ANY entry, changes its hash),
 *   - every pick still satisfies decisionAt < kickoffAt,
 *   - every settlement's pickId still resolves to an earlier pick entry.
 * Returns the seq of the first broken entry so a caller can localize damage
 * instead of just being told "somewhere in here".
 */
export function verifyChain(entries: LedgerChain): ChainVerification {
  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;

    if (entry.seq !== i) {
      return { valid: false, brokenAt: entry.seq, reason: `seq out of order at index ${i}: expected ${i}, got ${entry.seq}` };
    }
    if (entry.prevHash !== expectedPrev) {
      return {
        valid: false,
        brokenAt: entry.seq,
        reason: `prevHash mismatch at seq ${entry.seq}: expected ${expectedPrev}, got ${entry.prevHash}`,
      };
    }

    const settlement = isSettlement(entry);
    const recomputed = settlement
      ? sha256Hex(canonicalJson(settlementCommittedFields(entry)))
      : sha256Hex(canonicalJson(pickCommittedFields(entry)));

    if (recomputed !== entry.entryHash) {
      return {
        valid: false,
        brokenAt: entry.seq,
        reason: `entryHash mismatch at seq ${entry.seq} — a committed field was altered after the entry was appended`,
      };
    }

    if (!settlement) {
      if (Date.parse(entry.decisionAt) >= Date.parse(entry.kickoffAt)) {
        return {
          valid: false,
          brokenAt: entry.seq,
          reason: `publish-before-kickoff invariant violated at seq ${entry.seq}`,
        };
      }
    } else {
      const knownPick = entries.slice(0, i).some((e) => !isSettlement(e) && e.pickId === entry.pickId);
      if (!knownPick) {
        return {
          valid: false,
          brokenAt: entry.seq,
          reason: `settlement at seq ${entry.seq} references unknown pickId "${entry.pickId}"`,
        };
      }
    }

    expectedPrev = entry.entryHash;
  }

  return { valid: true };
}

// ───────────────────────────── external digest ─────────────────────────────

export interface ChainDigest {
  /** The tip's entryHash — GENESIS_HASH for an empty chain. */
  readonly tipHash: string;
  readonly count: number;
}

/** The tip hash + count — the only two numbers that get externally anchored (see ledger-anchor.ts). */
export function chainDigest(entries: LedgerChain): ChainDigest {
  return {
    tipHash: entries.length === 0 ? GENESIS_HASH : entries[entries.length - 1]!.entryHash,
    count: entries.length,
  };
}

// ───────────────────────────── CLV ─────────────────────────────

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/**
 * Per-play CLV in basis points, derived in probability space.
 *
 * A decimal price `d` implies win probability `1/d`. Getting a BETTER price
 * than the close means locking a HIGHER decimal price — i.e. a LOWER implied
 * probability — than where the market ultimately settled. So:
 *
 *   clvBps = 10000 * (impliedProb(closing) − impliedProb(decision))
 *          = 10000 * (1/closingPriceDecimal − 1/decisionPriceDecimal)
 *
 * POSITIVE => the decision price implied a lower probability than the close
 * => you got the better number => you beat the close (matches clv.ts's
 * module-wide sign convention: positive = good).
 *
 * Worked example: decision 2.10 (implied 0.47619), close 1.95 (implied
 * 0.51282) — the market shortened after you bet, so you got the better of
 * it: clvBps = 10000 * (0.51282 − 0.47619) = +366.30 (positive, beat the close).
 *
 * Mirror example: decision 1.90 (implied 0.52632), close 1.95 (implied
 * 0.51282) — the market drifted the OTHER way; your price was worse than
 * the close: clvBps = 10000 * (0.51282 − 0.52632) = −134.95 (negative, lost value).
 */
export function computeClvBps(decisionPriceDecimal: number, closingPriceDecimal: number): number {
  assertDecimalPrice("decisionPriceDecimal", decisionPriceDecimal);
  assertDecimalPrice("closingPriceDecimal", closingPriceDecimal);
  const bps = 10000 * (1 / closingPriceDecimal - 1 / decisionPriceDecimal);
  return round(bps, 2);
}
