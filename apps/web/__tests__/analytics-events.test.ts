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

  it("covers the Founding Desk / Revenue L1 events", () => {
    const required: AnalyticsEvent[] = [
      "founding_desk_view",
      "sample_desk_view",
      "trust_room_view",
      "no_bet_page_view",
      "ask_galaxy_started",
      "ask_galaxy_submitted",
      "email_signup_started",
      "email_signup_completed",
      "checkout_started",
      "checkout_completed",
      "feedback_submitted",
      "objection_logged",
      "testimonial_added",
      "referral_shared",
      "pricing_interest_clicked",
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

  it("track dispatches to a configured provider global when present (no PII)", () => {
    const calls: Array<{ name: string; props?: Record<string, unknown> }> = [];
    // jsdom provides window; attach a fake free provider global.
    (window as unknown as { posthog?: unknown }).posthog = {
      capture: (name: string, props?: Record<string, unknown>) => calls.push({ name, props }),
    };
    try {
      track("checkout_started", { tier: "PRO" });
      expect(calls).toHaveLength(1);
      expect(calls[0]?.name).toBe("checkout_started");
      expect(calls[0]?.props?.tier).toBe("PRO");
    } finally {
      delete (window as unknown as { posthog?: unknown }).posthog;
    }
  });

  it("track never throws even if a provider global misbehaves", () => {
    (window as unknown as { gtag?: unknown }).gtag = () => {
      throw new Error("provider exploded");
    };
    try {
      expect(() => track("pricing_page_view")).not.toThrow();
    } finally {
      delete (window as unknown as { gtag?: unknown }).gtag;
    }
  });
});
