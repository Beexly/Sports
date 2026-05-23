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

export type StripeCheckoutSessionSnapshot = {
  id: string;
  mode?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  customerEmail?: string | null;
  priceId?: string | null;
  paymentStatus?: string | null;
};

export type StripeCheckoutSessionDecision =
  | {
      status: "accept";
      reason: "vault_subscription_paid";
      sessionId: string;
    }
  | {
      status: "reject";
      reason:
        | "wrong_mode"
        | "wrong_price"
        | "missing_customer"
        | "missing_subscription"
        | "missing_email"
        | "unpaid";
      sessionId: string;
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

export function getStripeCheckoutSessionDecision(
  session: StripeCheckoutSessionSnapshot,
  expectedVaultPriceId: string,
): StripeCheckoutSessionDecision {
  if (session.mode !== "subscription") {
    return {
      status: "reject",
      reason: "wrong_mode",
      sessionId: session.id,
    };
  }

  if (!session.priceId || session.priceId !== expectedVaultPriceId) {
    return {
      status: "reject",
      reason: "wrong_price",
      sessionId: session.id,
    };
  }

  if (!session.customerId) {
    return {
      status: "reject",
      reason: "missing_customer",
      sessionId: session.id,
    };
  }

  if (!session.subscriptionId) {
    return {
      status: "reject",
      reason: "missing_subscription",
      sessionId: session.id,
    };
  }

  if (!session.customerEmail?.trim()) {
    return {
      status: "reject",
      reason: "missing_email",
      sessionId: session.id,
    };
  }

  if (session.paymentStatus !== "paid") {
    return {
      status: "reject",
      reason: "unpaid",
      sessionId: session.id,
    };
  }

  return {
    status: "accept",
    reason: "vault_subscription_paid",
    sessionId: session.id,
  };
}
