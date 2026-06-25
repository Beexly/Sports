/**
 * AUTHORITY GATE — the non-negotiable data-mode / model / publication / readiness ceilings.
 *
 * These prove the merge-blocker: fixture data can never be actionable, shadow data can never go public,
 * PUBLIC_ACTION needs live + readiness + public-authorized + public-publication, and EXECUTABLE_SHADOW
 * tradability can never by itself drive a card to an unrestricted PUBLIC_ACTION.
 */

import { describe, it, expect } from "vitest";
import {
  authorityCeiling,
  isPublicSafe,
  tradabilityStrengthCeiling,
  DEFAULT_AUTHORITY,
  type AuthorityContext,
} from "../index.js";

const FULL_PUBLIC: AuthorityContext = {
  dataMode: "LIVE_REAL",
  modelAuthority: "PUBLIC_ALLOWED",
  readinessAuthorized: true,
  publicationAuthority: "PUBLIC",
};

describe("authorityCeiling — fail-closed ladder", () => {
  it("FIXTURE caps at INFO_ONLY (default is fixture)", () => {
    expect(authorityCeiling(DEFAULT_AUTHORITY)).toBe("INFO_ONLY");
    expect(authorityCeiling({ ...FULL_PUBLIC, dataMode: "FIXTURE" })).toBe("INFO_ONLY");
  });

  it("SHADOW_REAL caps at WATCH", () => {
    expect(authorityCeiling({ ...FULL_PUBLIC, dataMode: "SHADOW_REAL" })).toBe("WATCH");
  });

  it("LIVE but unpriced caps at WATCH", () => {
    expect(authorityCeiling({ ...FULL_PUBLIC, modelAuthority: "UNPRICED" })).toBe("WATCH");
    expect(authorityCeiling({ ...FULL_PUBLIC, modelAuthority: "PROCESS_ONLY" })).toBe("WATCH");
  });

  it("LIVE without an open readiness gate caps at WATCH", () => {
    expect(authorityCeiling({ ...FULL_PUBLIC, readinessAuthorized: false })).toBe("WATCH");
  });

  it("LIVE + personalized-allowed + personalized-publication tops out at PERSONALIZED", () => {
    expect(
      authorityCeiling({ dataMode: "LIVE_REAL", modelAuthority: "PERSONALIZED_ALLOWED", readinessAuthorized: true, publicationAuthority: "PERSONALIZED" }),
    ).toBe("PERSONALIZED");
  });

  it("PUBLIC_ACTION requires the full live + readiness + public-authorized + public-publication conjunction", () => {
    expect(authorityCeiling(FULL_PUBLIC)).toBe("PUBLIC_ACTION");
    // Drop any single gate → no longer PUBLIC_ACTION.
    expect(authorityCeiling({ ...FULL_PUBLIC, publicationAuthority: "PERSONALIZED" })).not.toBe("PUBLIC_ACTION");
    expect(authorityCeiling({ ...FULL_PUBLIC, modelAuthority: "PERSONALIZED_ALLOWED" })).not.toBe("PUBLIC_ACTION");
  });
});

describe("isPublicSafe — every public gate must hold", () => {
  it("only true for live + ready + public-authorized + public-publication + rights + > INFO_ONLY", () => {
    expect(isPublicSafe(FULL_PUBLIC, "WATCH", true)).toBe(true);
    expect(isPublicSafe(FULL_PUBLIC, "INFO_ONLY", true)).toBe(false); // INFO_ONLY is never public
    expect(isPublicSafe(FULL_PUBLIC, "WATCH", false)).toBe(false); // rights not cleared
    expect(isPublicSafe(DEFAULT_AUTHORITY, "WATCH", true)).toBe(false); // fixture
    expect(isPublicSafe({ ...FULL_PUBLIC, dataMode: "SHADOW_REAL" }, "WATCH", true)).toBe(false);
  });
});

describe("tradabilityStrengthCeiling — EXECUTABLE_SHADOW is never unrestricted", () => {
  it("EXECUTABLE_SHADOW caps at ACTION (never PUBLIC_ACTION on its own)", () => {
    expect(tradabilityStrengthCeiling("EXECUTABLE_SHADOW")).toBe("ACTION");
  });
  it("weaker tradability tiers cap lower", () => {
    expect(tradabilityStrengthCeiling("WATCHLIST")).toBe("WATCH");
    expect(tradabilityStrengthCeiling("THEORETICAL_ONLY")).toBe("WAIT");
    expect(tradabilityStrengthCeiling("RESEARCH_ONLY")).toBe("INFO_ONLY");
    expect(tradabilityStrengthCeiling("FRICTION_KILLED")).toBe("INFO_ONLY");
    expect(tradabilityStrengthCeiling("DATA_QUALITY_FAIL")).toBe("INFO_ONLY");
  });
});
