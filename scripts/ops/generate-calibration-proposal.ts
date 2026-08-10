#!/usr/bin/env tsx
/**
 * Generates a CalibrationProposal DRAFT for a MODEL_VERSION freeze decision.
 *
 * scripts/guardrails/model-freeze.mjs accepts exactly two evidence forms for a
 * MODEL_VERSION bump: a `CalibrationProposal` row in packages/db/prisma/seed.ts
 * with status "IMPLEMENTED", or a docs/calibration-proposals/<slug>.md file whose
 * front-matter declares `modelVersion: <version>` and `status: IMPLEMENTED`. This
 * script produces NEITHER. It prints a `status: OPEN` draft — the Brier/RES
 * evidence a human reviews before deciding whether to promote it into one of
 * those two forms. It never writes MODEL_VERSION, never writes into
 * docs/calibration-proposals/, and never sets status: IMPLEMENTED itself; those
 * are exactly the actions the guardrail exists to gate behind human review.
 *
 * Scoring reuses buildShadowVsLiveReport (apps/web/lib/ops/shadow-vs-live-report.ts)
 * rather than a second Brier/RES calculator — same comparison the weekly
 * compare-shadow-vs-live.ts job posts, just over the last N settled rows instead
 * of a fixed 7-day window, and restricted to the CURRENT MODEL_VERSION so a prior
 * version's shadow performance can't be counted as evidence for this one.
 *
 * Read-only: only reads ShadowSignal rows. Fails open (empty results) under
 * @sports/db's stub mode when DATABASE_URL is unset, same as every other ops
 * script here.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { db, isStubMode } from "@sports/db";
import { MODEL_VERSION } from "@sports/prediction-engine";
import {
  buildShadowVsLiveReport,
  renderShadowVsLiveMarkdown,
  MIN_COMPARISON_SAMPLE,
  BRIER_TIE_BAND,
  type ShadowVsLiveReport,
} from "../../apps/web/lib/ops/shadow-vs-live-report";
import type { SettledShadowRow } from "../../apps/web/lib/ops/shadow-signal-store";

const PROPOSALS_DIR = resolve(process.cwd(), "docs/calibration-proposals");

/** Default rows to pull when --n is not passed. */
const DEFAULT_N = 200;

/**
 * A MODEL_VERSION-freeze claim is a stronger statement than "not noise" — it
 * retroactively re-labels historical confidence numbers. This mirrors the
 * n>=100 bar `wouldPassBrierFloor` already applies elsewhere in the calibration
 * surface (apps/web/lib/calibration/ranking-power-control.ts), stricter than the
 * n>=20 MIN_COMPARISON_SAMPLE floor that only guards against reporting pure noise.
 */
const PROPOSAL_MIN_N = 100;

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

interface FetchedRow extends SettledShadowRow {
  readonly settledAt: Date | null;
}

/** Last N settled rows, any model version, newest-first fetch reversed to chronological. */
async function loadLastNSettled(n: number): Promise<readonly FetchedRow[]> {
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

function versionBreakdown(rows: readonly FetchedRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.modelVersion, (counts.get(r.modelVersion) ?? 0) + 1);
  return counts;
}

function formatDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "n/a";
}

function renderArtifact(input: {
  readonly modelVersion: string;
  readonly requestedN: number;
  readonly fetchedN: number;
  readonly versions: Map<string, number>;
  readonly currentVersionN: number;
  readonly earliestDate: Date | null;
  readonly latestDate: Date | null;
  readonly report: ShadowVsLiveReport;
}): string {
  const { modelVersion, requestedN, fetchedN, versions, currentVersionN, earliestDate, latestDate, report } = input;
  const otherVersionCount = fetchedN - currentVersionN;

  const versionLines =
    [...versions.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([v, count]) => `  - ${v}: ${count} row(s)`)
      .join("\n") || "  - (none — no settled ShadowSignal rows found)";

  const meetsFloor = report.comparedGames >= MIN_COMPARISON_SAMPLE;
  const meetsProposalN = report.comparedGames >= PROPOSAL_MIN_N;
  const isShadowBetter = report.verdict === "shadow-better";
  const realAdvantage = report.brierAdvantage !== null && report.brierAdvantage > BRIER_TIE_BAND;
  const beatsMarket = report.shadow !== null && report.market !== null && report.shadow.brier < report.market.brier;
  const noContamination = otherVersionCount === 0;

  const checklist = [
    `- [${meetsFloor ? "x" : " "}] comparedGames >= ${MIN_COMPARISON_SAMPLE} (statistical floor — below this a verdict is noise, not evidence)`,
    `- [${meetsProposalN ? "x" : " "}] comparedGames >= ${PROPOSAL_MIN_N} (load-bearing floor for a MODEL_VERSION-freeze claim)`,
    `- [${isShadowBetter ? "x" : " "}] verdict === "shadow-better" (live-better or tied is not evidence FOR the bump)`,
    `- [${realAdvantage ? "x" : " "}] Brier advantage > ${BRIER_TIE_BAND} tie band (a real improvement, not noise inside the band)`,
    `- [${beatsMarket ? "x" : " "}] shadow.brier < market.brier (beats the market baseline — beating the live engine alone is not an edge)`,
    `- [${noContamination ? "x" : " "}] every compared row carries modelVersion === "${modelVersion}" (${otherVersionCount} row(s) from a different version were excluded, not counted)`,
    `- [ ] holds across >= 2 independent weekly compare-shadow-vs-live.ts runs, not just this one snapshot (one window is one observation)`,
    `- [ ] reviewed by a human and promoted to status: IMPLEMENTED in packages/db/prisma/seed.ts OR docs/calibration-proposals/<slug>.md — this script never does that step`,
  ].join("\n");

  const automatedFloorMet = meetsFloor && meetsProposalN && isShadowBetter && realAdvantage && beatsMarket && noContamination;

  return `---
modelVersion: ${modelVersion}
status: OPEN
generatedAt: ${new Date().toISOString()}
generatedBy: scripts/ops/generate-calibration-proposal.ts (auto-generated DRAFT — not reviewed)
---

# CalibrationProposal (DRAFT) — shadow vs live evidence for ${modelVersion}

**status: OPEN — this is NOT an IMPLEMENTED proposal.** \`scripts/guardrails/model-freeze.mjs\`
only accepts evidence with \`status: IMPLEMENTED\`. This file does not satisfy the guardrail
as written, and this script never writes it into \`docs/calibration-proposals/\` or
\`seed.ts\` — a human reviews the checklist below and makes that call.

## Sample

- Requested last ${requestedN} settled ShadowSignal row(s); fetched ${fetchedN}.
- Model versions present in the fetch window:
${versionLines}
- Rows matching current MODEL_VERSION (${modelVersion}): ${currentVersionN}
- Rows excluded as a different model version: ${otherVersionCount} (a different version's shadow performance is not evidence for THIS version's freeze)
- Date range (current-version, compared games): ${formatDate(earliestDate)} to ${formatDate(latestDate)}

## Evidence

${renderShadowVsLiveMarkdown(report)}

## Validity checklist (every box must be checked before this is real evidence)

${checklist}

## Verdict

${
  automatedFloorMet
    ? "MEETS the automated validity floor above. Still requires the two unchecked human-review items before promotion."
    : "DOES NOT yet meet the automated validity floor above. Accumulate more settled shadow signals on the current MODEL_VERSION and re-run before proposing a freeze."
}
`;
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
  const versions = versionBreakdown(rows);
  const currentVersionRows = rows.filter((r) => r.modelVersion === MODEL_VERSION);
  const report = buildShadowVsLiveReport(currentVersionRows);

  const earliestDate = currentVersionRows[0]?.settledAt ?? null;
  const latestDate = currentVersionRows[currentVersionRows.length - 1]?.settledAt ?? null;

  const artifact = renderArtifact({
    modelVersion: MODEL_VERSION,
    requestedN: n,
    fetchedN: rows.length,
    versions,
    currentVersionN: currentVersionRows.length,
    earliestDate,
    latestDate,
    report,
  });

  if (out) {
    writeFileSync(resolve(process.cwd(), out), artifact, "utf8");
    console.log(
      `[generate-calibration-proposal] wrote DRAFT to ${out} (status: OPEN — not evidence until a human reviews and promotes it)`,
    );
  } else {
    console.log(artifact);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[generate-calibration-proposal] FAILED: ${err instanceof Error ? err.stack : err}`);
    process.exit(1);
  });
