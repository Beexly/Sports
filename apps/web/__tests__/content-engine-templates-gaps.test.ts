/**
 * Targeted coverage for lib/content-engine/templates.ts.
 *
 * Tests verify:
 *   - listTemplates() returns all templates as a flat array
 *   - getTemplate(key) returns the matching template or undefined for unknown keys
 *   - Spot-check that template contracts are correct (requiredSources, reviewOwner,
 *     requiresPerformanceGate, defaultVisibility) for each template variant
 */

import { describe, it, expect } from "vitest";
import {
  listTemplates,
  getTemplate,
  CONTENT_TEMPLATES,
} from "@/lib/content-engine/templates";

// ============================================================
// listTemplates
// ============================================================

describe("listTemplates", () => {
  it("returns the same number of entries as CONTENT_TEMPLATES keys", () => {
    const templates = listTemplates();
    expect(templates.length).toBe(Object.keys(CONTENT_TEMPLATES).length);
  });

  it("returns an array of template objects (each has a key and contentType)", () => {
    const templates = listTemplates();
    for (const t of templates) {
      expect(typeof t.key).toBe("string");
      expect(typeof t.contentType).toBe("string");
    }
  });

  it("includes DAILY_SLATE_BRIEF", () => {
    const templates = listTemplates();
    expect(templates.some((t) => t.key === "DAILY_SLATE_BRIEF")).toBe(true);
  });

  it("includes RESPONSIBLE_BETTING_REMINDER", () => {
    const templates = listTemplates();
    expect(templates.some((t) => t.key === "RESPONSIBLE_BETTING_REMINDER")).toBe(true);
  });
});

// ============================================================
// getTemplate
// ============================================================

describe("getTemplate", () => {
  it("returns the template for a known key", () => {
    const t = getTemplate("DAILY_SLATE_BRIEF");
    expect(t).toBeDefined();
    expect(t?.key).toBe("DAILY_SLATE_BRIEF");
  });

  it("returns undefined for an unknown key", () => {
    expect(getTemplate("NONEXISTENT_KEY")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getTemplate("")).toBeUndefined();
  });
});

// ============================================================
// Template contract spot-checks
// ============================================================

describe("DAILY_SLATE_BRIEF template contract", () => {
  const t = CONTENT_TEMPLATES["DAILY_SLATE_BRIEF"];

  it("requires ODDS and DAILY_BRIEF sources", () => {
    expect(t.requiredSources).toContain("ODDS");
    expect(t.requiredSources).toContain("DAILY_BRIEF");
  });

  it("requires responsible gaming language", () => {
    expect(t.requiresResponsibleGaming).toBe(true);
  });

  it("does not require performance gate", () => {
    expect(t.requiresPerformanceGate).toBe(false);
  });

  it("defaults to PUBLIC visibility", () => {
    expect(t.defaultVisibility).toBe("PUBLIC");
  });

  it("reviewOwner is AVA", () => {
    expect(t.reviewOwner).toBe("AVA");
  });
});

describe("APPROVED_PROMOTIONS_ROUNDUP template contract", () => {
  const t = CONTENT_TEMPLATES["APPROVED_PROMOTIONS_ROUNDUP"];

  it("requires affiliate disclosure", () => {
    expect(t.requiresAffiliateDisclosure).toBe(true);
  });

  it("requires responsible gaming", () => {
    expect(t.requiresResponsibleGaming).toBe(true);
  });

  it("requires PROMOTION_TERMS and RESPONSIBLE_GAMING sources", () => {
    expect(t.requiredSources).toContain("PROMOTION_TERMS");
    expect(t.requiredSources).toContain("RESPONSIBLE_GAMING");
  });

  it("reviewOwner is BOBBY", () => {
    expect(t.reviewOwner).toBe("BOBBY");
  });

  it("prohibits 'banned.risk-free' claim", () => {
    expect(t.prohibitedClaimIds).toContain("banned.risk-free");
  });
});

describe("WEEKLY_PICK_TRANSPARENCY_RECAP template contract", () => {
  const t = CONTENT_TEMPLATES["WEEKLY_PICK_TRANSPARENCY_RECAP"];

  it("requires performance gate", () => {
    expect(t.requiresPerformanceGate).toBe(true);
  });

  it("requires PERFORMANCE and PICK sources", () => {
    expect(t.requiredSources).toContain("PERFORMANCE");
    expect(t.requiredSources).toContain("PICK");
  });

  it("defaults to PUBLIC visibility", () => {
    expect(t.defaultVisibility).toBe("PUBLIC");
  });
});

describe("LINE_MOVEMENT_WATCH template contract", () => {
  const t = CONTENT_TEMPLATES["LINE_MOVEMENT_WATCH"];

  it("defaults to INTERNAL visibility", () => {
    expect(t.defaultVisibility).toBe("INTERNAL");
  });

  it("reviewOwner is JARVIS", () => {
    expect(t.reviewOwner).toBe("JARVIS");
  });

  it("does not require performance gate", () => {
    expect(t.requiresPerformanceGate).toBe(false);
  });
});

describe("MODEL_ACCOUNTABILITY_NOTE template contract", () => {
  const t = CONTENT_TEMPLATES["MODEL_ACCOUNTABILITY_NOTE"];

  it("defaults to INTERNAL visibility", () => {
    expect(t.defaultVisibility).toBe("INTERNAL");
  });

  it("reviewOwner is TAL", () => {
    expect(t.reviewOwner).toBe("TAL");
  });

  it("does not require affiliate disclosure", () => {
    expect(t.requiresAffiliateDisclosure).toBe(false);
  });

  it("has empty prohibitedClaimIds", () => {
    expect(t.prohibitedClaimIds.length).toBe(0);
  });
});

describe("RESPONSIBLE_BETTING_REMINDER template contract", () => {
  const t = CONTENT_TEMPLATES["RESPONSIBLE_BETTING_REMINDER"];

  it("requires responsible gaming", () => {
    expect(t.requiresResponsibleGaming).toBe(true);
  });

  it("reviewOwner is SARAH", () => {
    expect(t.reviewOwner).toBe("SARAH");
  });

  it("does not require performance gate", () => {
    expect(t.requiresPerformanceGate).toBe(false);
  });
});
