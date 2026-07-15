interface CanonicalObject {
  readonly [key: string]: CanonicalValue;
}

type CanonicalArray = readonly CanonicalValue[];

type CanonicalValue = null | boolean | number | string | CanonicalArray | CanonicalObject;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalize(value: unknown): CanonicalValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical evidence payloads require finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (isRecord(value)) {
    const normalized: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(value).sort()) normalized[key] = normalize(value[key]);
    return normalized;
  }
  throw new Error(`Unsupported canonical evidence value: ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}
