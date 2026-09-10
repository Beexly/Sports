/**
 * FE-08: checkout resume across the sign-in bounce.
 *
 * SubscribeButton sends an unauthenticated visitor to /auth/signin before
 * Stripe Checkout ever opens. Without this, the round trip through sign-in
 * silently discarded the tier/interval the visitor picked and the date of
 * birth they typed, landing them back on a blank /pricing form. This stores
 * that intent in sessionStorage (tab-scoped, cleared on close, never sent to
 * a server) just before the redirect, so the pricing page can restore it on
 * return instead of re-asking.
 *
 * Short TTL (30 min): a stale intent from a much earlier visit should not
 * silently reappear and fill in someone else's date of birth on a shared
 * machine's next unrelated visit.
 */

const STORAGE_KEY = "gse:checkout-intent:v1";
const MAX_AGE_MS = 30 * 60 * 1000;

export type Interval = "month" | "year";

export interface CheckoutIntent {
  readonly tier: "FANTASY" | "PRO" | "ELITE";
  readonly interval: Interval;
  readonly dateOfBirth: string;
}

interface StoredCheckoutIntent extends CheckoutIntent {
  readonly savedAt: number;
}

function getStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    // Private-browsing / disabled storage throws on access, not just on use.
    return null;
  }
}

export function saveCheckoutIntent(intent: CheckoutIntent): void {
  const storage = getStorage();
  if (!storage) return;
  const record: StoredCheckoutIntent = { ...intent, savedAt: Date.now() };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Quota exceeded or storage unavailable — resuming is a convenience, not
    // a requirement, so fail silently rather than block the sign-in redirect.
  }
}

export function readCheckoutIntent(): CheckoutIntent | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCheckoutIntent>;
    if (
      typeof parsed.tier !== "string" ||
      typeof parsed.interval !== "string" ||
      typeof parsed.dateOfBirth !== "string" ||
      typeof parsed.savedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return { tier: parsed.tier as CheckoutIntent["tier"], interval: parsed.interval as Interval, dateOfBirth: parsed.dateOfBirth };
  } catch {
    return null;
  }
}

export function clearCheckoutIntent(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
