import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level contract for the Stripe webhook route.
 *
 * Full integration tests require live Stripe signatures and are not
 * feasible in CI. These checks pin the safety invariants we can verify
 * statically so regressions in the auth/idempotency/event-handling
 * contract are caught immediately.
 */

const root = resolve(__dirname, "..");
const src = readFileSync(
  resolve(root, "app/api/webhooks/stripe/route.ts"),
  "utf8"
);

describe("Stripe webhook route — source contract", () => {
  it("checks for missing stripe-signature header and returns 400", () => {
    expect(src).toMatch(/stripe-signature/);
    expect(src).toMatch(/status:\s*400/);
  });

  it("uses stripe.webhooks.constructEvent for signature verification", () => {
    expect(src).toMatch(/stripe\.webhooks\.constructEvent/);
  });

  it("requires STRIPE_WEBHOOK_SECRET from env (no hardcoded secret)", () => {
    expect(src).toMatch(/process\.env\[["']STRIPE_WEBHOOK_SECRET["']\]/);
    expect(src).not.toMatch(/"whsec_[A-Za-z0-9]+"/);
  });

  it("performs idempotency check before processing events", () => {
    expect(src).toMatch(/webhookEvent\.findUnique/);
    expect(src).toMatch(/stripeEventId/);
  });

  it("records processed event in webhookEvent table", () => {
    expect(src).toMatch(/webhookEvent\.create/);
  });

  it("handles checkout.session.completed", () => {
    expect(src).toMatch(/checkout\.session\.completed/);
  });

  it("handles customer.subscription.created and updated", () => {
    expect(src).toMatch(/customer\.subscription\.created/);
    expect(src).toMatch(/customer\.subscription\.updated/);
  });

  it("handles customer.subscription.deleted by setting status CANCELED", () => {
    expect(src).toMatch(/customer\.subscription\.deleted/);
    expect(src).toMatch(/CANCELED/);
  });

  it("handles invoice.payment_failed by setting status PAST_DUE", () => {
    expect(src).toMatch(/invoice\.payment_failed/);
    expect(src).toMatch(/PAST_DUE/);
  });

  it("handles invoice.payment_succeeded", () => {
    expect(src).toMatch(/invoice\.payment_succeeded/);
  });

  it("maps Stripe 'unpaid' status to PAST_DUE (not silently ignored)", () => {
    expect(src).toMatch(/unpaid/);
    // The mapStripeStatus function must handle 'unpaid' and map it.
    expect(src).toMatch(/["']unpaid["'][\s\S]{0,80}PAST_DUE/);
  });

  it("uses metadata.userId for upsert — no orphaned subscription records", () => {
    expect(src).toMatch(/metadata.*userId|userId.*metadata/);
    expect(src).toMatch(/subscription\.upsert/);
  });

  it("returns { received: true } on success", () => {
    expect(src).toMatch(/received:\s*true/);
  });

  it("route handler has explicit Promise<NextResponse> return type", () => {
    expect(src).toMatch(/POST.*NextRequest.*Promise<NextResponse>/);
  });
});
