import { describe, expect, it } from "vitest";
import {
  createDemoOwnStore,
  handleOwnCatalog,
  handleOwnProvenance,
  handleOwnSnapshot,
  handleOwnValues,
  ownCatalogStats,
  computeDominanceScore,
  designSpaceReport,
  OWN_METRICS,
} from "../own/index.js";

describe("own feed catalog + dominance", () => {
  it("registers first-party metrics with odds vendor never required", () => {
    const s = ownCatalogStats();
    expect(s.total).toBe(OWN_METRICS.length);
    expect(s.total).toBeGreaterThanOrEqual(20);
    expect(s.firstParty).toBeGreaterThan(0);
    expect(s.publicEligible).toBeGreaterThan(0);
    const d = computeDominanceScore();
    expect(d.oddsVendorRequired).toBe(false);
    expect(d.selfReliance).toBeGreaterThanOrEqual(70);
  });

  it("design space is theoretical density not accuracy claims", () => {
    const r = designSpaceReport();
    expect(r.theoreticalOwnedRolling).toBeGreaterThan(r.registeredNow);
    expect(r.note).toMatch(/not a claim/i);
  });

  it("snapshot handler returns law strip", () => {
    const r = handleOwnSnapshot();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.dominance.oddsVendorRequired).toBe(false);
    expect(r.data.law.some((l) => l.includes("LIVE_BOARD"))).toBe(true);
    expect(r.data.claim).toMatch(/Odds vendors optional/i);
  });

  it("catalog filters publicOnly", () => {
    const all = handleOwnCatalog({ publicOnly: false });
    const pub = handleOwnCatalog({ publicOnly: true });
    expect(all.ok && pub.ok).toBe(true);
    if (!all.ok || !pub.ok) return;
    expect(pub.data.metrics.length).toBeLessThanOrEqual(all.data.metrics.length);
    expect(pub.data.metrics.every((m) => m.publicApiEligible)).toBe(true);
  });

  it("provenance 404s unknown", () => {
    const miss = handleOwnProvenance("nope.metric");
    expect(miss.ok).toBe(false);
    const hit = handleOwnProvenance("own.model.p");
    expect(hit.ok).toBe(true);
  });

  it("values require asOf and refuse future leak", () => {
    const store = createDemoOwnStore(new Date("2026-07-29T12:00:00.000Z"));
    const asOf = "2026-07-29T10:00:00.000Z";
    const ok = handleOwnValues(
      store,
      { metricId: "own.model.p", entityId: "nfl:kc", asOf },
      new Date("2026-07-29T12:00:00.000Z"),
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.value).toBe(0.58);

    const future = handleOwnValues(
      store,
      {
        metricId: "own.model.p",
        entityId: "nfl:kc",
        asOf: "2099-01-01T00:00:00.000Z",
      },
      new Date("2026-07-29T12:00:00.000Z"),
    );
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.code).toBe("future_leak");
  });
});
