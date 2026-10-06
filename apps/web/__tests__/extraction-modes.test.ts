/**
 * extraction-modes — rights-constraint invariants.
 *
 * This table is a COMPLIANCE surface, not a lookup convenience. It decides which
 * extraction modes are legal for a given source status, and
 * `clearance-engine.ts` (plus `free-first-ingest.ts`, `tool-registry.ts` and
 * `coverage-map.ts`) read it to gate ingestion. A wrong or missing entry here is
 * a rights violation, not a bug a customer would notice — which is exactly why
 * it has had no test file.
 *
 * These tests are pure: they import the table and assert structural invariants.
 * No database, no network, and no invented product data — every expected value
 * is either a literal the source file already states, or a value the source file
 * itself supplies.
 */

import { describe, expect, it } from "vitest";
import {
  EXTRACTION_MODE_CONSTRAINTS,
  type ExtractionMode,
} from "@/lib/scraping/extraction-modes";

/** Every mode the union in the source file admits. */
const ALL_MODES: readonly ExtractionMode[] = [
  "public_logged_off_fact_extract",
  "clean_text_extract",
  "licensed_api_ingest",
  "open_dataset_ingest",
  "permissioned_crawl",
  "manual_research_note",
  "vendor_trial_ingest",
];

/** Statuses the registry can report. Listed for the compatibility assertions. */
const MANUAL_ONLY_STATUSES = ["manual_research_only", "permission_required"] as const;

describe("EXTRACTION_MODE_CONSTRAINTS — completeness", () => {
  it("defines a constraint record for every declared mode", () => {
    for (const mode of ALL_MODES) {
      expect(EXTRACTION_MODE_CONSTRAINTS[mode], `mode "${mode}" has no constraints`).toBeDefined();
    }
  });

  it("declares no mode the ExtractionMode union does not name", () => {
    // Guards the record against drifting from the union: a mode added to the
    // type but not the table is a runtime `undefined` in clearance-engine, and
    // one added to the table but not the type is a silent capability nothing can
    // request.
    const declared = Object.keys(EXTRACTION_MODE_CONSTRAINTS).sort();
    expect(declared).toEqual([...ALL_MODES].sort());
  });
});

describe("EXTRACTION_MODE_CONSTRAINTS — shape invariants", () => {
  it.each(ALL_MODES)("%s: every constraint flag is a real boolean", (mode) => {
    const c = EXTRACTION_MODE_CONSTRAINTS[mode];
    for (const flag of [
      "requiresAutomation",
      "requiresPublicLoggedOff",
      "requiresApiLicense",
      "requiresWrittenPermission",
      "requiresOpenLicense",
      "allowedWhenManualOnly",
    ] as const) {
      expect(typeof c[flag], `${mode}.${flag}`).toBe("boolean");
    }
  });

  it.each(ALL_MODES)("%s: describes itself and lists compatible statuses", (mode) => {
    const c = EXTRACTION_MODE_CONSTRAINTS[mode];
    expect(c.description.length, `${mode}.description is empty`).toBeGreaterThan(0);
    expect(c.compatibleStatuses.length, `${mode} is compatible with nothing`).toBeGreaterThan(0);
  });

  it.each(ALL_MODES)("%s: compatibleStatuses are approved/vendor, never manual-only", (mode) => {
    // The point of `allowedWhenManualOnly` is that a manual-only source cannot be
    // reached by an automated mode. A mode that lists a manual-only status while
    // NOT being allowed on manual-only sources would invert the guard.
    const c = EXTRACTION_MODE_CONSTRAINTS[mode];
    if (c.allowedWhenManualOnly) return;
    for (const status of MANUAL_ONLY_STATUSES) {
      expect(
        c.compatibleStatuses,
        `${mode} reaches "${status}" but sets allowedWhenManualOnly:false`,
      ).not.toContain(status);
    }
  });
});

describe("EXTRACTION_MODE_CONSTRAINTS — automation invariant", () => {
  it("manual_research_note is the only mode that does not require automation", () => {
    const automated = ALL_MODES.filter(
      (m) => EXTRACTION_MODE_CONSTRAINTS[m].requiresAutomation,
    );
    expect([...automated].sort()).toEqual(
      [...ALL_MODES.filter((m) => m !== "manual_research_note")].sort(),
    );
  });

  it("manual_research_note claims no rights the operator has not signed for", () => {
    // A human research note is a recorded observation, not an extraction. It must
    // never assert a requirement for automation-level rights, and it must be the
    // one mode allowed on a source that is manual-only.
    const c = EXTRACTION_MODE_CONSTRAINTS.manual_research_note;
    expect(c.requiresAutomation).toBe(false);
    expect(c.allowedWhenManualOnly).toBe(true);
    expect(c.compatibleStatuses).toEqual(
      expect.arrayContaining([...MANUAL_ONLY_STATUSES]),
    );
  });

  it("a mode requiring written permission is compatible ONLY with permission-backed statuses", () => {
    // Prevents a permissioned mode from being reachable off an open-license or
    // plain public source, which is the shape of an unlicensed bulk harvest.
    for (const mode of ALL_MODES) {
      const c = EXTRACTION_MODE_CONSTRAINTS[mode];
      if (!c.requiresWrittenPermission) continue;
      expect(
        c.compatibleStatuses.filter((s) => s === "approved_open_license"),
        `${mode} requires written permission yet accepts an open-license source`,
      ).toEqual([]);
    }
  });

  it("an API-licensed mode requires the API license and accepts the API status", () => {
    const c = EXTRACTION_MODE_CONSTRAINTS.licensed_api_ingest;
    expect(c.requiresApiLicense).toBe(true);
    expect(c.compatibleStatuses).toContain("approved_api");
    // A licensed API need not be publicly logged-off: a key is its own access
    // control. Pinning this documents the intent, since a future "simplification"
    // that flipped it to true would quietly break the licensed path.
    expect(c.requiresPublicLoggedOff).toBe(false);
  });

  it("open_dataset_ingest demands the open license and admits only that status", () => {
    const c = EXTRACTION_MODE_CONSTRAINTS.open_dataset_ingest;
    expect(c.requiresOpenLicense).toBe(true);
    expect(c.compatibleStatuses).toEqual(["approved_open_license"]);
  });
});

describe("EXTRACTION_MODE_CONSTRAINTS — public-facing modes", () => {
  it("the two logged-off fact/text modes require public logged-off access", () => {
    expect(EXTRACTION_MODE_CONSTRAINTS.public_logged_off_fact_extract.requiresPublicLoggedOff).toBe(true);
    expect(EXTRACTION_MODE_CONSTRAINTS.clean_text_extract.requiresPublicLoggedOff).toBe(true);
  });

  it("permissioned_crawl and vendor_trial_ingest do not pretend to be logged-off", () => {
    // Both need a signed agreement; neither is a "just fetch the page" mode.
    for (const mode of ["permissioned_crawl", "vendor_trial_ingest"] as const) {
      expect(EXTRACTION_MODE_CONSTRAINTS[mode].requiresPublicLoggedOff).toBe(false);
      expect(EXTRACTION_MODE_CONSTRAINTS[mode].requiresWrittenPermission).toBe(true);
    }
  });

  it("vendor_trial_ingest does not assume production rights", () => {
    // A trial sandbox is vendor_candidate, never approved_api: trial terms are
    // evaluation terms, and the table's own description says so.
    const c = EXTRACTION_MODE_CONSTRAINTS.vendor_trial_ingest;
    expect(c.compatibleStatuses).toContain("vendor_candidate");
    expect(c.compatibleStatuses).not.toContain("approved_api");
  });
});
