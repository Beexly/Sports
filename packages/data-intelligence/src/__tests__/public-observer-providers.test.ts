/**
 * Provider classifications (Addendum III) — the Provider Trial Court verdicts.
 *
 * The hard rules: a public observer cannot settle; a discovery list cannot go LIVE; a sportsbook
 * execution API is DO_NOT_USE_FOR_EXECUTION; no provider may execute; LIVE-capable providers must
 * require a fact-supply path.
 */

import { describe, it, expect } from "vitest";
import {
  PROVIDER_CLASSIFICATIONS,
  getProviderClassification,
  validateProviderClassifications,
} from "../public-observer-providers.js";

describe("provider classifications", () => {
  it("the registry validates against its own invariants", () => {
    expect(validateProviderClassifications().ok).toBe(true);
  });

  it("SerpApi Google Sports is a public observer that cannot settle and cannot be LIVE", () => {
    const p = getProviderClassification("SERPAPI_GOOGLE_SPORTS")!;
    expect(p.roles).toContain("PUBLIC_OBSERVER");
    expect(p.canSettle).toBe(false);
    expect(p.canBeLive).toBe(false);
    expect(p.authorityCeiling).toBe("WATCH");
  });

  it("public-api lists are discovery-only and can never be LIVE directly", () => {
    for (const id of ["PUBLIC_API_LISTS", "PUBLIC_APIS"]) {
      const p = getProviderClassification(id)!;
      expect(p.status).toBe("DISCOVERY_ONLY");
      expect(p.canBeLive).toBe(false);
    }
  });

  it("Cloudbet is execution-gated and may never execute", () => {
    const p = getProviderClassification("CLOUDBET")!;
    expect(p.status).toBe("DO_NOT_USE_FOR_EXECUTION");
    expect(p.canExecute).toBe(false);
  });

  it("no provider in the registry may execute, and LIVE providers require a fact-supply path", () => {
    for (const p of PROVIDER_CLASSIFICATIONS) {
      expect(p.canExecute).toBe(false);
      if (p.canBeLive) expect(p.requiresFactSupplyPath).toBe(true);
    }
  });

  it("a tampered classification (discovery-only marked LIVE) fails validation", () => {
    const bad = [{ ...getProviderClassification("PUBLIC_APIS")!, canBeLive: true }];
    expect(validateProviderClassifications(bad).ok).toBe(false);
  });
});
