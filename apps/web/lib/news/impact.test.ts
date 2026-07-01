import { describe, it, expect } from "vitest";
import { readImpact, rankWire, corroborate, rankWireCorroborated, TIER_WEIGHT, type NewsItem } from "./impact";
import { DEMO_WIRE, NATIONAL_INSIDERS, NFL_TEAMS } from "./wire";

const item = (over: Partial<NewsItem> = {}): NewsItem => ({
  id: "x", source: "src", tier: "Insider", team: "ATL", player: "X", headline: "h", signal: "injury-out", minutesAgo: 0, ...over,
});

describe("news impact engine", () => {
  it("injury-out is a strong negative fantasy delta", () => {
    const r = readImpact(item({ signal: "injury-out" }));
    expect(r.fantasyDelta).toBeLessThan(-50);
  });

  it("a higher-tier source produces more reliability and a bigger delta", () => {
    const insider = readImpact(item({ tier: "Insider" }));
    const aggregator = readImpact(item({ tier: "Aggregator" }));
    expect(insider.reliability).toBeGreaterThan(aggregator.reliability);
    expect(Math.abs(insider.fantasyDelta)).toBeGreaterThan(Math.abs(aggregator.fantasyDelta));
  });

  it("urgency decays as the report gets older", () => {
    const fresh = readImpact(item({ minutesAgo: 0 }));
    const stale = readImpact(item({ minutesAgo: 300 }));
    expect(fresh.urgency).toBeGreaterThan(stale.urgency);
    expect(stale.freshness).toBeLessThan(fresh.freshness);
  });

  it("freshness is 1 at t=0 and ~0.5 at one half-life", () => {
    const t0 = readImpact(item({ signal: "injury-out", minutesAgo: 0 }));
    const half = readImpact(item({ signal: "injury-out", minutesAgo: 90 })); // half-life 90
    expect(t0.freshness).toBeCloseTo(1, 5);
    expect(half.freshness).toBeCloseTo(0.5, 2);
  });

  it("a low-reliability source yields a hold/wait action", () => {
    const r = readImpact(item({ tier: "Unconfirmed", signal: "trade" }));
    expect(r.action.toLowerCase()).toContain("hold");
  });

  it("injury-return is positive, role-down is negative", () => {
    expect(readImpact(item({ signal: "injury-return" })).fantasyDelta).toBeGreaterThan(0);
    expect(readImpact(item({ signal: "role-down" })).fantasyDelta).toBeLessThan(0);
  });

  it("rankWire orders by urgency, fresh insider out-news on top", () => {
    const ranked = rankWire(DEMO_WIRE);
    expect(ranked[0]!.urgency).toBeGreaterThanOrEqual(ranked[ranked.length - 1]!.urgency);
    // the fresh insider 'ruled out' should outrank a stale low-tier rumor
    const top = ranked[0]!;
    expect(top.item.tier).toBe("Insider");
  });

  it("tier weights are monotonic Insider > Beat > Verified > Aggregator > Unconfirmed", () => {
    const t = TIER_WEIGHT;
    expect(t.Insider).toBeGreaterThan(t.Beat);
    expect(t.Beat).toBeGreaterThan(t.Verified);
    expect(t.Verified).toBeGreaterThan(t.Aggregator);
    expect(t.Aggregator).toBeGreaterThan(t.Unconfirmed);
  });

  it("registry covers all 32 NFL teams and seeds real insiders", () => {
    expect(new Set(NFL_TEAMS).size).toBe(32);
    expect(NATIONAL_INSIDERS.length).toBeGreaterThanOrEqual(5);
    expect(NATIONAL_INSIDERS.every((i) => i.tier === "Insider")).toBe(true);
  });

  it("the public DEMO_WIRE never attributes a fabricated report to a real journalist", () => {
    // The Beat renders DEMO_WIRE with each item's `source` shown next to a
    // "Confirmed / Reliability %" badge. A fabricated report attributed to a real
    // reporter (Schefter, Pelissero, …) reads as a genuine endorsement — a trust +
    // right-of-publicity risk. Demo sources must be fictional; real insider names
    // stay an internal reliability seed only.
    const realInsiders = new Set(NATIONAL_INSIDERS.map((i) => i.name));
    for (const w of DEMO_WIRE) {
      expect(realInsiders.has(w.source), `demo source "${w.source}" is a real insider`).toBe(false);
    }
  });
});

describe("corroboration", () => {
  it("marks a story confirmed when two distinct sources report the same player+signal", () => {
    const wire: NewsItem[] = [
      item({ id: "a", source: "Schefter", team: "ATL", player: "Vale", signal: "injury-out" }),
      item({ id: "b", source: "Pelissero", team: "ATL", player: "Vale", signal: "injury-out" }),
      item({ id: "c", source: "Schefter", team: "KC", player: "Other", signal: "trade" }),
    ];
    const c = corroborate(wire);
    expect(c.get("a")!.confirmed).toBe(true);
    expect(c.get("a")!.sources).toBe(2);
    expect(c.get("c")!.confirmed).toBe(false);
  });

  it("does not double-count the same source reporting twice", () => {
    const wire: NewsItem[] = [
      item({ id: "a", source: "Schefter", player: "Vale", signal: "injury-out" }),
      item({ id: "b", source: "Schefter", player: "Vale", signal: "injury-out" }),
    ];
    expect(corroborate(wire).get("a")!.confirmed).toBe(false);
  });

  it("a confirmed story gets a reliability lift and higher urgency than the same single-source item", () => {
    const single = rankWireCorroborated([item({ id: "a", source: "Beat guy", tier: "Beat", player: "Vale", signal: "injury-out" })]);
    const doubled = rankWireCorroborated([
      item({ id: "a", source: "Beat guy", tier: "Beat", player: "Vale", signal: "injury-out" }),
      item({ id: "b", source: "Other beat", tier: "Beat", player: "Vale", signal: "injury-out" }),
    ]);
    expect(doubled[0]!.corroboration.confirmed).toBe(true);
    expect(doubled[0]!.reliability).toBeGreaterThan(single[0]!.reliability);
    expect(doubled[0]!.urgency).toBeGreaterThan(single[0]!.urgency);
  });

  it("the live demo wire surfaces the corroborated top story", () => {
    const ranked = rankWireCorroborated(DEMO_WIRE);
    expect(ranked[0]!.corroboration.confirmed).toBe(true); // Vale injury-out, two insiders
    expect(ranked[0]!.corroboration.sources).toBeGreaterThanOrEqual(2);
  });
});
