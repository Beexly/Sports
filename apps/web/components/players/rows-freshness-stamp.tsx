/**
 * Rows + freshness stamp — one consistent, honest line under every Player Lab
 * table: how many rows the table is rendering, and how fresh the data behind it
 * is (e.g. "142 rows · updated 3h ago · nflverse").
 *
 * Honesty rules (project: no fake data):
 * - `rows` is the real length of the loaded row array — never an estimate.
 * - `asOf` must come from the loader's own `generatedAt` (or equivalent)
 *   timestamp. If it is absent or unparseable we show the row count ONLY —
 *   we never invent a time.
 */
export interface RowsFreshnessStampProps {
  /** Number of rows actually rendered by the table. */
  readonly rows: number;
  /** Data freshness timestamp from the loaded data (e.g. loader generatedAt). */
  readonly asOf?: Date | string | null;
  /** Optional source label appended to the stamp (e.g. "nflverse"). */
  readonly source?: string;
}

/** Parse `asOf` defensively; null when absent or invalid (then: rows only). */
function parseAsOf(asOf: Date | string | null | undefined): Date | null {
  if (asOf == null) return null;
  const date = asOf instanceof Date ? asOf : new Date(asOf);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Human freshness label. Coarse buckets keep server/client renders stable:
 * "updated just now" (<90s), "updated Xm ago", "updated Xh ago",
 * "updated Xd ago" (<14d), then "as of YYYY-MM-DD" (UTC) for anything older.
 */
export function freshnessLabel(asOf: Date, now: Date): string {
  const elapsedMs = Math.max(0, now.getTime() - asOf.getTime());
  const minutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMs < 90_000) return "updated just now";
  if (minutes < 60) return `updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `updated ${days}d ago`;
  return `as of ${asOf.toISOString().slice(0, 10)}`;
}

const ROWS_FORMATTER = new Intl.NumberFormat("en-US");

/**
 * The stamp itself. Pure presentational (no hooks) so it renders identically
 * from server and client components.
 */
export function RowsFreshnessStamp({ rows, asOf, source }: RowsFreshnessStampProps): JSX.Element {
  const date = parseAsOf(asOf);
  const parts: string[] = [`${ROWS_FORMATTER.format(rows)} row${rows === 1 ? "" : "s"}`];
  if (date) parts.push(freshnessLabel(date, new Date()));
  if (source) parts.push(source);

  return (
    <p
      data-testid="rows-freshness-stamp"
      className="font-mono text-xs tracking-wide text-ion-2"
      title={date ? date.toISOString() : undefined}
      suppressHydrationWarning
    >
      {parts.join(" · ")}
    </p>
  );
}

export default RowsFreshnessStamp;
