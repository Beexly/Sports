#!/usr/bin/env npx tsx
/**
 * Read-only listing of the published PENDING picks on games that have NOT
 * started and that the pipeline has not refreshed in STALE_PENDING_PICK_MAX_AGE_DAYS
 * (apps/web/lib/board/stale-pick-policy.ts). The public truth surface counts
 * them (`stalePendingPicks`, 20 on 2026-09-05: v5.0.0 / v5.2.6 rows written in
 * May-June on NFL and NCAAF games kicking off from Week 1); it deliberately does
 * not act on them, because superseding or voiding a published pick is an owner
 * decision. Every settlement lane WILL grade these rows at kickoff on their
 * months-old lock line and count them toward the canonical sample, so the owner
 * needs the exact rows in front of them before Thursday's kickoff.
 *
 * Modeled on scripts/ops/settlement-progress-snapshot.ts: DATABASE_URL-guarded,
 * SELECT-only. No create/update/delete/upsert/$executeRaw call exists in this
 * file. The adjudication itself (isPublished=false, or result=VOID with a
 * settlement event) is documented in docs/ops/OPERATOR_TASKS.md and is never
 * run by an agent or a cron.
 *
 * Usage:
 *   npm run ops:stale-picks
 *   DATABASE_URL=... TSX_TSCONFIG_PATH=apps/web/tsconfig.json npx tsx scripts/ops/list-stale-pending-picks.ts [--json]
 */
import { PrismaClient } from "@prisma/client";
import {
  STALE_PENDING_PICK_MAX_AGE_DAYS,
  stalePickWhere,
} from "../../apps/web/lib/board/stale-pick-policy";

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error("list-stale-pending-picks: DATABASE_URL missing or stub - abort (no secrets invented)");
  process.exit(2);
}

const JSON_OUT = process.argv.includes("--json");

function pad(value: unknown, width: number): string {
  return String(value ?? "").padEnd(width);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const now = new Date();
  try {
    const rows = await prisma.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: "PENDING",
        game: { commenceTime: { gt: now } },
        ...stalePickWhere(now),
      },
      select: {
        id: true,
        pickType: true,
        selection: true,
        line: true,
        clvLockLine: true,
        clvLockPrice: true,
        modelVersion: true,
        confidence: true,
        tier: true,
        generatedAt: true,
        dataFreshnessAt: true,
        game: {
          select: {
            homeTeamName: true,
            awayTeamName: true,
            commenceTime: true,
            sport: { select: { key: true } },
          },
        },
      },
      orderBy: [{ game: { commenceTime: "asc" } }, { generatedAt: "asc" }],
    });

    const out = rows.map((r) => ({
      pickId: r.id,
      sport: r.game.sport.key,
      matchup: `${r.game.awayTeamName} @ ${r.game.homeTeamName}`,
      kickoff: r.game.commenceTime.toISOString(),
      pickType: r.pickType,
      selection: r.selection,
      line: r.line,
      gradingLine: r.clvLockLine ?? r.line,
      clvLockPrice: r.clvLockPrice,
      modelVersion: r.modelVersion,
      confidence: r.confidence,
      tier: r.tier,
      generatedAt: r.generatedAt.toISOString(),
      lastRefreshedAt: (r.dataFreshnessAt ?? r.generatedAt).toISOString(),
      staleDays: Math.floor((now.getTime() - (r.dataFreshnessAt ?? r.generatedAt).getTime()) / 86_400_000),
    }));

    if (JSON_OUT) {
      console.log(JSON.stringify({ generatedAt: now.toISOString(), maxAgeDays: STALE_PENDING_PICK_MAX_AGE_DAYS, count: out.length, picks: out }, null, 2));
      return;
    }

    console.log(
      `${out.length} published PENDING pick(s) on unstarted games not refreshed in ${STALE_PENDING_PICK_MAX_AGE_DAYS}d (as of ${now.toISOString()})`,
    );
    console.log(pad("kickoff", 21), pad("sport", 22), pad("matchup", 48), pad("type", 10), pad("selection", 34), pad("grade@", 8), pad("model", 8), pad("stale", 6), "pickId");
    for (const r of out) {
      console.log(
        pad(r.kickoff.slice(0, 16) + "Z", 21),
        pad(r.sport, 22),
        pad(r.matchup.slice(0, 47), 48),
        pad(r.pickType, 10),
        pad(r.selection.slice(0, 33), 34),
        pad(r.gradingLine, 8),
        pad(r.modelVersion, 8),
        pad(`${r.staleDays}d`, 6),
        r.pickId,
      );
    }
    const byVersion = new Map<string, number>();
    for (const r of out) byVersion.set(r.modelVersion, (byVersion.get(r.modelVersion) ?? 0) + 1);
    console.log("by modelVersion:", [...byVersion.entries()].map(([v, n]) => `${v}=${n}`).join(" "));
    console.log("Owner decision per row: leave (grades at kickoff on the stale line), unpublish (isPublished=false), or void with a settlement event. See docs/ops/OPERATOR_TASKS.md STALE-PICKS.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
