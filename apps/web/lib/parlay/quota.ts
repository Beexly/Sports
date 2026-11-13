/**
 * Parlay X-Ray quota — PURE state machine, no I/O.
 *
 * Doctrine: every anonymous browser gets 1 free X-Ray (httpOnly cookie
 * counter). Email capture unlocks 3 more. After those: upsell to /packages.
 *
 * All transitions are pure functions so the whole funnel is unit-testable
 * without cookies, requests or a database. Cookie signing/serialization lives
 * in quota-cookie.ts (server-only); this module never touches node APIs.
 */

export const FREE_XRAY_LIMIT = 1;
export const UNLOCK_XRAY_GRANT = 3;

export interface XrayQuotaState {
  /** Free X-Rays consumed (0..FREE_XRAY_LIMIT). */
  readonly freeUsed: number;
  /** Normalized email that unlocked the extra grant, or null. */
  readonly unlockedEmail: string | null;
  /** Extra X-Rays left from the email unlock (0..UNLOCK_XRAY_GRANT). */
  readonly unlockedRemaining: number;
}

/** The shape the API returns and the UI renders. */
export interface XrayQuotaSummary {
  readonly freeUsed: number;
  readonly remaining: number;
  readonly exhausted: boolean;
  /** True once the email grant is also spent — UI shows the /packages CTA. */
  readonly upsell: boolean;
  readonly unlocked: boolean;
}

export function initialQuotaState(): XrayQuotaState {
  return { freeUsed: 0, unlockedEmail: null, unlockedRemaining: 0 };
}

export function normalizeQuotaEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function totalRemaining(state: XrayQuotaState): number {
  return Math.max(0, FREE_XRAY_LIMIT - state.freeUsed) + state.unlockedRemaining;
}

export function isExhausted(state: XrayQuotaState): boolean {
  return totalRemaining(state) <= 0;
}

export function quotaSummary(state: XrayQuotaState): XrayQuotaSummary {
  const exhausted = isExhausted(state);
  return {
    freeUsed: state.freeUsed,
    remaining: totalRemaining(state),
    exhausted,
    upsell: exhausted && state.unlockedEmail !== null,
    unlocked: state.unlockedEmail !== null,
  };
}

/**
 * Consume one X-Ray: the free allowance first, then the email grant.
 * Returns ok:false with the state UNCHANGED when nothing is left.
 */
export function consumeXray(state: XrayQuotaState): { ok: boolean; state: XrayQuotaState } {
  if (state.freeUsed < FREE_XRAY_LIMIT) {
    return { ok: true, state: { ...state, freeUsed: state.freeUsed + 1 } };
  }
  if (state.unlockedRemaining > 0) {
    return { ok: true, state: { ...state, unlockedRemaining: state.unlockedRemaining - 1 } };
  }
  return { ok: false, state };
}

/**
 * Grant the email unlock. Idempotent per email: re-submitting the SAME email
 * never refills the grant (it returns the state unchanged), so the capture
 * form can't be looped for unlimited scans. A different email starts a fresh
 * grant — the lead is still recorded once per address by the waitlist store.
 */
export function unlockWithEmail(state: XrayQuotaState, email: string): XrayQuotaState {
  const normalized = normalizeQuotaEmail(email);
  if (!normalized) return state;
  if (state.unlockedEmail === normalized) return state;
  return {
    freeUsed: state.freeUsed,
    unlockedEmail: normalized,
    unlockedRemaining: UNLOCK_XRAY_GRANT,
  };
}

// ─── Serialization (cookie payload) ─────────────────────────────────────────

export function serializeQuotaState(state: XrayQuotaState): string {
  return JSON.stringify({
    freeUsed: state.freeUsed,
    unlockedEmail: state.unlockedEmail,
    unlockedRemaining: state.unlockedRemaining,
  });
}

function clampInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Parse a cookie payload (JSON string or object) back into a state.
 * Anything malformed, missing or out of range falls back to the initial
 * state — a tampered cookie can never mint extra scans beyond the clamp,
 * and the HMAC check in quota-cookie.ts runs before this is even reached.
 */
export function parseQuotaState(raw: unknown): XrayQuotaState {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return initialQuotaState();
    }
  }
  if (typeof obj !== "object" || obj === null) return initialQuotaState();
  const { freeUsed, unlockedEmail, unlockedRemaining } = obj as Record<string, unknown>;
  const free = clampInt(freeUsed, 0, FREE_XRAY_LIMIT);
  const remaining = clampInt(unlockedRemaining, 0, UNLOCK_XRAY_GRANT);
  if (free === null || remaining === null) return initialQuotaState();
  const email =
    typeof unlockedEmail === "string" && unlockedEmail.length > 0 && unlockedEmail.length <= 254
      ? normalizeQuotaEmail(unlockedEmail)
      : null;
  return { freeUsed: free, unlockedEmail: email, unlockedRemaining: remaining };
}