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
