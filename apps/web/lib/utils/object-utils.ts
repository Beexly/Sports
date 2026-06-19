/**
 * Object manipulation utilities — pure, zero dependencies.
 *
 * Deep clone, deep merge, property access, object diffing,
 * flatten/unflatten, pick/omit, and transformation helpers.
 */

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/** Returns true if value is a plain object (not Array, Date, null, etc.) */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

// ---------------------------------------------------------------------------
// Deep clone
// ---------------------------------------------------------------------------

/**
 * Structurally clone any JSON-serializable value.
 * Handles objects, arrays, primitives, null, Date. Cycle-safe via WeakMap.
 */
export function deepClone<T>(value: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
  if (value === null || typeof value !== "object") return value;

  // Cycle detection
  if (seen.has(value as object)) return seen.get(value as object) as T;

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (Array.isArray(value)) {
    const cloned: unknown[] = [];
    seen.set(value as object, cloned);
    for (let i = 0; i < value.length; i++) {
      cloned[i] = deepClone(value[i], seen);
    }
    return cloned as unknown as T;
  }

  const cloned: Record<string, unknown> = {};
  seen.set(value as object, cloned);
  for (const key of Object.keys(value as object)) {
    cloned[key] = deepClone((value as Record<string, unknown>)[key], seen);
  }
  return cloned as unknown as T;
}

// ---------------------------------------------------------------------------
// Deep equality
// ---------------------------------------------------------------------------

/**
 * Deep structural equality. Works with objects, arrays, primitives, Date, NaN.
 */
export function deepEqual<T>(a: T, b: T): boolean {
  // NaN === NaN
  if (typeof a === "number" && typeof b === "number" && isNaN(a) && isNaN(b)) return true;
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Deep merge
// ---------------------------------------------------------------------------

/**
 * Recursively merge source into target.
 * Arrays are replaced (not merged). Returns new object, does not mutate.
 */
export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = (source as Record<string, unknown>)[key];
    const targetVal = (target as Record<string, unknown>)[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      result[key] = deepClone(sourceVal);
    }
  }

  return result as T & U;
}

// ---------------------------------------------------------------------------
// Pick / omit
// ---------------------------------------------------------------------------

/** Return new object with only specified keys. */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/** Return new object without specified keys. */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

// ---------------------------------------------------------------------------
// Path parsing
// ---------------------------------------------------------------------------

/**
 * Parse "a.b[0].c" → ["a", "b", "0", "c"]
 */
export function toPath(pathStr: string): string[] {
  if (pathStr === "") return [];
  // Replace bracket notation with dot notation, then split
  return pathStr
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter((p) => p !== "");
}

// ---------------------------------------------------------------------------
// get / set / has
// ---------------------------------------------------------------------------

/**
 * Access nested property by dot-notation path: "a.b.c" or "a[0].b".
 * Returns defaultValue if path not found.
 */
export function get(obj: unknown, path: string, defaultValue?: unknown): unknown {
  const parts = toPath(path);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return defaultValue;
    }
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current === undefined ? defaultValue : current;
}

/**
 * Set nested property by dot-notation path (immutable — returns new object).
 * Creates intermediate objects if needed.
 */
export function set<T extends object>(obj: T, path: string, value: unknown): T {
  const parts = toPath(path);
  if (parts.length === 0) return obj;

  function setIn(current: unknown, keys: string[]): unknown {
    const [head, ...rest] = keys;

    let base: Record<string, unknown>;
    if (Array.isArray(current)) {
      base = [...(current as unknown[])] as unknown as Record<string, unknown>;
    } else if (isPlainObject(current)) {
      base = { ...(current as Record<string, unknown>) };
    } else {
      base = {};
    }

    if (rest.length === 0) {
      base[head] = value;
    } else {
      base[head] = setIn(base[head], rest);
    }

    return base;
  }

  return setIn(obj, parts) as T;
}

/**
 * Returns true if the path exists (even if value is undefined).
 * Uses hasOwnProperty at each level.
 */
export function has(obj: unknown, path: string): boolean {
  const parts = toPath(path);
  if (parts.length === 0) return false;

  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return true;
}

// ---------------------------------------------------------------------------
// Flatten / unflatten
// ---------------------------------------------------------------------------

/**
 * Flatten nested object to single level with dot keys.
 * { a: { b: 1 } } → { "a.b": 1 }
 * Arrays are treated as values (not flattened).
 */
export function flatten(obj: object, separator = "."): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  function recurse(current: unknown, prefix: string): void {
    if (isPlainObject(current)) {
      const keys = Object.keys(current);
      if (keys.length === 0 && prefix !== "") {
        result[prefix] = current;
        return;
      }
      for (const key of keys) {
        recurse(
          (current as Record<string, unknown>)[key],
          prefix ? `${prefix}${separator}${key}` : key,
        );
      }
    } else {
      if (prefix !== "") {
        result[prefix] = current;
      }
    }
  }

  recurse(obj, "");
  return result;
}

/**
 * Reverse of flatten.
 * { "a.b": 1 } → { a: { b: 1 } }
 */
export function unflatten(
  obj: Record<string, unknown>,
  separator = ".",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [flatKey, value] of Object.entries(obj)) {
    const parts = flatKey.split(separator);
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!Object.prototype.hasOwnProperty.call(current, part) || !isPlainObject(current[part])) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

/**
 * Return object with keys where before[key] !== after[key] (shallow).
 * Values are { before, after } pairs.
 */
export function diff<T extends object>(
  before: T,
  after: T,
): Record<string, { before: unknown; after: unknown }> {
  const result: Record<string, { before: unknown; after: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const bVal = (before as Record<string, unknown>)[key];
    const aVal = (after as Record<string, unknown>)[key];
    if (bVal !== aVal) {
      result[key] = { before: bVal, after: aVal };
    }
  }

  return result;
}

/**
 * Deep diff, returning array of changed paths.
 * e.g., [{ path: "a.b", before: 1, after: 2 }]
 */
export function deepDiff(
  before: unknown,
  after: unknown,
  path = "",
): Array<{ path: string; before: unknown; after: unknown }> {
  const changes: Array<{ path: string; before: unknown; after: unknown }> = [];

  if (deepEqual(before, after)) return changes;

  const bothObjects = isPlainObject(before) && isPlainObject(after);

  if (bothObjects) {
    const allKeys = new Set([
      ...Object.keys(before as object),
      ...Object.keys(after as object),
    ]);

    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;
      const bVal = (before as Record<string, unknown>)[key];
      const aVal = (after as Record<string, unknown>)[key];
      const nested = deepDiff(bVal, aVal, childPath);
      changes.push(...nested);
    }
  } else {
    changes.push({ path, before, after });
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Value / key transformers
// ---------------------------------------------------------------------------

/**
 * Transform object values with a mapper function.
 */
export function mapValues<T extends object, R>(
  obj: T,
  fn: (value: T[keyof T], key: string) => R,
): Record<string, R> {
  const result: Record<string, R> = {};
  for (const key of Object.keys(obj)) {
    result[key] = fn((obj as Record<string, T[keyof T]>)[key], key);
  }
  return result;
}

/**
 * Filter object entries by value predicate.
 */
export function filterValues<T extends object>(
  obj: T,
  fn: (value: T[keyof T], key: string) => boolean,
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const val = obj[key];
    if (fn(val, key as string)) {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Transform object keys with a mapper function.
 */
export function mapKeys<T extends object>(
  obj: T,
  fn: (key: string, value: T[keyof T]) => string,
): Record<string, T[keyof T]> {
  const result: Record<string, T[keyof T]> = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, T[keyof T]>)[key];
    result[fn(key, val)] = val;
  }
  return result;
}

/**
 * Swap keys and values (values must be strings).
 */
export function invert<T extends object>(obj: T): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    result[String(val)] = key;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Array group helpers
// ---------------------------------------------------------------------------

/**
 * Group array items by a key function.
 */
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!Object.prototype.hasOwnProperty.call(result, k)) {
      result[k] = [];
    }
    result[k].push(item);
  }
  return result;
}

/**
 * Count array items by a key function.
 */
export function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const k = key(item);
    result[k] = (result[k] ?? 0) + 1;
  }
  return result;
}

/**
 * Index array by key function (last wins on collision).
 */
export function keyBy<T>(arr: T[], key: (item: T) => string): Record<string, T> {
  const result: Record<string, T> = {};
  for (const item of arr) {
    result[key(item)] = item;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Object construction
// ---------------------------------------------------------------------------

/**
 * Create object from arrays of keys and values.
 */
export function zipObject<K extends string, V>(keys: K[], values: V[]): Record<K, V> {
  const result = {} as Record<K, V>;
  for (let i = 0; i < keys.length; i++) {
    result[keys[i]] = values[i];
  }
  return result;
}

/**
 * Type-safe Object.entries wrapper.
 */
export function entries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

/**
 * Type-safe Object.fromEntries wrapper.
 */
export function fromEntries<K extends string, V>(entriesArr: Array<[K, V]>): Record<K, V> {
  return Object.fromEntries(entriesArr) as Record<K, V>;
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/**
 * Returns true for: null, undefined, empty string, empty array, empty object.
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

/**
 * Remove falsy values from array.
 */
export function compact<T>(arr: (T | null | undefined | false | 0 | "")[]): T[] {
  return arr.filter(Boolean) as T[];
}

/**
 * Split array into chunks of given size.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Remove consecutive duplicates from sorted array.
 */
export function sortedUniq<T>(arr: T[]): T[] {
  if (arr.length === 0) return [];
  const result: T[] = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] !== arr[i - 1]) {
      result.push(arr[i]);
    }
  }
  return result;
}
