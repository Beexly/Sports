/**
 * schema-utils.ts
 * Pure TypeScript schema validation, type guards, deep comparison,
 * object utilities, and data transformation helpers.
 * Zero npm dependencies — Node built-ins only.
 */

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

export type SchemaType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "array"
  | "object"
  | "undefined";

export type SchemaRule = {
  type?: SchemaType | SchemaType[];
  required?: boolean;
  min?: number; // string: minLength, number: min value, array: minItems
  max?: number; // string: maxLength, number: max value, array: maxItems
  pattern?: string; // regex string for string type
  enum?: unknown[]; // allowed values
  properties?: Record<string, SchemaRule>; // for object type
  items?: SchemaRule; // for array type
  nullable?: boolean; // allow null in addition to type
};

export type ValidationResult = { valid: boolean; errors: string[] };

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return typeof value === "undefined";
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

export function isPrimitive(
  value: unknown
): value is string | number | boolean | null | undefined {
  if (value === null || value === undefined) return true;
  const t = typeof value;
  return t === "string" || t === "number" || t === "boolean";
}

export function isNonEmpty(value: unknown): boolean {
  if (isString(value)) return value.length > 0;
  if (isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return value !== null && value !== undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSchemaType(value: unknown): SchemaType {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value as SchemaType;
}

function mergeResults(...results: ValidationResult[]): ValidationResult {
  const errors: string[] = [];
  for (const r of results) {
    errors.push(...r.errors);
  }
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Core validation
// ---------------------------------------------------------------------------

/**
 * Validate a value against a SchemaRule. Collects ALL errors (no early exit).
 * `path` is used in error messages (e.g. "user.email").
 */
export function validate(
  value: unknown,
  rule: SchemaRule,
  path = "value"
): ValidationResult {
  const errors: string[] = [];

  // required check
  if (rule.required && (value === undefined || value === null)) {
    errors.push(`${path} is required`);
    return { valid: false, errors };
  }

  // If value is absent and not required, skip further checks
  if (value === undefined) {
    return { valid: true, errors: [] };
  }

  // nullable: null is accepted in addition to stated type
  if (value === null) {
    if (rule.nullable) {
      return { valid: true, errors: [] };
    }
    // Check if null is an explicitly allowed type
    const types = rule.type
      ? Array.isArray(rule.type)
        ? rule.type
        : [rule.type]
      : [];
    if (!types.includes("null")) {
      errors.push(`${path} must not be null`);
      return { valid: false, errors };
    }
  }

  // type check
  if (rule.type !== undefined) {
    const allowedTypes = Array.isArray(rule.type) ? rule.type : [rule.type];
    const actualType = getSchemaType(value);
    const typeOk =
      allowedTypes.includes(actualType) ||
      (rule.nullable && value === null);

    if (!typeOk) {
      errors.push(
        `${path} must be of type ${allowedTypes.join(" | ")}, got ${actualType}`
      );
    }
  }

  // enum check
  if (rule.enum !== undefined) {
    const found = rule.enum.some((e) => deepEqual(e, value));
    if (!found) {
      errors.push(
        `${path} must be one of [${rule.enum
          .map((e) => JSON.stringify(e))
          .join(", ")}]`
      );
    }
  }

  // string-specific checks
  if (isString(value)) {
    if (rule.min !== undefined && value.length < rule.min) {
      errors.push(`${path} must have at least ${rule.min} characters`);
    }
    if (rule.max !== undefined && value.length > rule.max) {
      errors.push(`${path} must have at most ${rule.max} characters`);
    }
    if (rule.pattern !== undefined) {
      const re = new RegExp(rule.pattern);
      if (!re.test(value)) {
        errors.push(`${path} must match pattern ${rule.pattern}`);
      }
    }
  }

  // number-specific checks
  if (isNumber(value)) {
    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${path} must be >= ${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${path} must be <= ${rule.max}`);
    }
  }

  // array-specific checks
  if (isArray(value)) {
    if (rule.min !== undefined && value.length < rule.min) {
      errors.push(`${path} must have at least ${rule.min} items`);
    }
    if (rule.max !== undefined && value.length > rule.max) {
      errors.push(`${path} must have at most ${rule.max} items`);
    }
    if (rule.items !== undefined) {
      value.forEach((item, idx) => {
        const itemResult = validate(item, rule.items as SchemaRule, `${path}[${idx}]`);
        errors.push(...itemResult.errors);
      });
    }
  }

  // object-specific checks
  if (isObject(value) && rule.properties !== undefined) {
    for (const [propKey, propRule] of Object.entries(rule.properties)) {
      const propValue = value[propKey];
      const propResult = validate(propValue, propRule, `${path}.${propKey}`);
      errors.push(...propResult.errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate each key of an object against a schema map.
 */
export function validateObject(
  obj: unknown,
  schema: Record<string, SchemaRule>
): ValidationResult {
  if (!isObject(obj)) {
    return { valid: false, errors: ["value must be an object"] };
  }

  const errors: string[] = [];
  for (const [key, rule] of Object.entries(schema)) {
    const fieldValue = obj[key];
    const result = validate(fieldValue, rule, key);
    errors.push(...result.errors);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validate each element of an array against itemRule.
 */
export function validateArray(
  arr: unknown,
  itemRule: SchemaRule
): ValidationResult {
  if (!isArray(arr)) {
    return { valid: false, errors: ["value must be an array"] };
  }

  const errors: string[] = [];
  arr.forEach((item, idx) => {
    const result = validate(item, itemRule, `[${idx}]`);
    errors.push(...result.errors);
  });
  return { valid: errors.length === 0, errors };
}

/**
 * Attempt type coercion. Returns original value if coercion not possible.
 */
export function coerce(
  value: unknown,
  targetType: "string" | "number" | "boolean"
): unknown {
  if (targetType === "number") {
    if (isNumber(value)) return value;
    if (isString(value)) {
      const n = parseFloat(value);
      return Number.isNaN(n) ? value : n;
    }
    if (isBoolean(value)) return value ? 1 : 0;
    return value;
  }

  if (targetType === "boolean") {
    if (isBoolean(value)) return value;
    if (isString(value)) {
      if (value === "true" || value === "1") return true;
      if (value === "false" || value === "0") return false;
      return value;
    }
    if (isNumber(value)) return value !== 0;
    return value;
  }

  if (targetType === "string") {
    if (isString(value)) return value;
    if (isNumber(value) || isBoolean(value)) return String(value);
    return value;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Deep comparison
// ---------------------------------------------------------------------------

/**
 * Structural equality for primitives, arrays, objects.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;

  if (typeof a !== typeof b) return false;

  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i] ?? undefined));
  }

  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEqual(a[k], b[k]));
  }

  return false;
}

/**
 * Deep clone via JSON round-trip. Primitives, arrays, and plain objects
 * are handled correctly. Functions, undefined values, and Date instances
 * are returned as-is (JSON round-trip would lose/corrupt them).
 */
export function deepClone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (typeof value === "function") return value;
  if (value instanceof Date) return value;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Deep merge objects. Arrays are replaced, not merged. Later sources win.
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result: Record<string, unknown> = deepClone(target);

  for (const source of sources) {
    if (!isObject(source)) continue;
    for (const [key, val] of Object.entries(source)) {
      const existing = result[key];
      if (isObject(val) && isObject(existing)) {
        result[key] = deepMerge(
          existing as Record<string, unknown>,
          val as Record<string, unknown>
        );
      } else if (val !== undefined) {
        result[key] = deepClone(val);
      }
    }
  }

  return result as T;
}

/**
 * Return key paths (dot notation) that differ between two objects.
 */
export function deepDiff(
  a: unknown,
  b: unknown
): { added: string[]; removed: string[]; changed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  function diff(objA: unknown, objB: unknown, prefix: string): void {
    const isObjA = isObject(objA);
    const isObjB = isObject(objB);

    if (!isObjA && !isObjB) {
      // Both primitives / arrays — compare directly
      if (!deepEqual(objA, objB)) {
        changed.push(prefix);
      }
      return;
    }

    if (!isObjA) {
      // A is not an object, B is — treat as added
      added.push(prefix);
      return;
    }

    if (!isObjB) {
      // B is not an object, A is — treat as removed
      removed.push(prefix);
      return;
    }

    // Both are objects
    const aKeys = new Set(Object.keys(objA));
    const bKeys = new Set(Object.keys(objB));

    for (const key of aKeys) {
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      if (!bKeys.has(key)) {
        removed.push(childPrefix);
      } else {
        diff(objA[key], objB[key], childPrefix);
      }
    }

    for (const key of bKeys) {
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      if (!aKeys.has(key)) {
        added.push(childPrefix);
      }
    }
  }

  diff(a, b, "");
  // Remove empty prefix entries that may arise from top-level primitives
  return {
    added: added.filter(Boolean),
    removed: removed.filter(Boolean),
    changed: changed.filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Object utilities
// ---------------------------------------------------------------------------

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const k of keys) {
    result[k] = obj[k];
  }
  return result;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const keySet = new Set<string>(keys as string[]);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!keySet.has(k)) {
      result[k] = v;
    }
  }
  return result as Omit<T, K>;
}

/**
 * Flatten nested object: { a: { b: 1 } } → { "a.b": 1 }.
 */
export function flatten(
  obj: Record<string, unknown>,
  delimiter = ".",
  prefix = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    const flatKey = prefix ? `${prefix}${delimiter}${key}` : key;
    if (isObject(val)) {
      const nested = flatten(val as Record<string, unknown>, delimiter, flatKey);
      Object.assign(result, nested);
    } else {
      result[flatKey] = val;
    }
  }

  return result;
}

/**
 * Reverse of flatten.
 */
export function unflatten(
  flat: Record<string, unknown>,
  delimiter = "."
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [flatKey, val] of Object.entries(flat)) {
    const parts = flatKey.split(delimiter);
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i] ?? "";
      if (!isObject(current[part])) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1] ?? "";
    current[lastPart] = val;
  }

  return result;
}

export function objectMap<T, U>(
  obj: Record<string, T>,
  fn: (value: T, key: string) => U
): Record<string, U> {
  const result: Record<string, U> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = fn(v, k);
  }
  return result;
}

export function objectFilter<T>(
  obj: Record<string, T>,
  predicate: (value: T, key: string) => boolean
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (predicate(v, k)) {
      result[k] = v;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Data transformation
// ---------------------------------------------------------------------------

function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toLowerCase());
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/[-](.)/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1")
    .replace(/[_](.)/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

function transformKey(
  key: string,
  transform: "camelCase" | "snake_case" | "kebab-case"
): string {
  if (transform === "camelCase") return toCamelCase(key);
  if (transform === "snake_case") return toSnakeCase(key);
  return toKebabCase(key);
}

/**
 * Recursively transform all keys in an object.
 */
export function normalizeKeys(
  obj: Record<string, unknown>,
  transform: "camelCase" | "snake_case" | "kebab-case"
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const newKey = transformKey(key, transform);
    if (isObject(val)) {
      result[newKey] = normalizeKeys(val as Record<string, unknown>, transform);
    } else if (isArray(val)) {
      result[newKey] = val.map((item) =>
        isObject(item) ? normalizeKeys(item as Record<string, unknown>, transform) : item
      );
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

/**
 * Remove keys with null or undefined values (shallow).
 */
export function stripNullish(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Rename specific keys according to a mapping { oldKey: newKey }.
 */
export function renameKeys(
  obj: Record<string, unknown>,
  mapping: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const newKey = mapping[k] ?? k;
    result[newKey] = v;
  }
  return result;
}

/**
 * Group array of objects by the string value of a key.
 */
export function groupByKey<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const rawVal = item[key];
    const groupKey = String(rawVal ?? "");
    const existing = map.get(groupKey);
    if (existing !== undefined) {
      existing.push(item);
    } else {
      map.set(groupKey, [item]);
    }
  }
  return map;
}

/**
 * Index an array of objects by a key. Last value wins on duplicate keys.
 */
export function indexBy<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const rawVal = item[key];
    map.set(String(rawVal ?? ""), item);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Sports-specific schemas
// ---------------------------------------------------------------------------

/**
 * Schema for a sports pick.
 */
export function pickSchema(): Record<string, SchemaRule> {
  return {
    sport: { type: "string", required: true },
    game: { type: "string", required: true },
    line: { type: "number", required: true },
    confidence: { type: "number", required: true, min: 0, max: 100 },
    tier: {
      type: "string",
      required: true,
      enum: ["free", "pro", "elite"],
    },
    generatedAt: { type: "string", required: true },
  };
}

/**
 * Validate an unknown value against pickSchema().
 */
export function validatePick(pick: unknown): ValidationResult {
  return validateObject(pick, pickSchema());
}

/**
 * Schema rule for odds.
 */
export function oddsSchema(): SchemaRule {
  return {
    type: "object",
    properties: {
      home: { type: "number", required: false },
      away: { type: "number", required: false },
      draw: { type: "number", required: false },
      overUnder: { type: "number", required: false, min: 0 },
    },
  };
}

/**
 * Validate an unknown value against oddsSchema().
 */
export function validateOdds(odds: unknown): ValidationResult {
  return validate(odds, oddsSchema(), "odds");
}

/**
 * Allowed keys in a pick (from pickSchema).
 */
const PICK_SCHEMA_KEYS = new Set([
  "sport",
  "game",
  "line",
  "confidence",
  "tier",
  "generatedAt",
]);

const PICK_NUMBER_FIELDS = new Set(["line", "confidence"]);
const PICK_STRING_FIELDS = new Set(["sport", "game", "tier", "generatedAt"]);

/**
 * Strip unknown keys, coerce number fields, trim string fields.
 */
export function sanitizePickInput(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of PICK_SCHEMA_KEYS) {
    if (!(key in raw)) continue;

    const val = raw[key];

    if (PICK_NUMBER_FIELDS.has(key)) {
      result[key] = coerce(val, "number");
    } else if (PICK_STRING_FIELDS.has(key)) {
      const coerced = coerce(val, "string");
      result[key] = isString(coerced) ? coerced.trim() : coerced;
    } else {
      result[key] = val;
    }
  }

  return result;
}

// Re-export mergeResults for potential internal use in tests
export { mergeResults };
