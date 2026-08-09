/**
 * Safe env helpers — edge and Node.
 * Flags are true ONLY when value === "true" (after trim).
 * Waitlist: unset = OPEN; gated only when GSE_WAITLIST_GATE_ENABLED === "true".
 */

export type EnvMap = Record<string, string | undefined>;

export function optionalEnv(key: string, env: EnvMap = process.env): string | undefined {
  const v = env[key];
  if (v == null) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

/** true only when env[key] is the string "true". */
export function flagEnabled(key: string, env: EnvMap = process.env): boolean {
  return env[key]?.trim() === "true";
}

/**
 * Waitlist Basic Auth ON only when BOTH:
 *   GSE_WAITLIST_GATE_ENABLED === "true"
 *   GSE_WAITLIST_BASIC_FORCE === "true"
 * Legacy single-flag true (gate without FORCE) stays OPEN so FOUNDING ships
 * without a Vercel env click. Intentional lock requires the second flag.
 */
export function waitlistGated(env: EnvMap = process.env): boolean {
  return (
    flagEnabled("GSE_WAITLIST_GATE_ENABLED", env) &&
    flagEnabled("GSE_WAITLIST_BASIC_FORCE", env)
  );
}
