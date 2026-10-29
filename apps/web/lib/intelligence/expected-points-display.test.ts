import { describe, it, expect, vi } from "vitest";
import {
  checkExpectedPointsDisplayClearance,
  loadExpectedPointsForDisplay,
  rightsGatedExpectedPoints,
} from "./expected-points-display";
// The "public engines board wiring" block that used to live here imported
// `@/app/intelligence/engines/registry`. That module was deliberately removed
// with the public /intelligence methodology pages (89ec7c528, Garrett-ordered),
// so the wiring it asserted no longer exists and nothing else imports it.
// Removed 2026-10-29 with the display boundary below left intact: the rights
// gate itself is still enforced and still pinned by the tests that remain.

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

