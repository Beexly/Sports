/**
 * The Stripe events `app/api/webhooks/stripe/route.ts` actually handles.
 *
 * WHY THIS EXISTS AS A SEPARATE LIST (C-182 / F-20). The endpoint's Dashboard
 * subscription and the handler's switch statement are two different things, and
 * only Stripe knows the first. An event we handle but do not receive is silent:
 * the code is right, the delivery never arrives, and the entitlement it would
 * have written simply never happens. F-20 exists because the go-live checklist
 * listed seven of these while the handler had grown to ten, and nobody could
 * check that from the running system without opening the Dashboard.
 *
 * So this list is published on the operator truth surface as the SERVER-KNOWABLE
 * half of that comparison — "here is what this deployment can handle" — against
 * which the operator reads the Dashboard's subscribed list. It is deliberately
 * NOT presented as what the endpoint receives; the server cannot know that, and
 * `stripe.dashboardSubscribedEvents` on the surface says NOT_READABLE rather
 * than guessing.
 *
 * A hand-maintained list would drift from the switch it describes, which is the
 * same class of defect F-20 is about — so `stripe-webhook-handled-events.test.ts`
 * parses the case labels out of the route source and fails if the two disagree.
 */
export const HANDLED_STRIPE_WEBHOOK_EVENTS = [
  "charge.refunded",
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.deleted",
  "customer.subscription.updated",
  "invoice.paid",
  "invoice.payment_action_required",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
] as const;

export type HandledStripeWebhookEvent = (typeof HANDLED_STRIPE_WEBHOOK_EVENTS)[number];
