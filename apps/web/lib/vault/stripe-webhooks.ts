export type StripeWebhookAction =
  | "create_or_update_member"
  | "sync_subscription"
  | "cancel_membership"
  | "mark_past_due"
  | "renew_membership"
  | "mark_refunded";

export type StripeWebhookDecision =
  | {
      status: "process";
      eventId: string;
      eventType: string;
      action: StripeWebhookAction;
    }
  | {
      status: "skip_duplicate" | "ignore_unsupported";
      eventId: string;
      eventType: string;
      action: null;
    };

const STRIPE_EVENT_ACTIONS: Record<string, StripeWebhookAction> = {
  "checkout.session.completed": "create_or_update_member",
  "customer.subscription.created": "sync_subscription",
  "customer.subscription.updated": "sync_subscription",
  "customer.subscription.deleted": "cancel_membership",
  "invoice.payment_failed": "mark_past_due",
  "invoice.paid": "renew_membership",
  "charge.refunded": "mark_refunded",
};

export function getStripeWebhookDecision(
  event: { id: string; type: string },
  processedEventIds: ReadonlySet<string>,
): StripeWebhookDecision {
  if (processedEventIds.has(event.id)) {
    return {
      status: "skip_duplicate",
      eventId: event.id,
      eventType: event.type,
      action: null,
    };
  }

  const action = STRIPE_EVENT_ACTIONS[event.type];

  if (!action) {
    return {
      status: "ignore_unsupported",
      eventId: event.id,
      eventType: event.type,
      action: null,
    };
  }

  return {
    status: "process",
    eventId: event.id,
    eventType: event.type,
    action,
  };
}
