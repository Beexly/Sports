/**
 * Array utility functions — pure, zero dependencies.
 *
 * Functional helpers for common data-manipulation patterns:
 * grouping, partitioning, chunking, zipping, ranking, etc.
 */

/**
 * Split an array into chunks of at most `size` elements.
 * chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]
 */
export function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (size < 1) return [];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size) as T[]);
  }
  return result;
}

/**
 * Group array elements by a key derived from each element.
 * groupBy([{a:1},{a:2},{a:1}], x=>x.a) → Map { 1 → [{a:1},{a:1}], 2 → [{a:2}] }
 */
export function groupBy<T, K>(arr: readonly T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Split an array into two arrays based on a predicate.
 * Returns [matching, nonMatching].
 */
export function partition<T>(arr: readonly T[], pred: (item: T) => boolean): [T[], T[]] {
  const a: T[] = [];
  const b: T[] = [];
  for (const item of arr) {
    (pred(item) ? a : b).push(item);
  }
  return [a, b];
}

/**
 * Return unique elements, preserving first-seen order.
 * unique([1,2,1,3,2]) → [1,2,3]
 */
export function unique<T>(arr: readonly T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Return unique elements by a derived key.
 * uniqueBy([{id:1,v:1},{id:1,v:2},{id:2,v:3}], x=>x.id) → [{id:1,v:1},{id:2,v:3}]
 */
export function uniqueBy<T, K>(arr: readonly T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/**
 * Sort by one or more key functions (ascending). Returns a new array.
 * sortBy([{a:2},{a:1}], x=>x.a) → [{a:1},{a:2}]
 */
export function sortBy<T>(arr: readonly T[], ...keyFns: ReadonlyArray<(item: T) => number | string>): T[] {
  return [...arr].sort((a, b) => {
    for (const fn of keyFns) {
      const ka = fn(a);
      const kb = fn(b);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
    }
    return 0;
  });
}

/**
 * Sort by key descending.
 */
export function sortByDesc<T>(arr: readonly T[], keyFn: (item: T) => number | string): T[] {
  return [...arr].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    if (ka > kb) return -1;
    if (ka < kb) return 1;
    return 0;
  });
}

/**
 * Zip two arrays together.
 * zip([1,2,3], ['a','b','c']) → [[1,'a'],[2,'b'],[3,'c']]
 * Stops at the shorter array.
 */
export function zip<A, B>(a: readonly A[], b: readonly B[]): [A, B][] {
  const len = Math.min(a.length, b.length);
  const result: [A, B][] = [];
  for (let i = 0; i < len; i++) {
    result.push([a[i]!, b[i]!]);
  }
  return result;
}

/**
 * Zip three arrays.
 */
export function zip3<A, B, C>(a: readonly A[], b: readonly B[], c: readonly C[]): [A, B, C][] {
  const len = Math.min(a.length, b.length, c.length);
  const result: [A, B, C][] = [];
  for (let i = 0; i < len; i++) {
    result.push([a[i]!, b[i]!, c[i]!]);
  }
  return result;
}

/**
 * Flatten one level deep.
 * flatten([[1,2],[3,4]]) → [1,2,3,4]
 */
export function flatten<T>(arr: readonly (readonly T[])[]): T[] {
  return ([] as T[]).concat(...arr.map((sub) => [...sub]));
}

/**
 * Take the first N elements.
 */
export function take<T>(arr: readonly T[], n: number): T[] {
  return arr.slice(0, Math.max(0, n));
}

/**
 * Drop the first N elements.
 */
export function drop<T>(arr: readonly T[], n: number): T[] {
  return arr.slice(Math.max(0, n));
}

/**
 * Return the last N elements.
 */
export function takeLast<T>(arr: readonly T[], n: number): T[] {
  if (n <= 0) return [];
  return arr.slice(Math.max(0, arr.length - n));
}

/**
 * Min element by a numeric key.
 */
export function minBy<T>(arr: readonly T[], keyFn: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce((best, item) => (keyFn(item) < keyFn(best) ? item : best));
}

/**
 * Max element by a numeric key.
 */
export function maxBy<T>(arr: readonly T[], keyFn: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce((best, item) => (keyFn(item) > keyFn(best) ? item : best));
}

/**
 * Sum an array of numbers.
 */
export function sum(arr: readonly number[]): number {
  return arr.reduce((acc, n) => acc + n, 0);
}

/**
 * Sum elements by a numeric key.
 */
export function sumBy<T>(arr: readonly T[], keyFn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + keyFn(item), 0);
}

/**
 * Compute a simple mean.
 */
export function mean(arr: readonly number[]): number | null {
  if (arr.length === 0) return null;
  return sum(arr) / arr.length;
}

/**
 * Compute mean by key.
 */
export function meanBy<T>(arr: readonly T[], keyFn: (item: T) => number): number | null {
  if (arr.length === 0) return null;
  return sumBy(arr, keyFn) / arr.length;
}

/**
 * Count elements matching a predicate.
 */
export function countBy<T>(arr: readonly T[], pred: (item: T) => boolean): number {
  return arr.reduce((acc, item) => (pred(item) ? acc + 1 : acc), 0);
}

/**
 * Create a range [start, end) with optional step.
 * range(0, 5) → [0,1,2,3,4]
 * range(0, 10, 2) → [0,2,4,6,8]
 */
export function range(start: number, end: number, step = 1): number[] {
  if (step === 0 || (step > 0 && start >= end) || (step < 0 && start <= end)) return [];
  const result: number[] = [];
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Rotate array left by n positions.
 * rotate([1,2,3,4], 1) → [2,3,4,1]
 */
export function rotate<T>(arr: readonly T[], n: number): T[] {
  if (arr.length === 0) return [];
  const shift = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

/**
 * Sliding window over an array.
 * windows([1,2,3,4], 3) → [[1,2,3],[2,3,4]]
 */
export function windows<T>(arr: readonly T[], size: number): T[][] {
  if (size < 1 || arr.length < size) return [];
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - size; i++) {
    result.push(arr.slice(i, i + size) as T[]);
  }
  return result;
}

/**
 * Interleave two arrays.
 * interleave([1,3,5], [2,4,6]) → [1,2,3,4,5,6]
 */
export function interleave<T>(a: readonly T[], b: readonly T[]): T[] {
  const result: T[] = [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (i < a.length) result.push(a[i]!);
    if (i < b.length) result.push(b[i]!);
  }
  return result;
}

/**
 * Index an array into a Map by key for O(1) lookups.
 * indexBy([{id:'a',...},...], x=>x.id) → Map { 'a' → {...} }
 * Last value wins for duplicate keys.
 */
export function indexBy<T, K>(arr: readonly T[], keyFn: (item: T) => K): Map<K, T> {
  const map = new Map<K, T>();
  for (const item of arr) {
    map.set(keyFn(item), item);
  }
  return map;
}

/**
 * Compute the frequency of each element.
 * frequencies(['a','b','a','c','b','b']) → Map { 'a' → 2, 'b' → 3, 'c' → 1 }
 */
export function frequencies<T>(arr: readonly T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const item of arr) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return map;
}

/**
 * Compute dense rank (1-based) of each element by a numeric key.
 * Ties get the same rank; next rank skips.
 * rankBy([{v:10},{v:5},{v:10}], x=>x.v, 'desc')
 *   → [{...rank:1},{...rank:2},{...rank:1}]
 */
export function rankBy<T>(arr: readonly T[], keyFn: (item: T) => number, order: "asc" | "desc" = "desc"): Array<T & { rank: number }> {
  const sorted = sortBy(arr, keyFn);
  if (order === "desc") sorted.reverse();
  const rankMap = new Map<T, number>();
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]!;
    if (i > 0 && keyFn(item) === keyFn(sorted[i - 1]!)) {
      rankMap.set(item, rankMap.get(sorted[i - 1]!)!);
    } else {
      rankMap.set(item, rank);
    }
    rank++;
  }
  return arr.map((item) => ({ ...item, rank: rankMap.get(item) ?? arr.length }));
}
