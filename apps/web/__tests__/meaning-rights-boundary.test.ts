/**
 * The rights boundary adapter — RightsSnapshot → RightsEnvelope.
 *
 * The bar: every one of the nine SourceRightsStatus values maps to a defined LegalVerdict
 * (exhaustiveness, like ALL_DECISION_STATES), and a REAL snapshot from the source-rights registry
 * round-trips into a well-formed envelope whose permission flags match the snapshot.
 */

import { describe, it, expect } from "vitest";
import { rightsSnapshotToEnvelope, STATUS_TO_VERDICT } from "@/lib/meaning/rights-snapshot-to-envelope";
import {
  getSourceRightsEntry,
  snapshotRights,
  type SourceRightsStatus,
} from "@/lib/scraping/source-rights-registry";

const ALL_STATUSES: readonly SourceRightsStatus[] = [
  "approved_public_logged_off", "approved_api", "approved_open_license", "approved_written_permission",
  "vendor_candidate", "manual_research_only", "permission_required", "blocked_technical_controls", "excluded",
];

describe("rights boundary — exhaustive mapping", () => {
  it("every SourceRightsStatus maps to a defined LegalVerdict", () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_TO_VERDICT[s]).toBeTruthy();
    }
    // and no stray keys
    expect(Object.keys(STATUS_TO_VERDICT).sort()).toEqual([...ALL_STATUSES].sort());
  });

  it("forbidden statuses map to DO_NOT_USE", () => {
    expect(STATUS_TO_VERDICT.excluded).toBe("DO_NOT_USE");
    expect(STATUS_TO_VERDICT.blocked_technical_controls).toBe("DO_NOT_USE");
  });
});

describe("rights boundary — a real snapshot round-trips", () => {
  it("the licensed Odds API snapshot becomes a display-allowed, owner-free envelope", () => {
    const entry = getSourceRightsEntry("the-odds-api");
    expect(entry).toBeTruthy();
    const snap = snapshotRights(entry!, new Date("2026-01-01T00:00:00Z"));
    const env = rightsSnapshotToEnvelope(snap);
    expect(env.status).toBe(snap.status);
    expect(env.legalVerdict).toBe(STATUS_TO_VERDICT[snap.status]);
    expect(env.commercialDisplayAllowed).toBe(snap.commercial_display_allowed);
    expect(env.storageAllowed).toBe(snap.storage_allowed);
    expect(env.reviewStatus).toBe(snap.reviewed_at ? "REVIEWED" : "UNKNOWN");
  });

  it("a permission-required source becomes owner-gated with a RIGHTS_REVIEW verdict", () => {
    const entry = getSourceRightsEntry("scores24-live");
    if (entry) {
      const snap = snapshotRights(entry, new Date("2026-01-01T00:00:00Z"));
      const env = rightsSnapshotToEnvelope(snap);
      expect(env.ownerApprovalRequired).toBe(true);
      expect(env.legalVerdict).toBe("RIGHTS_REVIEW");
    }
  });
});
