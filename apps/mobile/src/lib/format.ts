import { glyph } from "../theme/tokens";

/**
 * Number and label formatting.
 *
 * The design contract is unusually specific here, and every rule below is a
 * direct port rather than a preference:
 *
 *   · "real minus `−`" — U+2212, not the ASCII hyphen. A hyphen next to a
 *     digit is a range separator in finance typography and reads as one.
 *   · tabular numerals everywhere numeric (enforced at the style layer, but
 *     these helpers exist so the VALUE is already canonical before it is set).
 *   · win/loss/push/void render as monograms W/L/P/V, never ✓/✗.
 *   · confidence is a SCORE out of 100, never a percent sign. Rendering it
 *     with `%` is the single most damaging thing this app could do: measured
 *     2026-09-13, the top confidence band claimed 0.8663 and realized 0.5191
 *     (z = −10.7), so a percent rendering states a win probability the number
 *     demonstrably is not. See AGENTS.md, 2026-09-13.
 */

const MINUS = glyph.minus;

/** Canonical signed number with a real minus and fixed decimals. */
export function signed(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return "0";
  const abs = Math.abs(rounded).toFixed(decimals);
  return rounded < 0 ? `${MINUS}${abs}` : `+${abs}`;
}

/** Unsigned number. Em dash for a non-finite value — never "NaN" on screen. */
export function num(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

/** Probability 0..1 → "52.4%". Only for genuine probabilities. */
export function pct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * A confidence SCORE, never a percent.
 *
 * Returns "72/100". Deliberately not "72%", not "0.72", not "72".
 * Renders an em dash when the viewer is not entitled to confidence, so a
 * redaction can never be mistaken for a real value of zero.
 */
export function confidenceScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}/100`;
}

/**
 * American odds with the correct sign.
 * Negative odds take the real minus. Positive odds take an explicit plus.
 */
export function american(odds: number | null | undefined): string {
  if (odds === null || odds === undefined || !Number.isFinite(odds)) return "—";
  const v = Math.round(odds);
  if (v > 0) return `+${v}`;
  if (v < 0) return `${MINUS}${Math.abs(v)}`;
  return "0";
}

/** Decimal odds, e.g. 1.91. Used for market-implied arithmetic, not display-first. */
export function decimalOdds(odds: number | null | undefined): string {
  return num(odds, 2);
}

/**
 * A spread or run-line value. Always signed, always one decimal.
 * "+3.5", "−1.5", "PK".
 */
export function line(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.001) return "PK";
  return signed(value, 1);
}

/**
 * Signed edge / expected-CLV value in the "percentage points" idiom the
 * research docs use. Note: this is a difference of probabilities expressed in
 * points, NOT a probability — the label must always travel with the unit.
 */
export function edgePoints(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return signed(value, 4);
}

export function ratio(value: number | null | undefined, decimals = 3): string {
  return num(value, decimals);
}

/** Byte-size-free relative time for freshness stamps. */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 45) return "just now";
  if (seconds < 90) return "1 min ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * Absolute stamp for a freshness footer. Always emitted, never "just now"
 * alone: rule 5 requires a timestamp the user can check.
 */
export function stamp(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  });
  return `${date}, ${time}`;
}

/** The exact freshness sentence every data card must carry. */
export function freshnessLine(iso: string | null | undefined, now: Date = new Date()): string {
  const absolute = stamp(iso);
  // An unparseable or missing stamp must not render as "Data as of — (—)":
  // that reads like a rendering bug rather than a data gap, and this sentence
  // is the one that tells a customer how old the number in front of them is.
  if (absolute === "—") return "Data as of: unknown";
  return `Data as of ${absolute} (${relativeTime(iso, now)})`;
}

/**
 * Positional ordinal for a slate row, without a locale surprise.
 * "1st", "2nd", "3rd", "11th".
 */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Title-case a machine token from the API without breaking initialisms.
 *
 * CONTRACT: a word of three characters or fewer that is ALREADY all-caps is
 * preserved verbatim — that is the shape of an initialism an author typed
 * ("LA", "NFL", "UFC"). Everything longer is title-cased, so "LAKERS" becomes
 * "Lakers" rather than shouting. A lowercase short word is NOT promoted, so a
 * surname like "Ng" cannot be turned into "NG".
 *
 *   "LA_LAKERS"              → "LA Lakers"
 *   "americanfootball_nfl"   → "Americanfootball Nfl"
 *
 * That last one is a deliberate non-guess. Display names should arrive from the
 * server already cased; this is the fallback for raw slugs, and inventing a
 * league-abbreviation table here would be a second source of truth for team
 * names — the kind of drift this codebase spends real effort preventing.
 */
export function displayToken(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word.length <= 3 && word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

/**
 * Truncate for a dense row.
 *
 * Breaks at a word boundary when one exists inside the budget, because a
 * headline reading "Atlanta Falco…" looks like a layout bug while "Atlanta…"
 * looks deliberate. Falls back to a hard cut when the first word alone
 * exceeds the budget (a 40-character team name must still fit).
 */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const budget = Math.max(1, max - 1);
  const slice = text.slice(0, budget);
  const lastSpace = slice.lastIndexOf(" ");
  const body = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${body.trimEnd()}\u2026`;
}
