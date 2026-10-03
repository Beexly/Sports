#!/usr/bin/env tsx
/**
 * W6 ablation report — `tsx scripts/srqc-ablation-report.ts [--since ISO] [--until ISO] [--window-days N]`.
 *
 * Script-only, per the explicit "no auto ENFORCE, admin/script output only"
 * constraint. Prints a JSON report of TP/FP counters over `FormalIncident`
 * rows in a window, computed purely from the `reviewOutcome` human-review
 * label. No new table — this is a derived, recomputable view. Redirect
 * stdout to a file for a point-in-time snapshot if one is wanted.
 */
import { computeAblationCounters } from "../apps/web/lib/ai-control-plane/ablation-counters";
import { prismaSqlClient } from "../apps/web/lib/ai-control-plane/control-store";
import { db } from "@sports/db";

const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function parseArgs(argv: readonly string[]): { since?: string; until?: string; windowDays?: string } {
  const out: { since?: string; until?: string; windowDays?: string } = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--since" && value !== undefined) {
      out.since = value;
      i += 1;
    } else if (arg === "--until" && value !== undefined) {
      out.until = value;
      i += 1;
    } else if (arg === "--window-days" && value !== undefined) {
      out.windowDays = value;
      i += 1;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const untilExclusive = args.until !== undefined ? new Date(args.until) : new Date();
  const sinceInclusive =
    args.since !== undefined
      ? new Date(args.since)
      : new Date(
          untilExclusive.getTime() -
            (args.windowDays !== undefined ? Number(args.windowDays) * 24 * 60 * 60 * 1000 : DEFAULT_WINDOW_MS),
        );

  const report = await computeAblationCounters(prismaSqlClient(db), { sinceInclusive, untilExclusive });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[srqc-ablation-report] failed:", err);
    process.exit(1);
  });
}
