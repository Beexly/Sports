import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Money-path audit MP-03 (2026-09-05): the post-checkout banner said
 * "Subscription active ... confidence scores now live" from the URL param alone.
 * In the webhook-retry race (or for anyone typing the URL) that told a FREE
 * member the opposite of what the board shows. The success banner must be gated
 * on the RESOLVED entitlement, with an honest pending state otherwise.
 * Source-level contract (the page needs Prisma + auth to render authenticated).
 */
const src = readFileSync(resolve(__dirname, "..", "app/dashboard/page.tsx"), "utf8");

describe("/dashboard upgrade banner", () => {
  it("shows the success banner only when the resolved tier is paid", () => {
    expect(src).toMatch(/searchParams\?\.upgraded === "true" && entitlements\.tier !== "FREE" && \(/);
    const successBlock = src.slice(src.indexOf('data-testid="upgrade-success-banner"'));
    expect(successBlock).toContain("Subscription active");
    // FANTASY buyers are not told that confidence scores are live.
    expect(successBlock).toMatch(/entitlements\.tier === "FANTASY"\s*\?\s*"The fantasy suite is now live/);
  });

  it("shows an honest pending state when the entitlement has not resolved yet", () => {
    expect(src).toMatch(/searchParams\?\.upgraded === "true" && entitlements\.tier === "FREE" && \(/);
    const pendingBlock = src.slice(src.indexOf('data-testid="upgrade-pending-banner"'), src.indexOf('data-testid="upgrade-success-banner"'));
    expect(pendingBlock).toContain("Payment received. Activating your plan.");
    expect(pendingBlock).not.toContain("Subscription active");
    expect(pendingBlock).not.toMatch(/now live/);
  });

  it("never renders the success copy on the URL param alone", () => {
    expect(src).not.toMatch(/\{searchParams\?\.upgraded === "true" && \(\s*<div\s*data-testid="upgrade-success-banner"/);
  });
});
