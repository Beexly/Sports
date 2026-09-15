import { describe, it, expect } from "vitest";
import { readImpact, rankWire, corroborate, rankWireCorroborated, TIER_WEIGHT, signalLabel, type NewsItem } from "./impact";
import { NATIONAL_INSIDERS, NFL_TEAMS } from "./wire";

const item = (over: Partial<NewsItem> = {}): NewsItem => ({
  id: "x", source: "src", tier: "Insider", team: "ATL", player: "X", headline: "h", signal: "injury-out", minutesAgo: 0, ...over,
});

/** C-416: local fixtures replace the deleted DEMO_WIRE. Fictional names only. */
const FIXTURE_WIRE: NewsItem[] = [
  { id: "n1", source: "Dana Frost", tier: "Insider", team: "ATL", player: "Marcus Vale", headline: "Vale (ankle) ruled OUT for Sunday after no practice all week", signal: "injury-out", minutesAgo: 12 },
  { id: "n1b", source: "Marcus Kline", tier: "Insider", team: "ATL", player: "Marcus Vale", headline: "Confirmed: Vale will not play; the team is elevating depth at the position", signal: "injury-out", minutesAgo: 6 },
  { id: "n2", source: "PHI beat", tier: "Beat", team: "PHI", player: "Tariq Bell", headline: "Bell taking clear lead-back reps with the starter limited", signal: "role-up", minutesAgo: 40 },
  { id: "n9", source: "single source", tier: "Unconfirmed", team: "SEA", player: "Tobias Frey", headline: "Whisper of a possible trade. No corroboration", signal: "trade", minutesAgo: 8 },
];

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

  it("coach-report fires as a moderate positive with a distinct label", () => {
    const r = readImpact(item({ signal: "coach-report" }));
    expect(r.fantasyDelta).toBeGreaterThan(0);
    expect(r.fantasyDelta).toBeLessThan(60); // below injury-return's 64 — coach news is context, not a rule change
    expect(signalLabel("coach-report")).toBe("Coach report");
  });

  it("a low-reliability coach-report still yields a measured read, not a hold", () => {
    const r = readImpact(item({ tier: "Beat", signal: "coach-report" }));
    expect(r.reliability).toBe(TIER_WEIGHT.Beat);
    expect(r.fantasyDelta).toBeGreaterThan(0);
    expect(r.action.toLowerCase()).toContain("coach");
  });

  it("rankWire orders by urgency, fresh insider out-news on top", () => {
    const ranked = rankWire(FIXTURE_WIRE);
    expect(ranked[0]!.urgency).toBeGreaterThanOrEqual(ranked[ranked.length - 1]!.urgency);
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

  it("a two-source fixture wire surfaces the corroborated top story", () => {
    const ranked = rankWireCorroborated(FIXTURE_WIRE);
    expect(ranked[0]!.corroboration.confirmed).toBe(true);
    expect(ranked[0]!.corroboration.sources).toBeGreaterThanOrEqual(2);
  });
});
