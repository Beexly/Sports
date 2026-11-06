import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AdapterError, runAdapter } from "../adapter.js";
import { stableHash } from "../types.js";
import {
  entryPriceByFamily,
  fantasylabsProductsAdapter,
  parseProducts,
} from "../adapters/fantasylabs-products.js";

const FIXTURE = readFileSync(
  join(__dirname, "..", "adapters", "__fixtures__", "fantasylabs-products.sample.json"),
  "utf8",
);

function artifact(body = FIXTURE) {
  return {
    url: "https://www.fantasylabs.com/api/subscription/products/",
    retrievedAt: "2026-11-06T10:42:00.000Z",
    tier: 3 as const,
    body,
    httpStatus: 200,
    contentHash: stableHash(body),
  };
}

describe("fantasylabs products adapter", () => {
  it("normalizes the keyed payload to rows in id order", async () => {
    const run = await runAdapter(fantasylabsProductsAdapter, artifact());
    expect(run.rows.length).toBe(14);
    expect(new Set(run.rows.map((r) => r.productId)).size).toBe(14);
  });

  it("identifies comped SKUs: free, no initial charge, no trial", async () => {
    const run = await runAdapter(fantasylabsProductsAdapter, artifact());
    const comped = run.rows.filter((r) => r.isComped);
    expect(comped.length).toBeGreaterThan(0);
    for (const row of comped) {
      expect(row.priceCents).toBe(0);
      expect(row.initialChargeCents).toBe(0);
      expect(row.trialInterval).toBe(0);
    }
  });

  it("separates a trial from a free tier", async () => {
    const run = await runAdapter(fantasylabsProductsAdapter, artifact());
    const trials = run.rows.filter((r) => r.isTrial);
    for (const row of trials) expect(row.trialInterval).toBeGreaterThan(0);
    for (const row of run.rows.filter((r) => r.isComped)) expect(row.isTrial).toBe(false);
  });

  it("derives the cheapest paid entry per family and skips comped and archived", async () => {
    const run = await runAdapter(fantasylabsProductsAdapter, artifact());
    const entry = entryPriceByFamily(run.rows);
    expect(entry.size).toBeGreaterThan(0);
    for (const [family, cents] of entry) {
      const candidates = run.rows.filter((r) => r.familyHandle === family && !r.archived && r.priceCents > 0);
      expect(cents).toBe(Math.min(...candidates.map((r) => r.priceCents)));
      for (const row of run.rows.filter((r) => r.familyHandle === family && r.isComped)) {
        expect(row.priceCents).toBeLessThan(cents + 1);
      }
    }
  });

  it("keeps cents, never floats", async () => {
    const run = await runAdapter(fantasylabsProductsAdapter, artifact());
    for (const row of run.rows) expect(Number.isInteger(row.priceCents)).toBe(true);
  });

  it("rejects an array payload and an empty object", () => {
    expect(() => parseProducts("[]")).toThrow(/not a JSON object/);
    expect(() => parseProducts("{}")).toThrow(/empty/);
  });

  it("fails the batch when one row loses its price", async () => {
    const parsed = JSON.parse(FIXTURE) as Record<string, Record<string, unknown>>;
    delete Object.values(parsed)[0]!.PriceInCents;
    await expect(runAdapter(fantasylabsProductsAdapter, artifact(JSON.stringify(parsed)))).rejects.toBeInstanceOf(
      AdapterError,
    );
  });

  it("stamps provenance with the price-sheet asset type", async () => {
    const run = await runAdapter(fantasylabsProductsAdapter, artifact());
    expect(run.assetType).toBe("price_sheet");
    expect(run.provenance.harvest_tier).toBe(3);
    expect(run.provenance.commercial_ok).toBe(false);
    expect(run.provenance.content_hash).toBe(stableHash(FIXTURE));
  });
});
