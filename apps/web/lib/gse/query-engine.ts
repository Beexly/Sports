/**
 * GSE Query Engine — a Stathead-style "Finder": composable predicate filters over
 * a generic record set, with sort, limit, and saved-query serialization. The
 * query-UX gold standard, ranked the #2 feature gap. Pairs with the evidence
 * engine ("every game where X happened" → marshal the cases).
 *
 * Pure, dependency-free, tested. Companion doc: docs/research/GSE_2026_REMAINING_MODELS.md
 */

export type FilterOp = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "between";

export interface Predicate {
  readonly field: string;
  readonly op: FilterOp;
  /** Scalar for most ops; array for `in`/`between`; substring for `contains`. */
  readonly value: unknown;
}

export type SortDir = "asc" | "desc";

export interface Query {
  readonly filters: readonly Predicate[];
  readonly sortBy?: string;
  readonly sortDir?: SortDir;
  readonly limit?: number;
}

type Row = Record<string, unknown>;

function asNumber(v: unknown): number | null {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

/** Evaluate a single predicate against a record. Unknown fields fail to match. */
export function matchesPredicate(row: Row, p: Predicate): boolean {
  const v = row[p.field];
  switch (p.op) {
    case "eq":
      return v === p.value;
    case "ne":
      return v !== p.value;
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = asNumber(v);
      const b = asNumber(p.value);
      if (a === null || b === null) return false;
      return p.op === "gt" ? a > b : p.op === "gte" ? a >= b : p.op === "lt" ? a < b : a <= b;
    }
    case "in":
      return Array.isArray(p.value) && p.value.includes(v);
    case "contains":
      return typeof v === "string" && typeof p.value === "string" && v.toLowerCase().includes(p.value.toLowerCase());
    case "between": {
      const a = asNumber(v);
      if (a === null || !Array.isArray(p.value) || p.value.length !== 2) return false;
      const lo = asNumber(p.value[0]);
      const hi = asNumber(p.value[1]);
      if (lo === null || hi === null) return false;
      return a >= lo && a <= hi;
    }
    default:
      return false;
  }
}

/** A record passes a query when it satisfies EVERY filter (AND semantics). */
export function matchesQuery(row: Row, filters: readonly Predicate[]): boolean {
  for (const p of filters) if (!matchesPredicate(row, p)) return false;
  return true;
}

/**
 * Run a query over records: filter (AND of all predicates), then sort, then
 * limit. Pure — returns a new array, never mutates the input.
 */
export function runQuery<T extends Row>(records: readonly T[], query: Query): T[] {
  let out = records.filter((r) => matchesQuery(r, query.filters));
  if (query.sortBy) {
    const dir = query.sortDir === "desc" ? -1 : 1;
    const key = query.sortBy;
    out = out.slice().sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const an = asNumber(av);
      const bn = asNumber(bv);
      if (an !== null && bn !== null) return (an - bn) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
  }
  if (typeof query.limit === "number" && query.limit >= 0) out = out.slice(0, query.limit);
  return out;
}

/** Serialize a query to a portable string (saved searches / shareable Finders). */
export function serializeQuery(query: Query): string {
  return JSON.stringify(query);
}

/** Parse a serialized query; returns null on malformed input rather than throwing. */
export function deserializeQuery(serialized: string): Query | null {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Query).filters)) return null;
    return parsed as Query;
  } catch {
    return null;
  }
}
