import { describe, it, expect } from "vitest";
import {
  NFL_SOURCE_CATALOG,
  AUTOMATABLE_STATUSES,
  isAutomatable,
} from "../lib/scraping/nfl-source-catalog";
import {
  SOURCE_RIGHTS_REGISTRY,
  type SourceRightsStatus,
} from "../lib/scraping/source-rights-registry";

const VALID_STATUSES: readonly SourceRightsStatus[] = [
  "approved_public_logged_off",
  "approved_api",
  "approved_open_license",
  "approved_written_permission",
  "vendor_candidate",
  "manual_research_only",
  "permission_required",
  "blocked_technical_controls",
  "excluded",
];

/**
 * Domains that are proprietary and must NEVER carry an approved_* status when
 * referenced directly (their facts flow in via open mirrors like nflverse).
 */
const PROPRIETARY_NOT_APPROVED_DOMAINS: readonly string[] = [
  "pro-football-reference.com",
  "nextgenstats.nfl.com",
  "www.nfl.com",
  "espn.com/nfl",
  "sports.yahoo.com",
  "cbssports.com",
  "foxsports.com",
  "statrankings.com",
  "footballdb.com",
];

describe("NFL source catalog", () => {
  it("every entry has non-empty id, name, url, and rationale", () => {
    for (const entry of NFL_SOURCE_CATALOG) {
      expect(entry.id.trim().length, `id empty: ${JSON.stringify(entry)}`).toBeGreaterThan(0);
      expect(entry.name.trim().length, `name empty: ${entry.id}`).toBeGreaterThan(0);
      expect(entry.url.trim().length, `url empty: ${entry.id}`).toBeGreaterThan(0);
      expect(entry.rationale.trim().length, `rationale empty: ${entry.id}`).toBeGreaterThan(0);
    }
  });

  it("ids are unique", () => {
    const seen = new Set<string>();
    for (const entry of NFL_SOURCE_CATALOG) {
      expect(seen.has(entry.id), `duplicate id: ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
    expect(seen.size).toBe(NFL_SOURCE_CATALOG.length);
  });

  it("every status is a valid SourceRightsStatus", () => {
    for (const entry of NFL_SOURCE_CATALOG) {
      expect(
        VALID_STATUSES.includes(entry.status),
        `invalid status "${entry.status}" on ${entry.id}`,
      ).toBe(true);
    }
  });

  it("no proprietary domain entry carries an approved_* status", () => {
    for (const entry of NFL_SOURCE_CATALOG) {
      const matchedDomain = PROPRIETARY_NOT_APPROVED_DOMAINS.find((domain) =>
        entry.url.includes(domain),
      );
      if (matchedDomain !== undefined) {
        expect(
          entry.status.startsWith("approved_"),
          `${entry.id} (${entry.url}) matches proprietary domain "${matchedDomain}" ` +
            `but has approved status "${entry.status}"`,
        ).toBe(false);
      }
    }
  });

  it("every non-null registry_id resolves to a real registry source_id", () => {
    const registryIds = new Set(SOURCE_RIGHTS_REGISTRY.map((s) => s.source_id));
    for (const entry of NFL_SOURCE_CATALOG) {
      if (entry.registry_id !== null) {
        expect(
          registryIds.has(entry.registry_id),
          `${entry.id} references unknown registry_id "${entry.registry_id}"`,
        ).toBe(true);
      }
    }
  });

  it("every entry has a non-empty path_to_yes, actionable when permission_required", () => {
    const ACTIONABLE_MARKERS: readonly string[] = [
      "MIRROR",
      "DERIVE",
      "PERMISSION",
      "LICENSE",
      "SIGN",
      "R&D",
      "DO NOT",
      "WEATHER",
    ];
    for (const entry of NFL_SOURCE_CATALOG) {
      expect(
        entry.path_to_yes.trim().length,
        `path_to_yes empty: ${entry.id}`,
      ).toBeGreaterThan(0);
      if (entry.status === "permission_required") {
        expect(
          ACTIONABLE_MARKERS.some((marker) => entry.path_to_yes.includes(marker)),
          `path_to_yes not actionable for ${entry.id}: "${entry.path_to_yes}"`,
        ).toBe(true);
      }
    }
  });

  it("isAutomatable() is true iff status is in AUTOMATABLE_STATUSES", () => {
    for (const entry of NFL_SOURCE_CATALOG) {
      expect(isAutomatable(entry), `isAutomatable mismatch for ${entry.id}`).toBe(
        AUTOMATABLE_STATUSES.includes(entry.status),
      );
    }
  });
});
