import type { PublicPick } from "@sports/types";
import { isRealBookmakerKey } from "@sports/prediction-engine";

/**
 * Public consensus-claim evidence binder (T-1 tripwire).
 *
 * A public bookmaker-consensus claim must travel with its exact priced book
 * set, source snapshot, capture time, and stable set identifier. A count or a
 * provider tag alone is not evidence. Any missing or inconsistent field causes
 * the claim to be withheld; this module never invents data or rewrites copy.
 */

export const CONSENSUS_CLAIM_RE =
  /\b(?:bookmaker consensus\b|\d{1,3}%\s+of\s+\d+\s+bookmakers?\b|\d{1,3}%\s+(?:bookmaker consensus\b|(?:of\s+)?bookmakers?\s+(?:favor|favou?rs?|align|aligned)\b)|\d+\/\d+\s+books?\s+in\s+set\s+books-v1-[a-f0-9]+\s+(?:favor|favou?rs?|align|aligned)\b|(?:all|every)\s+books?\b[^.!?\n]*\b(?:favor|favou?rs?|align|aligned|agree|agreeing|back)\b)/i;

export type ConsensusBookSetEvidence = {
  readonly books: readonly string[];
  /** Immutable SourceSnapshot.id or another stable source identifier. */
  readonly sourceId: string;
  /** Feed/provider tag, distinct from sourceId. */
  readonly provider: string;
  readonly capturedAt: Date | string;
};

export type PublicConsensusEvidence = {
  readonly claimText: string;
  readonly consensusPct: number;
  readonly bookmakerCount: number;
  /** Score-time freshness retained as a separate diagnostic. */
  readonly dataFreshnessAt: string;
  readonly ageHours: number;
  readonly consensusProvider: string;
  readonly consensusSourceId: string;
  readonly consensusBooks: readonly string[];
  readonly consensusBookSetId: string;
  readonly consensusCapturedAt: string;
};

export type PublicConsensusPick = Omit<PublicPick, "reasoning" | "reasoningShort"> & {
  reasoning: string | null;
  reasoningShort: string | null;
  consensusPct?: number | null;
  bookmakerCount?: number;
  consensusProvider?: string | null;
  consensusSourceId?: string | null;
  consensusBooks?: readonly string[] | null;
  consensusBookSetId?: string | null;
  consensusCapturedAt?: string | null;
  consensusEvidence?: string | null;
};

export type ConsensusClaimPickSlice = {
  readonly reasoningShort: string | null | undefined;
  readonly consensusPct?: number | null;
  readonly bookmakerCount?: number | null;
  readonly dataFreshnessAt?: Date | string | null;
  readonly consensusProvider?: string | null;
  readonly consensusSourceId?: string | null;
  readonly consensusBooks?: readonly string[] | null;
  readonly consensusBookSetId?: string | null;
  readonly consensusCapturedAt?: Date | string | null;
  readonly consensusBookSet?: ConsensusBookSetEvidence | null;
};

function normalizeToken(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function parseBookSet(
  pick: ConsensusClaimPickSlice,
  provider: string,
): { books: string[]; sourceId: string; capturedAt: string } | null {
  const source = pick.consensusBookSet;
  const sourceProvider = normalizeToken(source?.provider ?? pick.consensusProvider);
  if (!sourceProvider || sourceProvider !== provider) return null;

  const rawBooks = source?.books ?? pick.consensusBooks ?? [];
  const books = rawBooks.map(normalizeToken).filter(Boolean);
  const uniqueBooks = [...new Set(books)].sort((a, b) => a.localeCompare(b));
  if (books.length !== uniqueBooks.length || uniqueBooks.length === 0) return null;
  if (uniqueBooks.some((book) => !isRealBookmakerKey(book))) return null;

  const sourceId = normalizeToken(pick.consensusSourceId);
  if (!sourceId) return null;
  if (normalizeToken(source?.sourceId ?? sourceId) !== sourceId) return null;

  const rawCapturedAt = source?.capturedAt ?? pick.consensusCapturedAt;
  if (rawCapturedAt == null || rawCapturedAt === "") return null;
  const captured = rawCapturedAt instanceof Date
    ? rawCapturedAt
    : new Date(String(rawCapturedAt));
  if (Number.isNaN(captured.getTime())) return null;

  const expectedSetId = stableBookSetId(provider, uniqueBooks);
  const providedSetId = pick.consensusBookSetId?.trim();
  if (providedSetId && providedSetId !== expectedSetId) return null;

  return { books: uniqueBooks, sourceId, capturedAt: captured.toISOString() };
}

/** Stable deterministic id over the provider tag and canonical book keys. */
export function stableBookSetId(provider: string, books: readonly string[]): string {
  const canonicalProvider = normalizeToken(provider);
  const canonicalBooks = [...new Set(books.map(normalizeToken).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const payload = `${canonicalProvider}|${canonicalBooks.join("|")}`;
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `books-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function isBookmakerConsensusClaim(text: string | null | undefined): boolean {
  return Boolean(text && CONSENSUS_CLAIM_RE.test(text));
}

export function bindPublicConsensusClaim(
  pick: ConsensusClaimPickSlice,
  now: Date = new Date(),
): PublicConsensusEvidence | null {
  const text = pick.reasoningShort?.trim() ?? "";
  if (!isBookmakerConsensusClaim(text)) return null;

  const bookmakerCount = Math.floor(Number(pick.bookmakerCount ?? 0));
  if (!Number.isFinite(bookmakerCount) || bookmakerCount < 2) return null;

  const provider = normalizeToken(pick.consensusProvider);
  if (!provider) return null;
  if (provider.split("+").some((part) => part === "espn_public" || part.endsWith("-thin"))) return null;

  const rawFresh = pick.dataFreshnessAt;
  if (rawFresh == null || rawFresh === "") return null;
  const fresh = rawFresh instanceof Date
    ? rawFresh
    : new Date(typeof rawFresh === "string" ? rawFresh : String(rawFresh));
  if (Number.isNaN(fresh.getTime())) return null;

  const pct = Number(pick.consensusPct);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 1) return null;
  if (text.includes("100%") && pct !== 1) return null;

  const bookSet = parseBookSet(pick, provider);
  if (!bookSet || bookSet.books.length !== bookmakerCount) return null;

  const bookSetId = stableBookSetId(provider, bookSet.books);
  if (pick.consensusBookSetId && pick.consensusBookSetId !== bookSetId) return null;

  const ageHours = Math.max(
    0,
    Math.floor((now.getTime() - new Date(bookSet.capturedAt).getTime()) / (60 * 60 * 1000)),
  );
  return {
    claimText: text,
    consensusPct: pct,
    bookmakerCount,
    dataFreshnessAt: fresh.toISOString(),
    ageHours,
    consensusProvider: provider,
    consensusSourceId: bookSet.sourceId,
    consensusBooks: bookSet.books,
    consensusBookSetId: bookSetId,
    consensusCapturedAt: bookSet.capturedAt,
  };
}

export function consensusEvidenceCaption(ev: PublicConsensusEvidence): string {
  return `${ev.bookmakerCount} books · source ${ev.consensusProvider} (${ev.consensusSourceId}) · set ${ev.consensusBookSetId} · as of ${ev.consensusCapturedAt}`;
}
