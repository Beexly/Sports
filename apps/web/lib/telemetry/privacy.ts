/**
 * Telemetry privacy rules.
 *
 * Centralizes what the registry refuses to log and how it transforms
 * fields before they reach any sink. Defense-in-depth on top of the
 * typed registry in `./events.ts`.
 *
 * Aligned with FTC data-minimization guidance and the AI tool
 * confidentiality policy at docs/security/AI_TOOL_CONFIDENTIALITY_POLICY.md.
 */

/** Field keys that must never appear in an event payload, ever. */
export const FORBIDDEN_FIELD_KEYS: ReadonlySet<string> = new Set([
  "email",
  "emailAddress",
  "phone",
  "phoneNumber",
  "address",
  "ip",
  "ipAddress",
  "userAgent",
  "fingerprint",
  "cookieId",
  "ssn",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "stripePaymentMethodId",
  "passwordHash",
  "betAmount",
  "balance",
  "modelWeights",
  "promptText",
  "calibrationFormula",
  "factorThreshold",
]);

export function isForbiddenField(key: string): boolean {
  return FORBIDDEN_FIELD_KEYS.has(key);
}

/** Check a properties bag for any forbidden field keys (shallow check). Returns the first violation or null. */
export function checkForbiddenFields(properties: Record<string, unknown>): string | null {
  for (const key of Object.keys(properties)) {
    if (isForbiddenField(key)) return key;
  }
  return null;
}

/**
 * Coarse retention buckets. The actual storage layer must enforce these.
 */
export const RETENTION_BY_CATEGORY = {
  understanding: 180, // days — for learning the product, not user tracking
  "decision-quality": 365, // days — process maturity needs longer baseline
  restraint: 730, // days — responsible-play patterns
  confusion: 90, // days — short-lived UX signal
  conversion: 365, // days — Stripe-aligned compliance window
  experiment: 365, // days — experiment durability
} as const;

/**
 * Hash a raw subject id (e.g., user id, session id) into a stable 10-bit
 * bucket. The bucket is the only identifier the registry persists.
 *
 * Deterministic and salted with a server-only secret to defeat rainbow
 * tables. The implementation here is a pure-TypeScript placeholder
 * suitable for tests; production swaps in a Node `crypto` HMAC.
 */
export function bucketOfSubject(subjectId: string, saltEnvVar = "TELEMETRY_SALT"): number {
  const salt = (typeof process !== "undefined" ? process.env[saltEnvVar] : undefined) ?? "galaxy";
  let h = 5381;
  const input = `${salt}|${subjectId}`;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 1024;
}

/**
 * Strip any property whose key is in FORBIDDEN_FIELD_KEYS.
 * Deep — runs through nested objects and arrays.
 */
export function stripForbiddenFields<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripForbiddenFields(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenField(k)) continue;
    out[k] = stripForbiddenFields(v);
  }
  return out as T;
}

/**
 * Reject a payload that contains any forbidden field after stripping.
 * Used in tests and at the ingestion boundary to assert the policy.
 */
export function containsForbiddenField(value: unknown, path: string[] = []): string | null {
  if (value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = containsForbiddenField(value[i], [...path, String(i)]);
      if (hit) return hit;
    }
    return null;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenField(k)) return [...path, k].join(".");
    const hit = containsForbiddenField(v, [...path, k]);
    if (hit) return hit;
  }
  return null;
}
