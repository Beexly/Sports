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

/** Parse "101-98" / "3-1" style scores from free text. */
export function parseSportsScore(text: string): { home: number; away: number } | null {
  const m = text.match(/\b(\d{1,3})\s*[-–:]\s*(\d{1,3})\b/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { away: a, home: b };
}
