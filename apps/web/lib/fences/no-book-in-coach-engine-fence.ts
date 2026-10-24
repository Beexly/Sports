/**
 * Two-Class Firewall — Class A pure football engine must not import market prices.
 *
 * CI fails if any file under packages/prediction-engine/src/coach-engine/,
 * engine/, or data/ imports OddsInput or references spread_line, total_line,
 * marketFairProb, clv, bookmaker, americanOdds, or deVig.
 *
 * This is the compile-time guard for the Belichick-Adams inversion.
 */

export const FORBIDDEN_TOKENS = [
  "OddsInput",
  "spread_line",
  "total_line",
  "marketFairProb",
  "clv",
  "bookmaker",
  "americanOdds",
  "deVig",
] as const;

export function assertNoBookInCoachEngine(source: string, path: string): void {
  for (const token of FORBIDDEN_TOKENS) {
    if (source.includes(token)) {
      throw new Error(
        `Class A fence violation in ${path}: forbidden token "${token}" detected. Books stay at Step N.`
      );
    }
  }
}
