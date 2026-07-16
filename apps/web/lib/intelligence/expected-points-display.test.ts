import { describe, it, expect, vi } from "vitest";
import {
  checkExpectedPointsDisplayClearance,
  loadExpectedPointsForDisplay,
  rightsGatedExpectedPoints,
} from "./expected-points-display";
import { getEngine } from "@/app/intelligence/engines/registry";
import type { ExpectedPoints } from "./expected-points";

/**
 * The customer-display boundary for the CC-BY-SA ff_opportunity xFP data.
 * These tests pin the FAIL-CLOSED behavior: the registry blocks the true
 * commercial_display intent by design while the share-alike question is open,
 * so both customer surfaces (public engines board + Pro/Elite API) must get the
 * honest rights-gated payload and never fetch.
 */
describe("expected-points display boundary (fail-closed rights gate)", () => {
  it("the TRUE display intent is blocked by the registry (share-alike question open)", () => {
    const c = checkExpectedPointsDisplayClearance();
    expect(c.allowed).toBe(false);
    expect(c.blocks.some((b) => b.code === "COMMERCIAL_DISPLAY_NOT_ALLOWED")).toBe(true);
    expect(c.rightsSnapshot!.commercial_display_allowed).toBe(false);
  });

  it("loadExpectedPointsForDisplay fails CLOSED: honest rights-gated payload, no fetch", async () => {
    const fetcher = vi.fn(async () => new Response("must never be fetched", { status: 500 }));
    const r = await loadExpectedPointsForDisplay({ fetcher });
    expect(fetcher).not.toHaveBeenCalled();
    expect(r.status).toBe("source-error"); // the honest unavailable shape every board renders
    expect(r.rightsGated).toBe(true);
    expect(r.rows).toEqual([]);
    expect(r.record).toBeNull();
    expect(r.canPublishProjections).toBe(false);
    expect(r.error).toContain("COMMERCIAL_DISPLAY_NOT_ALLOWED");
    expect(r.note).toContain("CC-BY-SA-4.0");
    // No fabricated promises in the honest state.
    expect(r.note.toLowerCase()).not.toContain("coming soon");
  });

  it("the gated payload carries the registry attribution (provenance survives the gate)", () => {
    const gated = rightsGatedExpectedPoints(checkExpectedPointsDisplayClearance());
    expect(gated.attribution).toBe("Expected points data from ffverse/ffopportunity (CC-BY-SA-4.0)");
  });
});

describe("public engines board wiring (registry.tsx)", () => {
  it("the expected-points engine attributes ffverse-ffopportunity, not nflverse", () => {
    const engine = getEngine("expected-points");
    expect(engine.sourceIds).toEqual(["ffverse-ffopportunity"]);
  });

  it("the engine's loader is the display-gated path: it resolves to the rights-gated payload", async () => {
    const engine = getEngine("expected-points");
    const data = (await engine.load()) as ExpectedPoints;
    expect(data.status).toBe("source-error");
    expect(data.rightsGated).toBe(true);
    expect(data.rows).toEqual([]);
  });
});
