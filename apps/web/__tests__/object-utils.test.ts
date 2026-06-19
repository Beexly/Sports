import { describe, it, expect } from "vitest";
import {
  deepClone,
  deepEqual,
  deepMerge,
  pick,
  omit,
  get,
  set,
  has,
  flatten,
  unflatten,
  diff,
  deepDiff,
  mapValues,
  filterValues,
  mapKeys,
  invert,
  groupBy,
  countBy,
  zipObject,
  entries,
  fromEntries,
  isPlainObject,
  isEmpty,
  compact,
  chunk,
  keyBy,
  sortedUniq,
  toPath,
} from "@/lib/utils/object-utils";

// ---------------------------------------------------------------------------
// deepClone
// ---------------------------------------------------------------------------
describe("deepClone", () => {
  it("clones a primitive number", () => {
    expect(deepClone(42)).toBe(42);
  });

  it("clones a primitive string", () => {
    expect(deepClone("hello")).toBe("hello");
  });

  it("clones null", () => {
    expect(deepClone(null)).toBeNull();
  });

  it("clones undefined", () => {
    expect(deepClone(undefined)).toBeUndefined();
  });

  it("clones a flat object", () => {
    const obj = { a: 1, b: "x" };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
  });

  it("clones a nested object", () => {
    const obj = { a: { b: { c: 3 } } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned.a).not.toBe(obj.a);
    expect(cloned.a.b).not.toBe(obj.a.b);
  });

  it("clones an array", () => {
    const arr = [1, 2, 3];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });

  it("clones a nested array", () => {
    const arr = [[1, 2], [3, 4]];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned[0]).not.toBe(arr[0]);
  });

  it("clones a Date (new Date instance)", () => {
    const d = new Date("2024-01-01");
    const cloned = deepClone(d);
    expect(cloned).toEqual(d);
    expect(cloned).not.toBe(d);
    expect(cloned.getTime()).toBe(d.getTime());
  });

  it("mutating clone does not affect original", () => {
    const obj = { a: { b: 1 } };
    const cloned = deepClone(obj);
    cloned.a.b = 99;
    expect(obj.a.b).toBe(1);
  });

  it("is cycle-safe (no infinite loop)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = { a: 1 };
    obj.self = obj;
    // Just ensure it doesn't throw/hang
    expect(() => deepClone(obj)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// deepEqual
// ---------------------------------------------------------------------------
describe("deepEqual", () => {
  it("equal primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
  });

  it("unequal primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
  });

  it("NaN equals NaN", () => {
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  it("equal flat objects", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("unequal flat objects — different value", () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("unequal flat objects — different keys", () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("unequal objects — different key count", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it("equal nested objects", () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
  });

  it("unequal nested objects", () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it("equal arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("unequal arrays — different length", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("unequal arrays — different element", () => {
    expect(deepEqual([1, 2], [1, 3])).toBe(false);
  });

  it("equal Dates", () => {
    expect(deepEqual(new Date("2024-01-01"), new Date("2024-01-01"))).toBe(true);
  });

  it("unequal Dates", () => {
    expect(deepEqual(new Date("2024-01-01"), new Date("2025-01-01"))).toBe(false);
  });

  it("null equals null", () => {
    expect(deepEqual(null, null)).toBe(true);
  });

  it("null does not equal object", () => {
    expect(deepEqual(null, {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deepMerge
// ---------------------------------------------------------------------------
describe("deepMerge", () => {
  it("merges flat objects", () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("source values overwrite target values", () => {
    expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it("merges nested objects recursively", () => {
    const target = { a: { b: 1, c: 2 } };
    const source = { a: { b: 99 } };
    expect(deepMerge(target, source)).toEqual({ a: { b: 99, c: 2 } });
  });

  it("arrays are replaced, not merged", () => {
    expect(deepMerge({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
  });

  it("does not mutate the target", () => {
    const target = { a: 1 };
    deepMerge(target, { b: 2 });
    expect(target).toEqual({ a: 1 });
  });

  it("does not mutate the source", () => {
    const source = { b: 2 };
    deepMerge({ a: 1 }, source);
    expect(source).toEqual({ b: 2 });
  });
});

// ---------------------------------------------------------------------------
// pick
// ---------------------------------------------------------------------------
describe("pick", () => {
  it("extracts only specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  it("picks nothing when keys array is empty", () => {
    expect(pick({ a: 1 }, [])).toEqual({});
  });

  it("ignores missing keys", () => {
    // TypeScript would complain but runtime should handle gracefully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(pick({ a: 1 } as any, ["a", "z"] as any)).toEqual({ a: 1 });
  });
});

// ---------------------------------------------------------------------------
// omit
// ---------------------------------------------------------------------------
describe("omit", () => {
  it("removes specified keys", () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ["b"])).toEqual({ a: 1, c: 3 });
  });

  it("omits nothing when keys array is empty", () => {
    expect(omit({ a: 1, b: 2 }, [])).toEqual({ a: 1, b: 2 });
  });

  it("original not mutated", () => {
    const obj = { a: 1, b: 2 };
    omit(obj, ["a"]);
    expect(obj).toEqual({ a: 1, b: 2 });
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------
describe("get", () => {
  it("gets a top-level property", () => {
    expect(get({ a: 1 }, "a")).toBe(1);
  });

  it("gets a nested property via dot notation", () => {
    expect(get({ a: { b: { c: 42 } } }, "a.b.c")).toBe(42);
  });

  it("gets array element via bracket notation", () => {
    expect(get({ a: [10, 20, 30] }, "a[1]")).toBe(20);
  });

  it("gets array element via dot notation", () => {
    expect(get({ a: [10, 20] }, "a.0")).toBe(10);
  });

  it("returns defaultValue when path not found", () => {
    expect(get({ a: 1 }, "b.c", "default")).toBe("default");
  });

  it("returns undefined when path not found and no default", () => {
    expect(get({ a: 1 }, "b")).toBeUndefined();
  });

  it("handles null/undefined obj gracefully", () => {
    expect(get(null, "a", "fallback")).toBe("fallback");
  });

  it("returns value for path pointing to null", () => {
    expect(get({ a: null }, "a")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// set
// ---------------------------------------------------------------------------
describe("set", () => {
  it("sets a top-level property", () => {
    expect(set({ a: 1 }, "a", 99)).toEqual({ a: 99 });
  });

  it("sets a nested property", () => {
    expect(set({ a: { b: 1 } }, "a.b", 99)).toEqual({ a: { b: 99 } });
  });

  it("creates intermediate objects as needed", () => {
    expect(set({} as Record<string, unknown>, "a.b.c", 42)).toEqual({ a: { b: { c: 42 } } });
  });

  it("does not mutate the original", () => {
    const obj = { a: { b: 1 } };
    set(obj, "a.b", 99);
    expect(obj.a.b).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// has
// ---------------------------------------------------------------------------
describe("has", () => {
  it("returns true for existing path", () => {
    expect(has({ a: { b: 1 } }, "a.b")).toBe(true);
  });

  it("returns false for missing path", () => {
    expect(has({ a: 1 }, "b.c")).toBe(false);
  });

  it("returns false for null obj", () => {
    expect(has(null, "a")).toBe(false);
  });

  it("returns true even if value is undefined", () => {
    expect(has({ a: undefined }, "a")).toBe(true);
  });

  it("returns false for empty path string", () => {
    expect(has({ a: 1 }, "")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// flatten
// ---------------------------------------------------------------------------
describe("flatten", () => {
  it("flattens a nested object", () => {
    expect(flatten({ a: { b: 1, c: 2 } })).toEqual({ "a.b": 1, "a.c": 2 });
  });

  it("flattens deeply nested object", () => {
    expect(flatten({ a: { b: { c: 3 } } })).toEqual({ "a.b.c": 3 });
  });

  it("respects custom separator", () => {
    expect(flatten({ a: { b: 1 } }, "/")).toEqual({ "a/b": 1 });
  });

  it("treats arrays as leaf values", () => {
    const result = flatten({ a: [1, 2, 3] });
    expect(result["a"]).toEqual([1, 2, 3]);
  });

  it("flat object remains flat", () => {
    expect(flatten({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });
});

// ---------------------------------------------------------------------------
// unflatten
// ---------------------------------------------------------------------------
describe("unflatten", () => {
  it("reverses flatten for dot notation", () => {
    expect(unflatten({ "a.b": 1, "a.c": 2 })).toEqual({ a: { b: 1, c: 2 } });
  });

  it("reverses deeply nested", () => {
    expect(unflatten({ "a.b.c": 3 })).toEqual({ a: { b: { c: 3 } } });
  });

  it("respects custom separator", () => {
    expect(unflatten({ "a/b": 1 }, "/")).toEqual({ a: { b: 1 } });
  });

  it("roundtrips flatten → unflatten", () => {
    const obj = { a: { b: 1 }, c: { d: { e: 2 } } };
    expect(unflatten(flatten(obj))).toEqual(obj);
  });
});

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------
describe("diff", () => {
  it("reports changed keys with before/after", () => {
    const result = diff({ a: 1, b: 2 }, { a: 1, b: 99 });
    expect(result).toEqual({ b: { before: 2, after: 99 } });
  });

  it("does not include unchanged keys", () => {
    const result = diff({ a: 1, b: 2 }, { a: 1, b: 2 });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("reports added keys (before undefined)", () => {
    const result = diff({ a: 1 } as Record<string, unknown>, { a: 1, b: 2 });
    expect(result).toEqual({ b: { before: undefined, after: 2 } });
  });

  it("reports removed keys (after undefined)", () => {
    const result = diff({ a: 1, b: 2 }, { a: 1 } as Record<string, unknown>);
    expect(result).toEqual({ b: { before: 2, after: undefined } });
  });
});

// ---------------------------------------------------------------------------
// deepDiff
// ---------------------------------------------------------------------------
describe("deepDiff", () => {
  it("returns empty array for equal objects", () => {
    expect(deepDiff({ a: 1 }, { a: 1 })).toEqual([]);
  });

  it("detects nested change with correct path", () => {
    const changes = deepDiff({ a: { b: 1 } }, { a: { b: 2 } });
    expect(changes).toEqual([{ path: "a.b", before: 1, after: 2 }]);
  });

  it("detects multiple nested changes", () => {
    const changes = deepDiff({ a: 1, b: 2 }, { a: 9, b: 2 });
    expect(changes).toContainEqual({ path: "a", before: 1, after: 9 });
  });

  it("reports path at root level", () => {
    const changes = deepDiff(1, 2, "root");
    expect(changes).toEqual([{ path: "root", before: 1, after: 2 }]);
  });
});

// ---------------------------------------------------------------------------
// mapValues
// ---------------------------------------------------------------------------
describe("mapValues", () => {
  it("transforms all values", () => {
    expect(mapValues({ a: 1, b: 2 }, (v) => v * 10)).toEqual({ a: 10, b: 20 });
  });

  it("receives key as second argument", () => {
    const result = mapValues({ x: 1 }, (v, k) => `${k}=${v}`);
    expect(result).toEqual({ x: "x=1" });
  });
});

// ---------------------------------------------------------------------------
// filterValues
// ---------------------------------------------------------------------------
describe("filterValues", () => {
  it("keeps only entries passing predicate", () => {
    expect(filterValues({ a: 1, b: 2, c: 3 }, (v) => (v as number) > 1)).toEqual({ b: 2, c: 3 });
  });

  it("returns empty when no entries match", () => {
    expect(filterValues({ a: 1 }, () => false)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// mapKeys
// ---------------------------------------------------------------------------
describe("mapKeys", () => {
  it("transforms keys with mapping function", () => {
    expect(mapKeys({ a: 1, b: 2 }, (k) => k.toUpperCase())).toEqual({ A: 1, B: 2 });
  });

  it("receives value as second argument", () => {
    const result = mapKeys({ x: 1 }, (k, v) => `${k}${v}`);
    expect(result).toEqual({ x1: 1 });
  });
});

// ---------------------------------------------------------------------------
// invert
// ---------------------------------------------------------------------------
describe("invert", () => {
  it("swaps keys and values", () => {
    expect(invert({ a: "x", b: "y" })).toEqual({ x: "a", y: "b" });
  });

  it("handles numeric values by stringifying", () => {
    expect(invert({ a: 1, b: 2 })).toEqual({ "1": "a", "2": "b" });
  });
});

// ---------------------------------------------------------------------------
// groupBy
// ---------------------------------------------------------------------------
describe("groupBy", () => {
  it("groups items correctly", () => {
    const arr = [
      { sport: "NBA", name: "LeBron" },
      { sport: "NFL", name: "Mahomes" },
      { sport: "NBA", name: "Curry" },
    ];
    const result = groupBy(arr, (i) => i.sport);
    expect(result["NBA"]).toHaveLength(2);
    expect(result["NFL"]).toHaveLength(1);
  });

  it("returns empty object for empty array", () => {
    expect(groupBy([], (i: string) => i)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// countBy
// ---------------------------------------------------------------------------
describe("countBy", () => {
  it("counts items correctly", () => {
    const arr = ["a", "b", "a", "c", "a", "b"];
    expect(countBy(arr, (x) => x)).toEqual({ a: 3, b: 2, c: 1 });
  });

  it("returns zero-entry object for empty array", () => {
    expect(countBy([], (x: string) => x)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// zipObject
// ---------------------------------------------------------------------------
describe("zipObject", () => {
  it("creates object from keys and values", () => {
    expect(zipObject(["a", "b", "c"], [1, 2, 3])).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("returns empty object for empty arrays", () => {
    expect(zipObject([], [])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// entries / fromEntries
// ---------------------------------------------------------------------------
describe("entries", () => {
  it("returns key-value pairs", () => {
    const result = entries({ a: 1, b: 2 });
    expect(result).toContainEqual(["a", 1]);
    expect(result).toContainEqual(["b", 2]);
  });
});

describe("fromEntries", () => {
  it("creates object from entries", () => {
    expect(fromEntries([["a", 1], ["b", 2]])).toEqual({ a: 1, b: 2 });
  });
});

// ---------------------------------------------------------------------------
// isPlainObject
// ---------------------------------------------------------------------------
describe("isPlainObject", () => {
  it("returns true for plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isPlainObject([])).toBe(false);
  });

  it("returns false for Dates", () => {
    expect(isPlainObject(new Date())).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject("str")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isEmpty
// ---------------------------------------------------------------------------
describe("isEmpty", () => {
  it("null is empty", () => {
    expect(isEmpty(null)).toBe(true);
  });

  it("undefined is empty", () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it("empty string is empty", () => {
    expect(isEmpty("")).toBe(true);
  });

  it("empty array is empty", () => {
    expect(isEmpty([])).toBe(true);
  });

  it("empty object is empty", () => {
    expect(isEmpty({})).toBe(true);
  });

  it("non-empty string is not empty", () => {
    expect(isEmpty("a")).toBe(false);
  });

  it("non-empty array is not empty", () => {
    expect(isEmpty([1])).toBe(false);
  });

  it("non-empty object is not empty", () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it("number 0 is not treated as empty", () => {
    expect(isEmpty(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// compact
// ---------------------------------------------------------------------------
describe("compact", () => {
  it("removes falsy values", () => {
    expect(compact([0, 1, false, 2, "", 3, null, undefined])).toEqual([1, 2, 3]);
  });

  it("returns empty array for all-falsy input", () => {
    expect(compact([false, null, undefined, ""])).toEqual([]);
  });

  it("returns same elements for all-truthy input", () => {
    expect(compact([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// chunk
// ---------------------------------------------------------------------------
describe("chunk", () => {
  it("splits array into chunks of given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("last chunk may be smaller", () => {
    const result = chunk([1, 2, 3], 2);
    expect(result[result.length - 1]).toEqual([3]);
  });

  it("chunk size equal to length returns single chunk", () => {
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });

  it("chunk size 1 returns each element in its own array", () => {
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });

  it("empty array returns empty array", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// keyBy
// ---------------------------------------------------------------------------
describe("keyBy", () => {
  it("indexes by key function", () => {
    const arr = [{ id: "a", v: 1 }, { id: "b", v: 2 }];
    const result = keyBy(arr, (x) => x.id);
    expect(result["a"]).toEqual({ id: "a", v: 1 });
    expect(result["b"]).toEqual({ id: "b", v: 2 });
  });

  it("last item wins on collision", () => {
    const arr = [{ id: "a", v: 1 }, { id: "a", v: 2 }];
    expect(keyBy(arr, (x) => x.id)["a"]).toEqual({ id: "a", v: 2 });
  });
});

// ---------------------------------------------------------------------------
// sortedUniq
// ---------------------------------------------------------------------------
describe("sortedUniq", () => {
  it("removes consecutive duplicates", () => {
    expect(sortedUniq([1, 1, 2, 3, 3, 3, 4])).toEqual([1, 2, 3, 4]);
  });

  it("returns original when no duplicates", () => {
    expect(sortedUniq([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("returns empty array for empty input", () => {
    expect(sortedUniq([])).toEqual([]);
  });

  it("handles non-consecutive duplicates as distinct", () => {
    // [1, 2, 1] — the second 1 is not consecutive, so kept
    expect(sortedUniq([1, 2, 1])).toEqual([1, 2, 1]);
  });
});

// ---------------------------------------------------------------------------
// toPath
// ---------------------------------------------------------------------------
describe("toPath", () => {
  it("parses dot notation", () => {
    expect(toPath("a.b.c")).toEqual(["a", "b", "c"]);
  });

  it("parses bracket notation", () => {
    expect(toPath("a[0].b")).toEqual(["a", "0", "b"]);
  });

  it("parses mixed notation", () => {
    expect(toPath("a.b[0].c")).toEqual(["a", "b", "0", "c"]);
  });

  it("returns empty array for empty string", () => {
    expect(toPath("")).toEqual([]);
  });

  it("returns single element for simple key", () => {
    expect(toPath("a")).toEqual(["a"]);
  });
});
