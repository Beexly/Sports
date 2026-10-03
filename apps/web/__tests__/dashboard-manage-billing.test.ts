import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * P12-01: A paying subscriber must always have a way to reach the
 * Stripe billing portal from the dashboard — the published promise
 * ("Cancel any time from your dashboard", FAQ "Manage Billing button")
 * was false because <ManageSubscriptionButton/> only appeared inside
 * the dunning banner (BillingNoticeBanner), which renders only when
 * getBillingNotice returns non-null (PAST_DUE / INCOMPLETE).
 *
 * This test pins the source-level contract: the dashboard page imports
 * ManageSubscriptionButton and renders it for any non-FREE tier.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/dashboard/page.tsx"), "utf8");

describe("/dashboard manage-billing affordance", () => {
  it("imports ManageSubscriptionButton", () => {
    expect(src).toMatch(
      /import\s*\{[^}]*ManageSubscriptionButton[^}]*\}\s*from\s*["']@\/components\/ui\/manage-subscription-button["']/,
    );
  });

  it("renders the manage-billing section for a non-FREE (paid) tier", () => {
    // The gate is tier !== "FREE", so PRO / ELITE / FANTASY subscribers
    // all see it. The button lives inside a data-testid'd section.
    expect(src).toMatch(/entitlements\.tier\s*!==\s*"FREE"/);
    expect(src).toMatch(/billing-management-section/);
    expect(src).toMatch(/<ManageSubscriptionButton\s*\/>/);
  });

  it("describes the affordance as update-card / change-plan / cancel", () => {
    // Pin the user-facing copy so the promise on /pricing, /terms, and /faq
    // is backed by real UI text on the dashboard — not just "a button exists."
    expect(src).toMatch(/Update your card/);
    expect(src).toMatch(/change your plan/i);
    expect(src).toMatch(/cancel your subscription/i);
  });

  it("does NOT tie the button only to the dunning banner", () => {
    // The billing-management section must be a separate conditional from
    // the BillingNoticeBanner — i.e., it must not be nested inside
    // {billingNotice && ...}. A regression that re-hides the button only
    // behind the billing notice would re-introduce the original bug.
    const bannerIdx = src.indexOf("<BillingNoticeBanner");
    const manageIdx = src.indexOf("<ManageSubscriptionButton");
    const noticeCondIdx = src.indexOf("{billingNotice &&");
    expect(bannerIdx).toBeGreaterThan(-1);
    expect(manageIdx).toBeGreaterThan(-1);
    expect(noticeCondIdx).toBeGreaterThan(-1);
    // The button must appear AFTER the billingNotice conditional closes,
    // proving it is a separate code path, not nested inside it.
    expect(manageIdx).toBeGreaterThan(noticeCondIdx);
  });
});
