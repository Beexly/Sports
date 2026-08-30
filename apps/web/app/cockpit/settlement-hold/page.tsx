import type { Metadata } from "next";
import { db } from "@sports/db";
import { SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { NeedsAdjudicationCard, type AdjudicationRow } from "@/components/cockpit/needs-adjudication";

/**
 * /cockpit/settlement-hold — read-only "needs adjudication" worklist.
 *
 * Mirrors the overdue-PENDING population that `settlement-health.ts`
 * (loadSettlementHealth) counts, so this card and the DEGRADED signal describe
 * the same picks. It is STRICTLY read-only: no settle button, no write path, no
 * mutation of any kind. See ADR 006 for why the platform cannot yet show *why*
 * each pick is held (the hold is not persisted) — the caption says so.
 */

export const metadata: Metadata = { robots: { index: false, follow: false } };

const TAKE = 200;

export default async function CockpitSettlementHoldPage() {
  const now = new Date();
  const overdueCutoff = new Date(
    now.getTime() - SETTLEMENT_DEFAULT_GRACE_HOURS * 60 * 60 * 1000,
  );

  // Defensive: any DB error still renders an empty (honest) worklist.
  let rows: AdjudicationRow[] = [];
  try {
    const picks = await db.pick.findMany({
      where: {
        isPublished: true,
        NOT: { modelVersion: { contains: "seed" } },
        result: "PENDING",
        game: { commenceTime: { lt: overdueCutoff } },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { game: { commenceTime: "asc" } },
      take: TAKE,
    });

    rows = picks.map((p) => {
      const commence = p.game.commenceTime;
      const hoursOverdue = (now.getTime() - commence.getTime()) / (60 * 60 * 1000);
      return {
        id: p.id,
        sport: p.game.sport?.name ?? "—",
        matchup: `${p.game.awayTeamName} @ ${p.game.homeTeamName}`,
        commenceTime: commence.toISOString(),
        hoursOverdue,
        pickType: p.pickType,
        selection: p.selection,
        line: p.line,
      } satisfies AdjudicationRow;
    });
  } catch {
    rows = [];
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-1 text-lg font-bold text-ion-1">Settlement — needs adjudication</h1>
      <p className="mb-4 text-[11px] text-ion-3">
        Grace window: {SETTLEMENT_DEFAULT_GRACE_HOURS}h. Read-only worklist.
      </p>
      <NeedsAdjudicationCard rows={rows} />
    </main>
  );
}
