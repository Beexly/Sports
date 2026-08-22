import { describe, expect, it } from "vitest";
import {
  confidenceFromPOver,
  pricePropAgainstMarket,
  PROPS_HB_SOURCE,
} from "../props-priced-edge.js";
import { fitGroupPrior, posteriorRate, probOver } from "../props-hb.js";
import { americanToImpliedProbability, removeVig } from "../../scoring.js";
import { shinDevig } from "../../shin-devig.js";

describe("pricePropAgainstMarket", () => {
  it("refuses to rank on confidence when the book quote is missing", () => {
    const r = pricePropAgainstMarket(0.9, null);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected unpriced");
    expect(r.edgeOver).toBeNull();
    expect(r.reason).toMatch(/no two-way book quote/i);
    expect(r.priced).toBe(false);
  });

  it("a 90% model favorite already priced at ~90% has ~0 edge (chalk trap)", () => {
    // Over -900 / Under +700 → raw ~0.90 / ~0.125, vig-stripped over ≈ 0.878
    const r = pricePropAgainstMarket(0.9, { overAmerican: -900, underAmerican: 700 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected priced");
    expect(r.source).toBe(PROPS_HB_SOURCE);
    expect(Math.abs(r.edgeOver)).toBeLessThan(0.04);
    expect(confidenceFromPOver(0.9)).toBeGreaterThan(0.79);
    expect(Math.abs(r.edgeOver)).toBeLessThan(confidenceFromPOver(0.9) / 10);
  });

  it("prices e = p − q against an even two-way book", () => {
    const r = pricePropAgainstMarket(0.58, { overAmerican: -110, underAmerican: -110 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected priced");
    expect(r.qOver).toBeCloseTo(0.5, 8);
    expect(r.edgeOver).toBeCloseTo(0.08, 8);
    expect(r.overround).toBeGreaterThan(1);
    expect(r.qMethod).toBe("shin");
    expect(r.priced).toBe(false);
  });

  it("uses Shin q, not proportional split, on a favourite–longshot two-way", () => {
    const quote = { overAmerican: -250, underAmerican: 180 };
    const overRaw = americanToImpliedProbability(quote.overAmerican);
    const underRaw = americanToImpliedProbability(quote.underAmerican);
    const proportional = removeVig(overRaw, underRaw).home;
    const shinQ = shinDevig([overRaw, underRaw]).probabilities[0];
    expect(Math.abs(shinQ - proportional)).toBeGreaterThan(1e-4);

    const r = pricePropAgainstMarket(0.7, quote);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected priced");
    expect(r.qMethod).toBe("shin");
    expect(r.qOver).toBeCloseTo(shinQ, 8);
    expect(r.qOver).not.toBeCloseTo(proportional, 4);
  });

  it("fail-closes a one-sided quote instead of inventing q", () => {
    const r = pricePropAgainstMarket(0.62, {
      overAmerican: -120,
      underAmerican: Number.NaN,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected unpriced");
    expect(r.reason).toMatch(/Over or Under/i);
  });

  it("fail-closes a crossed/sub-vig book (overround < 1)", () => {
    const r = pricePropAgainstMarket(0.55, { overAmerican: 150, underAmerican: 150 });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected unpriced");
    expect(r.reason).toMatch(/overround/i);
  });

  it("wires the HB posterior-predictive into e = p − q", () => {
    const prior = fitGroupPrior([
      { games: 16, total: 80 },
      { games: 16, total: 96 },
      { games: 16, total: 64 },
    ]);
    expect(prior).not.toBeNull();
    const post = posteriorRate(prior!, 90, 16);
    const p = probOver(post, 5.5);
    const r = pricePropAgainstMarket(p, { overAmerican: -110, underAmerican: -110 });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected priced");
    expect(r.pOver).toBe(p);
    expect(r.edgeOver).toBeCloseTo(p - 0.5, 8);
  });
});

describe("confidenceFromPOver", () => {
  it("is the |2p−1| quantity that must never be used as edge", () => {
    expect(confidenceFromPOver(0.5)).toBeCloseTo(0, 8);
    expect(confidenceFromPOver(0.9)).toBeCloseTo(0.8, 8);
    expect(confidenceFromPOver(1.4)).toBe(0);
  });
});
