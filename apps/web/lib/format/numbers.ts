/**
 * Shared number formatting for the performance & calibration surfaces.
 *
 * Owner directive (docs/POLISH_BACKLOG.md #4): unify number formatting —
 * tabular-nums everywhere, one decimal standard. Every stat rendered on
 * /performance and the calibration panel goes through these helpers so
 * columns align and precision is consistent.
 *
 * Conventions:
 *   - One decimal is the default everywhere; callers may override `digits`.
 *   - Missing values (null / undefined / non-finite) render as an em-dash "—"
 *     so empty cells stay visually distinct from zero.
 *   - `pct` expects values already on the 0–100 percent scale
 *     (e.g. 54.32 → "54.3%"). Multiply fractions by 100 at the call site.
 */

/** Tailwind utility applied to every element rendering a number/stat. */
export const TABULAR = "tabular-nums" as const;

/** Rendered for null/undefined/NaN/Infinity inputs. */
export const EM_DASH = "—" as const;

type Numeric = number | null | undefined;

function present(value: Numeric): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Format a percent-scale value (0–100) with a trailing "%".
 * pct(54.32) → "54.3%" · pct(null) → "—"
 */
export function pct(value: Numeric, digits = 1): string {
  if (!present(value)) return EM_DASH;
  return `${value.toFixed(digits)}%`;
}

/**
 * Format a plain decimal. dec(2.345) → "2.3" · dec(0.187, 3) → "0.187"
 */
export function dec(value: Numeric, digits = 1): string {
  if (!present(value)) return EM_DASH;
  return value.toFixed(digits);
}

/**
 * Format a decimal with an explicit sign for positive values.
 * signed(1.25) → "+1.3" · signed(-1.25) → "-1.3" · signed(0) → "0.0"
 * Values that round to zero render unsigned (never "-0.0").
 */
export function signed(value: Numeric, digits = 1): string {
  if (!present(value)) return EM_DASH;
  // Round first so the sign reflects the rendered value, not the raw one.
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return (0).toFixed(digits);
  const fixed = rounded.toFixed(digits);
  return rounded > 0 ? `+${fixed}` : fixed;
}

/**
 * Format an integer (rounds), with en-US thousands grouping.
 * int(1234.6) → "1,235" · int(null) → "—"
 */
export function int(value: Numeric): string {
  if (!present(value)) return EM_DASH;
  return Math.round(value).toLocaleString("en-US");
}
