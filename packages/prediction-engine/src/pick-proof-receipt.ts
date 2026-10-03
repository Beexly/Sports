/**
 * Pre-result proof receipt — the tamper-evident commitment a hostile skeptic audits.
 *
 * The whole moat is an auditable track record. That record is only credible if a
 * skeptic can be sure we did not quietly edit a pick (or its claimed model/market
 * probabilities) AFTER seeing the result. This module freezes, at publish time and
 * BEFORE kickoff, exactly what we claimed: the side, the line/price we entered at,
 * our model's win probability, the de-vigged market fair probability, the edge, and
 * the moment it was frozen — then stamps it with a content hash.
 *
 * Two properties make it auditable:
 *   1. Determinism — the same committed facts always produce the same hash, so the
 *      receipt can be re-derived and checked by anyone.
 *   2. Tamper-evidence — changing ANY committed field changes the hash, so a
 *      back-dated edit cannot masquerade as the original claim.
 *
 * It builds on proof-of-record.ts (canonical payload + leaf hash); a batch of these
 * leaves rolls up into the published Merkle root. Pure and dependency-free: the hash
 * is injected. PRODUCTION MUST inject a real cryptographic hash (node:crypto sha256
 * hex). Never fabricate fields — bad input throws rather than minting a false receipt.
 */

import { canonicalPickPayload, hashLeaf, type HashFn } from "./proof-of-record.js";

export interface PickProofInput {
  readonly pickId: string;
  readonly gameId: string;
  readonly selection: string; // e.g. "Chiefs -3.5" / "OVER 48.5"
  readonly pickType: string; // SPREAD | TOTAL | MONEYLINE
  /** The line (spread/total) or American price (moneyline) we published at. */
  readonly line: number;
  /** American odds we entered at. */
  readonly entryOdds: number;
  /**
   * De-vigged market fair probability for the side taken, 0..1. This is a real,
   * market-derived quantity (consensus minus vig) — the honest anchor we always have.
   */
  readonly marketFairProb: number;
  /**
   * The published 0–100 CONFIDENCE score. This is the engine's heuristic, NOT a
   * calibrated probability — it is committed as the score we actually showed, so the
   * receipt freezes the real claim without dressing a heuristic up as a probability.
   */
  readonly confidence: number;
  /** The published 0–100 edge score (net bookmaker edge). Real engine output. */
  readonly edgeScore: number;
  /**
   * A genuinely calibrated model win probability, 0..1 — present ONLY once such a
   * probability exists (champion model w/ published calibration). Absent today, and
   * the receipt commits "none" rather than fabricating one. Never pass confidence/100.
   */
  readonly modelProb?: number | null;
  readonly modelVersion: string;
  /**
   * Method that produced marketFairProb (e.g. multiplicative_devig_v1).
   * Required for continuous self-CLV; optional for legacy receipts.
   * Absent commits as "none" — never invents a method.
   */
  readonly marketFairMethodTag?: string | null;
  /** ISO timestamp the pick + odds snapshot were frozen at (must be before kickoff). */
  readonly asOf: string;
  /**
   * SHA-256 of the mint-time feature vector. Omitted on receipts minted before
   * the field existed, so those payloads re-derive unchanged. Passed as null
   * when the mint has no feature vector: the receipt commits "none".
   */
  readonly featureHash?: string | null;
}

/**
 * The de-vig method every scoring path in this engine actually uses for
 * `marketFairProb`: each book's quoted price for each side converted to an
 * implied probability, averaged across the books, and the two-sided average
 * divided by its own sum. Committed to the receipt so a verifier can tell
 * which method produced the committed number instead of assuming one.
 *
 * NOT swapped to Shin (`shin_devig_v1`, market-read.ts). Measured 2026-09-13
 * on 621 settled book-priced picks carrying both values, the paired Brier
 * difference is +0.0022 (t = 1.80, not significant), and the entire moneyline
 * advantage comes from 11 rows where the methods disagree by over 10 points —
 * pathological books. Excluding those, Shin is slightly worse (t = -1.13).
 * Changing the committed method without evidence would break CLV continuity
 * (`sameMethodOrRefuse`) for nothing.
 */
export const MARKET_FAIR_METHOD_TAG = "proportional_devig_v1";

export interface PickProofReceipt {
  readonly pickId: string;
  /** Canonical serialization of the committed fields — the source of truth for verification. */
  readonly payload: string;
  /** Hash of the committed leaf (id + payload). Re-derivable by anyone with the same hash fn. */
  readonly contentHash: string;
  /** When the receipt was minted (mirrors asOf). */
  readonly frozenAt: string;
  /** The exact fields committed to, echoed back for display + re-verification. */
  readonly fields: PickProofInput;
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function assertProb(name: string, p: number): void {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new Error(`pick-proof-receipt: ${name} must be a probability in 0..1, got ${p}`);
  }
}

function assertNonEmpty(name: string, s: string): void {
  if (typeof s !== "string" || s.trim() === "") {
    throw new Error(`pick-proof-receipt: ${name} must be a non-empty string`);
  }
}

/**
 * The committed fields, normalized to stable primitives. Probabilities are rounded
 * to a fixed precision so floating-point noise never changes the hash for the same
 * underlying claim. This is the only place that decides what the receipt commits to.
 */
function committedFields(i: PickProofInput): Readonly<Record<string, string | number | boolean>> {
  return {
    pickId: i.pickId,
    gameId: i.gameId,
    selection: i.selection,
    pickType: i.pickType,
    line: round(i.line, 4),
    entryOdds: Math.round(i.entryOdds),
    marketFairProb: round(i.marketFairProb, 6),
    confidence: Math.round(i.confidence),
    edgeScore: round(i.edgeScore, 4),
    // Committed as "none" when absent — an honest, hashable commitment that we did
    // NOT claim a calibrated probability, distinct from any future real value.
    modelProb: i.modelProb == null ? "none" : round(i.modelProb, 6),
    modelVersion: i.modelVersion,
    marketFairMethodTag:
      i.marketFairMethodTag == null || !String(i.marketFairMethodTag).trim()
        ? "none"
        : String(i.marketFairMethodTag).trim(),
    asOf: i.asOf,
    ...("featureHash" in i
      ? { featureHash: featureHashCommitment(i.featureHash) }
      : {}),
  };
}

function featureHashCommitment(value: string | null | undefined): string {
  if (value == null || value.trim() === "" || value.trim() === "none") return "none";
  const hash = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error("pick-proof-receipt: featureHash must be a sha256 hex digest or none");
  }
  return hash;
}

/**
 * The only way a feature hash reaches a public surface. The founder gate is
 * the Glass Ledger flag, passed in by the caller. A missing hash, the
 * committed word "none", and a shut gate all render nothing.
 */
export function featureHashForDisplay(
  committed: string | null | undefined,
  founderGateOpen: boolean,
): string | null {
  if (!founderGateOpen) return null;
  if (typeof committed !== "string") return null;
  const hash = committed.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;
  return hash;
}

/**
 * The strict American-odds plausibility band a committed entry price must land in
 * before a receipt may be minted. American odds carry implied probability strictly
 * between 0% and 100%, so |odds| >= 100 always; values inside (-100, 100) — e.g.
 * a raw spread like -3.5 or 48.5 leaking in as a "price" — are structurally
 * impossible American prices.
 *
 * The launch audit (2026-09-08) found 199/1,111 frozen receipt rows with such
 * values (17.9%), caused by a spread/total `line` falling through the
 * `pick.pickType === "MONEYLINE" ? Math.round(pick.line) : null` fallback in the
 * pick-commit path. Frozen rows are immutable by design, so the fix is a write
 * guard: reject at mint time so no new poisoned rows can exist.
 */
export const ENTRY_ODDS_MIN_ABS = 100;
/**
 * Upper bound on |American odds| for a NEW write. Sportsbook two-way prices
 * essentially never leave (-10000, 10000); values beyond that are the same
 * class of bug as the poison band — a line, a player id, or a concatenated
 * field falling into the price slot. The launch audit's -10533 is the frozen
 * example. Frozen rows stay frozen; this gates new mints only.
 */
export const ENTRY_ODDS_MAX_ABS = 10000;

/**
 * True when `entryOdds` is a finite number within the plausible American-odds
 * band (ENTRY_ODDS_MIN_ABS <= |odds| <= ENTRY_ODDS_MAX_ABS). Pure; shared by
 * every pick-commit path so the rule cannot drift between callers.
 *
 * DELIBERATELY a WRITE-PATH gate, not a buildPickProofReceipt throw: the 199
 * frozen rows from the 2026-09-08 audit carry poison-band prices whose hashes
 * are consistent with those values. Enforcing here-at-mint inside the builder
 * would make every re-derivation of a legacy row (verifyPickProofReceipt,
 * verifyPickInSlate) throw and report frozen rows as tampered — a false
 * integrity alarm. Callers MINTING new receipts must call this first.
 */
export function isPlausibleEntryOdds(entryOdds: unknown): entryOdds is number {
  return (
    typeof entryOdds === "number" &&
    Number.isFinite(entryOdds) &&
    Math.abs(entryOdds) >= ENTRY_ODDS_MIN_ABS &&
    Math.abs(entryOdds) <= ENTRY_ODDS_MAX_ABS
  );
}

/**
 * The pick slice `modelProbForReceipt` reads. Structural rather than the
 * @sports/types alias so this module stays pure and dependency-free.
 */
export type ReceiptModelProbSource = {
  readonly pickType?: string | null;
  readonly factorBreakdown?: {
    readonly rankingP?: number | null;
    readonly rankingSource?: string | null;
    readonly independentEdge?: { readonly trueProb?: number | null } | null;
  } | null;
};

/**
 * The model probability a receipt may honestly commit — `independentEdge.trueProb`.
 *
 * Until this existed the mint wrote `modelProb: null`, so every one of the 2,213
 * frozen receipts committed "none" and Brier/ECE were uncomputable forever: the
 * consumers were already built and waiting (eval/edge-lab/clv-report.mjs,
 * scripts/db-calibration-pull.cjs) with nothing to consume. This is the single
 * value that closes it.
 *
 * WHY trueProb AND NOT rankingP (the trap this function exists to prevent):
 * `rankingP` is confidence/100 whenever independents are absent, and a
 * confidence-sourced blend otherwise. Committing either would be committing the
 * confidence heuristic dressed as a probability — the one thing this column has
 * never been allowed to hold ("Never pass confidence/100"). The independent
 * blend is the only number here that never looked at the book, so it is the only
 * one whose Brier says anything about OUR skill rather than echoing the market.
 * This mirrors the ranking load law in apps/web/lib/calibration/proven-path-rows.ts.
 *
 * EVENT MATCHING — a probability is only meaningful against the outcome it
 * actually predicts, and the scorer already segregates estimators by event:
 *   - SPREAD: scoring.ts prices ONLY `skellam_cover`, a P(cover-the-spread) with
 *     push mass removed. settlement.ts grades SPREAD on cover. They match.
 *   - MONEYLINE: scoring.ts prices every NON-skellam source (poisson,
 *     dixon_coles, elo, fpi, clubelo, kalshi) — P(win). settlement.ts grades
 *     MONEYLINE on the game. They match.
 *   - TOTAL: settlement grades OVER/UNDER. No total estimator exists, so
 *     scoreTotalPick sets no independentEdge and trueProb is null.
 * Writing a P(win) into a TOTAL receipt would not merely be a weak number, it
 * would be a number graded against an event it never predicted — Brier would
 * report confidently-wrong calibration and the engine would "learn" from noise.
 * The TOTAL guard below makes that structurally impossible rather than incidental,
 * so a future total estimator must be wired deliberately, not by accident.
 *
 * Absent or unusable estimate => null, which commits "none": the honest,
 * hashable statement that we claimed no model probability. Never fabricated.
 */
export function modelProbForReceipt(pick: ReceiptModelProbSource): number | null {
  // No total model exists; grading one against over/under would be a
  // false-precision trap, so refuse by construction (see EVENT MATCHING).
  if ((pick.pickType ?? "").toUpperCase() === "TOTAL") return null;

  const trueProb = pick.factorBreakdown?.independentEdge?.trueProb;
  if (typeof trueProb !== "number" || !Number.isFinite(trueProb)) return null;
  // A probability of exactly 0 or 1 is a broken estimator, not certainty.
  if (trueProb <= 0 || trueProb >= 1) return null;
  return trueProb;
}

/**
 * Freeze a pick into a tamper-evident receipt. Validates the inputs (never mints a
 * receipt from non-finite probabilities or empty identifiers), builds the canonical
 * payload, and stamps it with the injected hash.
 */
export function buildPickProofReceipt(input: PickProofInput, hash: HashFn): PickProofReceipt {
  assertNonEmpty("pickId", input.pickId);
  assertNonEmpty("gameId", input.gameId);
  assertNonEmpty("selection", input.selection);
  assertNonEmpty("modelVersion", input.modelVersion);
  assertNonEmpty("asOf", input.asOf);
  assertProb("marketFairProb", input.marketFairProb);
  // modelProb is optional, but if present it must be a real probability — never a
  // confidence score scaled into 0..1.
  if (input.modelProb != null) assertProb("modelProb", input.modelProb);
  if (!Number.isFinite(input.confidence)) throw new Error("pick-proof-receipt: confidence must be finite");
  if (!Number.isFinite(input.edgeScore)) throw new Error("pick-proof-receipt: edgeScore must be finite");
  if (!Number.isFinite(input.entryOdds) || input.entryOdds === 0) {
    throw new Error("pick-proof-receipt: entryOdds must be a non-zero finite American price");
  }
  if (!Number.isFinite(input.line)) throw new Error("pick-proof-receipt: line must be finite");

  const payload = canonicalPickPayload(committedFields(input));
  const contentHash = hashLeaf(hash, { id: input.pickId, payload });

  return {
    pickId: input.pickId,
    payload,
    contentHash,
    frozenAt: input.asOf,
    fields: input,
  };
}

/**
 * Re-derive a receipt from its echoed fields and confirm both the canonical payload
 * and the content hash still match. Returns false if any committed field was altered
 * after the fact (the tamper signal) — the check a skeptic runs.
 */
export function verifyPickProofReceipt(receipt: PickProofReceipt, hash: HashFn): boolean {
  let recomputed: PickProofReceipt;
  try {
    recomputed = buildPickProofReceipt(receipt.fields, hash);
  } catch {
    return false;
  }
  return recomputed.payload === receipt.payload && recomputed.contentHash === receipt.contentHash;
}
