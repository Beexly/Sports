/**
 * Bridge funnel track() → Microsoft Clarity custom events/tags.
 *
 * Uses the global queue Clarity installs (window.clarity) so this module stays
 * safe to import from shared code without forcing the SDK on the server.
 * No-ops when Clarity is not initialized (missing env / master flag off).
 *
 * PII law: never pass email, name, free-text, or raw user ids. Context values
 * must already be non-identifying funnel fields (tier, plan, feature, …).
 */

export type ClarityDispatchContext = Readonly<
  Record<string, string | number | boolean | undefined>
>;

type ClarityFn = (...args: unknown[]) => void;

function getClarityFn(): ClarityFn | null {
  if (typeof window === "undefined") return null;
  const fn = (window as Window & { clarity?: ClarityFn }).clarity;
  return typeof fn === "function" ? fn : null;
}

/** True when the Clarity queue is present (SDK initialized). */
export function isClarityReady(): boolean {
  return getClarityFn() !== null;
}

/**
 * Emit a custom event + optional tags. Safe no-op without Clarity.
 * Returns whether a dispatch was attempted on a live queue.
 */
export function dispatchClarityEvent(
  eventName: string,
  context: ClarityDispatchContext = {},
): boolean {
  const clarity = getClarityFn();
  if (!clarity) return false;

  clarity("event", eventName);

  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    // Clarity setTag values are string | string[]
    clarity("set", key, String(value));
  }

  return true;
}

/**
 * Prioritize a session for recording (e.g. checkout). No-op without Clarity.
 * Reason must be non-PII (e.g. "checkout_start").
 */
export function upgradeClaritySession(reason: string): boolean {
  const clarity = getClarityFn();
  if (!clarity) return false;
  const r = reason.trim();
  if (!r) return false;
  clarity("upgrade", r);
  return true;
}
