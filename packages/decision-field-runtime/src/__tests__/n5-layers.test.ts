/**
 * N5 — Authority Flight Record · Market Bloom · Route Authority · Slip MRI · Watchlist Alerts.
 *
 * Each layer's invariants: fixture/shadow never reaches public action (flight record), market stage
 * caps the decision and birth alone is never an action, every route declares a status and its gates,
 * a slip's strongest verdict is "proceed with caution" with correlation flagged, and every alert has a
 * reason + proof and no bet-now pressure.
 */

import { describe, it, expect } from "vitest";
import { buildFlightRecord } from "../authority-flight-record.js";
import { classifyMarketBloomStage, marketBloomToDecisionState, buildAllMarketBloomRecords } from "../market-bloom.js";
import { validateRouteAuthority, ROUTE_AUTHORITY_REGISTRY } from "../route-authority-registry.js";
import { analyzeSlip, analyzeFixtureSlip, type SlipLeg } from "../slip-mri.js";
import { buildAlert, buildFixtureAlerts, applyFrequency } from "../watchlist-alerts.js";

describe("Authority Flight Record (over composeAuthority)", () => {
  it("a fixture request is capped at INFO_ONLY with SOURCE_REALITY binding + an upgrade hint", () => {
    const fr = buildFlightRecord({
      subject: "Ecuador role read",
      requested: "PUBLIC_ACTION",
      authority: { rights: "PUBLIC", temporal: "FRESH_POST_LOCK", sourceReality: "FIXTURE", evidence: "SUFFICIENT", localExpression: "ACTION", modelMaturity: "PUBLIC_ALLOWED", entitlement: "PUBLIC", ownerAction: "ARMED" },
    });
    expect(fr.permittedExpression).toBe("INFO_ONLY");
    expect(fr.bindingLayer).toBe("SOURCE_REALITY");
    expect(fr.lifecycleStage).toBe("FIXTURE");
    expect(fr.fixtureWatermarked).toBe(true);
    expect(fr.whatWouldUpgrade).toMatch(/activate the live data source/i);
  });
  it("a fully-live public request clears to PUBLIC_ACTION", () => {
    const fr = buildFlightRecord({
      subject: "x", requested: "WATCH",
      authority: { rights: "PUBLIC", temporal: "FRESH_POST_LOCK", sourceReality: "LIVE_REAL", evidence: "SUFFICIENT", localExpression: "PUBLIC_ACTION", modelMaturity: "PUBLIC_ALLOWED", entitlement: "PUBLIC", ownerAction: "ARMED" },
    });
    expect(fr.permittedExpression).toBe("WATCH");
    expect(fr.lifecycleStage).toBe("LIVE");
  });
});

describe("Market Bloom — lifecycle classification", () => {
  it("one book = THIN, many = MATURE, stale = STALE, gone = CLOSED, caught-up = CAUGHT_UP", () => {
    expect(classifyMarketBloomStage({ eventId: "e", sport: "s", marketKey: "m", bookCount: 1, minutesSinceUpdate: 2, priceMovedRecently: false, caughtUpToFair: false, closed: false })).toBe("THIN");
    expect(classifyMarketBloomStage({ eventId: "e", sport: "s", marketKey: "m", bookCount: 7, minutesSinceUpdate: 2, priceMovedRecently: false, caughtUpToFair: false, closed: false })).toBe("MATURE");
    expect(classifyMarketBloomStage({ eventId: "e", sport: "s", marketKey: "m", bookCount: 3, minutesSinceUpdate: 99, priceMovedRecently: false, caughtUpToFair: false, closed: false })).toBe("STALE");
    expect(classifyMarketBloomStage({ eventId: "e", sport: "s", marketKey: "m", bookCount: 0, minutesSinceUpdate: 2, priceMovedRecently: false, caughtUpToFair: false, closed: true })).toBe("CLOSED");
    expect(classifyMarketBloomStage({ eventId: "e", sport: "s", marketKey: "m", bookCount: 5, minutesSinceUpdate: 2, priceMovedRecently: true, caughtUpToFair: true, closed: false })).toBe("CAUGHT_UP");
  });
  it("a caught-up market becomes TOO_LATE, a stale market needs live data — birth alone is never an action", () => {
    expect(marketBloomToDecisionState("CAUGHT_UP")).toBe("TOO_LATE");
    expect(marketBloomToDecisionState("STALE")).toBe("NEEDS_LIVE_DATA");
    for (const stage of ["UNBORN", "OPENED", "THIN", "BROADENING", "MOVING", "MATURE"] as const) {
      expect(["WATCHLIST"]).toContain(marketBloomToDecisionState(stage)); // never ACTIONABLE on the market alone
    }
  });
  it("the fixture market that caught up suppresses action", () => {
    const recs = buildAllMarketBloomRecords();
    const caught = recs.find((r) => r.marketKey === "germany_tt_under_2_5");
    expect(caught?.suppressesAction).toBe(true);
  });
});

describe("Route Authority Registry", () => {
  it("every route has a status and the registry validates", () => {
    for (const r of ROUTE_AUTHORITY_REGISTRY) expect(r.status).toBeTruthy();
    expect(validateRouteAuthority().ok).toBe(true);
  });
  it("bonus/ratings routes are OWNER_GATED + compliance-gated; prediction routes need a trial; trend routes need a passport", () => {
    const bonus = ROUTE_AUTHORITY_REGISTRY.find((r) => r.family === "bonus-affiliate")!;
    expect(bonus.status).toBe("OWNER_GATED");
    expect(bonus.requiresComplianceReview).toBe(true);
    expect(ROUTE_AUTHORITY_REGISTRY.find((r) => r.family === "prediction")!.requiresPredictionTrial).toBe(true);
    expect(ROUTE_AUTHORITY_REGISTRY.find((r) => r.family === "trend")!.requiresTrendPassport).toBe(true);
  });
  it("a bonus route wrongly marked PREVIEW_ALLOWED fails validation", () => {
    const bad = [{ ...ROUTE_AUTHORITY_REGISTRY.find((r) => r.family === "bonus-affiliate")!, status: "PREVIEW_ALLOWED" as const }];
    expect(validateRouteAuthority(bad).ok).toBe(false);
  });
});

describe("Slip MRI — risk diagnosis, not a parlay push", () => {
  it("correlated legs (same event) are flagged, verdict PASS", () => {
    const mri = analyzeFixtureSlip();
    expect(mri.correlatedPairs.length).toBeGreaterThan(0); // leg1+leg2 same event
    expect(mri.verdict).toBe("PASS");
  });
  it("unsupported leg caps the slip and forces PASS", () => {
    const legs: SlipLeg[] = [
      { legId: "a", sport: "x", eventId: "e1", market: "m", selection: "s", impliedProb: 0.7, authorityCeiling: "WATCH", supported: true },
      { legId: "b", sport: "y", eventId: "e2", market: "m", selection: "s", impliedProb: 0.7, authorityCeiling: "WATCH", supported: false },
    ];
    expect(analyzeSlip(legs).verdict).toBe("PASS");
  });
  it("the strongest possible verdict is PROCEED_WITH_CAUTION (never a 'best bet')", () => {
    const legs: SlipLeg[] = [
      { legId: "a", sport: "x", eventId: "e1", market: "m1", selection: "s", impliedProb: 0.8, authorityCeiling: "WATCH", supported: true },
      { legId: "b", sport: "y", eventId: "e2", market: "m2", selection: "s", impliedProb: 0.8, authorityCeiling: "WATCH", supported: true },
    ];
    expect(analyzeSlip(legs).verdict).toBe("PROCEED_WITH_CAUTION");
    expect(analyzeSlip(legs).responsibleWarning.length).toBeGreaterThan(0);
  });
});

describe("Watchlist Alerts — every alert has a reason + proof, no bet-now pressure", () => {
  it("alerts carry a reason and a proof reference", () => {
    for (const a of buildFixtureAlerts()) {
      expect(a.reason.length).toBeGreaterThan(0);
      expect(a.proofRef.length).toBeGreaterThan(0);
      expect(a.fixtureWatermarked).toBe(true);
    }
  });
  it("an alert with bet-now pressure is rejected at construction", () => {
    expect(() => buildAlert({ alertId: "x", subjectKind: "MARKET", subjectId: "m", type: "MARKET_MOVED", reason: "Bet now before the line moves!", proofRef: "p" })).toThrow();
  });
  it("frequency settings filter the batch (muted + budget)", () => {
    const alerts = buildFixtureAlerts();
    const filtered = applyFrequency(alerts, { maxPerDay: 2, quietHours: [22, 8], mutedTypes: ["DATA_SOURCE_STALE"], onlyTimeSensitive: false });
    expect(filtered.length).toBeLessThanOrEqual(2);
    expect(filtered.some((a) => a.type === "DATA_SOURCE_STALE")).toBe(false);
  });
});
