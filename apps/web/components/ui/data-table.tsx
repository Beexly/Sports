"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toneClass, toneRowClass, type SignalTone } from "@/lib/intelligence/colors";

/**
 * Generic, typed, dependency-light data table for the shared data surfaces.
 * Every board page hand-rolled its own table (sticky header, zebra rows,
 * right-aligned numerics, source-error empty state); this is the shared one
 * they should all use.
 *
 * Design intent (FantasyPros / PFF / Stathead): the data is the hero, chrome is
 * quiet, density is generous (py-3.5), numerics are tabular mono and
 * right-aligned, sort/filter are strong and obvious.
 *
 * Surfaces: `surface="light"` (default) is the "paper" skin — all text AA on
 * paper (text-ink / ink-1 / ink-2 only). `surface="dark"` is the "carbon" skin
 * used by the Player Lab (carbon/eclipse backgrounds, mineral hairlines, the
 * ion text scale, and white/[0.03] zebra rows) — the same token set the Player
 * Lab previously applied from the outside via `!`-important descendant
 * overrides, now owned by the component.
 */

export type ColumnAlign = "left" | "right" | "center";

/** Surface the table renders on: light "paper" (default) or dark "carbon". */
export type TableSurface = "light" | "dark";

export interface Column<Row> {
  /** Stable key; also the default sort accessor when `sortValue` is omitted. */
  key: string;
  /** Header label. Kept short; the table renders headers at 12px. */
  label: string;
  /** left (default) | right (numerics) | center. */
  align?: ColumnAlign;
  /** Cell renderer. Falls back to String((row as any)[key]) if omitted. */
  render?: (row: Row, index: number) => ReactNode;
  /** Whether this column participates in click-to-sort. */
  sortable?: boolean;
  /** Native title tooltip on the header cell (abbreviation gloss). */
  tooltip?: string;
  /**
   * Value used for sorting / numeric formatting. Defaults to (row as any)[key].
   * Return a number for numeric sort, a string for locale sort, null to sink.
   */
  sortValue?: (row: Row) => number | string | null;
  /** Render numerics in tabular mono. Auto-true when align === "right". */
  numeric?: boolean;
}

export type SortDir = "asc" | "desc";

export interface SortState {
  key: string;
  dir: SortDir;
}

export interface FilterOption {
  /** Distinct field for an enum filter (e.g. position). */
  value: string;
  label: string;
}

export interface DataTableProps<Row> {
  columns: ReadonlyArray<Column<Row>>;
  rows: ReadonlyArray<Row>;
  /** Stable React key per row. */
  rowKey: (row: Row, index: number) => string;
  /** Optional default sort. */
  initialSort?: SortState;
  /** Show a free-text filter box; predicate decides which fields to match. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Returns the haystack string for free-text search of a row. */
  searchAccessor?: (row: Row) => string;
  /** Optional enum filter (e.g. by position). */
  enumFilter?: {
    label: string;
    options: ReadonlyArray<FilterOption>;
    accessor: (row: Row) => string;
  };
  /** Optional per-row accent tone (e.g. a top buy signal) -> subtle row tint. */
  rowTone?: (row: Row) => SignalTone | null;
  /** Native title tooltip per row. */
  rowTitle?: (row: Row) => string | undefined;
  /** Empty-state copy when there are zero rows (before filtering). */
  emptyTitle?: string;
  emptyHint?: string;
  /** Show the 1-based rank "#" column. */
  showRank?: boolean;
  /** Extra className on the scroll container. */
  className?: string;
  /** min-width for the scrollable table (keeps columns from crushing). */
  minWidth?: number;
  /** Surface skin: light "paper" (default) or dark "carbon". */
  surface?: TableSurface;
}

// ── Surface token sets ────────────────────────────────────────────────────────

/**
 * Every surface-dependent class the table emits, resolved once per render from
 * the `surface` prop. The dark set mirrors exactly what the Player Lab used to
 * force through `!`-important descendant overrides (see player-lab-table.tsx
 * history): paper→carbon/eclipse backgrounds, paper-border→mineral hairlines,
 * ink→ion text scale, white/[0.03] zebra, emerald/rose-500/10 tone tints.
 */
interface SurfaceTokens {
  /** Wrapper card: border + background. */
  container: string;
  /** Filter bar (search/enum) strip. */
  filterBar: string;
  /** Search input. */
  input: string;
  /** Enum <select>. */
  select: string;
  /** Enum filter label text. */
  enumLabel: string;
  /** "N rows" count text. */
  rowCount: string;
  /** Sticky <thead> background. */
  thead: string;
  /** Header row bottom border. */
  headerRowBorder: string;
  /** Rank "#" header cell text. */
  rankHeader: string;
  /** Header cell text. */
  th: string;
  /** Active (sorted) header text. */
  thActive: string;
  /** Sort button hover/focus. */
  sortButton: string;
  /** Sort glyph when the column is inactive / active. */
  glyphIdle: string;
  glyphActive: string;
  /** Empty-state title / hint text. */
  emptyTitle: string;
  emptyHint: string;
  /** Body row border + hover. */
  rowBorder: string;
  rowHover: string;
  /** Zebra striping: odd-index rows (visual even) / even-index rows. */
  zebraOdd: string;
  zebraEven: string;
  /** Rank "#" body cell text. */
  rankCell: string;
  /** Data cell text. */
  cellText: string;
  /** Muted "—" for null default cells. */
  nullCell: string;
  /** Subtle row tint for an accented tone. */
  toneRow: (tone: SignalTone) => string;
}

const SURFACE_TOKENS: Record<TableSurface, SurfaceTokens> = {
  light: {
    container: "border-paper-border bg-paper-raised",
    filterBar: "border-paper-border bg-paper",
    input:
      "border-paper-border bg-paper-raised text-ink placeholder:text-ink-2 focus:border-ink-1 focus:ring-ink-1/20",
    select:
      "border-paper-border bg-paper-raised text-ink focus:border-ink-1 focus:ring-ink-1/20",
    enumLabel: "text-ink-1",
    rowCount: "text-ink-2",
    thead: "bg-paper-sunken",
    headerRowBorder: "border-paper-border",
    rankHeader: "text-ink-2",
    th: "text-ink-1",
    thActive: "text-ink",
    sortButton: "hover:text-ink focus:ring-ink-1/20",
    glyphIdle: "text-ink-2/50",
    glyphActive: "text-ink",
    emptyTitle: "text-ink",
    emptyHint: "text-ink-2",
    rowBorder: "border-paper-border/70",
    rowHover: "hover:bg-paper-sunken",
    zebraOdd: "bg-paper-sunken/60",
    zebraEven: "bg-paper-raised",
    rankCell: "text-ink-2",
    cellText: "text-ink",
    nullCell: "text-ink-2",
    toneRow: toneRowClass,
  },
  dark: {
    container: "border-mineral bg-eclipse",
    filterBar: "border-mineral bg-carbon",
    input:
      "border-mineral bg-eclipse text-ion placeholder:text-ion-3 focus:border-ion-1 focus:ring-ion-1/20",
    select: "border-mineral bg-eclipse text-ion focus:border-ion-1 focus:ring-ion-1/20",
    enumLabel: "text-ion-1",
    rowCount: "text-ion-2",
    thead: "bg-carbon",
    headerRowBorder: "border-mineral",
    rankHeader: "text-ion-2",
    th: "text-ion-1",
    thActive: "text-ion",
    sortButton: "hover:text-ion-white focus:ring-ion-1/20",
    glyphIdle: "text-ion-2/50",
    glyphActive: "text-ion",
    emptyTitle: "text-ion",
    emptyHint: "text-ion-2",
    rowBorder: "border-mineral",
    rowHover: "hover:bg-white/[0.06]",
    zebraOdd: "bg-white/[0.03]",
    zebraEven: "bg-eclipse",
    rankCell: "text-ion-2",
    cellText: "text-ion",
    nullCell: "text-ion-2",
    toneRow: (tone) =>
      tone === "good" ? "bg-emerald-500/10" : tone === "bad" ? "bg-rose-500/10" : "",
  },
};

// ── Pure helpers (exported for unit testing) ─────────────────────────────────

/** Resolve the sort value for a row+column, falling back to the keyed field. */
export function columnSortValue<Row>(column: Column<Row>, row: Row): number | string | null {
  if (column.sortValue) return column.sortValue(row);
  const raw = (row as Record<string, unknown>)[column.key];
  if (raw == null) return null;
  if (typeof raw === "number" || typeof raw === "string") return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  return String(raw);
}

/**
 * Stable comparator. Nulls always sink to the bottom regardless of direction.
 * Numbers compare numerically; everything else compares as a locale string.
 */
export function compareValues(
  a: number | string | null,
  b: number | string | null,
  dir: SortDir,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls sink
  if (b == null) return -1;
  let cmp: number;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { numeric: true });
  }
  return dir === "asc" ? cmp : -cmp;
}

/** Sort rows by a column. Returns a NEW array; input is not mutated. */
export function sortRows<Row>(
  rows: ReadonlyArray<Row>,
  columns: ReadonlyArray<Column<Row>>,
  sort: SortState | null,
): Row[] {
  const out = rows.slice();
  if (!sort) return out;
  const column = columns.find((c) => c.key === sort.key);
  if (!column) return out;
  // Decorate-sort-undecorate keeps it stable across engines and cheap on re-sort.
  return out
    .map((row, index) => ({ row, index, value: columnSortValue(column, row) }))
    .sort((x, y) => {
      const c = compareValues(x.value, y.value, sort.dir);
      return c !== 0 ? c : x.index - y.index; // stable tiebreak
    })
    .map((d) => d.row);
}

/** True if `haystack` contains the trimmed, case-insensitive `query`. */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return haystack.toLowerCase().includes(q);
}

/** Apply free-text + enum filters. Returns a NEW array. */
export function filterRows<Row>(
  rows: ReadonlyArray<Row>,
  opts: {
    query?: string;
    searchAccessor?: (row: Row) => string;
    enumValue?: string; // "" / "all" means no enum filter
    enumAccessor?: (row: Row) => string;
  },
): Row[] {
  const { query = "", searchAccessor, enumValue, enumAccessor } = opts;
  const enumActive = enumValue != null && enumValue !== "" && enumValue !== "all";
  return rows.filter((row) => {
    if (searchAccessor && !matchesQuery(searchAccessor(row), query)) return false;
    if (enumActive && enumAccessor && enumAccessor(row) !== enumValue) return false;
    return true;
  });
}

/** Next sort state when a header is clicked (toggle dir, or switch column). */
export function nextSort(current: SortState | null, key: string): SortState {
  if (current && current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  // New numeric-leaning column: default to descending (leaders first).
  return { key, dir: "desc" };
}

// ── Component ────────────────────────────────────────────────────────────────

function alignClass(align: ColumnAlign | undefined): string {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function SortGlyph({
  active,
  dir,
  tokens,
}: {
  active: boolean;
  dir: SortDir;
  tokens: SurfaceTokens;
}): JSX.Element {
  if (!active) return <span className={`ml-1 ${tokens.glyphIdle}`}>↕</span>;
  return <span className={`ml-1 ${tokens.glyphActive}`}>{dir === "asc" ? "▲" : "▼"}</span>;
}

export function DataTable<Row>(props: DataTableProps<Row>): JSX.Element {
  const {
    columns,
    rows,
    rowKey,
    initialSort = null,
    searchable = false,
    searchPlaceholder = "Filter…",
    searchAccessor,
    enumFilter,
    rowTone,
    rowTitle,
    emptyTitle = "No rows in the source window.",
    emptyHint,
    showRank = false,
    className = "",
    minWidth,
    surface = "light",
  } = props;

  const t = SURFACE_TOKENS[surface];

  const [sort, setSort] = useState<SortState | null>(initialSort);
  const [query, setQuery] = useState("");
  const [enumValue, setEnumValue] = useState<string>("all");

  const visibleRows = useMemo(() => {
    const filtered = filterRows(rows, {
      query,
      searchAccessor,
      enumValue,
      enumAccessor: enumFilter?.accessor,
    });
    return sortRows(filtered, columns, sort);
  }, [rows, columns, sort, query, enumValue, searchAccessor, enumFilter]);

  const hasFilters = searchable || Boolean(enumFilter);
  const tableStyle = minWidth ? { minWidth: `${minWidth}px` } : undefined;

  return (
    <div className={`overflow-hidden rounded-ds-md border ${t.container} ${className}`}>
      {hasFilters ? (
        <div
          className={`flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center ${t.filterBar}`}
        >
          {searchable ? (
            <label className="flex flex-1 items-center gap-2">
              <span className="sr-only">Filter rows</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className={`min-h-[36px] w-full rounded-ds-sm border px-3 text-sm focus:outline-none focus:ring-2 ${t.input}`}
              />
            </label>
          ) : null}
          {enumFilter ? (
            <label className={`flex items-center gap-2 text-xs font-medium ${t.enumLabel}`}>
              <span>{enumFilter.label}</span>
              <select
                value={enumValue}
                onChange={(e) => setEnumValue(e.target.value)}
                className={`min-h-[36px] rounded-ds-sm border px-2 text-sm focus:outline-none focus:ring-2 ${t.select}`}
              >
                <option value="all">All</option>
                {enumFilter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <span className={`text-xs tabular-nums ${t.rowCount}`}>
            {visibleRows.length} {visibleRows.length === 1 ? "row" : "rows"}
          </span>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm" style={tableStyle}>
          <thead className={`sticky top-0 z-10 ${t.thead}`}>
            <tr className={`border-b ${t.headerRowBorder}`}>
              {showRank ? (
                <th
                  scope="col"
                  className={`px-4 py-3 text-right font-mono text-xs font-semibold uppercase tracking-wider ${t.rankHeader}`}
                >
                  #
                </th>
              ) : null}
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const align = alignClass(col.align);
                const sortable = col.sortable !== false; // default sortable
                return (
                  <th
                    key={col.key}
                    scope="col"
                    title={col.tooltip}
                    aria-sort={
                      active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={`px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider ${t.th} ${align}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => setSort((cur) => nextSort(cur, col.key))}
                        className={`inline-flex items-center gap-0.5 rounded-ds-xs focus:outline-none focus:ring-2 ${t.sortButton} ${
                          align === "text-right" ? "flex-row-reverse" : ""
                        } ${active ? t.thActive : ""}`}
                      >
                        <span>{col.label}</span>
                        <SortGlyph active={active} dir={sort?.dir ?? "desc"} tokens={t} />
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showRank ? 1 : 0)}
                  className="px-4 py-10 text-center"
                >
                  <p className={`text-sm font-medium ${t.emptyTitle}`}>{emptyTitle}</p>
                  {emptyHint ? (
                    <p className={`mt-1 text-xs ${t.emptyHint}`}>{emptyHint}</p>
                  ) : null}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, i) => {
                const tone = rowTone?.(row) ?? null;
                const tint = tone ? t.toneRow(tone) : "";
                const zebra = i % 2 === 1 ? t.zebraOdd : t.zebraEven;
                return (
                  <tr
                    key={rowKey(row, i)}
                    title={rowTitle?.(row)}
                    className={`border-b ${t.rowBorder} last:border-0 ${tint || zebra} ${t.rowHover}`}
                  >
                    {showRank ? (
                      <td
                        className={`px-4 py-3.5 text-right font-mono text-xs tabular-nums ${t.rankCell}`}
                      >
                        {i + 1}
                      </td>
                    ) : null}
                    {columns.map((col) => {
                      const align = alignClass(col.align);
                      const isNumeric = col.numeric ?? col.align === "right";
                      const numericClass = isNumeric ? "font-mono tabular-nums" : "";
                      const content = col.render
                        ? col.render(row, i)
                        : defaultCell((row as Record<string, unknown>)[col.key], t);
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3.5 text-sm ${t.cellText} ${align} ${numericClass}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function defaultCell(value: unknown, tokens: SurfaceTokens): ReactNode {
  if (value == null) return <span className={tokens.nullCell}>—</span>;
  return String(value);
}

/**
 * Convenience: a span that colors a cell value by signal tone. Lets callers
 * keep tone logic in `lib/intelligence/colors` instead of inlining classes.
 */
export function ToneCell({
  tone,
  children,
  bold = true,
}: {
  tone: SignalTone;
  children: ReactNode;
  bold?: boolean;
}): JSX.Element {
  return <span className={`${toneClass(tone)} ${bold ? "font-semibold" : ""}`}>{children}</span>;
}
