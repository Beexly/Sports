/**
 * SituationSnapshot ↔ MarketQuote join (eventId fill-only).
 *
 * Destined for packages/quote-plane or packages/data-ingestion when Beexly applies.
 * Mirrors /workspace/situation-join/lib/join-situation-quote.mjs
 *
 * Tolerance: ±12 hours on commenceTime (DST / local-kickoff slack).
 * Hard wall: never copy prices onto the situation snapshot.
 */

export const COMMENCE_TOLERANCE_HOURS = 12 as const;

export const PRICE_KEYS = [
  "consensusDeviggedProbHome",
  "consensusDeviggedProbAway",
  "consensusDeviggedProbDraw",
  "bookCount",
  "market",
  "away_moneyline",
  "home_moneyline",
  "spread_line",
  "total_line",
  "price",
  "odds",
  "moneylines",
  "spreads",
  "totals",
] as const;

export type SituationSnapshotLike = {
  sport: string;
  eventId?: string | null;
  home: string;
  away: string;
  homeAbbr?: string;
  awayAbbr?: string;
  commenceTime?: string;
  [key: string]: unknown;
};

export type QuoteJoinKeys = {
  sport?: string;
  eventId?: string;
  home: string;
  away: string;
  commenceTime?: string;
  [key: string]: unknown;
};

function namesEqual(a: string, b: string): boolean {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

export function resolveTeamFullName(
  abbrToFull: Record<string, string>,
  nameOrAbbr: string
): string | null {
  if (!nameOrAbbr || typeof nameOrAbbr !== "string") return null;
  const s = nameOrAbbr.trim();
  if (abbrToFull[s]) return abbrToFull[s];
  const lower = s.toLowerCase();
  const hit = Object.entries(abbrToFull).find(
    ([abbr, full]) => abbr.toLowerCase() === lower || full.toLowerCase() === lower
  );
  return hit ? hit[1] : s;
}

export function withinHours(
  isoA: string | null | undefined,
  isoB: string | null | undefined,
  slackHours: number = COMMENCE_TOLERANCE_HOURS
): boolean {
  if (!isoA || !isoB) return true;
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return Math.abs(a - b) <= slackHours * 3600 * 1000;
}

/**
 * Fill-only: copy eventId from quote when sport + teams + commenceTime match.
 * Never invents eventId. Never copies PRICE_KEYS.
 */
export function joinSituationToMarketQuote(
  snapshot: SituationSnapshotLike,
  quote: QuoteJoinKeys,
  abbrToFull: Record<string, string> = {},
  opts: { toleranceHours?: number } = {}
): { snapshot: SituationSnapshotLike | null; matched: boolean; reason?: string } {
  if (!snapshot || !quote) {
    return { snapshot: null, matched: false, reason: "missing snapshot or quote" };
  }
  const toleranceHours = opts.toleranceHours ?? COMMENCE_TOLERANCE_HOURS;
  const sport = quote.sport || "americanfootball_nfl";
  if (snapshot.sport !== sport) {
    return { snapshot: null, matched: false, reason: "sport mismatch" };
  }

  const homeFull = resolveTeamFullName(abbrToFull, quote.home);
  const awayFull = resolveTeamFullName(abbrToFull, quote.away);
  const sHome =
    resolveTeamFullName(abbrToFull, snapshot.home) ||
    (snapshot.homeAbbr
      ? resolveTeamFullName(abbrToFull, snapshot.homeAbbr)
      : null) ||
    snapshot.home;
  const sAway =
    resolveTeamFullName(abbrToFull, snapshot.away) ||
    (snapshot.awayAbbr
      ? resolveTeamFullName(abbrToFull, snapshot.awayAbbr)
      : null) ||
    snapshot.away;

  if (!namesEqual(sHome || "", homeFull || "") || !namesEqual(sAway || "", awayFull || "")) {
    return { snapshot: null, matched: false, reason: "home/away mismatch (order-sensitive)" };
  }
  if (!withinHours(snapshot.commenceTime, quote.commenceTime, toleranceHours)) {
    return {
      snapshot: null,
      matched: false,
      reason: `commenceTime outside ±${toleranceHours}h`,
    };
  }

  const out: SituationSnapshotLike = { ...snapshot };
  if (quote.eventId) out.eventId = quote.eventId;
  else if (out.eventId === undefined) out.eventId = null;

  for (const k of PRICE_KEYS) {
    if (k in out) delete out[k];
  }
  return { snapshot: out, matched: true };
}

/** Unique match only; ambiguous → null (never invent eventId). */
export function findSituationForQuote(
  snapshots: SituationSnapshotLike[],
  quote: QuoteJoinKeys,
  abbrToFull: Record<string, string> = {},
  opts: { toleranceHours?: number } = {}
): SituationSnapshotLike | null {
  if (!Array.isArray(snapshots) || !quote) return null;
  const sport = quote.sport || "americanfootball_nfl";
  const toleranceHours = opts.toleranceHours ?? COMMENCE_TOLERANCE_HOURS;
  const homeFull = resolveTeamFullName(abbrToFull, quote.home);
  const awayFull = resolveTeamFullName(abbrToFull, quote.away);

  const matches = snapshots.filter((s) => {
    if (!s || s.sport !== sport) return false;
    const sHome =
      resolveTeamFullName(abbrToFull, s.home) ||
      (s.homeAbbr ? resolveTeamFullName(abbrToFull, s.homeAbbr) : null) ||
      s.home;
    const sAway =
      resolveTeamFullName(abbrToFull, s.away) ||
      (s.awayAbbr ? resolveTeamFullName(abbrToFull, s.awayAbbr) : null) ||
      s.away;
    if (!namesEqual(sHome || "", homeFull || "") || !namesEqual(sAway || "", awayFull || "")) {
      return false;
    }
    if (!withinHours(s.commenceTime, quote.commenceTime, toleranceHours)) return false;
    return true;
  });

  const only = matches[0];
  if (matches.length !== 1 || !only) return null;
  return joinSituationToMarketQuote(only, quote, abbrToFull, opts).snapshot;
}
