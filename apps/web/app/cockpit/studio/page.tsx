import Link from "next/link";
import { loadStudioDashboard } from "@/lib/studio/load";

export const dynamic = "force-dynamic";

function statusClass(status: string): string {
  switch (status) {
    case "READY":
    case "green":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "GATED":
    case "yellow":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "THIN":
    case "red":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  }
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

export default async function CockpitStudioPage({
  searchParams,
}: {
  searchParams?: { gameId?: string };
}): Promise<JSX.Element> {
  const data = await loadStudioDashboard(searchParams?.gameId);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Galaxy Studio
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Creator Asset Workspace</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900/60"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-gray-400">
          Build cited, scanner-checked creator drafts from one Game Intelligence Room.
          Exports stay manual by design; there is no external posting action in Studio.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_18rem]">
        <aside className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Games</h2>
            <span className="text-[10px] uppercase tracking-wide text-gray-600">
              {data.games.length} loaded
            </span>
          </div>

          {data.games.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No canonical games are ready for Studio. The workspace will populate
              after ingestion attaches market evidence.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {data.games.map((game) => {
                const selected = game.id === data.selectedGame?.id;
                return (
                  <li key={game.id}>
                    <Link
                      href={`/cockpit/studio?gameId=${game.id}`}
                      className={`block rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-yellow-500/50 bg-yellow-500/10"
                          : "border-gray-800 bg-gray-950/30 hover:bg-gray-900/60"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-100">{game.matchup}</p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {game.sport} - {formatTime(game.commenceTime)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="min-w-0 rounded-lg border border-gray-800 bg-gray-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Template Grid</h2>
              <p className="mt-1 text-xs text-gray-500">
                Eight Claude-ready prompt packages with citations and scanner state.
              </p>
            </div>
            {data.selectedNode ? (
              <span className="rounded-md border border-gray-800 px-2 py-1 text-[10px] uppercase tracking-wide text-gray-400">
                {data.selectedNode.matchup}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.drafts.map((draft) => (
              <article
                key={draft.templateKind}
                className="rounded-lg border border-gray-800 bg-gray-950/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{draft.templateName}</h3>
                    <p className="mt-1 text-[11px] text-gray-500">{draft.templateKind.replace(/_/g, " ")}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(draft.gateState)}`}>
                    {draft.gateState}
                  </span>
                </div>

                {draft.refusalReason ? (
                  <p className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                    {draft.refusalReason}
                  </p>
                ) : (
                  <div className="mt-4 flex flex-col gap-3">
                    <p className="text-xs text-gray-400">
                      Prompt ready. Output must pass the compliance scanner before export.
                    </p>
                    <div className="rounded-md border border-gray-800 bg-gray-950 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-600">
                        Citations attached
                      </p>
                      <p className="mt-1 text-xs text-gray-300">{draft.citations.length}</p>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
          <h2 className="text-sm font-semibold text-white">Review Rail</h2>

          {data.selectedNode ? (
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-600">Evidence</p>
                <p className="mt-1 text-gray-200">
                  {data.selectedNode.evidenceHealth.score}/100 - {data.selectedNode.evidenceHealth.status}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-600">Market Pulse</p>
                <p className="mt-1 text-gray-200">
                  Edge Index {data.selectedNode.marketPulse.edgeIndex ?? "N/A"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-600">Export</p>
                <p className="mt-1 text-xs text-gray-500">
                  Copy and markdown download unlock after generation and a clean scan.
                  External publishing is intentionally absent.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              Select a game once canonical evidence exists.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}
