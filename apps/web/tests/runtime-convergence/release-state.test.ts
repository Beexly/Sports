/**
 * C55-C57 — Release Candidate State Machine + Feature Flags + Degraded Mode tests.
 *
 * Asserts the invariants that no env override can weaken:
 *  - Coach Live AI defaults to false in every release state
 *  - Payments default to false except production
 *  - Public picks default to false in development + internal-calibration
 *  - Feature flag defaults align with release-state capabilities
 *  - Degraded-mode decisions never silently pass through as "live"
 */

import { describe, it, expect } from "vitest";
import {
  RELEASE_STATE_CAPABILITIES,
  assertReleaseStateInvariants,
  isReleaseState,
} from "@/lib/release/release-state";
import { FEATURE_FLAGS, getFeatureFlag } from "@/lib/release/feature-flags";
import {
  decideFallback,
  isDegraded,
  liveOddsHealthFromEnv,
  stripeHealthFromEnv,
} from "@/lib/degraded-mode/degraded-state";
import { FALLBACK_COPY, getFallbackCopy } from "@/lib/degraded-mode/fallback-copy";

describe("release state invariants", () => {
  it("matrix passes assertReleaseStateInvariants", () => {
    expect(() => assertReleaseStateInvariants()).not.toThrow();
  });

  it("coachLiveAi defaults to false in every state", () => {
    for (const state of Object.keys(RELEASE_STATE_CAPABILITIES)) {
      const caps = RELEASE_STATE_CAPABILITIES[state as keyof typeof RELEASE_STATE_CAPABILITIES];
      expect(caps.coachLiveAi).toBe(false);
    }
  });

  it("payments defaults to false except production", () => {
    for (const state of Object.keys(RELEASE_STATE_CAPABILITIES)) {
      const caps = RELEASE_STATE_CAPABILITIES[state as keyof typeof RELEASE_STATE_CAPABILITIES];
      if (state === "production") {
        expect(caps.payments).toBe(true);
      } else {
        expect(caps.payments).toBe(false);
      }
    }
  });

  it("publicPicks defaults to false in development and internal-calibration", () => {
    expect(RELEASE_STATE_CAPABILITIES.development.publicPicks).toBe(false);
    expect(RELEASE_STATE_CAPABILITIES["internal-calibration"].publicPicks).toBe(false);
  });

  it("isReleaseState accepts known states and rejects unknown", () => {
    expect(isReleaseState("production")).toBe(true);
    expect(isReleaseState("internal-calibration")).toBe(true);
    expect(isReleaseState("bogus")).toBe(false);
    expect(isReleaseState("")).toBe(false);
  });
});

describe("feature flag registry", () => {
  it("every flag has defaults for every release state", () => {
    const expectedStates = Object.keys(RELEASE_STATE_CAPABILITIES);
    for (const flag of FEATURE_FLAGS) {
      for (const state of expectedStates) {
        expect(flag.defaults).toHaveProperty(state);
        expect(typeof flag.defaults[state as keyof typeof flag.defaults]).toBe("boolean");
      }
    }
  });

  it("COACH_LIVE_AI_ENABLED is false in every state by default", () => {
    const flag = getFeatureFlag("COACH_LIVE_AI_ENABLED");
    for (const v of Object.values(flag.defaults)) {
      expect(v).toBe(false);
    }
  });

  it("STRIPE_CHECKOUT_ENABLED is false except in production", () => {
    const flag = getFeatureFlag("STRIPE_CHECKOUT_ENABLED");
    expect(flag.defaults.production).toBe(true);
    expect(flag.defaults.development).toBe(false);
    expect(flag.defaults["internal-calibration"]).toBe(false);
    expect(flag.defaults.preview).toBe(false);
    expect(flag.defaults["private-beta"]).toBe(false);
    expect(flag.defaults["public-demo"]).toBe(false);
    expect(flag.defaults["release-candidate"]).toBe(false);
  });

  it("getFeatureFlag throws on unknown flag", () => {
    // @ts-expect-error testing runtime check
    expect(() => getFeatureFlag("BOGUS_FLAG")).toThrow();
  });

  it("each flag has owner, protects, and fallback fields", () => {
    for (const flag of FEATURE_FLAGS) {
      expect(flag.owner).toBeTruthy();
      expect(flag.protects.length).toBeGreaterThan(0);
      expect(flag.fallback.length).toBeGreaterThan(0);
    }
  });
});

describe("degraded mode", () => {
  it("live dependency decides proceed", () => {
    const d = decideFallback("live-odds", "live");
    expect(d.action).toBe("proceed");
    expect(isDegraded(d)).toBe(false);
  });

  it("degraded dependency decides fallback with user message", () => {
    const d = decideFallback("ai-coach", "degraded");
    expect(d.action).toBe("fallback");
    expect(d.userMessage).toBeTruthy();
    expect(isDegraded(d)).toBe(true);
  });

  it("unavailable decision-room hides instead of falling back", () => {
    const d = decideFallback("decision-room", "unavailable");
    expect(d.action).toBe("hide");
  });

  it("unavailable other deps fall back with copy", () => {
    const d = decideFallback("live-odds", "unavailable");
    expect(d.action).toBe("fallback");
    expect(d.userMessage).toBeTruthy();
  });

  it("env helpers reflect env state", () => {
    const oddsBefore = process.env.THE_ODDS_API_KEY;
    delete process.env.THE_ODDS_API_KEY;
    expect(liveOddsHealthFromEnv()).toBe("unavailable");
    process.env.THE_ODDS_API_KEY = "x";
    expect(liveOddsHealthFromEnv()).toBe("live");
    if (oddsBefore === undefined) delete process.env.THE_ODDS_API_KEY;
    else process.env.THE_ODDS_API_KEY = oddsBefore;

    const stripeBefore = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    expect(stripeHealthFromEnv()).toBe("unavailable");
    if (stripeBefore !== undefined) process.env.STRIPE_SECRET_KEY = stripeBefore;
  });
});

describe("fallback copy registry", () => {
  it("every key has title and body", () => {
    for (const key of Object.keys(FALLBACK_COPY)) {
      const copy = getFallbackCopy(key as keyof typeof FALLBACK_COPY);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });

  it("no certainty language in fallback copy", () => {
    const certaintyPatterns = [/guaranteed/i, /can't lose/i, /\block\b/i, /always wins/i];
    for (const copy of Object.values(FALLBACK_COPY)) {
      for (const p of certaintyPatterns) {
        expect(copy.title).not.toMatch(p);
        expect(copy.body).not.toMatch(p);
      }
    }
  });

  it("no marketing fluff in fallback copy", () => {
    const fluffPatterns = [/your business is important/i, /apologize for any inconvenience/i];
    for (const copy of Object.values(FALLBACK_COPY)) {
      for (const p of fluffPatterns) {
        expect(copy.body).not.toMatch(p);
      }
    }
  });
});
