import Link from "next/link";
import { db } from "@sports/db";

interface LossRoomRow {
  readonly id: string;
  readonly headline: string;
  readonly authoredAt: Date;
  readonly whatWeLearned: string;
  readonly rootCause: string;
  readonly matchup: string;
  readonly sport: string;
}

export const dynamic = "force-dynamic";

async function loadAuthoredRows(): Promise<LossRoomRow[]> {
  const rows = await db.lossAutopsy
    .findMany({
      where: { isPublic: true, status: "PUBLISHED" },
      orderBy: { authoredAt: "desc" },
      include: {
        pick: {
          include: { game: { include: { sport: { select: { name: true } } } } },
        },
      },
      take: 50,
    })
    .catch(() => []);

  return rows.map((row) => ({
    id: row.id,
    headline: row.headline,
    authoredAt: row.authoredAt,
    whatWeLearned: row.whatWeLearned,
    rootCause: row.rootCause,
    matchup: `${row.pick.game.awayTeamName} at ${row.pick.game.homeTeamName}`,
    sport: row.pick.game.sport.name,
  }));
}

async function loadFallbackRows(): Promise<LossRoomRow[]> {
  const picks = await db.pick
    .findMany({
      where: { result: "LOSS", isPublished: true, isBootstrap: false },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { settledAt: "desc" },
      take: 25,
    })
    .catch(() => []);

  return picks.map((pick) => ({
    id: pick.id,
    headline: `What we learned from ${pick.selection}`,
    authoredAt: pick.settledAt ?? pick.generatedAt,
    whatWeLearned:
      "This entry is awaiting a full operator-written autopsy. The original pick reasoning is preserved for review.",
    rootCause: "PENDING_REVIEW",
    matchup: `${pick.game.awayTeamName} at ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
  }));
}

export default async function LossRoomPage(): Promise<JSX.Element> {
  const authored = await loadAuthoredRows();
  const rows = authored.length > 0 ? authored : await loadFallbackRows();

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12 text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link href="/performance" className="text-sm text-brand-400 hover:underline">
            Performance
          </Link>
          <h1 className="text-3xl font-bold text-white">Loss Room</h1>
          <p className="max-w-2xl text-sm text-gray-400">
            Public loss autopsies focus on what changed, what held up, and what the model should learn next.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-400">
            No published loss autopsies yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
                  <span>{row.sport}</span>
                  <span>{row.rootCause.replace(/_/g, " ")}</span>
                  <span>{row.authoredAt.toISOString().slice(0, 10)}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  <Link href={`/performance/losses/${row.id}`} className="hover:underline">
                    {row.headline}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-gray-500">{row.matchup}</p>
                <p className="mt-3 text-sm text-gray-300">{row.whatWeLearned}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
