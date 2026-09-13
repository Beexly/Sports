/**
 * What to print where a board row's market goes.
 *
 * `BoardStateRow.market` does double duty. For a PREMIUM viewer it carries the
 * paid selection verbatim ("Chicago Bears -3.0"). For everyone else the loader
 * redacts it to the literal sentinel "ALL_MARKETS" so the row count stays
 * identical across tiers without leaking the pick (lib/board/state.ts). The
 * generic scoring and held lanes carry the sentinel unconditionally.
 *
 * Nothing humanized it, so the sentinel reached customers. Measured on
 * production 2026-09-13: the homepage ticker printed "Texas Rangers @ Arizona
 * Diamondbacks: we're on ALL_MARKETS", and /board and /slate rendered the same
 * token in their row subtitles.
 *
 * The rule here is deliberately conservative: a redacted row has NOTHING
 * truthful to say about which market we took, so it says nothing. It does not
 * guess "Moneyline", and it does not substitute a friendlier fiction. The
 * sentinel on the wire is unchanged — two tests and an e2e spec pin it as the
 * API contract, and the tier invariant depends on it — this is display only.
 *
 * When the row is NOT redacted the caller is a premium viewer and the string is
 * the real selection, so it passes straight through.
 */

/** The loader's tier-redaction sentinel. Never shown to a person. */
export const REDACTED_MARKET = "ALL_MARKETS";

/**
 * The market text to show, or "" when the row carries nothing sayable.
 * Callers decide how to render an empty label; none of them may invent one.
 */
export function boardMarketLabel(market: string | null | undefined): string {
  if (!market) return "";
  const trimmed = market.trim();
  if (trimmed === REDACTED_MARKET || trimmed === "") return "";
  return trimmed;
}

/**
 * One ticker line for a published row. Names the selection when the viewer is
 * entitled to it and says plainly that we are on the game when they are not.
 */
export function publishedTickerLine(matchup: string, market: string | null | undefined): string {
  const label = boardMarketLabel(market);
  return label ? `${matchup}: we're on ${label}` : `${matchup}: we're on this one`;
}

/**
 * One ticker line for a held row. The reason is already plain-English customer
 * copy (lib/board/pass-reason.ts on the fallback path, the real decision reason
 * on the decision path), so it is shown verbatim rather than re-summarised.
 *
 * "Held", not "passed": on the fallback path these rows were never evaluated,
 * and pass-reason.ts says so in its own doc. Calling that a pass asserts a
 * judgement nobody made.
 */
export function heldTickerLine(matchup: string, gateReason: string | null | undefined): string {
  const reason = gateReason?.trim();
  return reason ? `${matchup}: held. ${reason}` : `${matchup}: held`;
}
