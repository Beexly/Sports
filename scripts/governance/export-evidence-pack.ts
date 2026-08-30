#!/usr/bin/env tsx
/**
 * EU AI Act evidence-pack export CLI.
 *
 * Gathers `EvidenceItem[]` from whatever sources actually exist in THIS
 * repo/branch and writes `buildEvidencePack(items)` to
 * docs/governance/exports/evidence-pack-YYYYMMDD.json.
 *
 * Honesty rule (see docs/governance/EU_AI_ACT_EVIDENCE_PACK.md): every source
 * below is optional. If a source is absent, unreachable, or errors, this
 * script logs that plainly and SKIPS it — it never fabricates a placeholder
 * EvidenceItem pretending to be real. A pack with fewer items than sources
 * checked is the expected, correct output, not a failure.
 *
 * This script deliberately does NOT import anything from
 * apps/web/lib/ai-control-plane/internal.ts (or any of its other sealed
 * modules — internal, executor, cost-mode, emergency): per the sealing
 * guardrail (scripts/guardrails/ai-control-plane-sealing.mjs) and the
 * precedent in scripts/activate-srqc-version.mjs, a root script must not
 * reach across that boundary. Where it needs SrqcVersion data it talks to
 * Postgres directly with `pg`, mirroring formal-incident.ts's query shape.
 *
 * Sources checked, and how each is skipped when unavailable:
 *   1. AgentReceipt-shaped rows — packages/db/prisma/schema.prisma on this
 *      branch has no such model (checked at run time by inspecting the
 *      schema file). Skipped honestly; not fabricated.
 *   2. The active SrqcVersion row — queried directly via `pg` against
 *      DATABASE_URL, if set. Skipped (with a logged reason) if DATABASE_URL
 *      is unset or the query fails (e.g. no DB reachable, table absent).
 *   3. docs/formal/SRQC_STATUS.md — included (path + current git hash of the
 *      file) only if it exists in the working tree.
 *   4. docs/governance/COMPLIANCE_MATRIX.md — included (path + current git
 *      hash) only if it exists in the working tree.
 *
 * Usage: npx tsx scripts/governance/export-evidence-pack.ts
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import {
  buildEvidencePack,
  type EvidenceItem,
} from "../../apps/web/lib/governance/evidence-pack";

const scriptPath = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(scriptPath), "..", "..");

function log(message: string): void {
  console.log(`[export-evidence-pack] ${message}`);
}

/** Git hash of a tracked (or untracked-but-present) file's current content. */
function gitHashOf(absPath: string): string | null {
  try {
    return execFileSync("git", ["hash-object", absPath], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

async function collectAgentReceiptEvidence(): Promise<EvidenceItem[]> {
  const schemaPath = resolve(REPO_ROOT, "packages/db/prisma/schema.prisma");
  if (!existsSync(schemaPath)) {
    log("packages/db/prisma/schema.prisma not found — skipping AgentReceipt source.");
    return [];
  }
  const schema = readFileSync(schemaPath, "utf8");
  if (!/model\s+AgentReceipt\b/.test(schema)) {
    log(
      "No `AgentReceipt` model in packages/db/prisma/schema.prisma on this branch " +
        "(owned by a separate, in-flight track) — skipping this source honestly, not fabricating rows.",
    );
    return [];
  }
  // If/when the model lands, wire a real bounded query here (e.g. latest N
  // receipts) via `pg`, matching the SrqcVersion query pattern below.
  log(
    "`AgentReceipt` model is present but no query is wired yet — skipping rather than guessing a shape.",
  );
  return [];
}

async function collectSrqcVersionEvidence(): Promise<EvidenceItem[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log("DATABASE_URL not set — skipping active SrqcVersion source.");
    return [];
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const { rows } = await client.query<{
      version: number;
      indInvHash: string;
      activatedAt: Date | null;
    }>(
      `SELECT "version", "indInvHash", "activatedAt" FROM "srqc_version" WHERE "status" = 'active' LIMIT 1`,
    );
    if (rows.length === 0) {
      log("No active SrqcVersion row found — skipping this source.");
      return [];
    }
    const row = rows[0];
    if (row === undefined) {
      log("No active SrqcVersion row found — skipping this source.");
      return [];
    }
    return [
      {
        id: `srqc-version-${row.version}`,
        control: "SRQC certificate version register (active)",
        artifactPath: `db:srqc_version#version=${row.version}`,
        euTheme: "technical-documentation",
      },
    ];
  } catch (err) {
    log(
      `Could not query active SrqcVersion (${err instanceof Error ? err.message : String(err)}) — skipping this source.`,
    );
    return [];
  } finally {
    await client.end().catch(() => {});
  }
}

function collectDocEvidenceIfPresent(
  relPath: string,
  control: string,
  euTheme: string,
): EvidenceItem[] {
  const absPath = resolve(REPO_ROOT, relPath);
  if (!existsSync(absPath)) {
    log(`${relPath} not present on this branch — skipping this source.`);
    return [];
  }
  const hash = gitHashOf(absPath);
  return [
    {
      id: relPath.replace(/[/.]/g, "-"),
      control,
      artifactPath: hash ? `${relPath}#${hash}` : relPath,
      euTheme,
    },
  ];
}

async function main(): Promise<void> {
  const items: EvidenceItem[] = [
    ...(await collectAgentReceiptEvidence()),
    ...(await collectSrqcVersionEvidence()),
    ...collectDocEvidenceIfPresent(
      "docs/formal/SRQC_STATUS.md",
      "Formal Foundry SRQC status",
      "technical-documentation",
    ),
    ...collectDocEvidenceIfPresent(
      "docs/governance/COMPLIANCE_MATRIX.md",
      "Governance compliance matrix",
      "risk-management",
    ),
  ];

  const pack = buildEvidencePack(items);

  const outDir = resolve(REPO_ROOT, "docs/governance/exports");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = resolve(outDir, `evidence-pack-${stamp}.json`);
  writeFileSync(outPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

  log(`Wrote ${items.length} item(s) to ${outPath}`);
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === scriptPath;
if (isDirectRun) {
  main().catch((err) => {
    console.error("[export-evidence-pack] failed:", err);
    process.exit(1);
  });
}

export { main, collectAgentReceiptEvidence, collectSrqcVersionEvidence, collectDocEvidenceIfPresent };
