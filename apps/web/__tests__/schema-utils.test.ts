/**
 * schema-utils.test.ts
 * ~150+ tests for the schema-utils utility library.
 */
import { describe, it, expect } from "vitest";
import {
  // Type guards
  isString,
  isNumber,
  isBoolean,
  isNull,
  isUndefined,
  isArray,
  isObject,
  isPrimitive,
  isNonEmpty,
  // Core validation
  validate,
  validateObject,
  validateArray,
  coerce,
  // Deep comparison
  deepEqual,
  deepClone,
  deepMerge,
  deepDiff,
  // Object utilities
  pick,
  omit,
  flatten,
  unflatten,
  objectMap,
  objectFilter,
  // Data transformation
  normalizeKeys,
  stripNullish,
  renameKeys,
  groupByKey,
  indexBy,
  // Sports-specific
  pickSchema,
  validatePick,
  oddsSchema,
  validateOdds,
  sanitizePickInput,
} from "@/lib/utils/schema-utils";

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe("isString", () => {
  it("returns true for a string", () => {
    expect(isString("hello")).toBe(true);
  });
  it("returns true for empty string", () => {
    expect(isString("")).toBe(true);
  });
  it("returns false for number", () => {
    expect(isString(42)).toBe(false);
  });
  it("returns false for null", () => {
    expect(isString(null)).toBe(false);
  });
  it("returns false for undefined", () => {
    expect(isString(undefined)).toBe(false);
  });
  it("returns false for object", () => {
    expect(isString({})).toBe(false);
  });
});

describe("isNumber", () => {
  it("returns true for integer", () => {
    expect(isNumber(42)).toBe(true);
  });
  it("returns true for float", () => {
    expect(isNumber(3.14)).toBe(true);
  });
  it("returns true for 0", () => {
    expect(isNumber(0)).toBe(true);
  });
  it("returns true for negative", () => {
    expect(isNumber(-7)).toBe(true);
  });
  it("returns false for NaN", () => {
    expect(isNumber(NaN)).toBe(false);
  });
  it("returns false for string", () => {
    expect(isNumber("42")).toBe(false);
  });
  it("returns false for null", () => {
    expect(isNumber(null)).toBe(false);
  });
});

describe("isBoolean", () => {
  it("returns true for true", () => {
    expect(isBoolean(true)).toBe(true);
  });
  it("returns true for false", () => {
    expect(isBoolean(false)).toBe(true);
  });
  it("returns false for 0", () => {
    expect(isBoolean(0)).toBe(false);
  });
  it("returns false for string 'true'", () => {
    expect(isBoolean("true")).toBe(false);
  });
});

describe("isNull", () => {
  it("returns true for null", () => {
    expect(isNull(null)).toBe(true);
  });
  it("returns false for undefined", () => {
    expect(isNull(undefined)).toBe(false);
  });
  it("returns false for 0", () => {
    expect(isNull(0)).toBe(false);
  });
});

describe("isUndefined", () => {
  it("returns true for undefined", () => {
    expect(isUndefined(undefined)).toBe(true);
  });
  it("returns false for null", () => {
    expect(isUndefined(null)).toBe(false);
  });
  it("returns false for 0", () => {
    expect(isUndefined(0)).toBe(false);
  });
});

describe("isArray", () => {
  it("returns true for []", () => {
    expect(isArray([])).toBe(true);
  });
  it("returns true for [1, 2, 3]", () => {
    expect(isArray([1, 2, 3])).toBe(true);
  });
  it("returns false for object", () => {
    expect(isArray({})).toBe(false);
  });
  it("returns false for null", () => {
    expect(isArray(null)).toBe(false);
  });
  it("returns false for string", () => {
    expect(isArray("abc")).toBe(false);
  });
});

describe("isObject", () => {
  it("returns true for plain object", () => {
    expect(isObject({ a: 1 })).toBe(true);
  });
  it("returns true for empty object", () => {
    expect(isObject({})).toBe(true);
  });
  it("returns false for array", () => {
    expect(isObject([1, 2])).toBe(false);
  });
  it("returns false for null", () => {
    expect(isObject(null)).toBe(false);
  });
  it("returns false for string", () => {
    expect(isObject("hello")).toBe(false);
  });
  it("returns false for number", () => {
    expect(isObject(42)).toBe(false);
  });
});

describe("isPrimitive", () => {
  it("returns true for string", () => {
    expect(isPrimitive("x")).toBe(true);
  });
  it("returns true for number", () => {
    expect(isPrimitive(1)).toBe(true);
  });
  it("returns true for boolean", () => {
    expect(isPrimitive(true)).toBe(true);
  });
  it("returns true for null", () => {
    expect(isPrimitive(null)).toBe(true);
  });
  it("returns true for undefined", () => {
    expect(isPrimitive(undefined)).toBe(true);
  });
  it("returns false for object", () => {
    expect(isPrimitive({})).toBe(false);
  });
  it("returns false for array", () => {
    expect(isPrimitive([])).toBe(false);
  });
});

describe("isNonEmpty", () => {
  it("returns true for non-empty string", () => {
    expect(isNonEmpty("a")).toBe(true);
  });
  it("returns false for empty string", () => {
    expect(isNonEmpty("")).toBe(false);
  });
  it("returns true for non-empty array", () => {
    expect(isNonEmpty([1])).toBe(true);
  });
  it("returns false for empty array", () => {
    expect(isNonEmpty([])).toBe(false);
  });
  it("returns true for non-empty object", () => {
    expect(isNonEmpty({ a: 1 })).toBe(true);
  });
  it("returns false for empty object", () => {
    expect(isNonEmpty({})).toBe(false);
  });
  it("returns false for null", () => {
    expect(isNonEmpty(null)).toBe(false);
  });
  it("returns false for undefined", () => {
    expect(isNonEmpty(undefined)).toBe(false);
  });
  it("returns true for number 0 (non-null/undefined)", () => {
    expect(isNonEmpty(0)).toBe(true);
  });
  it("returns true for false (non-null/undefined)", () => {
    expect(isNonEmpty(false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

describe("validate — type checks", () => {
  it("passes when value matches declared type", () => {
    const r = validate("hello", { type: "string" });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("fails when value does not match type", () => {
    const r = validate(42, { type: "string" });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/type/);
  });

  it("accepts union types", () => {
    const r = validate(null, { type: ["string", "null"] });
    expect(r.valid).toBe(true);
  });

  it("accepts nullable null", () => {
    const r = validate(null, { type: "string", nullable: true });
    expect(r.valid).toBe(true);
  });

  it("rejects null when not nullable", () => {
    const r = validate(null, { type: "string" });
    expect(r.valid).toBe(false);
  });

  it("skips absent optional field", () => {
    const r = validate(undefined, { type: "string" });
    expect(r.valid).toBe(true);
  });

  it("fails when required field is absent", () => {
    const r = validate(undefined, { type: "string", required: true });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/required/);
  });

  it("includes path in error message", () => {
    const r = validate(42, { type: "string" }, "user.email");
    expect(r.errors[0]).toContain("user.email");
  });
});

describe("validate — string constraints", () => {
  it("passes min length", () => {
    const r = validate("abcde", { type: "string", min: 3 });
    expect(r.valid).toBe(true);
  });

  it("fails min length", () => {
    const r = validate("ab", { type: "string", min: 3 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/at least 3/);
  });

  it("passes max length", () => {
    const r = validate("ab", { type: "string", max: 5 });
    expect(r.valid).toBe(true);
  });

  it("fails max length", () => {
    const r = validate("abcdef", { type: "string", max: 5 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/at most 5/);
  });

  it("passes pattern", () => {
    const r = validate("abc123", { type: "string", pattern: "^[a-z0-9]+$" });
    expect(r.valid).toBe(true);
  });

  it("fails pattern", () => {
    const r = validate("ABC", { type: "string", pattern: "^[a-z]+$" });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/pattern/);
  });
});

describe("validate — number constraints", () => {
  it("passes min value", () => {
    const r = validate(5, { type: "number", min: 0 });
    expect(r.valid).toBe(true);
  });

  it("fails min value", () => {
    const r = validate(-1, { type: "number", min: 0 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/>= 0/);
  });

  it("passes max value", () => {
    const r = validate(100, { type: "number", max: 100 });
    expect(r.valid).toBe(true);
  });

  it("fails max value", () => {
    const r = validate(101, { type: "number", max: 100 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/<= 100/);
  });
});

describe("validate — array constraints", () => {
  it("passes minItems", () => {
    const r = validate([1, 2], { type: "array", min: 2 });
    expect(r.valid).toBe(true);
  });

  it("fails minItems", () => {
    const r = validate([1], { type: "array", min: 2 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/at least 2 items/);
  });

  it("fails maxItems", () => {
    const r = validate([1, 2, 3], { type: "array", max: 2 });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/at most 2 items/);
  });

  it("validates items rule on each element", () => {
    const r = validate([1, "bad", 3], { type: "array", items: { type: "number" } });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("[1]");
  });

  it("collects multiple item errors", () => {
    const r = validate(["a", "b"], { type: "array", items: { type: "number" } });
    expect(r.errors).toHaveLength(2);
  });
});

describe("validate — enum", () => {
  it("passes when value in enum", () => {
    const r = validate("pro", { enum: ["free", "pro", "elite"] });
    expect(r.valid).toBe(true);
  });

  it("fails when value not in enum", () => {
    const r = validate("vip", { enum: ["free", "pro", "elite"] });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/one of/);
  });
});

describe("validate — nested object properties", () => {
  it("validates nested properties", () => {
    const rule = {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, required: true },
        age: { type: "number" as const, min: 0 },
      },
    };
    const r = validate({ name: "Alice", age: 30 }, rule);
    expect(r.valid).toBe(true);
  });

  it("collects nested errors without short-circuit", () => {
    const rule = {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, required: true },
        age: { type: "number" as const, min: 0 },
      },
    };
    const r = validate({ name: 123, age: -1 }, rule);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("includes nested path in error", () => {
    const rule = {
      type: "object" as const,
      properties: { email: { type: "string" as const, required: true } },
    };
    const r = validate({}, rule, "user");
    expect(r.errors[0]).toContain("user.email");
  });
});

// ---------------------------------------------------------------------------
// validateObject
// ---------------------------------------------------------------------------

describe("validateObject", () => {
  it("passes valid object", () => {
    const schema = {
      name: { type: "string" as const, required: true },
      score: { type: "number" as const, required: true, min: 0, max: 100 },
    };
    const r = validateObject({ name: "Test", score: 75 }, schema);
    expect(r.valid).toBe(true);
  });

  it("rejects non-object", () => {
    const r = validateObject(42, {});
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/must be an object/);
  });

  it("collects all field errors", () => {
    const schema = {
      a: { type: "string" as const, required: true },
      b: { type: "number" as const, required: true },
    };
    const r = validateObject({}, schema);
    expect(r.errors).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// validateArray
// ---------------------------------------------------------------------------

describe("validateArray", () => {
  it("passes valid array", () => {
    const r = validateArray([1, 2, 3], { type: "number" });
    expect(r.valid).toBe(true);
  });

  it("rejects non-array", () => {
    const r = validateArray("nope", { type: "number" });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/must be an array/);
  });

  it("collects errors for each invalid item", () => {
    const r = validateArray(["a", "b", "c"], { type: "number" });
    expect(r.errors).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// coerce
// ---------------------------------------------------------------------------

describe("coerce", () => {
  it("coerces string to number", () => {
    expect(coerce("3.14", "number")).toBe(3.14);
  });

  it("coerces '0' to 0", () => {
    expect(coerce("0", "number")).toBe(0);
  });

  it("returns original for non-numeric string to number", () => {
    expect(coerce("abc", "number")).toBe("abc");
  });

  it("coerces boolean true to 1", () => {
    expect(coerce(true, "number")).toBe(1);
  });

  it("coerces boolean false to 0", () => {
    expect(coerce(false, "number")).toBe(0);
  });

  it("coerces 'true' string to boolean", () => {
    expect(coerce("true", "boolean")).toBe(true);
  });

  it("coerces '1' string to boolean true", () => {
    expect(coerce("1", "boolean")).toBe(true);
  });

  it("coerces 'false' string to boolean false", () => {
    expect(coerce("false", "boolean")).toBe(false);
  });

  it("coerces '0' string to boolean false", () => {
    expect(coerce("0", "boolean")).toBe(false);
  });

  it("returns original for unrecognized string to boolean", () => {
    expect(coerce("maybe", "boolean")).toBe("maybe");
  });

  it("coerces number to string", () => {
    expect(coerce(42, "string")).toBe("42");
  });

  it("coerces boolean to string", () => {
    expect(coerce(true, "string")).toBe("true");
  });

  it("returns original string as string", () => {
    expect(coerce("hello", "string")).toBe("hello");
  });

  it("returns object unchanged for number coercion", () => {
    expect(coerce({}, "number")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// deepEqual
// ---------------------------------------------------------------------------

describe("deepEqual", () => {
  it("returns true for identical primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
  });

  it("returns true for equal nested objects", () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
  });

  it("returns false for different nested values", () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it("returns true for equal arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("returns false for different arrays", () => {
    expect(deepEqual([1, 2], [1, 3])).toBe(false);
  });

  it("returns false for arrays of different lengths", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("returns true for null === null", () => {
    expect(deepEqual(null, null)).toBe(true);
  });

  it("returns false for null vs undefined", () => {
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it("returns true for nested objects with arrays", () => {
    expect(deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
  });

  it("returns false for objects with extra key", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deepClone
// ---------------------------------------------------------------------------

describe("deepClone", () => {
  it("clones a primitive", () => {
    expect(deepClone(42)).toBe(42);
  });

  it("clones a nested object", () => {
    const obj = { a: { b: 1 } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    // mutating clone does not affect original
    cloned.a.b = 99;
    expect(obj.a.b).toBe(1);
  });

  it("clones an array", () => {
    const arr = [1, [2, 3]];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
  });

  it("returns functions as-is", () => {
    const fn = (): void => { return; };
    expect(deepClone(fn)).toBe(fn);
  });

  it("returns Date as-is", () => {
    const d = new Date();
    expect(deepClone(d)).toBe(d);
  });
});

// ---------------------------------------------------------------------------
// deepMerge
// ---------------------------------------------------------------------------

describe("deepMerge", () => {
  it("merges two flat objects", () => {
    const target: Record<string, unknown> = { a: 1, b: 2 };
    const result = deepMerge(target, { b: 3, c: 4 });
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("deep merges nested objects", () => {
    const target: Record<string, unknown> = { a: { x: 1, y: 2 } };
    const result = deepMerge(target, { a: { y: 99, z: 3 } });
    expect(result).toEqual({ a: { x: 1, y: 99, z: 3 } });
  });

  it("replaces arrays (not merges)", () => {
    const target: Record<string, unknown> = { a: [1, 2, 3] };
    const result = deepMerge(target, { a: [4, 5] });
    expect(result["a"]).toEqual([4, 5]);
  });

  it("later sources win", () => {
    const target: Record<string, unknown> = { x: 1 };
    const result = deepMerge(target, { x: 2 }, { x: 3 });
    expect(result["x"]).toBe(3);
  });

  it("does not mutate the target", () => {
    const target: Record<string, unknown> = { a: 1 };
    deepMerge(target, { b: 2 });
    expect(target).toEqual({ a: 1 });
  });
});

// ---------------------------------------------------------------------------
// deepDiff
// ---------------------------------------------------------------------------

describe("deepDiff", () => {
  it("detects no diff when objects are equal", () => {
    const diff = deepDiff({ a: 1 }, { a: 1 });
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  it("detects added keys", () => {
    const diff = deepDiff({ a: 1 }, { a: 1, b: 2 });
    expect(diff.added).toContain("b");
  });

  it("detects removed keys", () => {
    const diff = deepDiff({ a: 1, b: 2 }, { a: 1 });
    expect(diff.removed).toContain("b");
  });

  it("detects changed values", () => {
    const diff = deepDiff({ a: 1 }, { a: 2 });
    expect(diff.changed).toContain("a");
  });

  it("uses dot notation for nested paths", () => {
    const diff = deepDiff({ a: { b: 1 } }, { a: { b: 2 } });
    expect(diff.changed).toContain("a.b");
  });

  it("detects nested added key", () => {
    const diff = deepDiff({ a: { b: 1 } }, { a: { b: 1, c: 2 } });
    expect(diff.added).toContain("a.c");
  });

  it("detects nested removed key", () => {
    const diff = deepDiff({ a: { b: 1, c: 2 } }, { a: { b: 1 } });
    expect(diff.removed).toContain("a.c");
  });
});

// ---------------------------------------------------------------------------
// pick / omit
// ---------------------------------------------------------------------------

describe("pick", () => {
  it("picks specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  it("picks single key", () => {
    const obj = { x: "hello", y: 42 };
    expect(pick(obj, ["x"])).toEqual({ x: "hello" });
  });

  it("returns empty object for empty keys array", () => {
    expect(pick({ a: 1 }, [])).toEqual({});
  });
});

describe("omit", () => {
  it("omits specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ["b"])).toEqual({ a: 1, c: 3 });
  });

  it("returns full object when keys array is empty", () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, [])).toEqual({ a: 1, b: 2 });
  });

  it("omits multiple keys", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(omit(obj, ["a", "d"])).toEqual({ b: 2, c: 3 });
  });
});

// ---------------------------------------------------------------------------
// flatten / unflatten
// ---------------------------------------------------------------------------

describe("flatten", () => {
  it("flattens nested object with default delimiter", () => {
    const result = flatten({ a: { b: 1 } });
    expect(result).toEqual({ "a.b": 1 });
  });

  it("flattens deeply nested object", () => {
    const result = flatten({ a: { b: { c: 42 } } });
    expect(result).toEqual({ "a.b.c": 42 });
  });

  it("keeps flat values unchanged", () => {
    const result = flatten({ x: 1, y: 2 });
    expect(result).toEqual({ x: 1, y: 2 });
  });

  it("supports custom delimiter", () => {
    const result = flatten({ a: { b: 1 } }, "_");
    expect(result).toEqual({ a_b: 1 });
  });

  it("handles mixed flat and nested", () => {
    const result = flatten({ a: 1, b: { c: 2 } });
    expect(result).toEqual({ a: 1, "b.c": 2 });
  });
});

describe("unflatten", () => {
  it("unflattens dotted keys", () => {
    const result = unflatten({ "a.b": 1 });
    expect(result).toEqual({ a: { b: 1 } });
  });

  it("unflattens deeply nested", () => {
    const result = unflatten({ "a.b.c": 42 });
    expect(result).toEqual({ a: { b: { c: 42 } } });
  });

  it("flat keys are preserved", () => {
    const result = unflatten({ x: 1, y: 2 });
    expect(result).toEqual({ x: 1, y: 2 });
  });

  it("supports custom delimiter", () => {
    const result = unflatten({ a_b: 1 }, "_");
    expect(result).toEqual({ a: { b: 1 } });
  });

  it("round-trips flatten → unflatten", () => {
    const original = { a: { b: { c: 1 }, d: 2 }, e: 3 };
    const flat = flatten(original);
    const restored = unflatten(flat);
    expect(restored).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// objectMap / objectFilter
// ---------------------------------------------------------------------------

describe("objectMap", () => {
  it("transforms values", () => {
    const result = objectMap({ a: 1, b: 2 }, (v) => v * 2);
    expect(result).toEqual({ a: 2, b: 4 });
  });

  it("provides key to callback", () => {
    const keys: string[] = [];
    objectMap({ x: 10 }, (_, k) => { keys.push(k); return k; });
    expect(keys).toContain("x");
  });
});

describe("objectFilter", () => {
  it("filters by value predicate", () => {
    const result = objectFilter({ a: 1, b: 2, c: 3 }, (v) => v > 1);
    expect(result).toEqual({ b: 2, c: 3 });
  });

  it("filters by key predicate", () => {
    const result = objectFilter({ foo: 1, bar: 2 }, (_, k) => k.startsWith("f"));
    expect(result).toEqual({ foo: 1 });
  });

  it("returns empty object when nothing passes", () => {
    const result = objectFilter({ a: 1 }, () => false);
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// normalizeKeys
// ---------------------------------------------------------------------------

describe("normalizeKeys", () => {
  it("converts snake_case keys to camelCase", () => {
    const result = normalizeKeys({ first_name: "Alice", last_name: "Smith" }, "camelCase");
    expect(result).toHaveProperty("firstName", "Alice");
    expect(result).toHaveProperty("lastName", "Smith");
  });

  it("converts camelCase keys to snake_case", () => {
    const result = normalizeKeys({ firstName: "Alice", lastName: "Smith" }, "snake_case");
    expect(result).toHaveProperty("first_name", "Alice");
    expect(result).toHaveProperty("last_name", "Smith");
  });

  it("converts camelCase keys to kebab-case", () => {
    const result = normalizeKeys({ firstName: "Alice" }, "kebab-case");
    expect(result).toHaveProperty("first-name", "Alice");
  });

  it("recursively normalizes nested object keys", () => {
    const result = normalizeKeys({ user_info: { first_name: "Bob" } }, "camelCase");
    expect(result).toHaveProperty("userInfo");
    const userInfo = result["userInfo"] as Record<string, unknown>;
    expect(userInfo["firstName"]).toBe("Bob");
  });

  it("normalizes keys inside arrays of objects", () => {
    const result = normalizeKeys({ my_list: [{ foo_bar: 1 }] }, "camelCase");
    const list = result["myList"] as Array<Record<string, unknown>>;
    expect(list[0]?.["fooBar"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// stripNullish
// ---------------------------------------------------------------------------

describe("stripNullish", () => {
  it("removes null values", () => {
    const result = stripNullish({ a: 1, b: null });
    expect(result).toEqual({ a: 1 });
  });

  it("removes undefined values", () => {
    const result = stripNullish({ a: 1, b: undefined });
    expect(result).toEqual({ a: 1 });
  });

  it("keeps 0 and false", () => {
    const result = stripNullish({ a: 0, b: false, c: "" });
    expect(result).toEqual({ a: 0, b: false, c: "" });
  });
});

// ---------------------------------------------------------------------------
// renameKeys
// ---------------------------------------------------------------------------

describe("renameKeys", () => {
  it("renames keys per mapping", () => {
    const result = renameKeys({ foo: 1, bar: 2 }, { foo: "baz" });
    expect(result).toEqual({ baz: 1, bar: 2 });
  });

  it("leaves unmapped keys unchanged", () => {
    const result = renameKeys({ a: 1, b: 2 }, {});
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("renames multiple keys", () => {
    const result = renameKeys({ x: 1, y: 2 }, { x: "a", y: "b" });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

// ---------------------------------------------------------------------------
// groupByKey / indexBy
// ---------------------------------------------------------------------------

describe("groupByKey", () => {
  it("groups by string key value", () => {
    const items = [
      { sport: "NFL", name: "Pick A" },
      { sport: "NBA", name: "Pick B" },
      { sport: "NFL", name: "Pick C" },
    ];
    const grouped = groupByKey(items, "sport");
    expect(grouped.get("NFL")).toHaveLength(2);
    expect(grouped.get("NBA")).toHaveLength(1);
  });

  it("handles empty array", () => {
    const grouped = groupByKey([], "id");
    expect(grouped.size).toBe(0);
  });

  it("converts key value to string", () => {
    const items = [{ score: 100 }, { score: 100 }, { score: 200 }];
    const grouped = groupByKey(items, "score");
    expect(grouped.get("100")).toHaveLength(2);
  });
});

describe("indexBy", () => {
  it("indexes by key", () => {
    const items = [
      { id: "a", val: 1 },
      { id: "b", val: 2 },
    ];
    const indexed = indexBy(items, "id");
    expect(indexed.get("a")).toEqual({ id: "a", val: 1 });
  });

  it("last value wins on duplicate keys", () => {
    const items = [
      { id: "a", val: 1 },
      { id: "a", val: 99 },
    ];
    const indexed = indexBy(items, "id");
    expect(indexed.get("a")?.val).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Sports-specific: pickSchema / validatePick
// ---------------------------------------------------------------------------

describe("pickSchema", () => {
  it("returns a schema with the required keys", () => {
    const schema = pickSchema();
    expect(schema).toHaveProperty("sport");
    expect(schema).toHaveProperty("game");
    expect(schema).toHaveProperty("line");
    expect(schema).toHaveProperty("confidence");
    expect(schema).toHaveProperty("tier");
    expect(schema).toHaveProperty("generatedAt");
  });

  it("marks sport as required", () => {
    expect(pickSchema()["sport"]?.required).toBe(true);
  });

  it("confidence has min 0 and max 100", () => {
    const conf = pickSchema()["confidence"];
    expect(conf?.min).toBe(0);
    expect(conf?.max).toBe(100);
  });

  it("tier has enum of free/pro/elite", () => {
    const tier = pickSchema()["tier"];
    expect(tier?.enum).toContain("free");
    expect(tier?.enum).toContain("pro");
    expect(tier?.enum).toContain("elite");
  });
});

describe("validatePick", () => {
  const validPick = {
    sport: "NFL",
    game: "Patriots vs Chiefs",
    line: -3.5,
    confidence: 72,
    tier: "pro",
    generatedAt: "2026-06-19T00:00:00Z",
  };

  it("passes a fully valid pick", () => {
    const r = validatePick(validPick);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("fails when sport is missing", () => {
    const r = validatePick({ ...validPick, sport: undefined });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("sport"))).toBe(true);
  });

  it("fails when confidence exceeds 100", () => {
    const r = validatePick({ ...validPick, confidence: 150 });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("confidence"))).toBe(true);
  });

  it("fails when confidence is below 0", () => {
    const r = validatePick({ ...validPick, confidence: -1 });
    expect(r.valid).toBe(false);
  });

  it("fails when tier is invalid", () => {
    const r = validatePick({ ...validPick, tier: "diamond" });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("tier"))).toBe(true);
  });

  it("fails for non-object input", () => {
    const r = validatePick("not an object");
    expect(r.valid).toBe(false);
  });

  it("collects multiple errors at once", () => {
    const r = validatePick({ sport: undefined, game: undefined, tier: "invalid" });
    // sport, game required + tier enum violation
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("passes for elite tier", () => {
    const r = validatePick({ ...validPick, tier: "elite" });
    expect(r.valid).toBe(true);
  });

  it("passes for free tier", () => {
    const r = validatePick({ ...validPick, tier: "free" });
    expect(r.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sports-specific: oddsSchema / validateOdds
// ---------------------------------------------------------------------------

describe("oddsSchema", () => {
  it("returns an object-type rule", () => {
    const schema = oddsSchema();
    expect(schema.type).toBe("object");
  });
});

describe("validateOdds", () => {
  it("passes valid odds", () => {
    const r = validateOdds({ home: 1.9, away: 1.9 });
    expect(r.valid).toBe(true);
  });

  it("passes empty object (all optional)", () => {
    const r = validateOdds({});
    expect(r.valid).toBe(true);
  });

  it("fails overUnder below 0", () => {
    const r = validateOdds({ overUnder: -1 });
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("overUnder"))).toBe(true);
  });

  it("fails for non-object", () => {
    const r = validateOdds("not odds");
    expect(r.valid).toBe(false);
  });

  it("passes odds with draw", () => {
    const r = validateOdds({ home: 2.5, away: 2.5, draw: 3.0 });
    expect(r.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sanitizePickInput
// ---------------------------------------------------------------------------

describe("sanitizePickInput", () => {
  it("strips unknown keys", () => {
    const result = sanitizePickInput({
      sport: "NBA",
      game: "Lakers vs Celtics",
      line: -2,
      confidence: 60,
      tier: "free",
      generatedAt: "2026-06-19T00:00:00Z",
      unknownField: "should be removed",
      anotherExtra: 999,
    });
    expect(result).not.toHaveProperty("unknownField");
    expect(result).not.toHaveProperty("anotherExtra");
  });

  it("keeps schema keys", () => {
    const result = sanitizePickInput({
      sport: "NBA",
      game: "Lakers vs Celtics",
      line: -2,
      confidence: 60,
      tier: "free",
      generatedAt: "2026-06-19T00:00:00Z",
    });
    expect(result).toHaveProperty("sport", "NBA");
    expect(result).toHaveProperty("game", "Lakers vs Celtics");
    expect(result).toHaveProperty("line", -2);
    expect(result).toHaveProperty("confidence", 60);
    expect(result).toHaveProperty("tier", "free");
    expect(result).toHaveProperty("generatedAt", "2026-06-19T00:00:00Z");
  });

  it("coerces string line to number", () => {
    const result = sanitizePickInput({ line: "3.5", confidence: "80" });
    expect(result["line"]).toBe(3.5);
    expect(result["confidence"]).toBe(80);
  });

  it("trims whitespace from string fields", () => {
    const result = sanitizePickInput({ sport: "  NFL  ", game: " Chiefs vs Ravens " });
    expect(result["sport"]).toBe("NFL");
    expect(result["game"]).toBe("Chiefs vs Ravens");
  });

  it("does not include absent keys", () => {
    const result = sanitizePickInput({ sport: "NFL" });
    expect(result).not.toHaveProperty("game");
    expect(result).not.toHaveProperty("line");
  });

  it("handles empty input", () => {
    const result = sanitizePickInput({});
    expect(result).toEqual({});
  });
});
