/**
 * Team / text matching helpers for exchange titles and headlines.
 * Ported from prediction-market sports-resolution patterns (NFKD, longest-first).
 * Pure; no I/O. Used for Kalshi/Polymarket internal matching — not product claims.
 */

/** Lowercase + NFKD strip diacritics + collapse non-alnum to spaces. */
export function normalizeComparableText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Find which team name appears in free text. Prefer longer names first so
 * "New York" does not steal "New York Knicks".
 */
export function findMatchingTeamInText(
  text: string,
  teamNames: readonly string[],
): string | null {
  const hay = normalizeComparableText(text);
  if (!hay) return null;
  const sorted = [...teamNames]
    .filter((t) => t.trim().length > 0)
    .sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const needle = normalizeComparableText(name);
    if (!needle) continue;
    if (hay === needle || hay.includes(` ${needle} `) || hay.startsWith(`${needle} `) || hay.endsWith(` ${needle}`) || hay.includes(needle)) {
      // Require whole-token match when needle is short (≤3 chars) to avoid "LA" in "LATE".
      if (needle.length <= 3) {
        const re = new RegExp(`(?:^|\\s)${needle}(?:\\s|$)`);
        if (!re.test(hay)) continue;
      }
      return name;
    }
  }
  return null;
}

/**
 * Cross-source team match for game-identity dedup: exact normalized name,
 * nickname last-token (≥4 chars, "Kansas City Chiefs" vs "Chiefs"), or
 * full-token prefix containment ("San Francisco" vs "San Francisco Giants" —
 * TheRundown city-style vs ESPN displayName). Deliberately does NOT alias
 * nickname-only rebrands ("Oakland" vs "Athletics") — that gap is healed
 * downstream by the settle cron's team-token recovery pass, never guessed here.
 */
export function comparableTeamsMatch(a: string, b: string): boolean {
  const na = normalizeComparableText(a);
  const nb = normalizeComparableText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = na.split(" ");
  const tb = nb.split(" ");
  const lastA = ta[ta.length - 1] ?? "";
  const lastB = tb[tb.length - 1] ?? "";
  if (lastA.length >= 4 && lastA === lastB) return true;
  // Prefix containment: every token of the shorter name, in order, prefixes the longer.
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length === long.length) return false;
  return short.every((tok, i) => tok === long[i]);
}

export type GameIdentityCandidate = {
  readonly externalId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTimeMs: number;
};

/**
 * Match an incoming (home, away, commence) against existing game rows across
 * externalId conventions. Returns the single best candidate within `windowMs`,
 * or null when none match — or when MORE THAN ONE candidate ties at a
 * commence-time delta within `ambiguityMs` of the best (e.g. "New York" could
 * be either New York club): ambiguous input must NOT dedup onto a guess.
 */
export function matchGameByTeamsAndTime(
  candidates: readonly GameIdentityCandidate[],
  target: { homeTeam: string; awayTeam: string; commenceTimeMs: number },
  windowMs: number,
  ambiguityMs = 60 * 60 * 1000,
): GameIdentityCandidate | null {
  if (!Number.isFinite(target.commenceTimeMs)) return null;
  const matches: Array<{ candidate: GameIdentityCandidate; delta: number }> = [];
  for (const candidate of candidates) {
    if (!comparableTeamsMatch(target.homeTeam, candidate.homeTeam)) continue;
    if (!comparableTeamsMatch(target.awayTeam, candidate.awayTeam)) continue;
    const delta = Math.abs(candidate.commenceTimeMs - target.commenceTimeMs);
    if (delta <= windowMs) matches.push({ candidate, delta });
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => a.delta - b.delta);
  const best = matches[0]!;
  const rival = matches[1];
  if (rival && rival.delta - best.delta <= ambiguityMs) return null;
  return best.candidate;
}

/** Parse "101-98" / "3-1" style scores from free text. */
export function parseSportsScore(text: string): { home: number; away: number } | null {
  const m = text.match(/\b(\d{1,3})\s*[-–:]\s*(\d{1,3})\b/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { away: a, home: b };
}
