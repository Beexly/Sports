import { describe, expect, it } from "vitest";
import { conformalDecision, shouldRefuse } from "../conformal";
import { computeMarketPhysics, type BookQuote } from "../market-physics";
import { claimIndependence, type IndependenceClaim } from "../claim-independence";
import { classifyRumor, isUsableEvidence } from "../rumor-quarantine";

describe("ConformalDecisionGate", () => {
  it("takes the over side when the interval clears the boundary above", () => {
    const d = conformalDecision({ probability: 0.62, intervalLow: 0.55, intervalHigh: 0.69, calibrationHealth: 0.8 });
    expect(d.abstain).toBe(false);
    expect(d.side).toBe("over");
  });

  it("takes the under side when the interval clears below", () => {
    const d = conformalDecision({ probability: 0.38, intervalLow: 0.31, intervalHigh: 0.45, calibrationHealth: 0.8 });
    expect(d.side).toBe("under");
  });

  it("abstains when the interval straddles the boundary", () => {
    const d = conformalDecision({ probability: 0.52, intervalLow: 0.45, intervalHigh: 0.59, calibrationHealth: 0.8 });
    expect(d.abstain).toBe(true);
    expect(d.side).toBeNull();
    expect(d.margin).toBeLessThan(0);
  });

  it("abstains on low calibration regardless of the interval", () => {
    expect(shouldRefuse({ probability: 0.7, intervalLow: 0.66, intervalHigh: 0.74, calibrationHealth: 0.3 })).toBe(true);
  });

  it("abstains when the interval is too wide", () => {
    expect(shouldRefuse({ probability: 0.7, intervalLow: 0.4, intervalHigh: 0.95, calibrationHealth: 0.9 })).toBe(true);
  });

  it("abstains when calibration health is non-finite (NaN) instead of returning a side", () => {
    const d = conformalDecision({ probability: 0.62, intervalLow: 0.55, intervalHigh: 0.69, calibrationHealth: NaN });
    expect(d.abstain).toBe(true);
    expect(d.side).toBeNull();
  });

  it("abstains when calibration health is Infinity", () => {
    expect(shouldRefuse({ probability: 0.62, intervalLow: 0.55, intervalHigh: 0.69, calibrationHealth: Infinity })).toBe(true);
  });

  it("abstains when interval bounds are non-finite (both Infinity would otherwise clear the boundary)", () => {
    const d = conformalDecision({ probability: 0.9, intervalLow: Infinity, intervalHigh: Infinity, calibrationHealth: 0.9 });
    expect(d.abstain).toBe(true);
    expect(d.side).toBeNull();
  });
});

describe("MarketPhysics", () => {
  const NOW = 1_000_000_000_000;
  const quote = (book: string, value: number, over: Partial<BookQuote> = {}): BookQuote => ({
    book,
    value,
    lastUpdate: NOW - 1000,
    reachable: true,
    ...over,
  });

  it("is maximally toxic / not safe for an empty market", () => {
    const p = computeMarketPhysics({ quotes: [], now: NOW });
    expect(p.toxicity).toBe(1);
    expect(p.safeToActOn).toBe(false);
    expect(p.viscosity).toBe(1);
  });

  it("reads a tight, fresh, reachable market as low-toxicity and safe", () => {
    const p = computeMarketPhysics({ quotes: [quote("a", 2.5), quote("b", 2.5), quote("c", 2.4)], now: NOW });
    expect(p.safeToActOn).toBe(true);
    expect(p.toxicity).toBeLessThan(0.5);
    expect(p.pressure).toBeGreaterThan(0.5); // tight consensus
  });

  it("flags a stale book as viscous and raises toxicity", () => {
    const stale = quote("slow", 2.5, { lastUpdate: NOW - 90 * 60 * 1000 }); // 90m old
    const p = computeMarketPhysics({ quotes: [quote("a", 2.5), stale], now: NOW });
    expect(p.viscosity).toBe(1);
    expect(p.toxicity).toBeGreaterThan(0.4);
  });

  it("raises friction when books are unreachable", () => {
    const p = computeMarketPhysics({ quotes: [quote("a", 2.5, { reachable: false }), quote("b", 2.5, { reachable: false })], now: NOW });
    expect(p.friction).toBe(1);
    expect(p.safeToActOn).toBe(false);
  });

  it("computes gravity toward the sharp anchor", () => {
    const p = computeMarketPhysics({ quotes: [quote("sharp", 2.5), quote("b", 2.5), quote("c", 2.5)], sharpBook: "sharp", now: NOW });
    expect(p.gravity).toBeGreaterThan(0.9); // consensus sits on the anchor
  });
});

describe("ClaimIndependenceIndex", () => {
  const claim = (id: string, source: string, over: Partial<IndependenceClaim> = {}): IndependenceClaim => ({
    id,
    source,
    atMs: 0,
    ...over,
  });

  it("counts genuinely independent sources as fully independent", () => {
    const r = claimIndependence([claim("1", "espn"), claim("2", "athletic"), claim("3", "rotowire")]);
    expect(r.independentSources).toBe(3);
    expect(r.independenceIndex).toBe(1);
  });

  it("collapses claims from the same source (publisher) into one origin", () => {
    // Two reports from a single publisher are not two independent sources — the natural
    // shape where callers pass publisher names as `source` must not inflate the count.
    const r = claimIndependence([claim("1", "espn"), claim("2", "espn")]);
    expect(r.independentSources).toBe(1);
    expect(r.independenceIndex).toBe(0.5);
  });

  it("collapses claims that share an origin", () => {
    const r = claimIndependence([
      claim("1", "espn", { originId: "wire-1" }),
      claim("2", "yahoo", { originId: "wire-1" }),
      claim("3", "cbs", { originId: "wire-1" }),
    ]);
    expect(r.independentSources).toBe(1);
  });

  it("collapses an echo chain (citation) transitively", () => {
    const r = claimIndependence([
      claim("1", "origin"),
      claim("2", "aggregator", { citesSourceIds: ["origin"] }),
      claim("3", "blog", { citesSourceIds: ["aggregator"] }),
    ]);
    expect(r.independentSources).toBe(1);
  });

  it("collapses near-identical text within the echo window", () => {
    const r = claimIndependence([
      claim("1", "a", { text: "Player is OUT for Sunday", atMs: 0 }),
      claim("2", "b", { text: "player is out for sunday", atMs: 5 * 60 * 1000 }),
    ]);
    expect(r.independentSources).toBe(1);
  });
});

describe("RumorQuarantine", () => {
  const base = { sourceTier: "tier1" as const, independentCorroborations: 2, contradicted: false, ageMinutes: 10, ttlMinutes: 120, rightsCleared: true };

  it("clears an official source as known", () => {
    expect(classifyRumor({ ...base, sourceTier: "official" }).status).toBe("known");
    expect(isUsableEvidence({ ...base, sourceTier: "official" })).toBe(true);
  });

  it("clears a corroborated tier-1 source as reported", () => {
    expect(classifyRumor(base).status).toBe("reported");
    expect(classifyRumor(base).quarantined).toBe(false);
  });

  it("quarantines an uncorroborated rumor", () => {
    const v = classifyRumor({ ...base, sourceTier: "rumor", independentCorroborations: 1 });
    expect(v.status).toBe("rumored");
    expect(v.quarantined).toBe(true);
  });

  it("quarantines contradicted, expired, and rights-uncleared claims (precedence)", () => {
    expect(classifyRumor({ ...base, rightsCleared: false }).status).toBe("unsafe");
    expect(classifyRumor({ ...base, contradicted: true }).status).toBe("contradicted");
    expect(classifyRumor({ ...base, ageMinutes: 200 }).status).toBe("expired");
  });

  it("quarantines a tier-1 source without enough corroboration", () => {
    expect(classifyRumor({ ...base, independentCorroborations: 1 }).quarantined).toBe(true);
  });
});
