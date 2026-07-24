import Link from "next/link";
import { db } from "@sports/db";
import { StatusTile } from "@/components/cockpit/status-tile";

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
      return "border-verify/40 bg-verify/10 text-verify";
    case "PEER_REVIEW":
      return "border-caution/40 bg-caution/10 text-caution";
    case "RETRACTED":
      return "border-alert/40 bg-alert/10 text-alert";
    case "DRAFT":
    default:
      return "border-titanium/50 bg-obsidian/40 text-ion-1";
  }
}

export default async function CockpitLossesPage(): Promise<JSX.Element> {
  const rows = await loadRows();

  // Lifecycle rollup derived from rows already loaded — no extra query.
  const lifecycle = { DRAFT: 0, PEER_REVIEW: 0, PUBLISHED: 0, RETRACTED: 0 };
  for (const r of rows) {
    if (r.status in lifecycle) {
      lifecycle[r.status as keyof typeof lifecycle] += 1;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ion-white">Loss Autopsies</h1>
          <Link href="/cockpit" className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60">
            Back to Jarvis
          </Link>
        </div>
        <p className="text-sm text-ion-2">
          Read-only authoring queue for drafts, reviews, and published public Loss Room entries.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatusTile label="Draft" value={String(lifecycle.DRAFT)} tone="neutral" />
          <StatusTile label="Peer review" value={String(lifecycle.PEER_REVIEW)} tone="neutral" />
          <StatusTile label="Published" value={String(lifecycle.PUBLISHED)} tone="info" />
          <StatusTile label="Retracted" value={String(lifecycle.RETRACTED)} tone="neutral" />
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-titanium/40 bg-obsidian/50 p-6 text-sm text-ion-2">
          No loss autopsies have been authored yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-titanium/40 bg-obsidian/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-ion-3">
                    <span>{row.rootCause.replace(/_/g, " ")}</span>
                    <span>{row.authoredAt.toISOString().slice(0, 10)}</span>
                    <span>{row.isPublic ? "public" : "internal"}</span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-ion-white">{row.headline}</h2>
                  <p className="mt-1 text-xs text-ion-3">
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
