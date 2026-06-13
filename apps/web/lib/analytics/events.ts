/**
 * Analytics event plan.
 *
 * A typed registry of the pricing/conversion funnel events we care about, plus a
 * provider-agnostic `track()` that is a NO-OP until an analytics provider is
 * wired (owner decision). This exists so the funnel is instrumented consistently
 * and the event contract is documented and type-checked now, without committing
 * to a vendor or leaking PII.
 *
 * Pure module — no network, no PII collected here. Fully unit-testable.
 */

export type AnalyticsEvent =
  | "pricing_page_view"
  | "plan_card_view"
  | "plan_compare_expand"
  | "feature_lock_click"
  | "upgrade_cta_click"
  | "promo_code_apply"
  | "promo_code_success"
  | "promo_code_fail"
  | "checkout_start"
  | "checkout_complete"
  | "checkout_abandon"
  | "free_preview_pick_view"
  | "locked_pick_click"
  | "no_bet_explainer_view"
  | "confidence_explainer_view"
  | "calibration_view"
  | "elite_feature_view"
  | "operator_waitlist_join"
  | "cancellation_start"
  | "cancellation_reason_submit";

/** What each event means and why it matters — the documented contract. */
export const ANALYTICS_EVENTS: Readonly<Record<AnalyticsEvent, string>> = {
  pricing_page_view: "Visitor reached /pricing — top of the conversion funnel.",
  plan_card_view: "A specific plan card entered view — measures which tier draws attention.",
  plan_compare_expand: "Visitor expanded the comparison matrix — high-intent comparison behavior.",
  feature_lock_click: "Visitor clicked a locked feature — surfaces the strongest upgrade triggers.",
  upgrade_cta_click: "Visitor clicked an upgrade CTA — intent to move up a tier.",
  promo_code_apply: "Visitor submitted a promo code at checkout.",
  promo_code_success: "Promo code accepted — measures promo dependency.",
  promo_code_fail: "Promo code rejected — friction / expired-code signal.",
  checkout_start: "Checkout session created — entered the paywall.",
  checkout_complete: "Subscription created — the conversion.",
  checkout_abandon: "Checkout started but not completed — recoverable drop-off.",
  free_preview_pick_view: "Free user viewed a sample/preview signal — proof-of-value moment.",
  locked_pick_click: "Free user clicked a gated pick row — direct upgrade trigger.",
  no_bet_explainer_view: "Visitor read the No-Bet explainer — trust/discipline engagement.",
  confidence_explainer_view: "Visitor read the confidence explainer — sets honest expectations.",
  calibration_view: "Visitor viewed the calibration/proof surface — trust signal.",
  elite_feature_view: "Visitor viewed an Elite-gated feature — Pro→Elite upgrade trigger.",
  operator_waitlist_join: "Visitor joined the Operator waitlist — demand signal for the top tier.",
  cancellation_start: "Member began cancellation — churn early-warning.",
  cancellation_reason_submit: "Member submitted a cancellation reason — churn-cause data.",
};

export interface AnalyticsContext {
  readonly tier?: string;
  readonly plan?: string;
  readonly feature?: string;
  readonly promoCode?: string;
  readonly [key: string]: string | number | boolean | undefined;
}

/**
 * Record an event. NO-OP until a provider is wired (owner decision). Never
 * collects PII; callers pass only non-identifying funnel context. Returns the
 * normalized payload so callers/tests can assert what would be sent.
 */
export function track(
  event: AnalyticsEvent,
  context: AnalyticsContext = {},
): { event: AnalyticsEvent; context: AnalyticsContext } {
  // When a provider is wired, dispatch here (e.g. window.analytics?.track(...)).
  // Intentionally inert for now — no network, no identity.
  return { event, context };
}

/** True for a known event name — guards against typos at call sites/tests. */
export function isAnalyticsEvent(name: string): name is AnalyticsEvent {
  return name in ANALYTICS_EVENTS;
}
