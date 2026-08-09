/**
 * Waitlist access gate — Basic Auth helper.
 *
 * All logic lives here so it can be unit-tested without a running Next.js
 * server.  The middleware imports and calls `checkWaitlistGate`.
 *
 * Gate is opt-in: it only activates when GSE_WAITLIST_GATE_ENABLED === "true".
 * FOUNDING launch default is OPEN (flag false/unset). Never force Basic Auth for public funnel.
 * Credentials are read exclusively from server-side env vars; they are never
 * logged and never reach the client bundle.
 */

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Validate an incoming Authorization header against the configured
 * Basic Auth credentials.
 *
 * @param authHeader  Value of the `Authorization` request header, or null.
 * @returns           GateResult — allowed: true to pass through, or
 *                    allowed: false with a reason to return a 401.
 */
export function checkWaitlistGate(authHeader: string | null): GateResult {
  const enabled = process.env["GSE_WAITLIST_GATE_ENABLED"] === "true";
  if (!enabled) return { allowed: true };

  const expectedUser = process.env["GSE_WAITLIST_BASIC_USER"];
  const expectedPass = process.env["GSE_WAITLIST_BASIC_PASSWORD"];

  // If gate is on but credentials are not configured, fail closed.
  if (!expectedUser || !expectedPass) {
    return { allowed: false, reason: "gate_not_configured" };
  }

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return { allowed: false, reason: "missing_credentials" };
  }

  const encoded = authHeader.slice(6).trim();
  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return { allowed: false, reason: "invalid_encoding" };
  }

  const colonIdx = decoded.indexOf(":");
  if (colonIdx === -1) {
    return { allowed: false, reason: "malformed_credentials" };
  }

  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  // Constant-time-ish comparison: compare both fields before short-circuiting.
  const userMatch = user === expectedUser;
  const passMatch = pass === expectedPass;
  if (!userMatch || !passMatch) {
    return { allowed: false, reason: "wrong_credentials" };
  }

  return { allowed: true };
}
