/**
 * Data pipeline utilities — pure functions, zero dependencies.
 *
 * Composable transform, filter, sort, and validate helpers
 * for processing pick/game/stats collections.
 */

export type Predicate<T> = (item: T) => boolean;
export type Transform<T, U> = (item: T) => U;
export type Comparator<T> = (a: T, b: T) => number;

export interface PipelineResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly filtered: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

/**
 * Left-to-right function composition: pipe(f, g)(x) = g(f(x))
 */
export function pipe<T>(...fns: ReadonlyArray<(x: T) => T>): (x: T) => T {
  return (x: T): T => fns.reduce((acc, fn) => fn(acc), x);
}

/**
 * Async version of pipe: runs sequentially left-to-right
 */
export function pipeAsync<T>(
  ...fns: ReadonlyArray<(x: T) => T | Promise<T>>
): (x: T) => Promise<T> {
  return async (x: T): Promise<T> => {
    let result = x;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}

/**
 * Right-to-left function composition: compose(f, g)(x) = f(g(x))
 */
export function compose<T>(...fns: ReadonlyArray<(x: T) => T>): (x: T) => T {
  return (x: T): T => [...fns].reverse().reduce((acc, fn) => fn(acc), x);
}

/**
 * Curried filter. filter(x => x > 5)(arr)
 */
export function filter<T>(pred: Predicate<T>): (items: readonly T[]) => T[] {
  return (items: readonly T[]): T[] => items.filter(pred);
}

/**
 * Apply ALL predicates (AND logic)
 */
export function filterAll<T>(
  preds: readonly Predicate<T>[]
): (items: readonly T[]) => T[] {
  return (items: readonly T[]): T[] =>
    items.filter((item) => preds.every((pred) => pred(item)));
}

/**
 * Apply ANY predicate (OR logic)
 */
export function filterAny<T>(
  preds: readonly Predicate<T>[]
): (items: readonly T[]) => T[] {
  return (items: readonly T[]): T[] =>
    items.filter((item) => preds.some((pred) => pred(item)));
}

/**
 * Curried sort by comparator
 */
export function sortWith<T>(
  comparator: Comparator<T>
): (items: readonly T[]) => T[] {
  return (items: readonly T[]): T[] => [...items].sort(comparator);
}

/**
 * Build a comparator from a key function
 */
export function compareBy<T>(
  keyFn: (item: T) => number | string,
  order: "asc" | "desc" = "asc"
): Comparator<T> {
  return (a: T, b: T): number => {
    const aKey = keyFn(a);
    const bKey = keyFn(b);
    let result: number;
    if (typeof aKey === "number" && typeof bKey === "number") {
      result = aKey - bKey;
    } else {
      result = String(aKey) < String(bKey) ? -1 : String(aKey) > String(bKey) ? 1 : 0;
    }
    return order === "desc" ? -result : result;
  };
}

/**
 * Chain multiple comparators (first tiebreaks with subsequent)
 */
export function compareByMulti<T>(
  comparators: readonly Comparator<T>[]
): Comparator<T> {
  return (a: T, b: T): number => {
    for (const cmp of comparators) {
      const result = cmp(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}

/**
 * Paginate items (1-indexed pages).
 * Items in result are the current page's slice.
 * total = items.length before pagination, filtered = total (caller filters first).
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): PipelineResult<T> {
  const total = items.length;
  const filtered = total;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const start = (page - 1) * pageSize;
  const sliced = items.slice(start, start + pageSize);
  return {
    items: sliced,
    total,
    filtered,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Apply filters → sort → paginate in one step.
 * Default page=1, pageSize=20.
 */
export function processPipeline<T>(opts: {
  items: readonly T[];
  filters?: readonly Predicate<T>[];
  sort?: Comparator<T>;
  page?: number;
  pageSize?: number;
}): PipelineResult<T> {
  const { items, filters = [], sort, page = 1, pageSize = 20 } = opts;

  let processed: readonly T[] = items;
  const total = items.length;

  if (filters.length > 0) {
    processed = items.filter((item) => filters.every((pred) => pred(item)));
  }

  const filtered = processed.length;

  if (sort) {
    processed = [...processed].sort(sort);
  }

  const totalPages = pageSize > 0 ? Math.ceil(filtered / pageSize) : 0;
  const start = (page - 1) * pageSize;
  const sliced = processed.slice(start, start + pageSize);

  return {
    items: sliced,
    total,
    filtered,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Returns a predicate that returns true if any keyFn output matches query.
 * Default: case-insensitive substring match.
 * exact: true → requires exact match (case-insensitive by default).
 */
export function searchFilter<T>(
  query: string,
  keyFns: readonly ((item: T) => string)[],
  opts?: { caseSensitive?: boolean; exact?: boolean }
): Predicate<T> {
  const { caseSensitive = false, exact = false } = opts ?? {};

  return (item: T): boolean => {
    if (keyFns.length === 0) return false;
    const normalizedQuery = caseSensitive ? query : query.toLowerCase();
    return keyFns.some((keyFn) => {
      const value = keyFn(item);
      const normalizedValue = caseSensitive ? value : value.toLowerCase();
      if (exact) {
        return normalizedValue === normalizedQuery;
      }
      return normalizedValue.includes(normalizedQuery);
    });
  };
}

/**
 * Filter items within a numeric range (inclusive).
 * Undefined min/max means unbounded on that side.
 */
export function rangeFilter<T>(
  keyFn: (item: T) => number,
  min?: number,
  max?: number
): Predicate<T> {
  return (item: T): boolean => {
    const value = keyFn(item);
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  };
}

/**
 * Filter items whose key matches one of the allowed values.
 */
export function enumFilter<T, V>(
  keyFn: (item: T) => V,
  allowedValues: readonly V[]
): Predicate<T> {
  return (item: T): boolean => allowedValues.includes(keyFn(item));
}

/**
 * Remove duplicates by key, keeping first occurrence.
 */
export function dedupe<T>(
  keyFn: (item: T) => string | number
): (items: readonly T[]) => T[] {
  return (items: readonly T[]): T[] => {
    const seen = new Set<string | number>();
    const result: T[] = [];
    for (const item of items) {
      const key = keyFn(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
    return result;
  };
}

/**
 * Group items and optionally sort the groups by a provided order.
 * Groups not in groupOrder appear last in insertion order.
 */
export function groupAndSort<T, K extends string | number>(
  items: readonly T[],
  groupKey: (item: T) => K,
  groupOrder?: readonly K[]
): Map<K, T[]> {
  const map = new Map<K, T[]>();

  for (const item of items) {
    const key = groupKey(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  if (!groupOrder || groupOrder.length === 0) {
    return map;
  }

  const ordered = new Map<K, T[]>();

  for (const key of groupOrder) {
    const group = map.get(key);
    if (group !== undefined) {
      ordered.set(key, group);
    }
  }

  // Append groups not in groupOrder in insertion order
  for (const [key, group] of map) {
    if (!ordered.has(key)) {
      ordered.set(key, group);
    }
  }

  return ordered;
}
