/**
 * GALILEO WEEK — acceptance.
 *
 * The week builds all eight atlases over fixtures; the dry-run prices the budget and spends nothing; a
 * LIVE run fails closed. Everything here is deterministic and key-free.
 */

import { describe, it, expect } from "vitest";
import {
  planGalileoWeek,
  runGalileoWeek,
  GALILEO_WEEK_FIXTURE,
  GALILEO_WEEK_CANDIDATES,
} from "../index.js";

describe("Galileo Week — the dry-run prices the budget and spends nothing", () => {
  const plan = planGalileoWeek(GALILEO_WEEK_CANDIDATES, 300);

  it("spends nothing and prices the stack", () => {
    expect(plan.spendsNothing).toBe(true);
    expect(plan.note).toMatch(/no call is made|purchased/i);
  });

  it("takes free sources first, fits paid within budget, and refuses forbidden ones", () => {
    const selected = new Set(plan.budget.selected.map((s) => s.sourceId));
    expect(selected.has("nflverse")).toBe(true); // free
    expect(selected.has("sleeper")).toBe(true); // free
    expect(selected.has("the_odds_api")).toBe(true); // paid, fits
    const deferred = new Set(plan.budget.deferred.map((d) => d.sourceId));
    expect(deferred.has("fantasydata")).toBe(true); // over budget at $300
    expect(deferred.has("draftkings_unofficial")).toBe(true); // DO_NOT_USE, never purchasable
    expect(plan.budget.totalCost).toBeLessThanOrEqual(300);
  });
});

describe("Galileo Week — PREVIEW builds all eight atlases", () => {
  const atlas = runGalileoWeek({ mode: "PREVIEW_FIXTURES", week: GALILEO_WEEK_FIXTURE });

  it("is a fixture preview with the public moment", () => {
    expect(atlas.mode).toBe("PREVIEW_FIXTURES");
    expect(atlas.publicMoment).toMatch(/^GSE checked/);
  });

  it("source race + market + fantasy absorption", () => {
    expect(atlas.sourceRace.races.length).toBeGreaterThan(0);
    expect(atlas.marketAbsorption.observerCount).toBeGreaterThan(0);
    expect(typeof atlas.fantasyAbsorption.avgAbsorptionGap).toBe("number");
  });

  it("decision card atlas counts what a user would have seen", () => {
    expect(atlas.decisionCard.emitted).toBeGreaterThanOrEqual(1);
  });

  it("scar atlas: a trap is filed, a sound loss is not overreacted to", () => {
    expect(atlas.scar.trapsAvoided.some((t) => t.verdict === "process_error")).toBe(true);
    expect(atlas.scar.processHeld.some((p) => p.verdict === "unlucky_loss")).toBe(true);
  });

  it("intelligence delta is an honest FIXTURE TREND (nothing validated); missed/over observation guide acquisition", () => {
    // On fixtures the Conscience must NOT claim validated improvement — only an upward trend.
    expect(atlas.intelligenceDelta.dataMode).toBe("FIXTURE");
    expect(atlas.intelligenceDelta.validated).toBe(false);
    expect(atlas.intelligenceDelta.improvingCount).toBe(0);
    expect(atlas.intelligenceDelta.upwardTrendCount).toBeGreaterThanOrEqual(1);
    expect(atlas.intelligenceDelta.note).toMatch(/FIXTURE TREND|UNVALIDATED/);
    expect(atlas.missedObservation.toBuy.length).toBeGreaterThan(0);
    expect(atlas.overObservation.toStopBuying.length).toBeGreaterThan(0);
  });
});

describe("Galileo Week — LIVE fails closed", () => {
  it("refuses a live run (no keys, no network in this package)", () => {
    expect(() => runGalileoWeek({ mode: "LIVE", week: GALILEO_WEEK_FIXTURE })).toThrow(/LIVE is refused|no keys/i);
  });
});
