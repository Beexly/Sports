import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { GET } from "@/app/api/cron/compound-fabric-audit/route";
import { probeCompoundFabricAndGsiHealth } from "@/lib/autonomy/compound-fabric-probe";

function makeReq(auth?: string): Request {
  return new Request(
    "https://www.galaxysportsedge.com/api/cron/compound-fabric-audit",
    auth ? { headers: { authorization: auth } } : undefined,
  );
}

describe("GET /api/cron/compound-fabric-audit & probeCompoundFabricAndGsiHealth", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unauthenticated requests with 401 (Bearer-only auth)", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);

    const badRes = await GET(makeReq("Bearer wrong-secret"));
    expect(badRes.status).toBe(401);
  });

  it("verifies live repo artifacts and is 100% idempotent under repeat firing", async () => {
    const r1 = await GET(makeReq("Bearer test-cron-secret"));
    const r2 = await GET(makeReq("Bearer test-cron-secret"));

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.headers.get("cache-control")).toBe("no-store");

    const b1 = (await r1.json()) as Record<string, unknown>;
    const b2 = (await r2.json()) as Record<string, unknown>;

    expect(b1.ok).toBe(true);
    expect(b1.idempotent).toBe(true);
    expect(b1.artifactsPresent).toBe(true);
    expect(b1.gsiRuleInDoctrineHeld).toBe(true);
    expect(b1.routerBitCount).toBe(276);
    expect(b1.filesSwept).toBeGreaterThanOrEqual(12469);
    expect(b1.manifest877PdfCount).toBe(877);
    expect(b1.lessonsLedgerCount).toBeGreaterThanOrEqual(32);
    expect(b1.sarEvaluatedCompounds).toBe(81);
    expect(b1.sarDownsampled).toBe(false);
    expect(b1.gfapDisorderWarningHeld).toBe(true);
    expect(b1.failureReasons).toEqual([]);

    expect(b2.ok).toBe(b1.ok);
    expect(b2.routerBitCount).toBe(b1.routerBitCount);
    expect(b2.filesSwept).toBe(b1.filesSwept);
    expect(b2.sarEvaluatedCompounds).toBe(b1.sarEvaluatedCompounds);
    expect(b2.gsiRuleInDoctrineHeld).toBe(b1.gsiRuleInDoctrineHeld);
  });

  it("flags ADR-0003 violation and downsampling fail-closed without throwing", () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "gse-fabric-probe-"));
    try {
      const engineDir = path.join(tmpDir, "data", "engine");
      mkdirSync(engineDir, { recursive: true });
      writeFileSync(
        path.join(engineDir, "foundry_compound_corpus_index_2026.json"),
        JSON.stringify({
          generated_at_utc: "2026-11-16T18:00:00Z",
          files_swept: 12469,
          primitives_extracted_total: 47645,
          lessons_ledger_count: 32,
          manifest_877_pdfs_count: 877,
          router_288bit_mask_hex: [
            "0xffffffff",
            "0xffffffff",
            "0xffffffff",
            "0xffffffff",
            "0xffffffff",
            "0xffffffff",
            "0xffffffff",
            "0xffffffff",
            "0x000fffff",
          ],
        }),
        "utf8",
      );
      writeFileSync(
        path.join(engineDir, "gsi_wave16_translational_and_datascience_telemetry_2026.json"),
        JSON.stringify({
          biomarker_structures: [
            { gene_symbol: "UCHL1", rule_in_only_doctrine: false, intrinsically_disordered_warning: false },
            { gene_symbol: "GFAP", rule_in_only_doctrine: true, intrinsically_disordered_warning: true },
            { gene_symbol: "MMP13", rule_in_only_doctrine: true, intrinsically_disordered_warning: false },
          ],
          sar_benchmark: {
            evaluated_compounds: 40,
            total_compounds: 81,
            downsampled: true,
            top_attributed_features: ["cLogP"],
          },
          progression_reports: [{ metric_name: "week10_team_pass_yds_mae" }],
        }),
        "utf8",
      );

      const probe = probeCompoundFabricAndGsiHealth({
        repoRoot: tmpDir,
        nowMs: Date.parse("2026-11-16T19:00:00Z"),
      });
      expect(probe.artifactsPresent).toBe(true);
      expect(probe.ok).toBe(false);
      expect(probe.gsiRuleInDoctrineHeld).toBe(false);
      expect(probe.compoundFabricAgeMinutes).toBe(60);
      expect(probe.failureReasons).toContain("adr0003_rule_in_only_doctrine_violated");
      expect(probe.failureReasons).toContain("sar_downsampled_violation");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
