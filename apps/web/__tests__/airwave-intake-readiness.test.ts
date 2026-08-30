import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseAirwaveDelimitedTable,
  readAirwaveIntakeReadiness,
} from "@/lib/airwave/intake-readiness";

const ORIGINAL_ENV = { ...process.env };

const VALID_CSV = [
  "aired_at_ct,show,segment,speaker,paraphrased_claim,sport,entity,claim_type,confidence,rights_status,source_pointer,operator_status",
  '2026-06-05 08:15,Galaxy AM,H1,Host,"Role change for Smith, higher route share",NFL,Smith,INJURY_READ,lean,owned,private://clip-1,approved',
  "2026-06-05 09:05,Galaxy AM,H2,Guest,Paywalled report needs permission,NFL,Jones,role change,hedged,permission-required,private://clip-2,approved",
  "2026-06-05 10:10,Galaxy AM,H3,Desk,Depth note still in draft,NFL,Bears,depth,lean,licensed,private://clip-3,draft",
].join("\n");

function tempCsv(content: string): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), "gse-airwave-intake-"));
  const file = join(dir, "secret-owner-transcripts.csv");
  writeFileSync(file, content, "utf8");
  return { dir, file };
}

describe("Airwave intake readiness", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("reports UNKNOWN instead of inventing rows when no local transcript file is configured", async () => {
    const report = await readAirwaveIntakeReadiness({}, new Date("2026-06-05T12:00:00Z"));

    expect(report.source.status).toBe("not-configured");
    expect(report.source.rowCount).toBe("UNKNOWN");
    expect(report.rows.total).toBe("UNKNOWN");
    expect(report.gates.canWriteRows).toBe(false);
    expect(report.policy.exposesFilePath).toBe(false);
    expect(report.policy.exposesTranscriptText).toBe(false);
  });

  it("validates a local transcript CSV without exposing the file path or transcript text", async () => {
    const { dir, file } = tempCsv(VALID_CSV);
    try {
      const report = await readAirwaveIntakeReadiness(
        {
          AIRWAVE_ENABLED: "true",
          AIRWAVE_TRANSCRIPT_IMPORT_ENABLED: "true",
          AIRWAVE_TRANSCRIPT_FILE_PATH: file,
        },
        new Date("2026-06-05T12:00:00Z"),
      );

      expect(report.source.status).toBe("review-ready");
      expect(report.source.fileKind).toBe(".csv");
      expect(report.rows.total).toBe(3);
      expect(report.rows.requiredComplete).toBe(3);
      expect(report.rows.reviewReady).toBe(1);
      expect(report.rows.approved).toBe(1);
      expect(report.rows.rightsHeld).toBe(1);
      expect(report.rows.operatorDraft).toBe(1);
      expect(report.rows.entityTagged).toBe(3);
      expect(report.rows.breakingNews).toBe(3);
      expect(report.gates.canStageForReview).toBe(true);

      const body = JSON.stringify(report);
      expect(body).not.toContain(file);
      expect(body).not.toContain("secret-owner-transcripts");
      expect(body).not.toContain("Role change for Smith");
      expect(body).not.toContain("private://clip-1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("holds a reachable file when required contract columns are missing", async () => {
    const { dir, file } = tempCsv("show,entity,rights_status\nGalaxy AM,Smith,owned\n");
    try {
      const report = await readAirwaveIntakeReadiness(
        { AIRWAVE_TRANSCRIPT_FILE_PATH: file },
        new Date("2026-06-05T12:00:00Z"),
      );

      expect(report.source.status).toBe("invalid-contract");
      expect(report.rows.total).toBe(1);
      expect(report.contract.missingRequiredColumns).toContain("aired_at_ct");
      expect(report.contract.missingRequiredColumns).toContain("operator_status");
      expect(report.gates.canStageForReview).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("parses quoted CSV cells and tab-delimited exports", () => {
    const csv = parseAirwaveDelimitedTable('show,paraphrased_claim\nAM,"Kupp, routes up"\n');
    const tsv = parseAirwaveDelimitedTable("show\tparaphrased_claim\nPM\tRoutes up\n");

    expect(csv.rows[0]?.["paraphrased_claim"]).toBe("Kupp, routes up");
    expect(tsv.rows[0]?.["paraphrased_claim"]).toBe("Routes up");
  });
});
