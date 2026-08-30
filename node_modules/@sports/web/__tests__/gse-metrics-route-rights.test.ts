import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../app/api/gse/v1/metrics/route";
import { listMetrics } from "@sports/stats-api/src/catalog.js";

/**
 * Regression for a real exposure on the public Stats API.
 *
 * `/api/gse/v1/metrics` used to forward `?publicOnly=false` straight into
 * `handleListMetrics`, which returns the WHOLE registry. On an unauthenticated
 * route that enumerated every restricted metric definition — the DARK
 * proprietary set and the BLOCKED `excluded_sharealike` entry — while
 * `/metrics/:id` returned 403 for those same ids. The single-get path refused
 * what the list path served in bulk.
 *
 * These tests drive off the live registry, so they keep covering restricted
 * metrics added after this was written.
 */

const RESTRICTED_IDS = new Set(
  listMetrics({ publicApiOnly: false })
    .filter((m) => !m.publicApi)
    .map((m) => m.id),
);

interface MetricsPage {
  readonly metrics: { id: string; publicApi: boolean }[];
  readonly page: { limit: number; offset: number; total: number; returned: number };
}

async function getMetrics(query: string): Promise<{ status: number; body: MetricsPage }> {
  const res = await GET(new NextRequest(`https://x.test/api/gse/v1/metrics${query}`));
  return { status: res.status, body: (await res.json()) as MetricsPage };
}

describe("GET /api/gse/v1/metrics — the rights boundary holds at the HTTP edge", () => {
  it("the fixture is meaningful: the registry HAS restricted metrics", () => {
    expect(RESTRICTED_IDS.size).toBeGreaterThan(0);
  });

  it("?publicOnly=false does NOT expose restricted definitions", async () => {
    // The exact request that used to work.
    const { status, body } = await getMetrics("?publicOnly=false&limit=500");
    expect(status).toBe(200);
    const leaked = body.metrics
      .map((m) => m.id)
      .filter((id) => RESTRICTED_IDS.has(id));
    expect(leaked, `restricted metrics served publicly: ${leaked.join(", ")}`).toEqual([]);
  });

  it("returns the same total with or without the parameter — it is simply ignored", async () => {
    const withParam = await getMetrics("?publicOnly=false");
    const without = await getMetrics("");
    expect(withParam.body.page.total).toBe(without.body.page.total);
  });

  it("every metric on the default page is publicApi", async () => {
    const { body } = await getMetrics("?limit=500");
    for (const m of body.metrics) {
      expect(m.publicApi, `${m.id} served but publicApi=false`).toBe(true);
    }
  });

  it("paging deep into the list never reaches restricted metrics", async () => {
    // Pagination is the other way a bulk endpoint leaks: the tail is easy to
    // forget when only the first page is eyeballed.
    const { body: first } = await getMetrics("?limit=1");
    const total = first.page.total;
    const { body: tail } = await getMetrics(`?limit=500&offset=${Math.max(0, total - 500)}`);
    const leaked = tail.metrics
      .map((m) => m.id)
      .filter((id) => RESTRICTED_IDS.has(id));
    expect(leaked, `restricted metrics on the last page: ${leaked.join(", ")}`).toEqual([]);
  });

  it("still serves a healthy public catalog — the fix did not empty the endpoint", async () => {
    const { body } = await getMetrics("");
    expect(body.page.total).toBeGreaterThan(100);
    expect(body.metrics.length).toBeGreaterThan(0);
  });

  /**
   * Second exposure on the same surface, found 2026-08-16.
   *
   * `publicOnly` was pinned true above, but `tier` was still read straight from
   * `?tier=` — so an anonymous caller could self-declare ELITE. The anti-spoof
   * resolver (`lib/gse-stats/session-tier.ts`, the GSE-SEC-018 fix) already
   * existed and was already used by the sibling `values/[metricId]` route; these
   * two routes simply never adopted it.
   *
   * The assertion is equality, not a blocklist: an anonymous ?tier=ELITE request
   * must be identical to an anonymous request with no tier at all. That holds no
   * matter which metrics get added to the registry later.
   */
  it("an anonymous ?tier=ELITE cannot elevate — identical to no tier at all", async () => {
    const spoofed = await getMetrics("?tier=ELITE&limit=500");
    const plain = await getMetrics("?limit=500");

    expect(spoofed.status).toBe(plain.status);
    expect(spoofed.body.page.total).toBe(plain.body.page.total);
    expect(spoofed.body.metrics.map((m) => m.id)).toEqual(
      plain.body.metrics.map((m) => m.id),
    );
  });

  it("no ?tier= value of any kind leaks a restricted metric", async () => {
    for (const tier of ["ELITE", "PRO", "FANTASY", "elite", "ADMIN", "../ELITE"]) {
      const { body } = await getMetrics(`?tier=${encodeURIComponent(tier)}&limit=500`);
      const leaked = body.metrics.map((m) => m.id).filter((id) => RESTRICTED_IDS.has(id));
      expect(leaked, `?tier=${tier} leaked: ${leaked.join(", ")}`).toEqual([]);
    }
  });
});
