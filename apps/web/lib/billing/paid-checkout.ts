/**
 * PART 4 (C12): the free-only switch.
 *
 * PAID_CHECKOUT_OPEN is the single server-side choke for NEW paid checkouts.
 * Default is OPEN — this module changes no behavior by itself; closing it is
 * the founder's console action (set PAID_CHECKOUT_OPEN=false), and the
 * one-line revert is deleting that env var. Only the literal string "false"
 * (case-insensitive, trimmed) closes.
 *
 * Scope: NEW checkout sessions only. The billing portal (/api/subscriptions/
 * portal) stays OPEN while closed — an existing paying subscriber (keys are
 * live since 2026-07-09) must always be able to manage or cancel. The
 * double-billing guard in the checkout route already redirects live
 * subscribers to the portal, so closing checkout strands no one.
 */
export function paidCheckoutOpen(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env["PAID_CHECKOUT_OPEN"]?.trim().toLowerCase();
  return v !== "false";
}
