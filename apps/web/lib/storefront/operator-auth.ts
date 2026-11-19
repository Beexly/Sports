/**
 * Operator-key authorization for storefront maintenance routes.
 *
 * The previous shape fell back to a literal default key when the env var was
 * unset, which turns a missing configuration into a published credential:
 * anyone reading the source could POST the maintenance route. This resolver
 * refuses to authorize at all unless a real key is configured, and refuses
 * trivially short keys so a placeholder like "changeme" cannot become one.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export const MIN_OPERATOR_KEY_LENGTH = 16;

export type OperatorAuthResult = "ok" | "unconfigured" | "unauthorized";

export function resolveOperatorKey(env: Record<string, string | undefined>): string | null {
  const configured = env["GSE_OPERATOR_KEY"]?.trim() || env["OPERATOR_KEY"]?.trim();
  if (!configured) return null;
  if (configured.length < MIN_OPERATOR_KEY_LENGTH) return null;
  return configured;
}

export function authorizeOperator(
  provided: string | null | undefined,
  env: Record<string, string | undefined>,
): OperatorAuthResult {
  const expected = resolveOperatorKey(env);
  if (!expected) return "unconfigured";
  if (!provided) return "unauthorized";
  const a = createHash("sha256").update(provided.trim(), "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  if (!timingSafeEqual(a, b)) return "unauthorized";
  return "ok";
}
