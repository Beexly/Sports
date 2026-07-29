import { describe, it, expect } from "vitest";
import { handleListMetrics, handleGetMetric } from "../handlers.js";
import { handleGetMetricValue, createMemoryValueProvider } from "../values.js";
import { listMetrics } from "../catalog.js";

/**
 * The rights boundary, proven EXHAUSTIVELY rather than by sample.
 *
 * The existing suite proves one hardcoded dark metric is refused. That is a
 * spot check: it cannot notice a NEW metric whose rights envelope and status
 * disagree, and the catalog is actively growing. These tests are driven from
 * the registry itself, so every metric added from here on is covered the
 * moment it exists — a fence that widens with the catalog instead of decaying
 * against it.
 *
 * The property under test is the compliance teeth: a metric that is DARK
 * (proprietary, unshipped) or BLOCKED (`excluded_sharealike` — excluded rather
 * than taken) must be unreachable through EVERY public path, not merely the
 * one that happens to be tested.
 */

/** Every metric the registry considers restricted, whatever the reason. */
const RESTRICTED = listMetrics({ publicApiOnly: false }).filter((m) => !m.publicApi);
const PUBLIC = listMetrics({ publicApiOnly: true });

describe("the restricted set is non-empty and internally consistent", () => {
  it("there ARE restricted metrics — otherwise every test below is vacuous", () => {
    // Guards against the worst failure mode of a registry-driven suite: if the
    // filter silently returned nothing, all the per-metric loops would pass by
    // doing nothing at all.
    expect(RESTRICTED.length).toBeGreaterThan(0);
    expect(PUBLIC.length).toBeGreaterThan(0);
  });

  it("every DARK or BLOCKED metric is marked non-public — status and rights never disagree", () => {
    for (const m of listMetrics({ publicApiOnly: false })) {
      if (m.status === "DARK" || m.status === "BLOCKED") {
        expect(m.publicApi, `${m.id} is ${m.status} but publicApi=true`).toBe(false);
      }
    }
  });

  it("no share-alike-excluded metric is ever public — the licence is the point", () => {
    for (const m of listMetrics({ publicApiOnly: false })) {
      if (m.rights.rights === "excluded_sharealike" || m.rights.rights === "rights_hold") {
        expect(m.publicApi, `${m.id} carries ${m.rights.rights} but publicApi=true`).toBe(false);
      }
    }
  });

  it("no metric on a dark or internal-only surface is public", () => {
    for (const m of listMetrics({ publicApiOnly: false })) {
      if (m.rights.surface === "dark" || m.rights.surface === "internal_only") {
        expect(m.publicApi, `${m.id} surface=${m.rights.surface} but publicApi=true`).toBe(false);
      }
    }
  });
});

describe("EVERY restricted metric is refused on EVERY public path", () => {
  it("none appear in the default public listing", () => {
    const listed = handleListMetrics({});
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    const listedIds = new Set(listed.data.metrics.map((m) => m.id));
    const leaked = RESTRICTED.filter((m) => listedIds.has(m.id)).map((m) => m.id);
    expect(leaked, `restricted metrics present in public list: ${leaked.join(", ")}`).toEqual([]);
  });

  it("none appear under ANY sport or family filter", () => {
    // A filter must narrow the public set, never re-admit outside it.
    const restrictedIds = new Set(RESTRICTED.map((m) => m.id));
    for (const sport of ["NFL", "NCAAF", "NBA", "NCAAB", "MLB", "NHL", "MULTI", "SOCCER"]) {
      const r = handleListMetrics({ sport });
      if (!r.ok) continue;
      for (const m of r.data.metrics) {
        expect(restrictedIds.has(m.id), `${m.id} leaked via sport=${sport}`).toBe(false);
      }
    }
  });

  it("none can be re-admitted by filtering on their own status", () => {
    // Asking for status=DARK must not hand back the DARK metrics.
    for (const status of ["DARK", "BLOCKED"]) {
      const r = handleListMetrics({ status });
      if (!r.ok) continue;
      expect(
        r.data.metrics.map((m) => m.id),
        `status=${status} returned restricted metrics on the public path`,
      ).toEqual([]);
    }
  });

  it("every one of them returns 403 on single-get", () => {
    for (const m of RESTRICTED) {
      const r = handleGetMetric(m.id);
      expect(r.ok, `${m.id} was served by handleGetMetric`).toBe(false);
      if (!r.ok) expect(r.status, `${m.id} refused with ${r.status}, expected 403`).toBe(403);
    }
  });

  it("every one of them is refused a VALUE even when the provider holds the data", async () => {
    // The adversarial case, and the one that matters: rights refuse, not
    // absence of data. A provider seeded with a real value for every
    // restricted metric must still get 403 — the refusal is about permission,
    // never about whether the number happens to exist.
    const seeded: Record<string, number> = {};
    for (const m of RESTRICTED) seeded[`${m.id}|entity_1`] = 0.5;
    const provider = createMemoryValueProvider(seeded);

    for (const m of RESTRICTED) {
      const r = await handleGetMetricValue(
        { metricId: m.id, entityId: "entity_1", asOf: "2025-11-01T18:00:00.000Z" },
        provider,
      );
      expect(r.ok, `${m.id} served a VALUE despite being ${m.status}`).toBe(false);
      if (!r.ok) expect(r.status, `${m.id} value refused with ${r.status}`).toBe(403);
    }
  });
});

describe("the public set stays genuinely public", () => {
  it("every listed metric is publicApi — the listing never over-refuses either", () => {
    const listed = handleListMetrics({});
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    for (const m of listed.data.metrics) {
      expect(m.publicApi, `${m.id} listed publicly but publicApi=false`).toBe(true);
    }
  });

  it("a public metric is actually retrievable — the fence is not a wall", () => {
    const sample = PUBLIC[0];
    expect(sample).toBeDefined();
    const r = handleGetMetric(sample!.id);
    expect(r.ok, `public metric ${sample!.id} was refused`).toBe(true);
  });
});
