import { afterEach, describe, expect, it } from "vitest";
import {
  OddsPaymentCircuitBreaker,
  setOddsPaymentCircuitBreakerForTests,
} from "../odds-api-circuit-breaker.js";

afterEach(() => {
  setOddsPaymentCircuitBreakerForTests(null);
  delete process.env["ODDS_API_CIRCUIT_FORCE_OPEN"];
});

describe("OddsPaymentCircuitBreaker", () => {
  it("allows requests while closed", () => {
    const b = new OddsPaymentCircuitBreaker({ failureThreshold: 1, openDurationMs: 60_000 });
    const a = b.tryAcquire();
    expect(a.allowed).toBe(true);
    expect(a.state).toBe("closed");
  });

  it("opens on a single 402 by default and fails closed", () => {
    let t = 1_000_000;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 60_000,
      now: () => t,
    });

    b.recordPaymentRequired("quota exhausted");
    expect(b.getState()).toBe("open");

    const blocked = b.tryAcquire();
    expect(blocked.allowed).toBe(false);
    expect(blocked.state).toBe("open");
    expect(blocked.reason).toMatch(/402|payment circuit open/i);
    expect(blocked.remainingOpenMs).toBe(60_000);
  });

  it("does not open until failureThreshold is reached", () => {
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 3,
      openDurationMs: 60_000,
    });
    b.recordPaymentRequired();
    b.recordPaymentRequired();
    expect(b.getState()).toBe("closed");
    expect(b.tryAcquire().allowed).toBe(true);
    b.recordPaymentRequired();
    expect(b.getState()).toBe("open");
    expect(b.tryAcquire().allowed).toBe(false);
  });

  it("enters half-open after openDurationMs and allows one probe", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1_000,
      now: () => t,
    });
    b.recordPaymentRequired();
    expect(b.getState()).toBe("open");

    t = 1_001;
    expect(b.getState()).toBe("half_open");

    const probe = b.tryAcquire();
    expect(probe.allowed).toBe(true);
    expect(probe.state).toBe("half_open");

    const second = b.tryAcquire();
    expect(second.allowed).toBe(false);
    expect(second.reason).toMatch(/probe already in flight/i);
  });

  it("closes on success after probe", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 100,
      now: () => t,
    });
    b.recordPaymentRequired();
    t = 200;
    expect(b.tryAcquire().allowed).toBe(true);
    b.recordSuccess();
    expect(b.getState()).toBe("closed");
    expect(b.tryAcquire().allowed).toBe(true);
  });

  it("re-opens if half-open probe still returns 402", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 100,
      now: () => t,
    });
    b.recordPaymentRequired();
    t = 200;
    b.tryAcquire();
    b.recordPaymentRequired("still unpaid");
    expect(b.getState()).toBe("open");
    expect(b.tryAcquire().allowed).toBe(false);
  });

  it("ODDS_API_CIRCUIT_FORCE_OPEN hard-stops all acquires", () => {
    process.env["ODDS_API_CIRCUIT_FORCE_OPEN"] = "1";
    const b = new OddsPaymentCircuitBreaker();
    const a = b.tryAcquire();
    expect(a.allowed).toBe(false);
    expect(a.reason).toMatch(/FORCE_OPEN/);
  });

  it("reset clears open state", () => {
    const b = new OddsPaymentCircuitBreaker({ failureThreshold: 1 });
    b.forceOpen();
    expect(b.tryAcquire().allowed).toBe(false);
    b.reset();
    expect(b.tryAcquire().allowed).toBe(true);
  });
});

/**
 * Regression: a half-open probe that ends in anything other than a clean 2xx
 * or a 402/401 must hand its exclusive slot back.
 */
describe("half-open probe release", () => {
  it("a probe that fails for a NON-payment reason does not wedge the circuit forever", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1000,
      now: () => t,
    });

    b.recordPaymentRequired("402");
    expect(b.getState()).toBe("open");

    t += 1001;
    expect(b.getState()).toBe("half_open");
    expect(b.tryAcquire().allowed).toBe(true); // probe slot taken

    // The probe throws a transient 500 / network error: neither recordSuccess
    // nor recordPaymentRequired runs. Before the fix the slot stayed held and
    // every subsequent acquire was refused for the life of the process — so
    // the circuit never recovered even after payment was restored.
    b.releaseProbe();

    t += 1;
    const next = b.tryAcquire();
    expect(next.allowed).toBe(true);
    expect(next.state).toBe("half_open");
  });

  it("releaseProbe does not count as a payment failure and does not re-arm the open window", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1000,
      now: () => t,
    });

    b.recordPaymentRequired("402");
    t += 1001;
    b.tryAcquire();
    const failuresBefore = b.snapshot().consecutiveFailures;

    b.releaseProbe();

    const after = b.snapshot();
    // A network blip must not be recorded as "the upstream demanded payment",
    // and must not buy another full open window.
    expect(after.consecutiveFailures).toBe(failuresBefore);
    expect(after.state).toBe("half_open");
  });

  it("releaseProbe is a safe no-op when no probe is in flight", () => {
    const b = new OddsPaymentCircuitBreaker({ failureThreshold: 1 });
    expect(() => b.releaseProbe()).not.toThrow();
    expect(b.tryAcquire().allowed).toBe(true);
    b.releaseProbe();
    expect(b.tryAcquire().allowed).toBe(true);
  });

  it("a successful probe still closes the circuit fully", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1000,
      now: () => t,
    });
    b.recordPaymentRequired("402");
    t += 1001;
    b.tryAcquire();
    b.recordSuccess();
    b.releaseProbe(); // the client's finally always runs; must not undo the close
    expect(b.getState()).toBe("closed");
    expect(b.tryAcquire().allowed).toBe(true);
  });
});

/**
 * A refusal must say WHAT ACTUALLY HAPPENED. odds-provider-adapter classifies
 * 401/402/403 as `paymentOrAuth`, so throwing 402 for every refusal reported a
 * local concurrency limit — and an operator's own kill switch — as "provider
 * payment failure".
 */
describe("refusal cause is stated, not inferred from a status code", () => {
  it("a genuine payment-driven open reports cause payment_circuit_open", () => {
    const b = new OddsPaymentCircuitBreaker({ failureThreshold: 1 });
    b.recordPaymentRequired("402");
    const r = b.tryAcquire();
    expect(r.allowed).toBe(false);
    expect(r.cause).toBe("payment_circuit_open");
  });

  it("a half-open probe-concurrency refusal is NOT reported as payment", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1000,
      now: () => t,
    });
    b.recordPaymentRequired("402");
    t += 1001;
    expect(b.tryAcquire().acquiredProbe).toBe(true); // first probe takes the slot

    const second = b.tryAcquire();
    expect(second.allowed).toBe(false);
    expect(second.cause).toBe("probe_in_flight");
    expect(second.cause).not.toBe("payment_circuit_open");
    // The message must not imply upstream said anything.
    expect(second.reason).toMatch(/has NOT reported a payment or auth failure/);
  });

  it("the operator kill switch reports its own cause, not a payment failure", () => {
    process.env["ODDS_API_CIRCUIT_FORCE_OPEN"] = "1";
    const b = new OddsPaymentCircuitBreaker();
    const r = b.tryAcquire();
    expect(r.allowed).toBe(false);
    expect(r.cause).toBe("operator_forced_open");
    delete process.env["ODDS_API_CIRCUIT_FORCE_OPEN"];
  });

  it("an allowed acquire carries no refusal cause", () => {
    const b = new OddsPaymentCircuitBreaker();
    const r = b.tryAcquire();
    expect(r.allowed).toBe(true);
    expect(r.cause).toBeUndefined();
  });
});

describe("probe ownership: only the acquirer may release the slot", () => {
  it("a CLOSED-circuit acquire does not claim a probe", () => {
    const b = new OddsPaymentCircuitBreaker();
    const r = b.tryAcquire();
    expect(r.state).toBe("closed");
    expect(r.acquiredProbe).toBe(false);
  });

  it("only the half-open acquirer reports acquiredProbe", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1000,
      now: () => t,
    });
    b.recordPaymentRequired("402");
    t += 1001;

    const holder = b.tryAcquire();
    expect(holder.acquiredProbe).toBe(true);

    const contender = b.tryAcquire();
    expect(contender.allowed).toBe(false);
    // A non-holder must not believe it owns the slot — releasing on its behalf
    // is what let a second probe through.
    expect(contender.acquiredProbe).toBeFalsy();
  });

  it("the slot stays held while the real probe is in flight", () => {
    let t = 0;
    const b = new OddsPaymentCircuitBreaker({
      failureThreshold: 1,
      openDurationMs: 1000,
      now: () => t,
    });
    b.recordPaymentRequired("402");
    t += 1001;
    b.tryAcquire(); // holder

    // A non-holder that (incorrectly) released would open a second probe here.
    // With ownership enforced at the call site, the slot remains taken.
    expect(b.tryAcquire().allowed).toBe(false);
  });
});
