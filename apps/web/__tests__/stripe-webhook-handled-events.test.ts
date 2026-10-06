import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { HANDLED_STRIPE_WEBHOOK_EVENTS } from "@/lib/billing/stripe-webhook-events";

/**
 * C-182 / F-20 — the published handled-event list must be the handler's own.
 *
 * The operator truth surface reports HANDLED_STRIPE_WEBHOOK_EVENTS as the
 * server-knowable half of "does the Stripe endpoint subscribe to everything
 * this deployment handles". A hand-maintained copy that drifts from the switch
 * it describes would reintroduce exactly the defect F-20 was opened for: the
 * go-live checklist listed seven events while the handler had grown to ten, and
 * the gap was invisible from the running system.
 *
 * So the list is checked against the route SOURCE, not against a second copy of
 * itself. Adding a `case` to the handler without adding it here fails this test.
 */
const ROUTE_PATH = resolve(__dirname, "../app/api/webhooks/stripe/route.ts");

/** Case labels inside `handleStripeEvent` — the switch on `event.type`. */
function caseLabelsInHandler(source: string): string[] {
  const start = source.indexOf("async function handleStripeEvent");
  expect(start).toBeGreaterThan(-1);
  const body = source.slice(start);
  // A Stripe event type is dotted and lower-case; the other string literals in
  // this file (log text, status names, error codes) are not, so the shape is
  // the discriminator rather than a brittle line range.
  return [...body.matchAll(/case\s+"([a-z_]+(?:\.[a-z_]+)+)":/g)].map((m) => m[1] as string);
}

describe("the published handled-event list is the handler's own (C-182 / F-20)", () => {
  const source = readFileSync(ROUTE_PATH, "utf8");

  it("matches the case labels in handleStripeEvent exactly", () => {
    const fromSource = [...new Set(caseLabelsInHandler(source))].sort();
    expect(fromSource).toEqual([...HANDLED_STRIPE_WEBHOOK_EVENTS].sort());
  });

  it("finds the ten events the handler is documented to cover", () => {
    // A count assertion on its own would pass a swap; the set equality above is
    // the real check. This one pins the number the F-20 row names, so a silent
    // REMOVAL is as loud as an addition.
    expect(HANDLED_STRIPE_WEBHOOK_EVENTS).toHaveLength(10);
    expect(new Set(caseLabelsInHandler(source)).size).toBe(10);
  });
});
