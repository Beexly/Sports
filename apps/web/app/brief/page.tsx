import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getReadinessGates } from "@sports/prediction-engine";
import { BRIEF_RESPONSIBLE_GAMING_NOTE } from "@/lib/brief/compose";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export const metadata: Metadata = {
  title: "Daily Brief — Galaxy Sports Edge",
  description:
    "Today's published picks, recent settlements, and slate context. Sourced from live odds data; never fabricated.",
  alternates: { canonical: "/brief" },
};

export const dynamic = "force-dynamic";

const RISK_COLOR: Record<string, string> = {
  LOW: "text-emerald-400",
  MEDIUM: "text-yellow-300",
  HIGH: "text-red-400",
};

const GRADE_BG: Record<string, string> = {
  S: "bg-violet-900/60 text-violet-200",
  A: "bg-cyan-900/60 text-cyan-200",
  B: "bg-blue-900/40 text-blue-200",
  C: "bg-gray-800 text-gray-300",
  D: "bg-gray-800 text-gray-500",
};

function gradeChip(grade: string): string {
  return GRADE_BG[grade] ?? GRADE_BG["C"]!;
}

export default async function BriefPage() {
  const gates = getReadinessGates();
  const demoActive = isStubMode() && isDemoPicksEnabled();
  const now = new Date();
  const todayLabel = format(now, "EEEE, MMMM d, yyyy");

  const [todayPicks, recentSettled] = await Promise.all([
    db.pick
      .findMany({
        where: {
          isPublished: true,
          result: "PENDING",
          generatedAt: { gte: startOfDay(now), lte: endOfDay(now) },
        },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: [{ isFeatured: "desc" }, { confidence: "desc" }],
        take: 20,
      })
      .catch(() => []),
    db.pick
      .findMany({
        where: {
          settledAt: { gte: subDays(now, 2) },
          result: { in: ["WIN", "LOSS", "PUSH"] },
        },
        orderBy: { settledAt: "desc" },
        take: 10,
      })
      .catch(() => []),
  ]);

  const sportBreakdown = new Map<string, number>();
  for (const p of todayPicks) {
    const s = p.game.sport.name;
    sportBreakdown.set(s, (sportBreakdown.get(s) ?? 0) + 1);
  }

  const wins = recentSettled.filter((p) => p.result === "WIN").length;
  const losses = recentSettled.filter((p) => p.result === "LOSS").length;
  const pushes = recentSettled.filter((p) => p.result === "PUSH").length;
  const winRate = recentSettled.length > 0 ? (wins / recentSettled.length) * 100 : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Daily brief
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">{todayLabel}</h1>
          <p className="mt-2 text-sm text-gray-400">
            Today&apos;s published picks, live from the engine.{" "}
            {demoActive && (
              <span className="ml-1 rounded bg-yellow-900/40 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-yellow-300">
                sample data
              </span>
            )}
          </p>
        </div>

        {/* Slate overview */}
        {todayPicks.length > 0 ? (
          <>
            <section className="mb-6 rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
              <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Today&apos;s slate
              </p>
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-white">{todayPicks.length}</p>
                  <p className="text-xs text-gray-500">
                    {todayPicks.length === 1 ? "pick" : "picks"} published
                  </p>
                </div>
                {Array.from(sportBreakdown.entries()).map(([sport, count]) => (
                  <div key={sport} className="rounded-lg bg-gray-800/60 px-3 py-2 text-center">
                    <p className="text-lg font-bold tabular-nums text-cyan-300">{count}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {sport}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Pick list */}
            <section className="mb-6">
              <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Published picks
              </p>
              <div className="flex flex-col gap-2">
                {todayPicks.map((pick) => (
                  <article
                    key={pick.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{pick.selection}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {pick.game.homeTeamName} vs {pick.game.awayTeamName}
                        <span className="mx-1.5 text-gray-700">·</span>
                        {pick.game.sport.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${gradeChip(pick.pickGrade)}`}
                      >
                        {pick.pickGrade}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-gray-400">
                        {pick.confidence}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-semibold uppercase ${RISK_COLOR[pick.riskLevel] ?? "text-gray-400"}`}
                      >
                        {pick.riskLevel}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-right text-xs text-gray-600">
                Confidence 0–100 · Grade S→D ·{" "}
                <Link href="/methodology" className="text-gray-500 hover:text-gray-400 underline underline-offset-2">
                  methodology
                </Link>
              </p>
            </section>
          </>
        ) : (
          <section className="mb-6 rounded-2xl border border-gray-800 bg-gray-900/40 p-6 text-center">
            <p className="text-sm text-gray-500">No picks published yet today. Check back after the morning build.</p>
            <Link
              href="/picks"
              className="mt-3 inline-block text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
            >
              View full picks board →
            </Link>
          </section>
        )}

        {/* Recent record */}
        {gates.canExposePerformanceStats && recentSettled.length > 0 && (
          <section className="mb-6 rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Last 48 hrs · settled record
            </p>
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-bold tabular-nums text-emerald-400">{wins}</p>
                <p className="text-[10px] uppercase text-gray-500">Wins</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-rose-400">{losses}</p>
                <p className="text-[10px] uppercase text-gray-500">Losses</p>
              </div>
              {pushes > 0 && (
                <div>
                  <p className="text-2xl font-bold tabular-nums text-gray-400">{pushes}</p>
                  <p className="text-[10px] uppercase text-gray-500">Pushes</p>
                </div>
              )}
              {winRate !== null && (
                <div>
                  <p className="text-2xl font-bold tabular-nums text-white">
                    {winRate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] uppercase text-gray-500">Win rate</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/picks"
            className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Full picks board
          </Link>
          <Link
            href="/performance"
            className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-900"
          >
            Track record
          </Link>
        </div>

        {/* Responsible gaming */}
        <p className="rounded-lg border border-gray-800 bg-gray-900/30 px-4 py-3 text-xs leading-5 text-gray-500">
          {BRIEF_RESPONSIBLE_GAMING_NOTE} If you or someone you know has a gambling problem, help is available.
          Call or text <strong className="text-gray-300">1-800-GAMBLER</strong>.
        </p>
      </main>
      <Footer />
    </div>
  );
}
