/**
 * Public consensus-claim evidence binder (T-1 tripwire).
 *
 * A quantified "N% bookmaker consensus" string on a public surface must travel
 * with its evidence: source count (bookmakerCount) and score-time freshness.
 * Claim alone is not enough — that is how a single-source or stale snapshot
 * can read as market-wide agreement.
 *
 * Does not invent wording. Does not rewrite the stored teaser. Only gates
 * whether the teaser may render and attaches the evidence fields that must
 * sit next to it.
 */

export const CONSENSUS_CLAIM_RE =
  /\b(\d{1,3})%\s+bookmaker consensus\b/i;

export type PublicConsensusEvidence = {
  /** Unmodified teaser text from the pick (no rewrite). */
  readonly claimText: string;
  readonly consensusPct: number;
  readonly bookmakerCount: number;
  /** ISO timestamp when underlying odds were scored. */
  readonly dataFreshnessAt: string;
  /** Age of the score snapshot in hours (floor), relative to `now`. */
  readonly ageHours: number;
};

export type ConsensusClaimPickSlice = {
  readonly reasoningShort: string | null | undefined;
  readonly consensusPct?: number | null;
  readonly bookmakerCount?: number | null;
  readonly dataFreshnessAt?: Date | string | null;
};

/** True when the free teaser asserts a quantified bookmaker-consensus claim. */
export function isBookmakerConsensusClaim(text: string | null | undefined): boolean {
  if (!text) return false;
  return CONSENSUS_CLAIM_RE.test(text);
}

/**
 * Bind a public consensus claim to evidence, or return null (do not render).
 *
 * Rules:
 * - Must match the consensus teaser pattern.
 * - bookmakerCount ≥ 2 (MIN_BOOKMAKERS in prediction-engine).
 * - dataFreshnessAt present and parseable.
 * - consensusPct in (0, 1].
 */
export function bindPublicConsensusClaim(
  pick: ConsensusClaimPickSlice,
  now: Date = new Date(),
): PublicConsensusEvidence | null {
  const text = pick.reasoningShort?.trim() ?? "";
  if (!isBookmakerConsensusClaim(text)) return null;

  const bookmakerCount = Math.floor(Number(pick.bookmakerCount ?? 0));
  if (!Number.isFinite(bookmakerCount) || bookmakerCount < 2) return null;

  const rawFresh = pick.dataFreshnessAt;
  if (rawFresh == null || rawFresh === "") return null;
  const fresh =
    rawFresh instanceof Date ? rawFresh : new Date(typeof rawFresh === "string" ? rawFresh : String(rawFresh));
  if (Number.isNaN(fresh.getTime())) return null;

  const pct = Number(pick.consensusPct);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 1) return null;

  const ageHours = Math.max(0, Math.floor((now.getTime() - fresh.getTime()) / (60 * 60 * 1000)));

  return {
    claimText: text,
    consensusPct: pct,
    bookmakerCount,
    dataFreshnessAt: fresh.toISOString(),
    ageHours,
  };
}

/**
 * One-line evidence caption for UI — not a rewrite of the claim itself.
 * Example: "2 books · scored 48h ago"
 */
export function consensusEvidenceCaption(ev: PublicConsensusEvidence): string {
  const books = `${ev.bookmakerCount} book${ev.bookmakerCount === 1 ? "" : "s"}`;
  if (ev.ageHours <= 0) return `${books} · scored just now`;
  if (ev.ageHours < 48) return `${books} · scored ${ev.ageHours}h ago`;
  const days = Math.floor(ev.ageHours / 24);
  return `${books} · scored ${days}d ago`;
}
