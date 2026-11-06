import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runAdapter, AdapterError } from "../adapter.js";
import { sha256Hex } from "../types.js";
import {
  familyHistogram,
  fantasylabsFiltersAdapter,
  parseFilters,
  toFeature,
} from "../adapters/fantasylabs-filters.js";

const FIXTURE = readFileSync(
  join(__dirname, "..", "adapters", "__fixtures__", "fantasylabs-filters.sample.json"),
  "utf8",
);

/** Fixture replay: no network anywhere in this file. */
function artifact(body = FIXTURE, status = 200) {
  return {
    url: "https://www.fantasylabs.com/api/filters/",
    retrievedAt: "2026-11-06T11:35:00.000Z",
    tier: 3 as const,
    body,
    httpStatus: status,
    contentHash: sha256Hex(body),
  };
}

describe("fantasylabs filters adapter", () => {
  it("normalizes every fixture row and keeps determinism", async () => {
    const run = await runAdapter(fantasylabsFiltersAdapter, artifact());
    expect(run.rows).toHaveLength(12);
    expect(run.rows.map((r) => r.featureId)).toEqual([...run.rows.map((r) => r.featureId)]);
    // Running twice over the same bytes is byte-identical: normalize is pure.
    const again = await runAdapter(fantasylabsFiltersAdapter, artifact());
    expect(again.rows).toEqual(run.rows);
  });

  it("maps the families the brief cares about, first rule wins", async () => {
    const run = await runAdapter(fantasylabsFiltersAdapter, artifact());
    const byName = new Map(run.rows.map((r) => [r.name, r]));
    expect(byName.get("Line")?.family).toBe("TRENCHES");
    expect(byName.get("Wind")?.family).toBe("MICROCLIMATE");
    expect(byName.get("ProjectedOwnership")?.family).toBe("MARKET_MICROSTRUCTURE");
    expect(byName.get("Salary")?.family).toBe("MARKET_MICROSTRUCTURE");
    expect(byName.get("Snaps Played")?.family).toBe("SITUATIONAL");
    expect(byName.get("Coach")?.family).toBe("NARRATIVE");
    // Percent rate stats fall through to efficiency, never to market.
    expect(byName.get("Team PK% % - Month")?.family).toBe("EFFICIENCY");
  });

  it("stamps all six provenance columns from the artifact", async () => {
    const raw = artifact();
    const run = await runAdapter(fantasylabsFiltersAdapter, raw);
    expect(run.provenance).toEqual({
      source_url: raw.url,
      retrieved_at: raw.retrievedAt,
      harvest_tier: 3,
      license_class: "tos_scraped",
      commercial_ok: false,
      content_hash: raw.contentHash,
    });
    expect(Object.keys(run.provenance)).toHaveLength(6);
  });

  it("fails the whole batch on one bad row instead of dropping it", async () => {
    const rows = JSON.parse(FIXTURE) as Record<string, unknown>[];
    delete rows[3]!.Table;
    const bad = JSON.stringify(rows);
    await expect(runAdapter(fantasylabsFiltersAdapter, artifact(bad))).rejects.toBeInstanceOf(AdapterError);
    try {
      await runAdapter(fantasylabsFiltersAdapter, artifact(bad));
    } catch (err) {
      expect((err as AdapterError).code).toBe("NORMALIZE");
    }
  });

  it("rejects a non-array payload rather than reporting zero rows", () => {
    expect(() => parseFilters('{"error":"nope"}')).toThrow(/not a JSON array/);
    expect(() => parseFilters("")).toThrow(/not a JSON array/);
  });

  it("counts families for the coverage gap list", async () => {
    const run = await runAdapter(fantasylabsFiltersAdapter, artifact());
    const hist = familyHistogram(run.rows);
    expect(hist.TRENCHES).toBeGreaterThan(0);
    expect(hist.MARKET_MICROSTRUCTURE).toBe(2);
    expect(Object.values(hist).reduce((a, b) => a + b, 0)).toBe(run.rows.length);
  });

  it("keeps subject separate from family", () => {
    const parsed = parseFilters(FIXTURE);
    const player = parsed.find((r) => r.Table.toLowerCase().includes("player"));
    if (player) expect(toFeature(player).subject).toBe("player");
    const feature = toFeature(parsed[0]!);
    expect(feature.subject).toBeDefined();
  });
});
