/**
 * OpenAPI 3.1 contract for the read-only Proof API — /api/proof/openapi.json.
 *
 * Pins the invariants that keep the contract trustworthy and read-only:
 *   - It is OpenAPI 3.1, points at the canonical host, and documents exactly
 *     the three live proof endpoints.
 *   - Every operation is a GET and there is NO security scheme — the record is
 *     public and nothing here can mutate state.
 */

import { describe, expect, it } from "vitest";
import { buildProofOpenApiSpec } from "@/lib/proof/openapi-spec";

const TEST_BASE = "https://www.galaxysportsedge.com";

describe("buildProofOpenApiSpec", () => {
  it("is OpenAPI 3.1 and titled for the Proof API", () => {
    const spec = buildProofOpenApiSpec({ siteUrl: TEST_BASE });
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toMatch(/Proof API/);
    expect(spec.info.version).toBe("1.0.0");
  });

  it("points the single server at the canonical host, trailing slash stripped", () => {
    const spec = buildProofOpenApiSpec({ siteUrl: `${TEST_BASE}/` });
    expect(spec.servers).toHaveLength(1);
    expect(spec.servers[0]!.url).toBe(TEST_BASE);
  });

  it("documents the three live proof endpoints", () => {
    const spec = buildProofOpenApiSpec({ siteUrl: TEST_BASE });
    expect(Object.keys(spec.paths).sort()).toEqual([
      "/api/proof/ledger",
      "/api/proof/receipts",
      "/api/verify",
    ]);
  });

  it("is READ-ONLY: every operation is a GET and there is no security scheme", () => {
    const spec = buildProofOpenApiSpec({ siteUrl: TEST_BASE });
    for (const [, item] of Object.entries(spec.paths)) {
      const methods = Object.keys(item);
      expect(methods).toEqual(["get"]); // no post/put/patch/delete
    }
    // No securitySchemes and no top-level security requirement — public read-only.
    expect("securitySchemes" in spec.components).toBe(false);
    expect("security" in spec).toBe(false);
  });

  it("exposes the receipt schema with the leaf-preimage payload + verified flag", () => {
    const spec = buildProofOpenApiSpec({ siteUrl: TEST_BASE });
    const receipt = spec.components.schemas.Receipt;
    expect(receipt.properties.payload).toBeDefined();
    expect(receipt.properties.verified).toBeDefined();
    expect(receipt.properties.contentHash.pattern).toBe("^[0-9a-f]{64}$");
    expect(receipt.required).toContain("payload");
  });

  it("honours an injected version", () => {
    const spec = buildProofOpenApiSpec({ siteUrl: TEST_BASE, version: "2.3.4" });
    expect(spec.info.version).toBe("2.3.4");
  });

  it("makes no unsupported performance claim in its descriptions", () => {
    const spec = buildProofOpenApiSpec({ siteUrl: TEST_BASE });
    const blob = JSON.stringify(spec).toLowerCase();
    expect(blob).not.toMatch(/\bprofit(able)?\b/);
    expect(blob).not.toMatch(/\bbeats?\s+the\s+market\b/);
    expect(blob).not.toMatch(/\bguaranteed?\b/);
  });
});

describe("GET /api/proof/openapi.json", () => {
  it("serves the spec as JSON with a 200", async () => {
    const { GET } = await import("@/app/api/proof/openapi.json/route");
    const res = GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(body.openapi).toBe("3.1.0");
    expect(Object.keys(body.paths)).toContain("/api/proof/receipts");
  });
});
