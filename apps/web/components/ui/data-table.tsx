"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toneClass, toneRowClass, type SignalTone } from "@/lib/intelligence/colors";

/**
 * Generic, typed, dependency-light data table.
 *
 * Two surfaces via the `variant` prop:
 *   - "paper" (default): the LIGHT data surface (text-ink on white). All text is
 *     AA on paper (text-ink / ink-1 / ink-2 only).
 *   - "dark": the cosmic surface (ion tokens on eclipse/carbon). Use this when the
 *     table sits on a dark page (e.g. the Player Lab) so identifier cells rendered
 *     with on-dark tokens are not white-on-white (the 1.07:1 failure this fixes).
 *
 * Design intent (FantasyPros / PFF / Stathead): the data is the hero, chrome is
 * quiet, density is generous (py-3.5), numerics are tabular mono and
 * right-aligned, sort/filter are strong and obvious.
 */

export type ColumnAlign = "left" | "right" | "center";

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

export type DataTableVariant = "paper" | "dark";

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
  /**
   * Screen-reader table caption (rendered sr-only). Gives the table an
   * accessible name for AT users who navigate by table; visible headings
   * outside the table do not attach to it.
   */
  caption?: string;
  /** Show the 1-based rank "#" column. */
  showRank?: boolean;
  /** Extra className on the scroll container. */
  className?: string;
  /** min-width for the scrollable table (keeps columns from crushing). */
  minWidth?: number;
  /**
   * Surface theme. "paper" (default) = light data surface. "dark" = the cosmic
   * surface (ion tokens on eclipse/carbon) — use when the table sits on a dark
   * page so cells are not rendered white-on-white.
   */
  variant?: DataTableVariant;
}

// ── Surface tokens by variant ────────────────────────────────────────────────

interface SurfaceTokens {
  shell: string;
  panel: string;
  input: string;
  headBg: string;
  headBorder: string;
  headText: string;
  headStrong: string;
  text: string;
  muted: string;
  rowBorder: string;
  zebra: string;
  raised: string;
  rowHover: string;
  active: string;
  hoverText: string;
  glyphMuted: string;
  ring: string;
}

const SURFACE: Record<DataTableVariant, SurfaceTokens> = {
  paper: {
    shell: "border-paper-border bg-paper-raised",
    panel: "border-paper-border bg-paper",
    input:
      "border-paper-border bg-paper-raised text-ink placeholder:text-ink-2 focus:border-ink-1 focus:ring-ink-1/20",
    headBg: "bg-paper-sunken",
    headBorder: "border-paper-border",
    headText: "text-ink-2",
    headStrong: "text-ink-1",
    text: "text-ink",
    muted: "text-ink-2",
    rowBorder: "border-paper-border/70",
    zebra: "bg-paper-sunken/60",
    raised: "bg-paper-raised",
    rowHover: "hover:bg-paper-sunken",
    active: "text-ink",
    hoverText: "hover:text-ink",
    glyphMuted: "text-ink-2/50",
    ring: "focus:ring-ink-1/20",
  },
  dark: {
    shell: "border-mineral bg-eclipse",
    panel: "border-mineral bg-carbon",
    input:
      "border-mineral bg-eclipse text-ion-white placeholder:text-ion-2 focus:border-orbital-cyan focus:ring-orbital-cyan/25",
    headBg: "bg-carbon",
    headBorder: "border-mineral",
    headText: "text-ion-2",
    headStrong: "text-ion-1",
    text: "text-ion-white",
    muted: "text-ion-2",
    rowBorder: "border-mineral/70",
    zebra: "bg-carbon/40",
    raised: "bg-eclipse",
    rowHover: "hover:bg-eclipse/60",
    active: "text-orbital-cyan",
    hoverText: "hover:text-orbital-cyan",
    glyphMuted: "text-ion-2/50",
    ring: "focus:ring-orbital-cyan/25",
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
  mutedClass,
  activeClass,
}: {
  active: boolean;
  dir: SortDir;
  mutedClass: string;
  activeClass: string;
}): JSX.Element {
  if (!active) return <span className={`ml-1 ${mutedClass}`}>↕</span>;
  return <span className={`ml-1 ${activeClass}`}>{dir === "asc" ? "▲" : "▼"}</span>;
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
    caption,
    showRank = false,
    className = "",
    minWidth,
    variant = "paper",
  } = props;

  const t = SURFACE[variant];

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
    <div className={`overflow-hidden rounded-ds-md border ${t.shell} ${className}`}>
      {hasFilters ? (
        <div className={`flex flex-col gap-3 border-b ${t.panel} px-4 py-3 sm:flex-row sm:items-center`}>
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
            <label className={`flex items-center gap-2 text-xs font-medium ${t.headStrong}`}>
              <span>{enumFilter.label}</span>
              <select
                value={enumValue}
                onChange={(e) => setEnumValue(e.target.value)}
                className={`min-h-[36px] rounded-ds-sm border px-2 text-sm focus:outline-none focus:ring-2 ${t.input}`}
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
          <span className={`text-xs tabular-nums ${t.muted}`}>
            {visibleRows.length} {visibleRows.length === 1 ? "row" : "rows"}
          </span>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm" style={tableStyle}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className={`sticky top-0 z-10 ${t.headBg}`}>
            <tr className={`border-b ${t.headBorder}`}>
              {showRank ? (
                <th
                  scope="col"
                  className={`px-4 py-3 text-right font-mono text-xs font-semibold uppercase tracking-wider ${t.headText}`}
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
                    className={`px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider ${t.headStrong} ${align}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => setSort((cur) => nextSort(cur, col.key))}
                        className={`inline-flex items-center gap-0.5 rounded-ds-xs ${t.hoverText} focus:outline-none focus:ring-2 ${t.ring} ${
                          align === "text-right" ? "flex-row-reverse" : ""
                        } ${active ? t.active : ""}`}
                      >
                        <span>{col.label}</span>
                        <SortGlyph
                          active={active}
                          dir={sort?.dir ?? "desc"}
                          mutedClass={t.glyphMuted}
                          activeClass={t.active}
                        />
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
                  <p className={`text-sm font-medium ${t.text}`}>{emptyTitle}</p>
                  {emptyHint ? <p className={`mt-1 text-xs ${t.muted}`}>{emptyHint}</p> : null}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, i) => {
                const tone = rowTone?.(row) ?? null;
                const tint = tone ? toneRowClass(tone, variant) : "";
                const zebra = i % 2 === 1 ? t.zebra : t.raised;
                return (
                  <tr
                    key={rowKey(row, i)}
                    title={rowTitle?.(row)}
                    className={`border-b ${t.rowBorder} last:border-0 ${tint || zebra} ${t.rowHover}`}
                  >
                    {showRank ? (
                      <td className={`px-4 py-3.5 text-right font-mono text-xs tabular-nums ${t.muted}`}>
                        {i + 1}
                      </td>
                    ) : null}
                    {columns.map((col) => {
                      const align = alignClass(col.align);
                      const isNumeric = col.numeric ?? col.align === "right";
                      const numericClass = isNumeric ? "font-mono tabular-nums" : "";
                      const content = col.render
                        ? col.render(row, i)
                        : defaultCell((row as Record<string, unknown>)[col.key], t.muted);
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3.5 text-sm ${t.text} ${align} ${numericClass}`}
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

function defaultCell(value: unknown, mutedClass = "text-ink-2"): ReactNode {
  if (value == null) return <span className={mutedClass}>—</span>;
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
