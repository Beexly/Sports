import { describe, expect, it } from "vitest";
import { getStripeWebhookDecision } from "./stripe-webhooks";

describe("Stripe webhook decisioning", () => {
  it("skips already-processed events before action mapping", () => {
    expect(
      getStripeWebhookDecision(
        { id: "evt_1", type: "checkout.session.completed" },
        new Set(["evt_1"]),
      ),
    ).toEqual({
      status: "skip_duplicate",
      eventId: "evt_1",
      eventType: "checkout.session.completed",
      action: null,
    });
  });

  it("maps launch-critical events to deterministic actions", () => {
    const processed = new Set<string>();

    expect(
      getStripeWebhookDecision(
        { id: "evt_checkout", type: "checkout.session.completed" },
        processed,
      ),
    ).toMatchObject({
      status: "process",
      action: "create_or_update_member",
    });

    expect(
      getStripeWebhookDecision(
        { id: "evt_refund", type: "charge.refunded" },
        processed,
      ),
    ).toMatchObject({
      status: "process",
      action: "mark_refunded",
    });

    expect(
      getStripeWebhookDecision(
        { id: "evt_failed", type: "invoice.payment_failed" },
        processed,
      ),
    ).toMatchObject({
      status: "process",
      action: "mark_past_due",
    });
  });

  it("ignores unsupported Stripe event types", () => {
    expect(
      getStripeWebhookDecision(
        { id: "evt_other", type: "payment_intent.created" },
        new Set(),
      ),
    ).toEqual({
      status: "ignore_unsupported",
      eventId: "evt_other",
      eventType: "payment_intent.created",
      action: null,
    });
  });
});
