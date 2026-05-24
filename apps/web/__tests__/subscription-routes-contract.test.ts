import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level contract for subscription API routes.
 *
 * These routes handle real money (Stripe checkout sessions and billing
 * portal). They must:
 *  1. Require authentication (no anonymous purchases)
 *  2. Validate input with a schema (no arbitrary tier strings)
 *  3. Use the Stripe helper abstractions (not raw stripe.checkout.sessions.create)
 *  4. Not expose the Stripe secret key directly
 */

const repoRoot = resolve(__dirname, "..");

const CHECKOUT = readFileSync(
  resolve(repoRoot, "app/api/subscriptions/checkout/route.ts"),
  "utf8"
);
const PORTAL = readFileSync(
  resolve(repoRoot, "app/api/subscriptions/portal/route.ts"),
  "utf8"
);
const WEBHOOK = readFileSync(
  resolve(repoRoot, "app/api/webhooks/stripe/route.ts"),
  "utf8"
);

describe("/api/subscriptions/checkout — contract", () => {
  it("requires authentication (auth() called)", () => {
    expect(CHECKOUT).toMatch(/from\s+["']@\/lib\/auth["']/);
    const authIdx = CHECKOUT.indexOf("auth()");
    expect(authIdx).toBeGreaterThan(-1);
  });

  it("validates tier input with a schema (not raw typeof)", () => {
    // Uses z.enum(["PRO","ELITE"]) — prevents arbitrary tier injection
    expect(CHECKOUT).toMatch(/z\.enum/);
    expect(CHECKOUT).toMatch(/PRO/);
    expect(CHECKOUT).toMatch(/ELITE/);
  });

  it("returns 401 when unauthenticated", () => {
    expect(CHECKOUT).toMatch(/status:\s*401/);
  });

  it("does not expose STRIPE_SECRET_KEY directly in source", () => {
    // Must use lib/stripe abstraction — never raw process.env.STRIPE_SECRET_KEY
    expect(CHECKOUT).not.toMatch(/STRIPE_SECRET_KEY/);
  });

  it("delegates session creation to a helper (not inline stripe.checkout)", () => {
    // createCheckoutSession or similar helper — keeps business logic in lib/stripe
    expect(CHECKOUT).toMatch(/createCheckoutSession|getOrCreateStripeCustomer/);
  });
});

describe("/api/subscriptions/portal — contract", () => {
  it("requires authentication", () => {
    expect(PORTAL).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(PORTAL).toMatch(/auth\(\)/);
  });

  it("returns 401 when unauthenticated", () => {
    expect(PORTAL).toMatch(/status:\s*401/);
  });

  it("looks up stripe customer from DB, not from request body", () => {
    // Customer ID must come from the DB, not from user-supplied input
    // (prevents privilege escalation via arbitrary customer ID)
    expect(PORTAL).toMatch(/db\.subscription\.findUnique/);
    expect(PORTAL).toMatch(/stripeCustomerId/);
  });
});

describe("/api/webhooks/stripe — contract", () => {
  it("validates webhook signature before processing", () => {
    expect(WEBHOOK).toMatch(/constructEvent/);
    expect(WEBHOOK).toMatch(/stripe-signature/);
  });

  it("returns 400 on signature failure (not 500)", () => {
    // 400 = bad request (client fault); 500 would suggest a server bug
    const badSigSection = WEBHOOK.indexOf("constructEvent");
    const after = WEBHOOK.slice(badSigSection);
    expect(after).toMatch(/status:\s*400/);
  });

  it("reads raw body text (not parsed JSON) for signature validation", () => {
    // Stripe requires the raw body bytes for signature verification
    expect(WEBHOOK).toMatch(/req\.text\(\)/);
  });

  it("does not expose STRIPE_WEBHOOK_SECRET in plaintext error messages", () => {
    expect(WEBHOOK).not.toMatch(/STRIPE_WEBHOOK_SECRET[^'"]\s*\+/);
  });
});
