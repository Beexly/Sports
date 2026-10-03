import { describe, it, expect } from "vitest";
import { TtlCache, quoteCacheKey } from "../cache/ttl-cache";
import {
  ClosingArchive,
  seedDemoClosingArchive,
} from "../archive/closing-archive";
import {
  computeClvPoints,
  meanClv,
  publishableClvSummary,
} from "../clv/compute";
import {
  GammaCronRunner,
  authorizeCron,
  handleGammaCronRequest,
  DEFAULT_GAMMA_CRON,
} from "../cron/gamma-cron";
import { createPolymarketGammaProvider } from "../providers/polymarket-gamma";
import { createModelPriorProvider } from "../providers/model-prior";
import {
  getIndependentQuotes,
  oddsApiIndependenceReport,
} from "../aggregate";

describe("TTL cache", () => {
  it("hits after set, misses after expiry", async () => {
    const c = new TtlCache<number>(100);
    c.set("a", 1, 50, 1000);
    expect(c.get("a", 1020)).toBe(1);
    expect(c.get("a", 1060)).toBeUndefined();
    const stats = c.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it("getOrSet only factories on miss", async () => {
    const c = new TtlCache<string>(10_000);
    let calls = 0;
    const r1 = await c.getOrSet("k", async () => {
      calls++;
      return "v";
    });
    const r2 = await c.getOrSet("k", async () => {
      calls++;
      return "v2";
    });
    expect(r1.cacheHit).toBe(false);
    expect(r2.cacheHit).toBe(true);
    expect(r2.value).toBe("v");
    expect(calls).toBe(1);
  });

  it("quoteCacheKey is stable", () => {
    expect(
      quoteCacheKey({ providerId: "polymarket.gamma", sport: "NFL" }),
    ).toBe("polymarket.gamma|NFL|*|*");
  });
});

describe("Closing archive + CLV (P3)", () => {
  it("stores quotes and computes CLV", () => {
    const arch = new ClosingArchive(() => new Date("2026-09-10T18:00:00Z"));
    seedDemoClosingArchive(arch, new Date("2026-09-10T18:00:00Z"));
    expect(arch.size()).toBeGreaterThan(4);
    const clv = arch.computeClv("nfl-kc-buf", "KC");
    expect(clv).not.toBeNull();
    expect(clv!.openQ).toBeLessThan(clv!.closeQ);
    expect(clv!.clv).toBeCloseTo(clv!.openQ - clv!.closeQ);
  });

  it("closing provider serves without Odds API", async () => {
    const arch = new ClosingArchive();
    seedDemoClosingArchive(arch);
    const p = arch.asClosingProvider();
    expect(p.requiresApiKey).toBe(false);
    const lines = await p.fetchQuotes({ sport: "NFL" });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.sourceKind === "closing_archive")).toBe(true);
  });

  it("pure CLV math refuse-default", () => {
    const r = computeClvPoints({ openQ: 0.5, closeQ: 0.55, side: "long" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clv).toBeCloseTo(0.05);
      expect(r.interpretation).toBe("beat_close");
    }
    expect(computeClvPoints({ openQ: 1.2, closeQ: 0.5, side: "long" }).ok).toBe(
      false,
    );
    expect(publishableClvSummary([{ clv: 0.01 }], 50).publishable).toBe(false);
    const many = Array.from({ length: 60 }, () => ({ clv: 0.02 }));
    expect(publishableClvSummary(many, 50).publishable).toBe(true);
    const m = meanClv(many);
    expect(m.ok).toBe(true);
    if (m.ok) {
      expect(m.n).toBe(60);
      expect(m.mean).toBeCloseTo(0.02, 10);
    }
  });
});

describe("Gamma cron (P2)", () => {
  it("refuses without CRON_SECRET", async () => {
    expect(
      authorizeCron({ providedSecret: "x", expectedSecret: null }),
    ).toMatchObject({ ok: false, code: "cron_secret_unset" });
    expect(
      authorizeCron({ providedSecret: "bad", expectedSecret: "good" }),
    ).toMatchObject({ ok: false, code: "cron_unauthorized" });
  });

  it("runs with fixtures, caches, archives — no Odds API", async () => {
    const gamma = createPolymarketGammaProvider({
      fixtures: [
        {
          id: "m1",
          question: "KC wins?",
          outcomePrices: "[0.58,0.42]",
          outcomes: '["KC","BUF"]',
          updatedAt: "2026-09-10T12:00:00Z",
        },
      ],
      sport: "NFL",
    });
    const archive = new ClosingArchive();
    const runner = new GammaCronRunner(gamma, archive, {
      ...DEFAULT_GAMMA_CRON,
      sports: ["NFL"],
    });
    const r1 = await runner.run({
      auth: { providedSecret: "sec", expectedSecret: "sec" },
      now: new Date("2026-09-10T12:00:00Z"),
    });
    expect(r1.ok).toBe(true);
    expect(r1.oddsApiRequired).toBe(false);
    expect(r1.linesIngested).toBeGreaterThan(0);
    expect(r1.cacheMisses).toBe(1);
    expect(archive.size()).toBeGreaterThan(0);

    const r2 = await runner.run({
      auth: { providedSecret: "sec", expectedSecret: "sec" },
      now: new Date("2026-09-10T12:01:00Z"),
    });
    expect(r2.cacheHits).toBe(1);
  });

  it("handleGammaCronRequest Bearer parse", async () => {
    const gamma = createPolymarketGammaProvider({
      fixtures: [
        {
          id: "m2",
          outcomePrices: [0.5, 0.5],
          outcomes: ["Yes", "No"],
        },
      ],
    });
    const archive = new ClosingArchive();
    const runner = new GammaCronRunner(gamma, archive, {
      ...DEFAULT_GAMMA_CRON,
      sports: ["MULTI"],
    });
    const r = await handleGammaCronRequest({
      authorizationHeader: "Bearer mysecret",
      cronSecretEnv: "mysecret",
      runner,
    });
    expect(r.ok).toBe(true);
  });
});

describe("Independence with archive in pool", () => {
  it("aggregate prefers PM/archive over books", async () => {
    const arch = new ClosingArchive();
    seedDemoClosingArchive(arch);
    const providers = [
      arch.asClosingProvider(),
      createModelPriorProvider([
        { eventId: "nfl-kc-buf", sport: "NFL", selection: "KC", p: 0.56 },
      ]),
    ];
    const report = oddsApiIndependenceReport(providers as never);
    expect(report.oddsApiRequired).toBe(false);
    expect(report.readyForProdWithoutOddsApi).toBe(true);

    const quotes = await getIndependentQuotes(providers as never, {
      sport: "NFL",
    });
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes.every((q) => q.independence.oddsApiRequired === false)).toBe(
      true,
    );
  });
});

describe("durable archive snapshot", () => {
  it("round-trips toSnapshot/loadSnapshot", () => {
    const a = new ClosingArchive();
    seedDemoClosingArchive(a);
    const snap = a.toSnapshot();
    expect(snap.version).toBe(1);
    expect(snap.rows.length).toBeGreaterThan(0);
    const b = new ClosingArchive();
    const n = b.loadSnapshot(snap, "replace");
    expect(n).toBe(snap.rows.length);
    expect(b.size()).toBe(a.size());
    expect(b.stats().oddsApiRequired).toBe(false);
  });
});
