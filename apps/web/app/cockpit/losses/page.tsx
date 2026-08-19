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

interface CockpitLossCandidateRow {
  readonly id: string;
  readonly matchup: string;
  readonly selection: string;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly modelVersion: string;
  readonly settledAt: Date | null;
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

/**
 * Settled LOSS picks that have NO loss autopsy attached yet.
 * Highest-confidence losses first — these are the ones a skeptic finds
 * first, so they carry the most cherry-picking risk.
 */
async function loadCandidateRows(): Promise<CockpitLossCandidateRow[]> {
  const rows = await db.pick
    .findMany({
      where: {
        result: "LOSS",
        lossAutopsy: null,
        isPublished: true,
      },
      include: {
        game: { select: { awayTeamName: true, homeTeamName: true } },
      },
      orderBy: { confidence: "desc" },
      take: 50,
    })
    .catch(() => []);

  return rows.map((pick) => ({
    id: pick.id,
    matchup: `${pick.game.awayTeamName} at ${pick.game.homeTeamName}`,
    selection: pick.selection,
    confidence: pick.confidence,
    edgeScore: pick.edgeScore,
    modelVersion: pick.modelVersion,
    settledAt: pick.settledAt,
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
  const candidates = await loadCandidateRows();

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

      {candidates.length > 0 && (
        <section className="rounded-lg border border-caution/40 bg-caution/5 p-4">
          <h2 className="text-lg font-semibold text-ion-white">Needs Autopsy</h2>
          <p className="mt-1 text-xs text-ion-3">
            {candidates.length} settled loss{candidates.length !== 1 ? "es" : ""} with no autopsy — highest-confidence losses first.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {candidates.map((candidate) => (
              <li key={candidate.id} className="rounded-lg border border-titanium/40 bg-obsidian/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-ion-3">{candidate.matchup}</div>
                    <p className="mt-1 text-sm font-semibold text-ion-white">{candidate.selection}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-ion-3">
                      <span>Confidence {candidate.confidence}</span>
                      <span>Edge {candidate.edgeScore}</span>
                      <span>{candidate.modelVersion}</span>
                    </div>
                  </div>
                  <Link
                    href={`/cockpit/losses/${candidate.id}/draft`}
                    className="rounded-md border border-titanium/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ion-2 hover:bg-carbon/60"
                  >
                    Draft
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
