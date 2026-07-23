#!/usr/bin/env tsx
/**
 * Export the compliance evidence pack — `tsx scripts/compliance/export-evidence-pack.ts`.
 *
 * Loads the last real ComplianceCheckRun + a sample of real
 * ComplianceEvidence rows from Postgres (via apps/web/lib/compliance/store.ts),
 * builds the pack with @sports/compliance's exportCompliancePack, and writes
 * it to docs/compliance/exports/compliance-pack-YYYYMMDD.json.
 *
 * The pack is an internal alignment artifact ONLY — see the disclaimer
 * baked into exportCompliancePack ("Internal alignment pack only. Not a
 * SOC 2 report or ISO 27001 certificate."). Never present this file, or any
 * output derived from it, as a certification.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCompliancePack, type CcmRunResult, type ControlCheckResult } from "@sports/compliance";
import { loadLastRun, sampleEvidence } from "../../apps/web/lib/compliance/store";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const [lastRunRow, evidenceSample] = await Promise.all([
    loadLastRun(),
    sampleEvidence(50),
  ]);

  const lastCcmRun: CcmRunResult | null = lastRunRow
    ? {
        at: lastRunRow.at.toISOString(),
        ok: lastRunRow.ok,
        results: lastRunRow.results as unknown as ControlCheckResult[],
      }
    : null;

  const pack = exportCompliancePack({ lastCcmRun, evidenceSample });

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outDir = resolve(__dirname, "../../docs/compliance/exports");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `compliance-pack-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(pack, null, 2) + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log(`[export-evidence-pack] wrote ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[export-evidence-pack] failed:", err);
  process.exit(1);
});
