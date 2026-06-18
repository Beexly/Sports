import Link from "next/link";
import { db } from "@sports/db";
import { startOfDay, endOfDay, subDays } from "date-fns";
import {
  composeBrief,
  type BriefPickInput,
  type BriefSettledInput,
  type BriefLineMoveInput,
  type BriefPromotionInput,
  type BriefTaskInput,
} from "@/lib/brief/compose";

/**
 * /cockpit/brief — the operator's morning packet, rebuilt on real rows.
 *
 * Admin-gated by `app/cockpit/layout.tsx`. Pulls today's gate-cleared picks,
 * the last 24h of settlements, significant line movement, promotions awaiting
 * compliance, and the manual-review queue — then runs them through the pure
 * composer. DRAFT-only by construction: there is no publish control here.
 * Every query is defensive so the page renders in stub mode / DB outages.
 */
export const dynamic = "force-dynamic";

export default async function CockpitBriefPage() {
  const now = new Date();

  const [pickRows, settledRows, movedGames, promoRows, taskRows] = await Promise.all([
    db.pick
      .findMany({
        where: { isPublished: true, generatedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: { confidence: "desc" },
        take: 50,
      })
      .catch(() => []),
    db.pick
      .findMany({
        where: { settledAt: { gte: subDays(now, 1) }, result: { in: ["WIN", "LOSS", "PUSH", "VOID"] } },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: { settledAt: "desc" },
        take: 50,
      })
      .catch(() => []),
    db.game
      .findMany({
        where: {
          commenceTime: { gte: now },
          OR: [
            { lineMovementSpread: { not: null } },
            { lineMovementTotal: { not: null } },
          ],
        },
        include: { sport: { select: { name: true } } },
        orderBy: { commenceTime: "asc" },
        take: 40,
      })
      .catch(() => []),
    db.promotion
      .findMany({
        where: { complianceStatus: "UNREVIEWED" },
        select: { headline: true, operatorName: true, complianceStatus: true },
        take: 20,
      })
      .catch(() => []),
    db.cockpitTask
      .findMany({
        where: { status: { in: ["NEEDS_REVIEW", "BLOCKED"] } },
        select: { title: true, assignedAgent: true, priority: true },
        orderBy: { priority: "desc" },
        take: 12,
      })
      .catch(() => []),
  ]);

  const picks: BriefPickInput[] = pickRows.map((p) => ({
    selection: p.selection,
    sport: p.game.sport.name,
    pickGrade: p.pickGrade,
    tier: p.tier,
    confidence: p.confidence,
    edgeScore: p.edgeScore,
    riskLevel: p.riskLevel,
  }));
  const settled: BriefSettledInput[] = settledRows.map((p) => ({
    selection: p.selection,
    sport: p.game.sport.name,
    result: p.result as BriefSettledInput["result"],
  }));
  const lineMoves: BriefLineMoveInput[] = movedGames.map((g) => ({
    matchup: `${g.awayTeamName} @ ${g.homeTeamName}`,
    sport: g.sport.name,
    moveSpread: g.lineMovementSpread,
    moveTotal: g.lineMovementTotal,
  }));
  const promotions: BriefPromotionInput[] = promoRows;
  const reviewTasks: BriefTaskInput[] = taskRows;

  const brief = composeBrief({ date: now, picks, settled, lineMoves, promotions, reviewTasks });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">Daily brief</h1>
        <span className="rounded-full border border-yellow-900 bg-yellow-950/40 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-yellow-200">
          {brief.status} · internal only
        </span>
      </div>
      <p className="text-xs text-ink-500">
        {brief.date} · composed from live rows at render · no publish path exists on this surface
      </p>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-4">
        <p className="text-sm leading-relaxed text-ink-300">{brief.summary}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {brief.sections.map((s) => (
          <section key={s.type} className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">{s.title}</h2>
            <p className="text-sm leading-relaxed text-ink-300">{s.body}</p>
          </section>
        ))}

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
            Content ideas (data-backed only)
          </h2>
          {brief.contentIdeas.items.length === 0 ? (
            <p className="text-sm text-ink-500">No angles earned by today&apos;s data.</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-ink-300">
              {brief.contentIdeas.items.map((idea) => (
                <li key={idea}>· {idea}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {brief.manualReview.items.length > 0 && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
            Needs an operator decision
          </h2>
          <ul className="divide-y divide-titanium/30 text-sm">
            {brief.manualReview.items.map((t) => (
              <li key={t.title} className="flex items-center justify-between py-1.5">
                <span className="text-ink-300">{t.title}</span>
                <span className="font-mono text-[10px] uppercase text-ink-500">
                  {t.assignedAgent} · p{t.priority}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/cockpit/review" className="mt-3 inline-block text-xs text-cyan-300 hover:underline">
            Open the review queue →
          </Link>
        </section>
      )}

      <p className="text-[11px] text-ink-500">{brief.responsibleGamingText}</p>

      <Link
        href="/cockpit"
        className="w-fit rounded-lg border border-white/[0.06] px-3 py-2 text-xs text-ink-300 hover:bg-white/[0.03]"
      >
        ← Back to Jarvis
      </Link>
    </div>
  );
}
