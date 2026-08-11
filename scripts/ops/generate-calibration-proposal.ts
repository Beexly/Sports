#!/usr/bin/env tsx
/**
 * Generates a CalibrationProposal DRAFT for a MODEL_VERSION freeze decision.
 *
 * Thin CLI over apps/web/lib/ops/calibration-proposal-draft.ts — the same split
 * compare-shadow-vs-live.ts uses over shadow-vs-live-report.ts. This file owns the
 * DB read, argv, and output; all scoring and rendering (and the safety assertion
 * that the draft can never satisfy the freeze guardrail) live in the pure module,
 * where they are unit-tested.
 *
 * scripts/guardrails/model-freeze.mjs accepts exactly two evidence forms for a
 * MODEL_VERSION bump: a CalibrationProposal row in packages/db/prisma/seed.ts whose
 * status field reads IMPLEMENTED, or a docs/calibration-proposals/<slug>.md file
 * declaring the same. This script produces NEITHER. It prints an OPEN draft — the
 * Brier/RES evidence a human reviews before deciding whether to promote it.
 *
 * Read-only: only reads ShadowSignal rows. Fails open (empty results) under
 * @sports/db's stub mode when DATABASE_URL is unset, like every other ops script here.
 *
 * Usage:
 *   npx tsx scripts/ops/generate-calibration-proposal.ts [--n=200] [--out=path.md]
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, isStubMode } from "@sports/db";
import { MODEL_VERSION } from "@sports/prediction-engine";
import {
  buildCalibrationProposalDraft,
  type CalibrationProposalRow,
} from "../../apps/web/lib/ops/calibration-proposal-draft";

const PROPOSALS_DIR = resolve(process.cwd(), "docs/calibration-proposals");

/** Default rows to pull when --n is not passed. */
const DEFAULT_N = 200;

interface Args {
  readonly n: number;
  readonly out: string | null;
}

function parseArgs(argv: readonly string[]): Args {
  let n = DEFAULT_N;
  let out: string | null = null;
  for (const arg of argv) {
    const nMatch = arg.match(/^--n=(\d+)$/);
    if (nMatch && nMatch[1] !== undefined) n = Math.max(1, parseInt(nMatch[1], 10));
    const outMatch = arg.match(/^--out=(.+)$/);
    if (outMatch && outMatch[1] !== undefined) out = outMatch[1];
  }
  return { n, out };
}

/** Last N settled rows, any model version, newest-first fetch reversed to chronological. */
async function loadLastNSettled(n: number): Promise<readonly CalibrationProposalRow[]> {
  const rows = await db.shadowSignal
    .findMany({
      where: { outcome: { not: null } },
      select: {
        gameId: true,
        modelVersion: true,
        shadowProb: true,
        marketProb: true,
        liveConfidence: true,
        outcome: true,
        settledAt: true,
      },
      orderBy: { settledAt: "desc" },
      take: n,
    })
    .catch(() => null);
  if (rows === null) return [];
  return rows
    .filter((r): r is (typeof rows)[number] & { outcome: number } => r.outcome !== null)
    .reverse();
}

async function main(): Promise<void> {
  const { n, out } = parseArgs(process.argv.slice(2));

  if (out) {
    const resolvedOut = resolve(process.cwd(), out);
    if (resolvedOut === PROPOSALS_DIR || resolvedOut.startsWith(PROPOSALS_DIR + "/")) {
      console.error(
        "[generate-calibration-proposal] refusing --out under docs/calibration-proposals/ — " +
          "landing evidence there is a human decision (see scripts/guardrails/model-freeze.mjs). " +
          "Write the draft elsewhere and promote it manually after review.",
      );
      process.exit(1);
    }
  }

  if (isStubMode()) {
    console.warn(
      "[generate-calibration-proposal] @sports/db stub mode — DATABASE_URL unset, all reads return empty.",
    );
  }

  const rows = await loadLastNSettled(n);
  const draft = buildCalibrationProposalDraft({
    rows,
    modelVersion: MODEL_VERSION,
    requestedN: n,
    generatedAt: new Date().toISOString(),
  });

  if (out) {
    writeFileSync(resolve(process.cwd(), out), draft.markdown, "utf8");
    console.log(
      `[generate-calibration-proposal] wrote DRAFT to ${out} ` +
        `(status OPEN — not evidence until a human reviews and promotes it). ` +
        `scored=${draft.currentVersionRows} excluded=${draft.excludedOtherVersionRows} ` +
        `verdict=${draft.report.verdict} automatedFloor=${draft.validity.meetsAutomatedFloor}`,
    );
  } else {
    console.log(draft.markdown);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[generate-calibration-proposal] FAILED: ${err instanceof Error ? err.stack : err}`);
    process.exit(1);
  });
