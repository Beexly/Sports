/**
 * Parlay X-Ray quota — logic-only tests (node env, no DOM).
 * Covers the full funnel: 1 free → email unlock 3 → exhausted upsell,
 * idempotent re-unlock, cookie payload parsing/clamping, and HMAC signing.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FREE_XRAY_LIMIT,
  UNLOCK_XRAY_GRANT,
  consumeXray,
  initialQuotaState,
  isExhausted,
  parseQuotaState,
  quotaSummary,
  serializeQuotaState,
  totalRemaining,
  unlockWithEmail,
  type XrayQuotaState,
} from "./quota";
import { signQuotaState, verifyQuotaCookie } from "./quota-cookie";

describe("free allowance", () => {
  it("starts with exactly 1 free X-Ray", () => {
    const state = initialQuotaState();
    expect(FREE_XRAY_LIMIT).toBe(1);
    expect(quotaSummary(state)).toEqual({
      freeUsed: 0,
      remaining: 1,
      exhausted: false,
      upsell: false,
      unlocked: false,
    });
  });

  it("consumes the free scan, then reports exhausted without upsell", () => {
    const first = consumeXray(initialQuotaState());
    expect(first.ok).toBe(true);
    expect(first.state.freeUsed).toBe(1);
    expect(quotaSummary(first.state)).toEqual({
      freeUsed: 1,
      remaining: 0,
      exhausted: true,
      upsell: false,
      unlocked: false,
    });
  });

  it("refuses further scans and leaves state unchanged when exhausted", () => {
    const exhausted = consumeXray(initialQuotaState()).state;
    const again = consumeXray(exhausted);
    expect(again.ok).toBe(false);
    expect(again.state).toEqual(exhausted);
    expect(isExhausted(again.state)).toBe(true);
  });
});

describe("email unlock funnel", () => {
  it("grants 3 more after the free scan is spent", () => {
    const spent = consumeXray(initialQuotaState()).state;
    const unlocked = unlockWithEmail(spent, "Fan@Example.com ");
    expect(unlocked.unlockedEmail).toBe("fan@example.com");
    expect(unlocked.unlockedRemaining).toBe(UNLOCK_XRAY_GRANT);
    expect(quotaSummary(unlocked)).toEqual({
      freeUsed: 1,
      remaining: 3,
      exhausted: false,
      upsell: false,
      unlocked: true,
    });
  });

  it("counts down the grant, then reports exhausted WITH upsell", () => {
    let state = unlockWithEmail(consumeXray(initialQuotaState()).state, "fan@example.com");
    for (let i = 0; i < UNLOCK_XRAY_GRANT; i += 1) {
      const step = consumeXray(state);
      expect(step.ok).toBe(true);
      state = step.state;
      expect(totalRemaining(state)).toBe(UNLOCK_XRAY_GRANT - 1 - i);
    }
    expect(quotaSummary(state)).toEqual({
      freeUsed: 1,
      remaining: 0,
      exhausted: true,
      upsell: true,
      unlocked: true,
    });
    expect(consumeXray(state).ok).toBe(false);
  });

  it("re-submitting the SAME email never refills the grant", () => {
    let state = unlockWithEmail(initialQuotaState(), "fan@example.com");
    state = consumeXray(state).state; // free scan
    state = consumeXray(state).state; // 1 of the grant → 2 left
    const again = unlockWithEmail(state, " FAN@example.com ");
    expect(again).toEqual(state);
    expect(again.unlockedRemaining).toBe(2);
  });

  it("a different email starts a fresh grant", () => {
    const spent = unlockWithEmail(initialQuotaState(), "a@example.com");
    const regrant = unlockWithEmail(spent, "b@example.com");
    expect(regrant.unlockedEmail).toBe("b@example.com");
    expect(regrant.unlockedRemaining).toBe(UNLOCK_XRAY_GRANT);
  });

  it("unlocking before the free scan keeps the free scan first in line", () => {
    const unlocked = unlockWithEmail(initialQuotaState(), "fan@example.com");
    expect(totalRemaining(unlocked)).toBe(4);
    const first = consumeXray(unlocked);
    expect(first.state.freeUsed).toBe(1);
    expect(first.state.unlockedRemaining).toBe(3);
  });

  it("ignores an empty email", () => {
    const state = initialQuotaState();
    expect(unlockWithEmail(state, "   ")).toEqual(state);
  });
});

describe("cookie payload serialization", () => {
  it("round-trips a state", () => {
    const state: XrayQuotaState = {
      freeUsed: 1,
      unlockedEmail: "fan@example.com",
      unlockedRemaining: 2,
    };
    expect(parseQuotaState(serializeQuotaState(state))).toEqual(state);
  });

  it("falls back to initial on garbage", () => {
    for (const raw of ["not json", "", null, undefined, 42, []]) {
      expect(parseQuotaState(raw)).toEqual(initialQuotaState());
    }
  });

  it("clamps tampered counters instead of trusting them", () => {
    const parsed = parseQuotaState(
      JSON.stringify({ freeUsed: 9, unlockedRemaining: -4, unlockedEmail: "x@y.z" }),
    );
    expect(parsed.freeUsed).toBe(1);
    expect(parsed.unlockedRemaining).toBe(0);
    expect(parsed.unlockedEmail).toBe("x@y.z");
    const overGrant = parseQuotaState({ freeUsed: 0, unlockedRemaining: 99, unlockedEmail: null });
    expect(overGrant.unlockedRemaining).toBe(UNLOCK_XRAY_GRANT);
  });

  it("rejects missing counters", () => {
    expect(parseQuotaState({ unlockedEmail: "x@y.z" })).toEqual(initialQuotaState());
  });
});

describe("signed cookie (HMAC)", () => {
  const SECRET_KEY = "PARLAY_MRI_COOKIE_SECRET";
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env[SECRET_KEY];
    process.env[SECRET_KEY] = "test-secret-a";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env[SECRET_KEY];
    else process.env[SECRET_KEY] = saved;
  });

  it("sign → verify round-trips", () => {
    const state = unlockWithEmail(consumeXray(initialQuotaState()).state, "fan@example.com");
    const cookie = signQuotaState(state);
    expect(cookie).toContain(".");
    expect(verifyQuotaCookie(cookie)).toEqual(state);
  });

  it("rejects a tampered payload", () => {
    const cookie = signQuotaState(initialQuotaState());
    const [, sig] = cookie.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ freeUsed: 0, unlockedEmail: null, unlockedRemaining: 3 }),
      "utf8",
    ).toString("base64url");
    expect(verifyQuotaCookie(`${forgedPayload}.${sig}`)).toEqual(initialQuotaState());
  });

  it("rejects a wrong or missing signature", () => {
    const cookie = signQuotaState(initialQuotaState());
    const payload = cookie.split(".")[0];
    expect(verifyQuotaCookie(`${payload}.deadbeef`)).toEqual(initialQuotaState());
    expect(verifyQuotaCookie(payload)).toEqual(initialQuotaState());
    expect(verifyQuotaCookie("")).toEqual(initialQuotaState());
    expect(verifyQuotaCookie(null)).toEqual(initialQuotaState());
    expect(verifyQuotaCookie(undefined)).toEqual(initialQuotaState());
  });

  it("a different secret invalidates the cookie", () => {
    const cookie = signQuotaState(initialQuotaState());
    process.env[SECRET_KEY] = "test-secret-b";
    expect(verifyQuotaCookie(cookie)).toEqual(initialQuotaState());
  });
});