import { describe, it, expect } from "vitest";
import {
  parseShowBlocksFromCsv,
  SHOW_BLOCK_CSV_CONTRACT,
  type ShowBlockImportResult,
} from "@/lib/airwave/show-block-import";

// Minimal valid CSV with required columns only
const MINIMAL_VALID_CSV = `show_id,show_name,starts_at_ct,ends_at_ct
ch87-morning,Morning Show,06:00,10:00
ch87-midday,Midday Show,10:00,14:00`;

// Full CSV with all columns
const FULL_VALID_CSV = `show_id,show_name,starts_at_ct,ends_at_ct,expected_hosts,sport_focus,fantasy_focus,betting_relevance,source_confidence,manual_review_required,rights_status,operator_notes
ch87-morning,Morning Drive,06:00,10:00,Alex Smith|Jordan Lee,NFL|NBA,true,true,OPERATOR_PROVIDED,true,MANUAL_IMPORT_ONLY,Verified 2026-06-11
ch87-afternoon,Afternoon Lines,14:00,18:00,Sam Rivera,,false,true,MANUALLY_VERIFIED,true,OPERATOR_NOTED,Lines show`;

// TSV variant
const TSV_CSV = `show_id\tshow_name\tstarts_at_ct\tends_at_ct
ch87-evening\tEvening Debrief\t18:00\t22:00`;

describe("Show Block CSV Importer", () => {
  describe("SHOW_BLOCK_CSV_CONTRACT", () => {
    it("has 4 required columns", () => {
      const required = SHOW_BLOCK_CSV_CONTRACT.filter((c) => c.required);
      expect(required).toHaveLength(4);
      const names = required.map((c) => c.column);
      expect(names).toContain("show_id");
      expect(names).toContain("show_name");
      expect(names).toContain("starts_at_ct");
      expect(names).toContain("ends_at_ct");
    });

    it("has examples for all columns", () => {
      for (const col of SHOW_BLOCK_CSV_CONTRACT) {
        expect(col.example.length).toBeGreaterThan(0);
        expect(col.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe("parseShowBlocksFromCsv — policy", () => {
    it("always returns parsesOnly: true and no write/capture/publish flags", () => {
      const result = parseShowBlocksFromCsv(MINIMAL_VALID_CSV);
      expect(result.policy.parsesOnly).toBe(true);
      expect(result.policy.writesDatabase).toBe(false);
      expect(result.policy.capturesAudio).toBe(false);
      expect(result.policy.publishesOutput).toBe(false);
    });
  });

  describe("parseShowBlocksFromCsv — valid input", () => {
    it("parses minimal valid CSV with required columns only", () => {
      const result = parseShowBlocksFromCsv(MINIMAL_VALID_CSV);
      expect(result.errors).toHaveLength(0);
      expect(result.validBlocks).toHaveLength(2);
      expect(result.totalRows).toBe(2);
    });

    it("sets correct showId and showName", () => {
      const result = parseShowBlocksFromCsv(MINIMAL_VALID_CSV);
      const block = result.validBlocks[0]!;
      expect(block.showId).toBe("ch87-morning");
      expect(block.showName).toBe("Morning Show");
    });

    it("parses starts_at_ct and ends_at_ct correctly", () => {
      const result = parseShowBlocksFromCsv(MINIMAL_VALID_CSV);
      const block = result.validBlocks[0]!;
      expect(block.startsAtCt).toBe("06:00");
      expect(block.endsAtCt).toBe("10:00");
      expect(block.startHour).toBe(6);
      expect(block.endHour).toBe(10);
    });

    it("defaults optional fields when absent", () => {
      const result = parseShowBlocksFromCsv(MINIMAL_VALID_CSV);
      const block = result.validBlocks[0]!;
      expect(block.fantasyFocus).toBe(false);
      expect(block.bettingRelevance).toBe(false);
      expect(block.manualReviewRequired).toBe(true);
      expect(block.sourceConfidence).toBe("OPERATOR_PROVIDED");
      expect(block.rightsStatus).toBe("MANUAL_IMPORT_ONLY");
      expect(block.expectedHosts).toHaveLength(0);
      expect(block.sportFocus).toHaveLength(0);
    });

    it("parses full CSV with all optional columns", () => {
      const result = parseShowBlocksFromCsv(FULL_VALID_CSV);
      expect(result.errors).toHaveLength(0);
      expect(result.validBlocks).toHaveLength(2);
    });

    it("parses pipe-separated expected_hosts", () => {
      const result = parseShowBlocksFromCsv(FULL_VALID_CSV);
      const block = result.validBlocks[0]!;
      expect(block.expectedHosts).toEqual(["Alex Smith", "Jordan Lee"]);
    });

    it("parses pipe-separated sport_focus", () => {
      const result = parseShowBlocksFromCsv(FULL_VALID_CSV);
      const block = result.validBlocks[0]!;
      expect(block.sportFocus).toEqual(["NFL", "NBA"]);
    });

    it("parses boolean fantasy_focus and betting_relevance", () => {
      const result = parseShowBlocksFromCsv(FULL_VALID_CSV);
      const morning = result.validBlocks[0]!;
      const afternoon = result.validBlocks[1]!;
      expect(morning.fantasyFocus).toBe(true);
      expect(morning.bettingRelevance).toBe(true);
      expect(afternoon.fantasyFocus).toBe(false);
      expect(afternoon.bettingRelevance).toBe(true);
    });

    it("parses source_confidence and rights_status enums", () => {
      const result = parseShowBlocksFromCsv(FULL_VALID_CSV);
      expect(result.validBlocks[0]!.sourceConfidence).toBe("OPERATOR_PROVIDED");
      expect(result.validBlocks[1]!.sourceConfidence).toBe("MANUALLY_VERIFIED");
      expect(result.validBlocks[0]!.rightsStatus).toBe("MANUAL_IMPORT_ONLY");
      expect(result.validBlocks[1]!.rightsStatus).toBe("OPERATOR_NOTED");
    });

    it("parses operator_notes", () => {
      const result = parseShowBlocksFromCsv(FULL_VALID_CSV);
      expect(result.validBlocks[0]!.operatorNotes).toBe("Verified 2026-06-11");
    });

    it("parses TSV format", () => {
      const result = parseShowBlocksFromCsv(TSV_CSV);
      expect(result.errors).toHaveLength(0);
      expect(result.validBlocks).toHaveLength(1);
      expect(result.validBlocks[0]!.showId).toBe("ch87-evening");
    });

    it("reports presentColumns and requiredColumns", () => {
      const result = parseShowBlocksFromCsv(MINIMAL_VALID_CSV);
      expect(result.presentColumns).toContain("show_id");
      expect(result.presentColumns).toContain("starts_at_ct");
      expect(result.missingRequiredColumns).toHaveLength(0);
    });

    it("includes generatedAt timestamp", () => {
      const now = new Date("2026-06-11T12:00:00.000Z");
      const result = parseShowBlocksFromCsv(MINIMAL_VALID_CSV, now);
      expect(result.generatedAt).toBe("2026-06-11T12:00:00.000Z");
    });
  });

  describe("parseShowBlocksFromCsv — schema errors", () => {
    it("returns schema error when required columns are missing", () => {
      const badCsv = `show_id,show_name
morning-show,Morning Show`;
      const result = parseShowBlocksFromCsv(badCsv);
      expect(result.validBlocks).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.showId).toBe("(schema)");
      expect(result.missingRequiredColumns).toContain("starts_at_ct");
      expect(result.missingRequiredColumns).toContain("ends_at_ct");
    });
  });

  describe("parseShowBlocksFromCsv — row validation errors", () => {
    it("rejects row with invalid starts_at_ct format", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct
bad-time,Morning,6am,10:00`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.showId).toBe("bad-time");
      expect(result.errors[0]!.errors.some((e) => e.includes("starts_at_ct"))).toBe(true);
    });

    it("rejects row with start hour >= end hour", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct
bad-order,Morning,12:00,08:00`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.errors.some((e) => e.includes("startHour"))).toBe(true);
    });

    it("rejects row with start hour outside 05:00-23:00 window", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct
late-night,Night Owl,02:00,04:00`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.errors.some((e) => e.includes("outside the"))).toBe(true);
    });

    it("rejects invalid source_confidence value", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct,source_confidence
morning-show,Morning,06:00,10:00,UNKNOWN_VALUE`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.errors.some((e) => e.includes("source_confidence"))).toBe(true);
    });

    it("rejects invalid rights_status value", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct,rights_status
morning-show,Morning,06:00,10:00,TOTALLY_FREE`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.errors.some((e) => e.includes("rights_status"))).toBe(true);
    });

    it("collects errors per row while still returning valid rows from other rows", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct
good-row,Good Show,06:00,10:00
bad-row,Bad Show,99:00,10:00`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.validBlocks).toHaveLength(1);
      expect(result.validBlocks[0]!.showId).toBe("good-row");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.showId).toBe("bad-row");
    });

    it("reports rowIndex for errors (1-based)", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct
good,Good,06:00,10:00
bad,Bad,99:00,10:00`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.errors[0]!.rowIndex).toBe(2);
    });
  });

  describe("parseShowBlocksFromCsv — edge cases", () => {
    it("handles empty CSV (header only)", () => {
      const csv = "show_id,show_name,starts_at_ct,ends_at_ct";
      const result = parseShowBlocksFromCsv(csv);
      expect(result.validBlocks).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.totalRows).toBe(0);
    });

    it("strips BOM character from CSV", () => {
      const csv = "﻿show_id,show_name,starts_at_ct,ends_at_ct\nch87-morning,Morning,06:00,10:00";
      const result = parseShowBlocksFromCsv(csv);
      expect(result.validBlocks).toHaveLength(1);
    });

    it("handles rows with empty show_id gracefully", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct
,Empty ID Show,06:00,10:00`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.showId).toBe("(unknown)");
    });

    it("trims whitespace from cell values", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct
  ch87-morning  ,  Morning Show  ,  06:00  ,  10:00  `;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.validBlocks).toHaveLength(1);
      expect(result.validBlocks[0]!.showId).toBe("ch87-morning");
    });

    it("empty sport_focus cell produces empty array", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct,sport_focus
ch87-morning,Morning,06:00,10:00,`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.validBlocks[0]!.sportFocus).toHaveLength(0);
    });

    it("accepts SAMPLE_PLACEHOLDER as source_confidence (for migration from sample data)", () => {
      const csv = `show_id,show_name,starts_at_ct,ends_at_ct,source_confidence
ch87-morning,Morning,06:00,10:00,SAMPLE_PLACEHOLDER`;
      const result = parseShowBlocksFromCsv(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.validBlocks[0]!.sourceConfidence).toBe("SAMPLE_PLACEHOLDER");
    });
  });
});
