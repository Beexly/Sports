import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dispatchClarityEvent,
  isClarityReady,
  upgradeClaritySession,
} from "@/lib/analytics/clarity-dispatch";
import { track } from "@/lib/analytics/events";

describe("clarity-dispatch", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete window.clarity;
    vi.restoreAllMocks();
  });

  it("is not ready and no-ops when window.clarity is missing", () => {
    expect(isClarityReady()).toBe(false);
    expect(dispatchClarityEvent("pricing_page_view")).toBe(false);
    expect(upgradeClaritySession("checkout_start")).toBe(false);
  });

  it("dispatches event + set tags when clarity queue exists", () => {
    const clarity = vi.fn();
    // @ts-expect-error test stub
    window.clarity = clarity;

    expect(isClarityReady()).toBe(true);
    expect(dispatchClarityEvent("upgrade_cta_click", { tier: "pro", plan: "monthly" })).toBe(
      true,
    );
    expect(clarity).toHaveBeenCalledWith("event", "upgrade_cta_click");
    expect(clarity).toHaveBeenCalledWith("set", "tier", "pro");
    expect(clarity).toHaveBeenCalledWith("set", "plan", "monthly");
  });

  it("upgradeClaritySession sends upgrade reason", () => {
    const clarity = vi.fn();
    // @ts-expect-error test stub
    window.clarity = clarity;
    expect(upgradeClaritySession("checkout_start")).toBe(true);
    expect(clarity).toHaveBeenCalledWith("upgrade", "checkout_start");
  });

  it("track() bridges to clarity and upgrades checkout sessions", () => {
    const clarity = vi.fn();
    // @ts-expect-error test stub
    window.clarity = clarity;

    const payload = track("checkout_start", { plan: "elite" });
    expect(payload).toEqual({ event: "checkout_start", context: { plan: "elite" } });
    expect(clarity).toHaveBeenCalledWith("event", "checkout_start");
    expect(clarity).toHaveBeenCalledWith("set", "plan", "elite");
    expect(clarity).toHaveBeenCalledWith("upgrade", "checkout_start");
  });

  it("track() still returns payload when clarity is absent (no throw)", () => {
    expect(() => track("waitlist_viewed")).not.toThrow();
    expect(track("waitlist_viewed")).toEqual({
      event: "waitlist_viewed",
      context: {},
    });
  });
});
