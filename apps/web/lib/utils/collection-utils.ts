/**
 * collection-utils.ts
 * Pure TypeScript collection utilities for Galaxy Sports Edge.
 * No external dependencies.
 */

// ---------------------------------------------------------------------------
// Grouping & partitioning
// ---------------------------------------------------------------------------

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!Object.prototype.hasOwnProperty.call(result, k)) {
      result[k] = [];
    }
    (result[k] as T[]).push(item);
  }
  return result;
}

export function groupByMultiple<T>(
  arr: T[],
  keys: Array<(item: T) => string>,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = keys.map((fn) => fn(item)).join('|');
    if (!Object.prototype.hasOwnProperty.call(result, k)) {
      result[k] = [];
    }
    (result[k] as T[]).push(item);
  }
  return result;
}

export function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const trueItems: T[] = [];
  const falseItems: T[] = [];
  for (const item of arr) {
    if (predicate(item)) {
      trueItems.push(item);
    } else {
      falseItems.push(item);
    }
  }
  return [trueItems, falseItems];
}

/**
 * Partition into N+1 buckets where the last bucket catches all items that don't
 * match any predicate.
 */
export function partitionN<T>(arr: T[], predicates: Array<(item: T) => boolean>): T[][] {
  const buckets: T[][] = Array.from({ length: predicates.length + 1 }, () => []);
  for (const item of arr) {
    let matched = false;
    for (let i = 0; i < predicates.length; i++) {
      const predicate = predicates[i];
      if (predicate !== undefined && predicate(item)) {
        (buckets[i] as T[]).push(item);
        matched = true;
        break;
      }
    }
    if (!matched) {
      (buckets[predicates.length] as T[]).push(item);
    }
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Array operations
// ---------------------------------------------------------------------------

export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new RangeError('chunk size must be > 0');
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function zip<T, U>(a: T[], b: U[]): Array<[T, U]> {
  const len = Math.min(a.length, b.length);
  const result: Array<[T, U]> = [];
  for (let i = 0; i < len; i++) {
    result.push([a[i]!, b[i]!]);
  }
  return result;
}

export function zipWith<T, U, R>(a: T[], b: U[], fn: (x: T, y: U) => R): R[] {
  const len = Math.min(a.length, b.length);
  const result: R[] = [];
  for (let i = 0; i < len; i++) {
    result.push(fn(a[i]!, b[i]!));
  }
  return result;
}

export function unzip<T, U>(pairs: Array<[T, U]>): [T[], U[]] {
  const as: T[] = [];
  const bs: U[] = [];
  for (const [a, b] of pairs) {
    as.push(a);
    bs.push(b);
  }
  return [as, bs];
}

export function flatten<T>(arr: T[][], depth?: number): T[] {
  if (depth === undefined || depth === 1) {
    return (arr as unknown[]).flat() as T[];
  }
  return (arr as unknown[]).flat(depth) as T[];
}

export function flatMap<T, U>(arr: T[], fn: (item: T, index: number) => U[]): U[] {
  const result: U[] = [];
  for (let i = 0; i < arr.length; i++) {
    for (const x of fn(arr[i]!, i)) {
      result.push(x);
    }
  }
  return result;
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function uniqueBy<T>(arr: T[], key: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  const result: T[] = [];
  for (const item of arr) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(item);
    }
  }
  return result;
}

export function compact<T>(arr: Array<T | null | undefined | false | 0 | ''>): T[] {
  return arr.filter(Boolean) as T[];
}

export function rotate<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return [];
  const len = arr.length;
  // positive = right rotation, negative = left rotation
  const shift = ((-n % len) + len) % len;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

export function interleave<T>(...arrays: T[][]): T[] {
  const result: T[] = [];
  const maxLen = Math.max(...arrays.map((a) => a.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (i < arr.length) {
        result.push(arr[i]!);
      }
    }
  }
  return result;
}

export function slidingWindow<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new RangeError('window size must be > 0');
  if (arr.length < size) return [];
  const result: T[][] = [];
  for (let i = 0; i <= arr.length - size; i++) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function toPairs<T>(obj: Record<string, T>): Array<[string, T]> {
  return Object.entries(obj) as Array<[string, T]>;
}

export function fromPairs<T>(pairs: Array<[string, T]>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [k, v] of pairs) {
    result[k] = v;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sorting & ranking
// ---------------------------------------------------------------------------

export function sortBy<T>(arr: T[], ...comparators: Array<(item: T) => number | string>): T[] {
  return [...arr].sort((a, b) => {
    for (const fn of comparators) {
      const va = fn(a);
      const vb = fn(b);
      let cmp: number;
      if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb);
      } else {
        cmp = (va as number) < (vb as number) ? -1 : (va as number) > (vb as number) ? 1 : 0;
      }
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

export function topN<T>(arr: T[], n: number, score: (item: T) => number): T[] {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n);
}

export function bottomN<T>(arr: T[], n: number, score: (item: T) => number): T[] {
  return [...arr].sort((a, b) => score(a) - score(b)).slice(0, n);
}

export function rankItems<T>(
  arr: T[],
  score: (item: T) => number,
): Array<{ item: T; rank: number; score: number }> {
  const scored = arr.map((item) => ({ item, score: score(item) }));
  scored.sort((a, b) => b.score - a.score);

  const result: Array<{ item: T; rank: number; score: number }> = [];
  let currentRank = 1;
  for (let i = 0; i < scored.length; i++) {
    const cur = scored[i]!;
    const prev = scored[i - 1];
    if (i > 0 && prev !== undefined && cur.score < prev.score) {
      // Dense ranking: increment rank by 1 regardless of how many tied
      currentRank++;
    }
    result.push({ item: cur.item, rank: currentRank, score: cur.score });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Object operations
// ---------------------------------------------------------------------------

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const k of keys) {
    if (k in obj) {
      result[k] = obj[k];
    }
  }
  return result;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const keySet = new Set<unknown>(keys);
  const result = {} as Omit<T, K>;
  for (const k of Object.keys(obj) as K[]) {
    if (!keySet.has(k)) {
      (result as Record<string, unknown>)[k as string] = obj[k];
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  const result = { ...target } as Record<string, unknown>;
  for (const source of sources) {
    for (const key of Object.keys(source as object) as Array<keyof T & string>) {
      const sv = (source as Record<string, unknown>)[key];
      const tv = result[key];
      if (isPlainObject(sv) && isPlainObject(tv)) {
        result[key] = deepMerge(tv as object, sv as Partial<typeof tv>) as unknown;
      } else {
        result[key] = sv;
      }
    }
  }
  return result as T;
}

export function deepClone<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.toISOString()) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => deepClone(v)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = deepClone((value as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return value;
}

export function mapValues<T, U>(
  obj: Record<string, T>,
  fn: (val: T, key: string) => U,
): Record<string, U> {
  const result: Record<string, U> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = fn(v, k);
  }
  return result;
}

export function filterValues<T>(
  obj: Record<string, T>,
  fn: (val: T, key: string) => boolean,
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (fn(v, k)) {
      result[k] = v;
    }
  }
  return result;
}

export function invertObject(obj: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[v] = k;
  }
  return result;
}

export function flattenObject(obj: object, separator = '.'): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  function recurse(current: unknown, prefix: string): void {
    if (isPlainObject(current)) {
      for (const [k, v] of Object.entries(current)) {
        const newKey = prefix ? `${prefix}${separator}${k}` : k;
        recurse(v, newKey);
      }
    } else {
      result[prefix] = current;
    }
  }

  recurse(obj, '');
  return result;
}

export function unflattenObject(
  obj: Record<string, unknown>,
  separator = '.',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split(separator);
    let current: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i] ?? '';
      if (!isPlainObject(current[part])) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1] ?? ''] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Set operations
// ---------------------------------------------------------------------------

export function union<T>(a: T[], b: T[]): T[] {
  return unique([...a, ...b]);
}

export function intersection<T>(a: T[], b: T[]): T[] {
  const bSet = new Set(b);
  return unique(a.filter((x) => bSet.has(x)));
}

export function difference<T>(a: T[], b: T[]): T[] {
  const bSet = new Set(b);
  return a.filter((x) => !bSet.has(x));
}

export function symmetricDifference<T>(a: T[], b: T[]): T[] {
  return [...difference(a, b), ...difference(b, a)];
}

export function isSubset<T>(sub: T[], sup: T[]): boolean {
  const supSet = new Set(sup);
  return sub.every((x) => supSet.has(x));
}

export function cartesianProduct<T, U>(a: T[], b: U[]): Array<[T, U]> {
  const result: Array<[T, U]> = [];
  for (const x of a) {
    for (const y of b) {
      result.push([x, y]);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Counting & frequency
// ---------------------------------------------------------------------------

export function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const k = key(item);
    result[k] = (result[k] ?? 0) + 1;
  }
  return result;
}

export function frequencies<T>(arr: T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const item of arr) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return map;
}

export function mostCommon<T>(arr: T[], n?: number): T[] {
  const freq = frequencies(arr);
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const top = n === undefined ? sorted : sorted.slice(0, n);
  return top.map(([item]) => item);
}

// ---------------------------------------------------------------------------
// Sports utilities
// ---------------------------------------------------------------------------

export function rollingAverage<T>(
  arr: T[],
  n: number,
  getValue: (item: T) => number,
): number[] {
  if (n <= 0) throw new RangeError('window size must be > 0');
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - n + 1);
    const window = arr.slice(start, i + 1);
    const sum = window.reduce((acc, x) => acc + getValue(x), 0);
    result.push(sum / window.length);
  }
  return result;
}

export function weightedAverage<T>(
  arr: T[],
  getValue: (item: T) => number,
  getWeight: (item: T) => number,
): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  let totalWeight = 0;
  for (const item of arr) {
    const w = getWeight(item);
    sum += getValue(item) * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return sum / totalWeight;
}

export function normalizeWeights(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return weights.map(() => 0);
  return weights.map((w) => w / total);
}

export function splitByThreshold<T>(
  arr: T[],
  getValue: (item: T) => number,
  threshold: number,
): { above: T[]; below: T[] } {
  const above: T[] = [];
  const below: T[] = [];
  for (const item of arr) {
    if (getValue(item) >= threshold) {
      above.push(item);
    } else {
      below.push(item);
    }
  }
  return { above, below };
}

export function indexBy<T>(arr: T[], key: (item: T) => string): Record<string, T> {
  const result: Record<string, T> = {};
  for (const item of arr) {
    result[key(item)] = item;
  }
  return result;
}
