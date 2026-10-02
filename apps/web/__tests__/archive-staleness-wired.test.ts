import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * GSE-MON-012 was written FOR the 2026-08-22 -> 2026-09-13 line-archive outage.
 *
 * `archive-staleness-monitor.ts` shipped with tests and ZERO production callers,
 * so the alarm written to catch that exact failure was never armed. A monitor
 * with no caller is indistinguishable from a monitor that does not exist, and
 * nothing in CI reported it.
 *
 * This pins the CALLER, not the monitor's internals (its own suite does that).
 * A test that only exercises the monitor in isolation would keep passing while
 * the wiring was reverted.
 */
const repoRoot = resolve(__dirname, "../../..");
const routePath = resolve(repoRoot, "apps/web/app/api/cron/health-alert/route.ts");
const monitorPath = resolve(
  repoRoot,
  "packages/ingestion-pipeline/src/archive-staleness-monitor.ts",
);

describe("the archive staleness monitor is actually armed", () => {
  const route = readFileSync(routePath, "utf8");

  it("health-alert calls checkArchiveStaleness", () => {
    // Import + call, not a comment. A comment would satisfy nothing.
    expect(route).toMatch(/import\s*\{[^}]*checkArchiveStaleness[^}]*\}/);
    expect(route).toMatch(/await\s+checkArchiveStaleness\s*\(/);
  });

  it("the health-alert route is the one in the schedule, every 15 minutes", () => {
    // A caller that is not scheduled is the 2026-08 failure mode in miniature.
    const vercel = JSON.parse(
      readFileSync(resolve(repoRoot, "apps/web/vercel.json"), "utf8"),
    ) as { crons: ReadonlyArray<{ path: string; schedule: string }> };
    const entry = vercel.crons.find((c) => c.path === "/api/cron/health-alert");
    expect(entry, "health-alert must be a scheduled cron").toBeDefined();
    expect(entry?.schedule).toBe("*/15 * * * *");
  });

  it("surfaces the verdict in the webhook payload, so a stale archive can page", () => {
    expect(route).toMatch(/lineArchiveStaleness/);
  });

  it("a monitor read that THROWS reports stale, never a false all-clear", () => {
    // The outage's root cause was a swallowed error. The catch must not convert
    // an unreadable monitor into "nothing to report".
    const catchBlock = route.slice(route.indexOf("checkArchiveStaleness({"));
    const after = catchBlock.slice(catchBlock.indexOf("} catch"));
    expect(after).toMatch(/isStale:\s*true/);
    expect(after).toMatch(/reason:/);
  });

  it("the monitor itself is no longer orphaned", () => {
    const monitor = readFileSync(monitorPath, "utf8");
    expect(monitor).toMatch(/export async function checkArchiveStaleness/);
  });
});
