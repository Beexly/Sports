#!/usr/bin/env node
/**
 * Prune old Claude usage log rows from the claude_usage_logs Postgres table.
 *
 * Invoked by .github/workflows/telemetry-prune.yml on a weekly schedule.
 * Also safe to run manually when the table grows unexpectedly.
 *
 * Honors CLAUDE_LOG_RETENTION_DAYS (default 90). Rows whose `ts` column
 * is older than the retention window are deleted in a single deleteMany.
 * Exits 0 on success (including "nothing to prune"); exits 1 on any
 * Prisma or config error.
 *
 * Hard Rule §6 compatible: read-then-delete only. No Claude calls, no
 * PR, no external surface. The deleted count goes to stdout as JSON.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const DEFAULT_RETENTION_DAYS = 90;
const retentionDays = Number(
  process.env.CLAUDE_LOG_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS
);

if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
  console.error(
    `[prune-claude-usage-logs] CLAUDE_LOG_RETENTION_DAYS must be > 0 (got ${process.env.CLAUDE_LOG_RETENTION_DAYS ?? "unset"})`
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.log(
    JSON.stringify({
      skipped: true,
      reason: "DATABASE_URL not set — nothing to prune",
      retentionDays,
    })
  );
  process.exit(0);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const before = await prisma.claudeUsageLog.count({
    where: { ts: { lt: cutoff } },
  });

  const { count: deleted } = await prisma.claudeUsageLog.deleteMany({
    where: { ts: { lt: cutoff } },
  });

  const result = {
    prunedAt: new Date().toISOString(),
    retentionDays,
    cutoffDate: cutoff.toISOString(),
    rowsFoundBefore: before,
    rowsDeleted: deleted,
  };
  console.log(JSON.stringify(result));
  process.exit(0);
} catch (err) {
  console.error(
    `[prune-claude-usage-logs] Prisma error: ${err instanceof Error ? err.message : String(err)}`
  );
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
