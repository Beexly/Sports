/**
 * Scraping clearance engine — end-to-end proof tests.
 *
 * Proves that the rights-gated extraction framework enforces every block condition
 * and that no record can be created without a valid clearance + rights snapshot.
 */
import { describe, it, expect } from "vitest";
import {
  checkClearance,
  wrapExtractedRecord,
  summarizeClearance,
} from "@/lib/scraping/clearance-engine";
import {
  getSourceRightsEntry,
  getVendorCandidates,
  getSourcesByStatus,
  getApprovedSources,
  snapshotRights,
} from "@/lib/scraping/source-rights-registry";
import {
  getAllowedDataCategories,
  getBlockedDataCategories,
  getDataRule,
} from "@/lib/scraping/data-rules";
import {
  getToolEntry,
  isToolApprovedForMode,
  getApprovedProductionTools,
} from "@/lib/scraping/tool-registry";

// ─── Source rights registry ───────────────────────────────────────────────────

describe("Source rights registry — registry shape", () => {
  it("nflverse is approved_open_license with full permissions", () => {
    const entry = getSourceRightsEntry("nflverse");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("approved_open_license");
    expect(entry!.automation_allowed).toBe(true);
    expect(entry!.commercial_display_allowed).toBe(true);
    expect(entry!.storage_allowed).toBe(true);
    expect(entry!.derived_analytics_allowed).toBe(true);
    expect(entry!.model_training_allowed).toBe(true);
    expect(entry!.attribution_required).toBe(true);
    expect(entry!.attribution_text).toContain("nflverse");
  });

  it("espn-public-api is approved_public_logged_off with limited commercial rights", () => {
    const entry = getSourceRightsEntry("espn-public-api");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("approved_public_logged_off");
    expect(entry!.automation_allowed).toBe(true);
    expect(entry!.commercial_display_allowed).toBe(false);
    expect(entry!.storage_allowed).toBe(false);
    expect(entry!.model_training_allowed).toBe(false);
    expect(entry!.derived_analytics_allowed).toBe(true);
  });

  it("the-odds-api is approved_api with commercial rights", () => {
    const entry = getSourceRightsEntry("the-odds-api");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("approved_api");
    expect(entry!.automation_allowed).toBe(true);
    expect(entry!.commercial_display_allowed).toBe(true);
    expect(entry!.storage_allowed).toBe(true);
    expect(entry!.model_training_allowed).toBe(false);
  });

  it("scores24-live is permission_required with no automation", () => {
    const entry = getSourceRightsEntry("scores24-live");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("permission_required");
    expect(entry!.automation_allowed).toBe(false);
    expect(entry!.commercial_display_allowed).toBe(false);
    expect(entry!.storage_allowed).toBe(false);
    expect(entry!.unlock_condition).toBeTruthy();
    expect(entry!.vendor_contact).toContain("scores24.live");
  });

  it("score24-com is vendor_candidate — all flags false until contract signed", () => {
    const entry = getSourceRightsEntry("score24-com");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("vendor_candidate");
    expect(entry!.automation_allowed).toBe(false);
    expect(entry!.commercial_display_allowed).toBe(false);
    expect(entry!.storage_allowed).toBe(false);
    expect(entry!.derived_analytics_allowed).toBe(false);
    expect(entry!.model_training_allowed).toBe(false);
  });

  it("jeff-mans-public-feed is permission_required with no automation until written consent", () => {
    const entry = getSourceRightsEntry("jeff-mans-public-feed");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("permission_required");
    expect(entry!.automation_allowed).toBe(false);
    expect(entry!.public_logged_off_allowed).toBe(false);
    expect(entry!.commercial_display_allowed).toBe(false);
    expect(entry!.storage_allowed).toBe(false);
    expect(entry!.derived_analytics_allowed).toBe(false);
    expect(entry!.model_training_allowed).toBe(false);
    expect(entry!.attribution_required).toBe(true);
    expect(entry!.unlock_condition).toContain("Written consent");
    // Scope: only the independent public feed; SiriusXM licensing parked per owner.
    expect(entry!.notes).toContain("SiriusXM corporate licensing is PARKED");
  });

  it("siriusxm-activator is permanently excluded", () => {
    const entry = getSourceRightsEntry("siriusxm-activator");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("excluded");
    expect(entry!.automation_allowed).toBe(false);
    expect(entry!.unlock_condition).toBeNull();
  });

  it("getVendorCandidates returns score24-com", () => {
    const candidates = getVendorCandidates();
    const ids = candidates.map((c) => c.source_id);
    expect(ids).toContain("score24-com");
  });

  it("getApprovedSources returns only approved statuses", () => {
    const approved = getApprovedSources();
    const approvedStatuses = new Set(approved.map((s) => s.status));
    expect(approvedStatuses.has("excluded")).toBe(false);
    expect(approvedStatuses.has("permission_required")).toBe(false);
    expect(approvedStatuses.has("vendor_candidate")).toBe(false);
  });

  it("getSourcesByStatus finds permission_required sources", () => {
    const permRequired = getSourcesByStatus("permission_required");
    const ids = permRequired.map((s) => s.source_id);
    expect(ids).toContain("scores24-live");
    expect(ids).toContain("jeff-mans-public-feed");
  });
});

// ─── PROOF 1: scores24.live cannot run automated extraction ───────────────────

describe("PROOF 1 — scores24.live: automated extraction is blocked", () => {
  it("blocks public_logged_off_fact_extract — automation not allowed", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "AUTOMATION_NOT_ALLOWED")).toBe(true);
  });

  it("blocks permissioned_crawl — incompatible status + automation not allowed", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "permissioned_crawl",
      tool_id: "crawlee-python",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(false);
    const codes = result.blocks.map((b) => b.code);
    expect(codes.some((c) => ["INCOMPATIBLE_STATUS", "AUTOMATION_NOT_ALLOWED", "WRITTEN_PERMISSION_REQUIRED"].includes(c))).toBe(true);
  });

  it("blocks licensed_api_ingest — not an API source", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "licensed_api_ingest",
      tool_id: "fetch-native",
      intents: ["storage"],
    });
    expect(result.allowed).toBe(false);
  });

  it("blocks clean_text_extract — automation not allowed", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "clean_text_extract",
      tool_id: "trafilatura",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "AUTOMATION_NOT_ALLOWED")).toBe(true);
  });

  it("summarizeClearance reports the primary block", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["internal_analysis"],
    });
    const summary = summarizeClearance(result);
    expect(summary.allowed).toBe(false);
    expect(summary.blockCount).toBeGreaterThan(0);
    expect(summary.primaryBlock).toBeTruthy();
  });
});

// ─── PROOF 2: scores24.live allows manual_research_note ──────────────────────

describe("PROOF 2 — scores24.live: manual_research_note is allowed", () => {
  it("allows manual_research_note with manual-operator tool", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "manual_research_note",
      tool_id: "manual-operator",
      intents: ["manual_research"],
    });
    expect(result.allowed).toBe(true);
    expect(result.blocks).toHaveLength(0);
    expect(result.rightsSnapshot).not.toBeNull();
    expect(result.rightsSnapshot!.source_id).toBe("scores24-live");
  });

  it("allows manual_research_note with easyspider tool", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "manual_research_note",
      tool_id: "easyspider",
      intents: ["manual_research"],
    });
    expect(result.allowed).toBe(true);
    expect(result.blocks).toHaveLength(0);
  });

  it("manual_research_note + internal_analysis intent is allowed", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "manual_research_note",
      tool_id: "manual-operator",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(true);
  });

  it("manual_research_note + derived_analytics intent is blocked — analytics not permitted", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "manual_research_note",
      tool_id: "manual-operator",
      intents: ["derived_analytics"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "DERIVED_ANALYTICS_NOT_ALLOWED")).toBe(true);
  });

  it("manual_research_note + commercial_display intent is blocked", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "manual_research_note",
      tool_id: "manual-operator",
      intents: ["commercial_display"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "COMMERCIAL_DISPLAY_NOT_ALLOWED")).toBe(true);
  });
});

// ─── PROOF 3: score24.com is vendor_candidate ─────────────────────────────────

describe("PROOF 3 — score24.com: vendor_candidate blocks all automation", () => {
  it("is in the vendor candidate list", () => {
    const candidates = getVendorCandidates();
    const entry = candidates.find((c) => c.source_id === "score24-com");
    expect(entry).toBeDefined();
    expect(entry!.status).toBe("vendor_candidate");
  });

  it("blocks public_logged_off_fact_extract — incompatible status", () => {
    const result = checkClearance({
      source_id: "score24-com",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "INCOMPATIBLE_STATUS")).toBe(true);
  });

  it("blocks vendor_trial_ingest — automation not yet allowed", () => {
    const result = checkClearance({
      source_id: "score24-com",
      mode: "vendor_trial_ingest",
      tool_id: "crawlee-python",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "AUTOMATION_NOT_ALLOWED")).toBe(true);
  });

  it("blocks licensed_api_ingest — not approved API", () => {
    const result = checkClearance({
      source_id: "score24-com",
      mode: "licensed_api_ingest",
      tool_id: "fetch-native",
      intents: ["storage"],
    });
    expect(result.allowed).toBe(false);
  });

  it("allows manual_research_note for UX review", () => {
    const result = checkClearance({
      source_id: "score24-com",
      mode: "manual_research_note",
      tool_id: "manual-operator",
      intents: ["manual_research"],
    });
    expect(result.allowed).toBe(true);
    expect(result.blocks).toHaveLength(0);
  });
});

// ─── PROOF 4: approved public_logged_off sources can run fact extraction ──────

describe("PROOF 4 — espn-public-api: approved public logged-off fact extraction", () => {
  it("allows public_logged_off_fact_extract for internal_analysis", () => {
    const result = checkClearance({
      source_id: "espn-public-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(true);
    expect(result.blocks).toHaveLength(0);
    expect(result.rightsSnapshot).not.toBeNull();
    expect(result.rightsSnapshot!.status).toBe("approved_public_logged_off");
  });

  it("allows public_logged_off_fact_extract for derived_analytics", () => {
    const result = checkClearance({
      source_id: "espn-public-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["derived_analytics"],
    });
    expect(result.allowed).toBe(true);
  });

  it("includes attribution warning when attribution_required=true", () => {
    const result = checkClearance({
      source_id: "espn-public-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(true);
    expect(result.warnings.some((w) => w.includes("Attribution required"))).toBe(true);
  });

  it("nflverse open_dataset_ingest clears with all intents", () => {
    const result = checkClearance({
      source_id: "nflverse",
      mode: "open_dataset_ingest",
      tool_id: "fetch-native",
      intents: ["storage", "derived_analytics", "model_training"],
    });
    expect(result.allowed).toBe(true);
    expect(result.blocks).toHaveLength(0);
    expect(result.rightsSnapshot!.model_training_allowed).toBe(true);
  });

  it("the-odds-api licensed_api_ingest clears with commercial_display + storage", () => {
    const result = checkClearance({
      source_id: "the-odds-api",
      mode: "licensed_api_ingest",
      tool_id: "fetch-native",
      intents: ["commercial_display", "storage", "derived_analytics"],
    });
    expect(result.allowed).toBe(true);
    expect(result.blocks).toHaveLength(0);
  });
});

// ─── PROOF 5: commercial_display blocks when not allowed ─────────────────────

describe("PROOF 5 — commercial_display: blocks when not permitted by source", () => {
  it("espn-public-api blocks commercial_display intent", () => {
    const result = checkClearance({
      source_id: "espn-public-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["commercial_display"],
    });
    expect(result.allowed).toBe(false);
    const commercialBlock = result.blocks.find((b) => b.code === "COMMERCIAL_DISPLAY_NOT_ALLOWED");
    expect(commercialBlock?.message).toContain("commercial_display");
  });

  it("espn-public-api blocks commercial_display even with other valid intents", () => {
    const result = checkClearance({
      source_id: "espn-public-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["internal_analysis", "commercial_display"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "COMMERCIAL_DISPLAY_NOT_ALLOWED")).toBe(true);
  });

  it("the-odds-api permits commercial_display — licensed", () => {
    const result = checkClearance({
      source_id: "the-odds-api",
      mode: "licensed_api_ingest",
      tool_id: "fetch-native",
      intents: ["commercial_display"],
    });
    expect(result.allowed).toBe(true);
  });
});

// ─── PROOF 6: derived_analytics blocks when not allowed ──────────────────────

describe("PROOF 6 — derived_analytics: blocks when not permitted by source", () => {
  it("scores24-live blocks derived_analytics", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "manual_research_note",
      tool_id: "manual-operator",
      intents: ["derived_analytics"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "DERIVED_ANALYTICS_NOT_ALLOWED")).toBe(true);
  });

  it("score24-com blocks derived_analytics", () => {
    const result = checkClearance({
      source_id: "score24-com",
      mode: "manual_research_note",
      tool_id: "manual-operator",
      intents: ["derived_analytics"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "DERIVED_ANALYTICS_NOT_ALLOWED")).toBe(true);
  });

  it("nflverse permits derived_analytics — CC BY-SA", () => {
    const result = checkClearance({
      source_id: "nflverse",
      mode: "open_dataset_ingest",
      tool_id: "fetch-native",
      intents: ["derived_analytics"],
    });
    expect(result.allowed).toBe(true);
  });
});

// ─── PROOF 7: model_training blocks when not allowed ─────────────────────────

describe("PROOF 7 — model_training: blocks when not permitted by source", () => {
  it("espn-public-api blocks model_training intent", () => {
    const result = checkClearance({
      source_id: "espn-public-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["model_training"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "MODEL_TRAINING_NOT_ALLOWED")).toBe(true);
  });

  it("the-odds-api blocks model_training", () => {
    const result = checkClearance({
      source_id: "the-odds-api",
      mode: "licensed_api_ingest",
      tool_id: "fetch-native",
      intents: ["model_training"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "MODEL_TRAINING_NOT_ALLOWED")).toBe(true);
  });

  it("nflverse permits model_training — CC BY-SA explicitly allows it", () => {
    const result = checkClearance({
      source_id: "nflverse",
      mode: "open_dataset_ingest",
      tool_id: "fetch-native",
      intents: ["model_training"],
    });
    expect(result.allowed).toBe(true);
  });
});

// ─── PROOF 8: no extraction job runs without a rights snapshot ────────────────

describe("PROOF 8 — rights snapshot: every job must have one", () => {
  it("unregistered source returns null snapshot and blocks job", () => {
    const result = checkClearance({
      source_id: "totally-unknown-source-xyz",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: [],
    });
    expect(result.allowed).toBe(false);
    expect(result.rightsSnapshot).toBeNull();
    expect(result.blocks.at(0)?.code).toBe("SOURCE_NOT_REGISTERED");
  });

  it("wrapExtractedRecord throws when clearance.allowed=false", () => {
    const result = checkClearance({
      source_id: "scores24-live",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(false);
    expect(() =>
      wrapExtractedRecord(result, "https://scores24.live", { data: true }),
    ).toThrow(/clearance not granted/);
  });

  it("wrapExtractedRecord throws if snapshot missing despite allowed=true (guard)", () => {
    const clearanceWithoutSnapshot = {
      allowed: true,
      requiresReview: false,
      source_id: "test",
      mode: "manual_research_note" as const,
      tool_id: "manual-operator" as const,
      intents: [],
      blocks: [],
      warnings: [],
      rightsSnapshot: null,
      checkedAt: new Date().toISOString(),
    };
    expect(() =>
      wrapExtractedRecord(clearanceWithoutSnapshot, "https://example.com", {}),
    ).toThrow(/rights snapshot is missing/);
  });

  it("excluded source returns snapshot but blocks job", () => {
    const result = checkClearance({
      source_id: "siriusxm-activator",
      mode: "manual_research_note",
      tool_id: "manual-operator",
      intents: ["manual_research"],
    });
    expect(result.allowed).toBe(false);
    expect(result.rightsSnapshot).not.toBeNull();
    expect(result.blocks.some((b) => b.code === "SOURCE_EXCLUDED")).toBe(true);
  });

  it("allowed clearance produces a non-null snapshot with expected fields", () => {
    const result = checkClearance({
      source_id: "the-odds-api",
      mode: "licensed_api_ingest",
      tool_id: "fetch-native",
      intents: ["storage"],
    });
    expect(result.allowed).toBe(true);
    expect(result.rightsSnapshot).not.toBeNull();
    const snap = result.rightsSnapshot!;
    expect(snap.source_id).toBe("the-odds-api");
    expect(snap.status).toBe("approved_api");
    expect(snap.snapshotted_at).toBeTruthy();
    expect(snap.reviewed_at).toBeTruthy();
  });
});

// ─── PROOF 9: every extracted record carries required envelope fields ─────────

describe("PROOF 9 — ExtractedRecord: required envelope fields on every record", () => {
  it("record carries source_id, source_url, extracted_at, extraction_mode, tool_name, rights_snapshot", () => {
    const clearance = checkClearance({
      source_id: "nflverse",
      mode: "open_dataset_ingest",
      tool_id: "fetch-native",
      intents: ["storage", "derived_analytics"],
    });
    expect(clearance.allowed).toBe(true);

    const record = wrapExtractedRecord(
      clearance,
      "https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_2024.parquet",
      { season: 2024, rows: 5432 },
    );

    expect(record.source_id).toBe("nflverse");
    expect(record.source_url).toContain("nflverse");
    expect(record.extracted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(record.extraction_mode).toBe("open_dataset_ingest");
    expect(record.tool_name).toBe("fetch-native");
    expect(record.rights_snapshot).toBeTruthy();
    expect(record.rights_snapshot.source_id).toBe("nflverse");
    expect(record.rights_snapshot.status).toBe("approved_open_license");
    expect(record.rights_snapshot.attribution_required).toBe(true);
    expect(record.data).toMatchObject({ season: 2024, rows: 5432 });
  });

  it("rights_snapshot is frozen at extraction time (not mutable)", () => {
    const clearance = checkClearance({
      source_id: "the-odds-api",
      mode: "licensed_api_ingest",
      tool_id: "fetch-native",
      intents: ["commercial_display"],
    });
    const record = wrapExtractedRecord(
      clearance,
      "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds",
      { market: "h2h" },
    );
    expect(record.rights_snapshot.commercial_display_allowed).toBe(true);
    expect(record.rights_snapshot.snapshotted_at).toBeTruthy();
  });

  it("the-odds-api record carries correct mode and tool", () => {
    const clearance = checkClearance({
      source_id: "the-odds-api",
      mode: "licensed_api_ingest",
      tool_id: "fetch-native",
      intents: ["storage"],
    });
    const record = wrapExtractedRecord(
      clearance,
      "https://api.the-odds-api.com/v4/sports/",
      { game: "Chiefs vs Ravens" },
    );
    expect(record.extraction_mode).toBe("licensed_api_ingest");
    expect(record.tool_name).toBe("fetch-native");
  });
});

// ─── Additional clearance checks ──────────────────────────────────────────────

describe("Clearance — tool registry enforcement", () => {
  it("blocks unknown tool", () => {
    const result = checkClearance({
      source_id: "nflverse",
      mode: "open_dataset_ingest",
      tool_id: "fetch-native",
      intents: [],
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks tool not approved for mode", () => {
    const result = checkClearance({
      source_id: "nflverse",
      mode: "open_dataset_ingest",
      tool_id: "playwright",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "TOOL_NOT_APPROVED_FOR_MODE")).toBe(true);
  });

  it("warns when tool not approved for production (playwright on non-manual mode)", () => {
    const result = checkClearance({
      source_id: "espn-public-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "playwright",
      intents: ["internal_analysis"],
    });
    expect(result.allowed).toBe(true);
    expect(result.warnings.some((w) => w.includes("not approved for production"))).toBe(true);
  });

  it("manual-operator is approved for manual_research_note", () => {
    expect(isToolApprovedForMode("manual-operator", "manual_research_note")).toBe(true);
  });

  it("playwright is not approved for licensed_api_ingest", () => {
    expect(isToolApprovedForMode("playwright", "licensed_api_ingest")).toBe(false);
  });

  it("autoscraper has no allowed modes", () => {
    const entry = getToolEntry("autoscraper");
    expect(entry).toBeDefined();
    expect(entry!.allowed_modes).toHaveLength(0);
  });

  it("all production tools have evasion_capable=false", () => {
    const prodTools = getApprovedProductionTools();
    for (const tool of prodTools) {
      expect(tool.evasion_capable).toBe(false);
    }
  });
});

describe("Clearance — excluded source", () => {
  it("siriusxm-activator is fully blocked on any mode", () => {
    for (const mode of ["manual_research_note", "public_logged_off_fact_extract"] as const) {
      const result = checkClearance({
        source_id: "siriusxm-activator",
        mode,
        tool_id: "manual-operator",
        intents: ["manual_research"],
      });
      expect(result.allowed).toBe(false);
      expect(result.blocks.some((b) => b.code === "SOURCE_EXCLUDED")).toBe(true);
    }
  });
});

describe("Clearance — storage intent", () => {
  it("espn-public-api blocks storage intent", () => {
    const result = checkClearance({
      source_id: "espn-public-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["storage"],
    });
    expect(result.allowed).toBe(false);
    expect(result.blocks.some((b) => b.code === "STORAGE_NOT_ALLOWED")).toBe(true);
  });

  it("nflverse permits storage", () => {
    const result = checkClearance({
      source_id: "nflverse",
      mode: "open_dataset_ingest",
      tool_id: "fetch-native",
      intents: ["storage"],
    });
    expect(result.allowed).toBe(true);
  });
});

// ─── Data rules ───────────────────────────────────────────────────────────────

describe("Data rules — allowed and blocked categories", () => {
  it("fact, timestamp, url, metadata, derived_signal, text_summary, source_reference are allowed", () => {
    const allowed = getAllowedDataCategories().map((r) => r.category);
    expect(allowed).toContain("fact");
    expect(allowed).toContain("timestamp");
    expect(allowed).toContain("url");
    expect(allowed).toContain("metadata");
    expect(allowed).toContain("derived_signal");
    expect(allowed).toContain("text_summary");
    expect(allowed).toContain("source_reference");
  });

  it("expression, personal_data, proprietary, graphic, account_gated are blocked", () => {
    const blocked = getBlockedDataCategories().map((r) => r.category);
    expect(blocked).toContain("expression");
    expect(blocked).toContain("personal_data");
    expect(blocked).toContain("proprietary");
    expect(blocked).toContain("graphic");
    expect(blocked).toContain("account_gated");
  });

  it("fact is fully extractable including commercial display and model training", () => {
    const rule = getDataRule("fact");
    expect(rule).toBeDefined();
    expect(rule!.extractionAllowed).toBe(true);
    expect(rule!.storageAllowed).toBe(true);
    expect(rule!.commercialDisplayAllowed).toBe(true);
    expect(rule!.modelTrainingAllowed).toBe(true);
    expect(rule!.requiresAttributedLicense).toBe(false);
  });

  it("expression requires attributed license and is fully blocked", () => {
    const rule = getDataRule("expression");
    expect(rule).toBeDefined();
    expect(rule!.extractionAllowed).toBe(false);
    expect(rule!.storageAllowed).toBe(false);
    expect(rule!.commercialDisplayAllowed).toBe(false);
    expect(rule!.requiresAttributedLicense).toBe(true);
  });

  it("personal_data requires privacy review and is fully blocked", () => {
    const rule = getDataRule("personal_data");
    expect(rule).toBeDefined();
    expect(rule!.extractionAllowed).toBe(false);
    expect(rule!.requiresPrivacyReview).toBe(true);
  });

  it("account_gated is permanently blocked regardless of other rights", () => {
    const rule = getDataRule("account_gated");
    expect(rule).toBeDefined();
    expect(rule!.extractionAllowed).toBe(false);
    expect(rule!.storageAllowed).toBe(false);
    expect(rule!.commercialDisplayAllowed).toBe(false);
    expect(rule!.modelTrainingAllowed).toBe(false);
    expect(rule!.requiresAttributedLicense).toBe(false);
  });

  it("text_summary blocks commercial_display and model_training without further rights", () => {
    const rule = getDataRule("text_summary");
    expect(rule).toBeDefined();
    expect(rule!.extractionAllowed).toBe(true);
    expect(rule!.commercialDisplayAllowed).toBe(false);
    expect(rule!.modelTrainingAllowed).toBe(false);
  });
});

// ─── RightsSnapshot contract ──────────────────────────────────────────────────

describe("RightsSnapshot — contract", () => {
  it("snapshotRights produces all required fields", () => {
    const entry = getSourceRightsEntry("nflverse");
    const snap = snapshotRights(entry!, new Date("2026-06-11T12:00:00Z"));
    expect(snap.source_id).toBe("nflverse");
    expect(snap.source_url).toBeTruthy();
    expect(snap.status).toBe("approved_open_license");
    expect(snap.snapshotted_at).toBe("2026-06-11T12:00:00.000Z");
    expect(snap.reviewed_at).toBeTruthy();
    expect(typeof snap.automation_allowed).toBe("boolean");
    expect(typeof snap.commercial_display_allowed).toBe("boolean");
    expect(typeof snap.storage_allowed).toBe("boolean");
    expect(typeof snap.derived_analytics_allowed).toBe("boolean");
    expect(typeof snap.model_training_allowed).toBe("boolean");
    expect(typeof snap.attribution_required).toBe("boolean");
  });

  it("checkedAt in ClearanceResult matches the time the check was run", () => {
    const now = new Date("2026-06-11T08:30:00Z");
    const result = checkClearance(
      {
        source_id: "the-odds-api",
        mode: "licensed_api_ingest",
        tool_id: "fetch-native",
        intents: ["storage"],
      },
      now,
    );
    expect(result.checkedAt).toBe("2026-06-11T08:30:00.000Z");
    expect(result.rightsSnapshot!.snapshotted_at).toBe("2026-06-11T08:30:00.000Z");
  });
});
