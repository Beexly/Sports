import { describe, it, expect } from "vitest";
import {
  ANALYTICS_EVENTS,
  track,
  isAnalyticsEvent,
  type AnalyticsEvent,
} from "@/lib/analytics/events";

describe("analytics event plan", () => {
  it("every event has a non-empty documented meaning", () => {
    for (const [name, desc] of Object.entries(ANALYTICS_EVENTS)) {
      expect(desc.length, `${name} description`).toBeGreaterThan(0);
    }
  });

  it("covers the pricing/conversion funnel the owner brief listed", () => {
    const required: AnalyticsEvent[] = [
      "pricing_page_view", "plan_compare_expand", "feature_lock_click",
      "upgrade_cta_click", "promo_code_apply", "checkout_start", "checkout_complete",
      "checkout_abandon", "no_bet_explainer_view", "confidence_explainer_view",
      "operator_waitlist_join", "cancellation_start",
    ];
    for (const e of required) expect(ANALYTICS_EVENTS[e], `missing ${e}`).toBeDefined();
  });

  it("isAnalyticsEvent guards against typos", () => {
    expect(isAnalyticsEvent("checkout_complete")).toBe(true);
    expect(isAnalyticsEvent("nope_event")).toBe(false);
  });

  it("track is inert (no throw) and echoes a normalized payload", () => {
    const out = track("upgrade_cta_click", { tier: "PRO", feature: "galaxy-twin" });
    expect(out.event).toBe("upgrade_cta_click");
    expect(out.context.tier).toBe("PRO");
  });

  it("track defaults context to an empty object", () => {
    expect(track("pricing_page_view").context).toEqual({});
  });
});
