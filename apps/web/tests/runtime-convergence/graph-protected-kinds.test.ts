/**
 * C44 — Graph PROTECTED_KINDS Test
 *
 * Asserts that the public graph projection never exposes edges whose
 * kind is in PROTECTED_KINDS (weights, thresholds, prompts, etc.).
 */

import { describe, it, expect } from "vitest";
import {
  PROTECTED_KINDS,
  GRAPH_EDGES,
  getOutboundEdges,
  getInboundEdges,
} from "@/lib/galaxy/kernel/graph";
import { SURFACES } from "@/lib/galaxy/kernel/surfaces";

describe("Graph public projection — PROTECTED_KINDS excluded", () => {
  it("PROTECTED_KINDS contains the five forbidden categories", () => {
    expect(PROTECTED_KINDS.has("model-weights")).toBe(true);
    expect(PROTECTED_KINDS.has("factor-threshold")).toBe(true);
    expect(PROTECTED_KINDS.has("prompt-template")).toBe(true);
    expect(PROTECTED_KINDS.has("calibration-formula")).toBe(true);
    expect(PROTECTED_KINDS.has("aggregation-logic")).toBe(true);
  });

  it("getOutboundEdges never returns a protected-kind edge for any surface", () => {
    for (const surface of SURFACES) {
      const edges = getOutboundEdges(surface.id);
      for (const edge of edges) {
        expect(PROTECTED_KINDS.has(edge.kind)).toBe(false);
      }
    }
  });

  it("getInboundEdges never returns a protected-kind edge for any surface", () => {
    for (const surface of SURFACES) {
      const edges = getInboundEdges(surface.id);
      for (const edge of edges) {
        expect(PROTECTED_KINDS.has(edge.kind)).toBe(false);
      }
    }
  });

  it("no edge in GRAPH_EDGES has a kind that is in PROTECTED_KINDS", () => {
    for (const edge of GRAPH_EDGES) {
      expect(PROTECTED_KINDS.has(edge.kind)).toBe(false);
    }
  });
});
