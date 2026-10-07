/**
 * Fail-closed production environment guards.
 *
 * The pattern this module exists to kill: `process.env["X"] ?? "<placeholder>"`.
 * A placeholder fallback is a genuine convenience locally and a silent,
 * unloggable production defect — the deploy boots green, the request succeeds,
 * and the damage lands somewhere no server-side error ever reaches:
 *
 *   - `NEXT_PUBLIC_APP_URL` unset  → Stripe redirects a PAYING customer to
 *     `http://localhost:3000/dashboard?upgraded=true`. The card was charged, the
 *     webhook fired, the entitlement was granted; the customer sees
 *     connection-refused and believes payment failed. Nothing throws.
 *   - `GOOGLE_CLIENT_ID` unset → NextAuth registers a provider with a fake id and
 *     the first user to click "Sign in with Google" gets Google's
 *     "Error 401: invalid_client" — on Google's domain, so nothing is logged here.
 *
 * Shape is deliberately borrowed from `StripeConfigError` in `lib/stripe.ts`: a
 * typed error naming the exact missing variable, so a caller can catch it and
 * return a precise 5xx instead of leaking an opaque failure.
 *
 * Local-dev ergonomics are preserved verbatim — outside production the caller's
 * declared fallback is returned exactly as before.
 */

/**
 * Thrown when a variable that production genuinely requires is missing or blank.
 * Carries the variable name so the message is actionable without a stack trace.
 */
export class MissingProductionEnvError extends Error {
  readonly name = "MissingProductionEnvError" as const;

  constructor(
    readonly variable: string,
    readonly capability: string,
  ) {
    super(
      `${variable} is not set. It is REQUIRED in production for "${capability}"; ` +
        `refusing to fall back to a development placeholder, which would fail ` +
        `silently on the user's side with nothing logged here. ` +
        `Set ${variable} in the deployment environment and redeploy.`,
    );
  }
}

/** True only for a real production runtime/build. */
function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

/** A trimmed, non-blank env value, or null. Blank strings are treated as unset. */
function readEnv(name: string): string | null {
  const raw = process.env[name];
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve a required variable, or throw `MissingProductionEnvError` in production.
 *
 * Outside production the `developmentFallback` is returned unchanged, so local
 * dev and the test suite behave exactly as they did before this guard existed.
 *
 * @param name                 env var name, e.g. "NEXT_PUBLIC_APP_URL"
 * @param developmentFallback  value used ONLY when NODE_ENV !== "production"
 * @param capability           what breaks without it, for the error message
 */
export function requireProductionEnv(
  name: string,
  developmentFallback: string,
  capability: string,
): string {
  const value = readEnv(name);
  if (value !== null) return value;

  if (isProduction()) {
    throw new MissingProductionEnvError(name, capability);
  }
  return developmentFallback;
}

/**
 * Same contract as `requireProductionEnv`, with one escape hatch: a production
 * BUILD that legitimately has no credentials.
 *
 * CI builds the app with `SKIP_ENV_VALIDATION: "true"` and without the Google
 * OAuth vars (`.github/workflows/ci.yml`), and `next build` runs with
 * NODE_ENV=production. Auth config is evaluated at module scope, so an
 * unconditional throw would fail that build on a machine that is not, and never
 * will be, serving traffic. The opt-out is explicit, must be set deliberately,
 * and still logs loudly — it never happens by omission, which is the whole
 * failure mode being fixed.
 */
export function requireProductionEnvUnlessSkipped(
  name: string,
  developmentFallback: string,
  capability: string,
): string {
  const value = readEnv(name);
  if (value !== null) return value;

  if (isProduction() && process.env["SKIP_ENV_VALIDATION"] === "true") {
    console.error(
      `[env] ${name} is MISSING and SKIP_ENV_VALIDATION=true — using a ` +
        `non-functional placeholder for "${capability}". This is valid ONLY for a ` +
        `credential-less build. If this line appears in a serving environment, ` +
        `${capability} is broken for every user.`,
    );
    return developmentFallback;
  }

  return requireProductionEnv(name, developmentFallback, capability);
}
