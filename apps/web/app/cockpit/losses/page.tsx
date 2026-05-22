import Link from "next/link";
import { db } from "@sports/db";

interface CockpitLossRow {
  readonly id: string;
  readonly headline: string;
  readonly status: string;
  readonly isPublic: boolean;
  readonly authoredAt: Date;
  readonly rootCause: string;
  readonly authorEmail: string;
  readonly matchup: string;
}

export const dynamic = "force-dynamic";

async function loadRows(): Promise<CockpitLossRow[]> {
  const rows = await db.lossAutopsy
    .findMany({
      orderBy: [{ status: "asc" }, { authoredAt: "desc" }],
      include: { pick: { include: { game: true } } },
      take: 100,
    })
    .catch(() => []);

  return rows.map((row) => ({
    id: row.id,
    headline: row.headline,
    status: row.status,
    isPublic: row.isPublic,
    authoredAt: row.authoredAt,
    rootCause: row.rootCause,
    authorEmail: row.authorEmail,
    matchup: `${row.pick.game.awayTeamName} at ${row.pick.game.homeTeamName}`,
  }));
}

function statusClass(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "PEER_REVIEW":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "RETRACTED":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    case "DRAFT":
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  }
}

export default async function CockpitLossesPage(): Promise<JSX.Element> {
  const rows = await loadRows();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Loss Autopsies</h1>
          <Link href="/cockpit" className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900/60">
            Back to Jarvis
          </Link>
        </div>
        <p className="text-sm text-gray-400">
          Read-only authoring queue for drafts, reviews, and published public Loss Room entries.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-6 text-sm text-gray-400">
          No loss autopsies have been authored yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
                    <span>{row.rootCause.replace(/_/g, " ")}</span>
                    <span>{row.authoredAt.toISOString().slice(0, 10)}</span>
                    <span>{row.isPublic ? "public" : "internal"}</span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-white">{row.headline}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {row.matchup} by {row.authorEmail}
                  </p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(row.status)}`}>
                  {row.status.replace(/_/g, " ")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
