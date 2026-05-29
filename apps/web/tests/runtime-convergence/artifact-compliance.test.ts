/**
 * C44 — Artifact Compliance Test
 *
 * Asserts that no artifact type's public-facing metadata contains
 * forbidden terms (weights, thresholds, prompts, calibration formulas).
 */

import { describe, it, expect } from "vitest";
import { ARTIFACT_TYPES } from "@/lib/galaxy/kernel/artifacts";
import { containsForbiddenForPublic } from "@/lib/explainability/levels";

describe("Artifact metadata — containsForbiddenForPublic", () => {
  for (const artifact of ARTIFACT_TYPES) {
    it(`${artifact.id} — label is clean`, () => {
      expect(containsForbiddenForPublic(artifact.label)).toBeNull();
    });

    it(`${artifact.id} — description is clean`, () => {
      expect(containsForbiddenForPublic(artifact.description)).toBeNull();
    });

    it(`${artifact.id} — sourceSurface is clean`, () => {
      expect(containsForbiddenForPublic(artifact.sourceSurface)).toBeNull();
    });
  }
});

describe("Artifact registry — structural invariants", () => {
  it("all artifacts have width 1200 and height 630", () => {
    for (const artifact of ARTIFACT_TYPES) {
      expect(artifact.width).toBe(1200);
      expect(artifact.height).toBe(630);
    }
  });

  it("all artifact IDs are unique", () => {
    const ids = ARTIFACT_TYPES.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("accentHex values are valid 7-char hex strings", () => {
    for (const artifact of ARTIFACT_TYPES) {
      expect(artifact.accentHex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
