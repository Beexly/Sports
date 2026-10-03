/**
 * Thin-coverage event merge — fill games under MIN_BOOKMAKERS from a secondary
 * aggregator without dual-pulling a well-covered slate.
 *
 * Matching is team-pair + commence window because Odds API ids and TheRundown
 * event_ids are not the same namespace. Unmatched secondary events are dropped
 * (never inserted as extra games). Primary bookmaker keys always win.
 *
 * Pure: no I/O.
 */

import type { OddsApiBookmaker, OddsApiEvent } from "@sports/types";
import { normalizeComparableText } from "./team-text-match.js";

/** Scoring refuses a market with fewer than two books. */
export const THIN_FILL_MIN_BOOKMAKERS = 2;

/** Kickoff clocks differ across vendors; 12h still the same contest. */
export const THIN_FILL_COMMENCE_MATCH_MS = 12 * 60 * 60 * 1000;

export interface ThinFillMergeResult {
  readonly events: OddsApiEvent[];
  readonly filledGameIds: string[];
  readonly unmatchedSecondary: number;
  readonly skippedWellCovered: number;
}

function lastToken(name: string): string {
  const parts = normalizeComparableText(name).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** Exact normalized name, or nickname last-token (≥4 chars) — same rule as NFL preseason remap. */
export function eventTeamsMatch(a: string, b: string): boolean {
  const na = normalizeComparableText(a);
  const nb = normalizeComparableText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const la = lastToken(a);
  const lb = lastToken(b);
  return la.length >= 4 && la === lb;
}

export function eventBookmakerCount(event: OddsApiEvent): number {
  return Array.isArray(event.bookmakers) ? event.bookmakers.length : 0;
}

export function eventsBelowBookmakerThreshold(
  events: readonly OddsApiEvent[],
  minBookmakers: number = THIN_FILL_MIN_BOOKMAKERS,
): OddsApiEvent[] {
  return events.filter((event) => eventBookmakerCount(event) < minBookmakers);
}

function commenceMs(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

export function matchSecondaryEventToPrimary(
  secondary: OddsApiEvent,
  primary: readonly OddsApiEvent[],
  claimedPrimaryIds: ReadonlySet<string>,
  windowMs: number = THIN_FILL_COMMENCE_MATCH_MS,
): OddsApiEvent | null {
  const t = commenceMs(secondary.commence_time);
  if (!Number.isFinite(t)) return null;
  let best: OddsApiEvent | null = null;
  let bestDelta = Infinity;
  for (const event of primary) {
    if (claimedPrimaryIds.has(event.id)) continue;
    if (!eventTeamsMatch(secondary.home_team, event.home_team)) continue;
    if (!eventTeamsMatch(secondary.away_team, event.away_team)) continue;
    const delta = Math.abs(commenceMs(event.commence_time) - t);
    if (delta <= windowMs && delta < bestDelta) {
      best = event;
      bestDelta = delta;
    }
  }
  return best;
}

function unionBookmakers(
  primaryBooks: readonly OddsApiBookmaker[],
  secondaryBooks: readonly OddsApiBookmaker[],
): { books: OddsApiBookmaker[]; added: number } {
  const seen = new Set(primaryBooks.map((b) => b.key));
  const books = [...primaryBooks];
  let added = 0;
  for (const book of secondaryBooks) {
    if (!book?.key || seen.has(book.key)) continue;
    seen.add(book.key);
    books.push(book);
    added += 1;
  }
  return { books, added };
}

/**
 * Merge secondary bookmakers into primary events that sit below `minBookmakers`.
 * Well-covered primary events are left untouched. Secondary-only games are not added.
 */
export function mergeBookmakersIntoPrimary(
  primary: readonly OddsApiEvent[],
  secondary: readonly OddsApiEvent[],
  minBookmakers: number = THIN_FILL_MIN_BOOKMAKERS,
): ThinFillMergeResult {
  const byId = new Map(primary.map((event) => [event.id, event]));
  const filledGameIds: string[] = [];
  const claimed = new Set<string>();
  let unmatchedSecondary = 0;
  let skippedWellCovered = 0;

  for (const event of primary) {
    if (eventBookmakerCount(event) >= minBookmakers) skippedWellCovered += 1;
  }

  for (const row of secondary) {
    const target = matchSecondaryEventToPrimary(row, primary, claimed);
    if (!target) {
      unmatchedSecondary += 1;
      continue;
    }
    if (eventBookmakerCount(target) >= minBookmakers) {
      continue;
    }
    const { books, added } = unionBookmakers(target.bookmakers ?? [], row.bookmakers ?? []);
    if (added === 0) continue;
    claimed.add(target.id);
    const next: OddsApiEvent = { ...target, bookmakers: books };
    byId.set(target.id, next);
    filledGameIds.push(target.id);
  }

  return {
    events: primary.map((event) => byId.get(event.id) ?? event),
    filledGameIds,
    unmatchedSecondary,
    skippedWellCovered,
  };
}
