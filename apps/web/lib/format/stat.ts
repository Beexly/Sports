/**
 * Canonical numeric formatting for public stat surfaces.
 *
 * Owner standard (docs/POLISH_BACKLOG.md #4): performance/calibration surfaces
 * render numerals in tabular figures with one consistent decimal policy:
 *   - rates / percentages → one decimal ("57.3%")
 *   - probability scores (Brier) → three decimals; one decimal erases meaning
 *   - counts → grouped integers ("1,204")
 * Apply NUMERIC_TEXT_CLASS to any element whose content is a formatted number
 * so digits align in columns. Missing data renders the em-dash placeholder —
 * never "0", never "N/A".
 */

export const NUMERIC_TEXT_CLASS = "font-numerals tabular-nums";

export const STAT_PLACEHOLDER = "—";

/** Breakeven win percentage at standard -110 pricing. */
export const BREAKEVEN_WIN_PCT = 52.4;

const countFormatter = new Intl.NumberFormat("en-US");

function isRenderable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Percentage points (0–100) → "57.3%". */
export function formatPercent(value: number | null | undefined): string {
  if (!isRenderable(value)) return STAT_PLACEHOLDER;
  return `${value.toFixed(1)}%`;
}

/** Ratio (0–1) → "57.3%". */
export function formatRatioAsPercent(ratio: number | null | undefined): string {
  if (!isRenderable(ratio)) return STAT_PLACEHOLDER;
  return formatPercent(ratio * 100);
}

/** Integer count → "1,204". */
export function formatCount(value: number | null | undefined): string {
  if (!isRenderable(value)) return STAT_PLACEHOLDER;
  return countFormatter.format(Math.round(value));
}

/** Brier score → "0.213". The sanctioned three-decimal exception. */
export function formatBrier(value: number | null | undefined): string {
  if (!isRenderable(value)) return STAT_PLACEHOLDER;
  return value.toFixed(3);
}

/** Generic one-decimal scalar (edge scores, deltas) → "7.5". */
export function formatScalar(value: number | null | undefined): string {
  if (!isRenderable(value)) return STAT_PLACEHOLDER;
  return value.toFixed(1);
}

/**
 * Win rate in percentage points from W/L counts. Pushes are excluded from the
 * denominator by policy (reported separately). Null until a decided pick
 * exists — never 0%, which would read as a real record.
 */
export function winRatePct(wins: number, losses: number): number | null {
  const decided = wins + losses;
  return decided > 0 ? (wins / decided) * 100 : null;
}

/**
 * Semantic tone for a win rate, anchored on the -110 breakeven — the honest
 * line, not a marketing one. Cyan = clear signal, ion = above water,
 * caution = above coin-flip but below breakeven, alert = underwater.
 * Doctrine: cyan never marks danger; green/red casino ramps are banned.
 */
export function winRateToneClass(ratePct: number | null | undefined): string {
  if (!isRenderable(ratePct)) return "text-ion-2";
  if (ratePct >= 55) return "text-orbital-cyan";
  if (ratePct >= BREAKEVEN_WIN_PCT) return "text-ion-white";
  if (ratePct >= 50) return "text-caution";
  return "text-alert";
}
