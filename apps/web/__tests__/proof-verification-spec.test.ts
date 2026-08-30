/**
 * Trustless verification spec — /api/proof/verification-spec.json.
 *
 * The point of this surface is that a third party can reproduce our hashes
 * without trusting our code. So the tests act as that third party: they
 * recompute the canonical payload and the leaf hash from scratch (a fresh
 * node:crypto SHA-256 + the DOCUMENTED recipe, not the production helper) and
 * confirm they match the published vectors. If the commitment recipe ever
 * changes, this fails loudly — exactly what a conformance suite must do.
 */

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildVerificationSpec } from "@/lib/proof/verification-spec";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** The documented canonical serialization, re-implemented independently. */
function canonicalFromScratch(fields: Readonly<Record<string, string | number>>): string {
  return Object.keys(fields)
    .sort()
    .map((k) => `${k}=${String(fields[k])}`)
    .join("|");
}

describe("buildVerificationSpec — algorithm identity", () => {
  it("names the commitment scheme and SHA-256", () => {
    const spec = buildVerificationSpec();
    expect(spec.algorithm).toBe("GSE-PickCommit-v1");
    expect(spec.version).toBe("1.0.0");
    expect(spec.hash).toMatch(/SHA-256/);
    expect(spec.leaf.prefix).toBe("leaf:");
    expect(spec.node.prefix).toBe("node:");
    expect(spec.canonicalPayload.separator).toBe("|");
  });

  it("ships three synthetic vectors (no real pick data)", () => {
    const spec = buildVerificationSpec();
    expect(spec.vectors).toHaveLength(3);
    for (const v of spec.vectors) {
      expect(v.pickId).toMatch(/^example-pick-/); // obviously synthetic
    }
  });
});

describe("buildVerificationSpec — a third party reproduces every vector from scratch", () => {
  it("canonicalPayload matches the documented sort+join recipe exactly", () => {
    const spec = buildVerificationSpec();
    for (const v of spec.vectors) {
      expect(v.canonicalPayload).toBe(canonicalFromScratch(v.fields));
    }
  });

  it("pins the exact canonical serialization for vector 1 (loud on any recipe change)", () => {
    const spec = buildVerificationSpec();
    const v1 = spec.vectors.find((v) => v.pickId === "example-pick-1")!;
    expect(v1.canonicalPayload).toBe(
      "asOf=2020-01-01T00:00:00.000Z|confidence=62|edgeScore=14|entryOdds=-110|line=-3.5|marketFairProb=0.5238|modelProb=none|modelVersion=v0.0.0-spec|selection=Team A -3.5",
    );
  });

  it("leafHash equals an independently-computed sha256('leaf:'+pickId+':'+payload)", () => {
    const spec = buildVerificationSpec();
    for (const v of spec.vectors) {
      const independent = sha256Hex(`leaf:${v.pickId}:${v.canonicalPayload}`);
      expect(v.leafHash).toBe(independent);
      expect(v.leafHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("the published merkle leaves are exactly the vector leaf hashes, and the root recomputes", () => {
    const spec = buildVerificationSpec();
    expect(spec.merkle.leaves).toEqual(spec.vectors.map((v) => v.leafHash));

    // Recompute the root from scratch per the documented node recipe
    // (duplicate the last node on an odd layer).
    let layer = [...spec.merkle.leaves];
    while (layer.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i]!;
        const right = i + 1 < layer.length ? layer[i + 1]! : left;
        next.push(sha256Hex(`node:${left}:${right}`));
      }
      layer = next;
    }
    expect(spec.merkle.root).toBe(layer[0]);
  });

  it("is deterministic — identical on repeated calls", () => {
    expect(JSON.stringify(buildVerificationSpec())).toBe(JSON.stringify(buildVerificationSpec()));
  });
});

describe("GET /api/proof/verification-spec.json", () => {
  it("serves the spec as JSON with a 200", async () => {
    const { GET } = await import("@/app/api/proof/verification-spec.json/route");
    const res = GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { algorithm: string; vectors: unknown[] };
    expect(body.algorithm).toBe("GSE-PickCommit-v1");
    expect(body.vectors).toHaveLength(3);
  });
});
