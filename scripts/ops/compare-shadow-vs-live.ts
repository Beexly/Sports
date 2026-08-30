#!/usr/bin/env tsx
/**
 * Weekly offline comparison: shadow engine vs. live engine vs. market, scored
 * against real settled `ShadowSignal` rows only. Read-only — never touches a
 * `Pick`, never routes traffic. Writes `comparison-report.md` for the workflow
 * to post as a GitHub issue (see .github/workflows/weekly-comparison.yml).
 *
 * ALWAYS posts the report, regardless of verdict. Posting only when the shadow
 * engine wins would be exactly the cherry-picking this repo's own
 * slate-commitment / proof-receipt machinery exists to prevent elsewhere —
 * silently favorable reporting is a worse failure mode than an honest loss.
 */
import { writeFileSync } from "node:fs";
import { db } from "@sports/db";
import { buildShadowVsLiveReport, renderShadowVsLiveMarkdown } from "../../apps/web/lib/ops/shadow-vs-live-report";
import type { SettledShadowRow } from "../../apps/web/lib/ops/shadow-signal-store";

const WINDOW_DAYS = 7;

async function loadSettledLastWeek(): Promise<readonly SettledShadowRow[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db.shadowSignal.findMany({
    where: { outcome: { not: null }, settledAt: { gte: since } },
    select: {
      gameId: true,
      modelVersion: true,
      shadowProb: true,
      marketProb: true,
      liveConfidence: true,
      outcome: true,
    },
    orderBy: { settledAt: "asc" },
  });
  return rows.filter((r): r is SettledShadowRow => r.outcome !== null);
}

async function main(): Promise<void> {
  const rows = await loadSettledLastWeek();
  const report = buildShadowVsLiveReport(rows);
  const markdown =
    renderShadowVsLiveMarkdown(report) +
    `\n\n_Window: last ${WINDOW_DAYS} days. Generated ${new Date().toISOString()}._\n`;

  writeFileSync("comparison-report.md", markdown, "utf8");
  console.log(`[compare-shadow-vs-live] wrote comparison-report.md — verdict: ${report.verdict}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // A failed comparison run must not silently produce no report — write an
    // honest failure notice instead of leaving the workflow's next step to
    // post a stale or missing file.
    console.error(`[compare-shadow-vs-live] FAILED: ${err instanceof Error ? err.stack : err}`);
    writeFileSync(
      "comparison-report.md",
      `## Shadow vs live — offline comparison\n\n**Run FAILED.** ${
        err instanceof Error ? err.message : String(err)
      }\n\nSee the workflow run log for the full trace.\n`,
      "utf8",
    );
    process.exit(1);
  });
