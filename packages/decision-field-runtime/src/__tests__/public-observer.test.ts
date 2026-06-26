/**
 * The Public Observer Ledger — what the public is shown, never what is true.
 *
 * The bar: a public observer record can NEVER settle an event or create a public action; on fixtures it
 * compiles to INFO_ONLY; highlights are rights-gated (no display without clearance); the Chronos lag
 * family computes real deltas and returns null for missing clocks (never zero); and a parsed SerpApi
 * result bridges into a governed record with its kgmids and highlights intact.
 */

import { describe, it, expect } from "vitest";
import {
  buildPublicObserverRecord,
  buildAllPublicObserverRecords,
  publicObserverCanSettle,
  publicObserverFromSerpApi,
  PUBLIC_OBSERVER_FIXTURES,
  PUBLIC_OBSERVER_RIGHTS,
} from "../public-observer-ledger.js";
import { buildHighlightPassport } from "../highlight-passport.js";
import { computeChronosLags, CHRONOS_FIXTURE, googleVisibilityIndex, knowledgeGraphCoverage, serpSportsConfidence, publicObserverDisagreement } from "../public-consensus-lag.js";
import { compileClaimObject, validateClaimObject } from "../meaning/meaning-compiler.js";
import { publicObserverToClaimObject } from "../meaning/morphology-adapters.js";
import { compileAllFixtures } from "../meaning/meaning-fixtures.js";
import { parseSportsResults, SERPAPI_FIXTURE_SOCCER_LIVE } from "@sports/data-intelligence";

describe("PublicObserverRecord — public display truth, not official truth", () => {
  it("can never settle and is public-observer-only authority", () => {
    for (const r of buildAllPublicObserverRecords()) {
      expect(r.canSettle).toBe(false);
      expect(publicObserverCanSettle(r)).toBe(false);
      expect(r.authorityImpact).toBe("PUBLIC_OBSERVER_ONLY");
      expect(r.fixtureWatermarked).toBe(true);
    }
  });

  it("requires a capturedAt (a public capture without a capture time is meaningless)", () => {
    expect(() => buildPublicObserverRecord({ ...PUBLIC_OBSERVER_FIXTURES[1]!, capturedAtLabel: "" })).toThrow(/capturedAt/i);
  });

  it("lifts raw highlights into rights-gated HighlightPassports (never raw urls)", () => {
    const r = buildAllPublicObserverRecords()[0]!;
    expect(r.highlights.length).toBeGreaterThan(0);
    for (const h of r.highlights) expect(h.sourceType).toBe("PUBLIC_OBSERVER_HIGHLIGHT");
  });
});

describe("compiled — a public observer caps at INFO_ONLY and can never act", () => {
  it("compiles to a fixture-watermarked PUBLIC_OBSERVER_RESULT capped at INFO_ONLY", () => {
    for (const r of buildAllPublicObserverRecords()) {
      const c = compileClaimObject(publicObserverToClaimObject(r));
      expect(validateClaimObject(c).ok).toBe(true);
      expect(c.objectType).toBe("PUBLIC_OBSERVER_RESULT");
      expect(c.publicExpression).toBe("INFO_ONLY");
      expect(c.publicSafe).toBe(false);
      expect(c.decision.suppressesAction).toBe(true);
    }
  });

  it("appears in the compiled corpus", () => {
    const corpus = compileAllFixtures();
    expect(corpus.some((c) => c.objectType === "PUBLIC_OBSERVER_RESULT")).toBe(true);
  });
});

describe("HighlightPassport — discovery is not ownership", () => {
  it("unknown rights ⇒ no display, no embed, thumbnail not reusable", () => {
    const h = buildHighlightPassport({ highlightId: "h1", sourceUrl: "https://x", sourcePlatform: "youtube", title: "t", capturedAtLabel: "f", rightsStatus: "UNKNOWN", thumbnailUrl: "https://x/t.jpg" });
    expect(h.displayAllowed).toBe(false);
    expect(h.embedAllowed).toBe(false);
    expect(h.thumbnailReusable).toBe(false);
    expect(h.publicSafe).toBe(false);
  });
  it("licensed ⇒ display + embed open, thumbnail reusable", () => {
    const h = buildHighlightPassport({ highlightId: "h2", sourceUrl: "https://x", sourcePlatform: "youtube", title: "t", capturedAtLabel: "f", rightsStatus: "LICENSED" });
    expect(h.displayAllowed).toBe(true);
    expect(h.embedAllowed).toBe(true);
    expect(h.thumbnailReusable).toBe(true);
  });
});

describe("Public Consensus Lag — the Chronos clock chain", () => {
  it("computes the lag family from the 55:00-goal fixture", () => {
    const r = computeChronosLags(CHRONOS_FIXTURE);
    expect(r.publicConsensusLag).toBe(8); // public 55:10 − official 55:02
    expect(r.publicScoreboardDelay).toBe(10); // public 55:10 − event 55:00
    expect(r.publicVsMarketLag).toBe(6); // public 55:10 − market 55:04
    expect(r.marketVsOfficialLag).toBe(2);
    expect(r.canImplyEdge).toBe(false);
    expect(r.canCreateAction).toBe(false);
  });
  it("a missing clock yields null (unknown), never zero", () => {
    const r = computeChronosLags({ ...CHRONOS_FIXTURE, sourceClockSec: null });
    expect(r.publicConsensusLag).toBeNull();
    expect(r.publicVsOfficialLag).toBeNull();
    expect(r.publicScoreboardDelay).toBe(10); // still known
  });
  it("visibility/coverage/confidence are deterministic; disagreement needs both scores", () => {
    const r = buildAllPublicObserverRecords()[0]!;
    expect(googleVisibilityIndex(r)).toBe(googleVisibilityIndex(r));
    expect(knowledgeGraphCoverage(r)).toBeGreaterThanOrEqual(0);
    expect(serpSportsConfidence(r)).toBeLessThanOrEqual(1);
    expect(publicObserverDisagreement(r, null)).toBeNull();
    expect(publicObserverDisagreement(r, "9 - 9")).toBe(true);
  });
});

describe("SerpApi → PublicObserverRecord bridge", () => {
  it("parses a live soccer payload and bridges into a governed record with kgmids + highlights", () => {
    const parsed = parseSportsResults(SERPAPI_FIXTURE_SOCCER_LIVE, "Ecuador vs Germany");
    const r = publicObserverFromSerpApi(parsed, { observerId: "po-bridge", subject: "Ecuador vs Germany", sport: "soccer", eventId: "fixture-soccer-ecu-ger-2026", capturedAtLabel: "fixture+55:10" });
    expect(r.kgmids.length).toBeGreaterThan(0);
    expect(r.highlights.length).toBeGreaterThan(0);
    expect(r.publicScore).toBe("2 - 1");
    expect(r.rightsEnvelope).toBe(PUBLIC_OBSERVER_RIGHTS);
    expect(r.canSettle).toBe(false);
  });
});
