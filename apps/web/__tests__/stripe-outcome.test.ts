import { describe, expect, it } from "vitest";
import {
  classifyStripeSessionCreateError,
  transitionForOutcome,
} from "@/lib/billing/stripe-outcome";

/**
 * Stripe session-create outcome classification (directive 5.3). The core
 * safety property: only outcomes that PROVE no session exists may release
 * the attempt's idempotency key; anything unprovable stays AMBIGUOUS and
 * keeps the key.
 */

function stripeError(type: string): Error & { type: string } {
  return Object.assign(new Error(`stripe ${type}`), { type });
}

describe("classifyStripeSessionCreateError", () => {
  it.each([
    ["StripeConnectionError", "AMBIGUOUS_NETWORK_OUTCOME"],
    ["StripeAPIError", "AMBIGUOUS_NETWORK_OUTCOME"],
    ["StripeCardError", "DEFINITIVE_REJECTION"],
    ["StripeInvalidRequestError", "CONFIGURATION_FAILURE"],
    ["StripeAuthenticationError", "CONFIGURATION_FAILURE"],
    ["StripePermissionError", "CONFIGURATION_FAILURE"],
    ["StripeIdempotencyError", "CONFIGURATION_FAILURE"],
    ["StripeRateLimitError", "RETRIABLE_NO_REQUEST_SENT"],
  ])("maps %s → %s", (type, expected) => {
    expect(classifyStripeSessionCreateError(stripeError(type))).toBe(expected);
  });

  it("classifies UNKNOWN errors as AMBIGUOUS (fail closed — never mint a fresh key on a guess)", () => {
    expect(classifyStripeSessionCreateError(new Error("stripe unreachable"))).toBe(
      "AMBIGUOUS_NETWORK_OUTCOME",
    );
    expect(classifyStripeSessionCreateError(stripeError("StripeSomethingNew"))).toBe(
      "AMBIGUOUS_NETWORK_OUTCOME",
    );
    expect(classifyStripeSessionCreateError(null)).toBe("AMBIGUOUS_NETWORK_OUTCOME");
    expect(classifyStripeSessionCreateError("boom")).toBe("AMBIGUOUS_NETWORK_OUTCOME");
    expect(classifyStripeSessionCreateError({ type: 42 })).toBe("AMBIGUOUS_NETWORK_OUTCOME");
  });
});

describe("transitionForOutcome", () => {
  it("ONLY provably-terminal outcomes release the active key", () => {
    expect(transitionForOutcome("DEFINITIVE_REJECTION").releasesActiveKey).toBe(true);
    expect(transitionForOutcome("CONFIGURATION_FAILURE").releasesActiveKey).toBe(true);
    expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME").releasesActiveKey).toBe(false);
    expect(transitionForOutcome("RETRIABLE_NO_REQUEST_SENT").releasesActiveKey).toBe(false);
  });

  it("maps outcomes to the attempt state machine", () => {
    expect(transitionForOutcome("DEFINITIVE_REJECTION").status).toBe("FAILED");
    expect(transitionForOutcome("CONFIGURATION_FAILURE").status).toBe("FAILED");
    expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME").status).toBe("AMBIGUOUS");
    expect(transitionForOutcome("RETRIABLE_NO_REQUEST_SENT").status).toBe("CREATED");
  });

  it("carries typed HTTP mappings for the route boundary", () => {
    expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME")).toMatchObject({
      httpStatus: 503,
      errorCode: "checkout_outcome_ambiguous",
    });
    expect(transitionForOutcome("RETRIABLE_NO_REQUEST_SENT")).toMatchObject({
      httpStatus: 503,
      errorCode: "checkout_retriable",
    });
    expect(transitionForOutcome("CONFIGURATION_FAILURE")).toMatchObject({
      httpStatus: 502,
      errorCode: "checkout_configuration_failure",
    });
    expect(transitionForOutcome("DEFINITIVE_REJECTION")).toMatchObject({
      httpStatus: 400,
      errorCode: "checkout_rejected",
    });
  });
});
