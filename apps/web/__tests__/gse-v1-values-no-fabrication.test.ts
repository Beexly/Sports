import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { handleGetMetricValue } from "@sports/stats-api/src/values.js";
import { getMetricById, listMetrics } from "@sports/stats-api/src/catalog.js";
import { wiredValueProvider } from "../lib/gse-stats/value-provider";
import { POST as ownValuesPost } from "../app/api/gse/v1/own/values/route";

/**
 * Two paid GSE v1 surfaces used to answer with invented numbers.
 *
 * 1. `/api/gse/v1/values/:metricId` routed every unwired ACTIVE public metric
 *    to a `demo` provider that derived a number from a character-code hash of
 *    `"<metricId>:<entityId>"`, then returned it 200 inside
 *    `provenance: { sourceIds: [...], rights, pitCorrect: true }` — a
 *    machine-readable claim that the number came from those sources.
 *
 * 2. `POST /api/gse/v1/own/values` seeded its store with own.model.p 0.58 /
 *    own.model.p_lo 0.54 / own.quote.q 0.51 for nfl:kc and nfl:phi at
 *    asOf = now - 2h, stamped ownership "first_party" / sourceId "gse.own" /
 *    pitCorrect true, on a route with no entitlement check.
 *
 * Both honest refusals were already written and merely unreachable. These
 * tests pin the refusal, and pin that a real value (including the falsy ones)
 * still passes through — the fix must remove the fabrication, not the API.
 */

const ASOF = "2026-09-01T18:00:00.000Z";

describe("metric values: absent means refuse, never fill in", () => {
  it("refuses 404 when the provider holds nothing, and emits no provenance", async () => {
    const r = await handleGetMetricValue(
      { metricId: "gse.edge_index", entityId: "game_1", asOf: ASOF, tier: "PRO" },
      () => null,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(404);
      expect(r.code).toBe("no_value");
    }
    // The whole point: nothing in the answer asserts a lineage.
    expect(JSON.stringify(r)).not.toContain("pitCorrect");
    expect(JSON.stringify(r)).not.toContain("sourceIds");
  });

  it("refuses when the provider returns undefined rather than null", async () => {
    const r = await handleGetMetricValue(
      { metricId: "gse.edge_index", entityId: "game_1", asOf: ASOF, tier: "PRO" },
      () => undefined as unknown as null,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });

  it("still serves values that are falsy but REAL — 0, false, empty string", async () => {
    for (const real of [0, false, ""] as const) {
      const r = await handleGetMetricValue(
        { metricId: "gse.edge_index", entityId: "game_1", asOf: ASOF, tier: "PRO" },
        () => real,
      );
      expect(r.ok, `provider returned ${JSON.stringify(real)} and was treated as absent`).toBe(
        true,
      );
      if (r.ok) expect(r.data.value).toBe(real);
    }
  });
});

describe("the production provider has no fallback fabricator", () => {
  // Driven off the live registry rather than a hardcoded list, so a metric
  // added later without a loader is covered the moment it exists.
  const WIRED_PREFIXES = ["nfl.", "ctx.weather."];
  const UNWIRED = listMetrics({ publicApiOnly: true }).filter(
    (m) => m.status === "ACTIVE" && !WIRED_PREFIXES.some((p) => m.id.startsWith(p)),
  );

  it("there ARE unwired public metrics — otherwise the loop below is vacuous", () => {
    expect(UNWIRED.length).toBeGreaterThan(0);
  });

  it("every unwired metric resolves to null, for any entity id", async () => {
    for (const m of UNWIRED.slice(0, 120)) {
      for (const entityId of ["game_1", "demo_game", "nfl:kc"]) {
        const v = await wiredValueProvider(m, entityId, ASOF);
        expect(v, `${m.id} / ${entityId} produced a value with no loader wired`).toBeNull();
      }
    }
  });

  it("the same metric+entity does not become answerable through the handler", async () => {
    const m = getMetricById("gse.edge_index")!;
    const r = await handleGetMetricValue(
      { metricId: m.id, entityId: "demo_game", asOf: ASOF, tier: "PRO" },
      wiredValueProvider,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe("POST /api/gse/v1/own/values serves no seeded first-party values", () => {
  async function post(body: unknown) {
    const req = new NextRequest("https://www.galaxysportsedge.com/api/gse/v1/own/values", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const res = await ownValuesPost(req);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }

  it("refuses the exact rows the demo seed used to serve", async () => {
    const asOf = new Date(Date.now() - 3600_000).toISOString();
    for (const metricId of ["own.model.p", "own.model.p_lo", "own.quote.q"]) {
      for (const entityId of ["nfl:kc", "nfl:phi"]) {
        const r = await post({ metricId, entityId, asOf });
        expect(r.status, `${metricId} / ${entityId} was served`).toBe(404);
        expect(r.body.value, `${metricId} / ${entityId} carried a value`).toBeUndefined();
        expect(r.body.ownership).toBeUndefined();
      }
    }
  });
});
