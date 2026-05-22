import Link from "next/link";
import { db } from "@sports/db";

type MarketTwinPosture = "READY_TO_SCORE" | "WATCH_ONLY" | "CONFLICT" | "QUIET";

interface TwinRow {
  readonly gameId: string;
  readonly sport: string;
  readonly matchup: string;
  readonly commenceTime: Date;
  readonly posture: MarketTwinPosture;
  readonly lineMovementSpread: number | null;
  readonly bookmakerCoverageMax: number;
  readonly contextComputedAt: Date | null;
}

export const dynamic = "force-dynamic";

function postureForGame(game: {
  bookmakerCoverageMax: number;
  contextComputedAt: Date | null;
  lineMovementSpread: number | null;
}): MarketTwinPosture {
  const freshnessMinutes = game.contextComputedAt
    ? (Date.now() - game.contextComputedAt.getTime()) / 60_000
    : null;
  if (game.lineMovementSpread !== null && Math.abs(game.lineMovementSpread) >= 3) {
    return "CONFLICT";
  }
  if (game.bookmakerCoverageMax >= 5 && freshnessMinutes !== null && freshnessMinutes <= 120) {
    return "READY_TO_SCORE";
  }
  if (game.bookmakerCoverageMax > 0) return "WATCH_ONLY";
  return "QUIET";
}

async function loadRows(): Promise<TwinRow[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const games = await db.game
    .findMany({
      where: {
        commenceTime: { gte: now, lte: cutoff },
        status: "SCHEDULED",
      },
      include: { sport: { select: { name: true } } },
      orderBy: { commenceTime: "asc" },
      take: 50,
    })
    .catch(() => []);

  return games.map((game) => ({
    gameId: game.id,
    sport: game.sport.name,
    matchup: `${game.awayTeamName} at ${game.homeTeamName}`,
    commenceTime: game.commenceTime,
    posture: postureForGame(game),
    lineMovementSpread: game.lineMovementSpread,
    bookmakerCoverageMax: game.bookmakerCoverageMax,
    contextComputedAt: game.contextComputedAt,
  }));
}

function postureClass(posture: MarketTwinPosture): string {
  switch (posture) {
    case "READY_TO_SCORE":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "WATCH_ONLY":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "CONFLICT":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    case "QUIET":
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  }
}

export default async function CockpitMarketTwinPage(): Promise<JSX.Element> {
  const rows = await loadRows();
  const counts = rows.reduce(
    (acc, row) => {
      acc[row.posture] += 1;
      return acc;
    },
    { READY_TO_SCORE: 0, WATCH_ONLY: 0, CONFLICT: 0, QUIET: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Market Twin</h1>
          <Link href="/cockpit" className="rounded-lg border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900/60">
            Back to Jarvis
          </Link>
        </div>
        <p className="text-sm text-gray-400">
          Internal posture read for upcoming boards. Read-only and not a public publishing surface.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <PostureChip label="Ready to score" count={counts.READY_TO_SCORE} variant="READY_TO_SCORE" />
          <PostureChip label="Watch only" count={counts.WATCH_ONLY} variant="WATCH_ONLY" />
          <PostureChip label="Conflict" count={counts.CONFLICT} variant="CONFLICT" />
          <PostureChip label="Quiet" count={counts.QUIET} variant="QUIET" />
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-6 text-sm text-gray-400">
          No upcoming games in the next 7 days.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.gameId} className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-950/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">{row.sport}</span>
                    <span className="text-[10px] text-gray-600">{row.commenceTime.toISOString()}</span>
                  </div>
                  <h2 className="text-base font-semibold text-white">{row.matchup}</h2>
                </div>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${postureClass(row.posture)}`}>
                  {row.posture.replace(/_/g, " ")}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-gray-400 md:grid-cols-3">
                <Metric label="Line move" value={row.lineMovementSpread === null ? "-" : String(row.lineMovementSpread)} />
                <Metric label="Book coverage" value={String(row.bookmakerCoverageMax)} />
                <Metric label="Context computed" value={row.contextComputedAt ? row.contextComputedAt.toISOString() : "-"} />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostureChip({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: MarketTwinPosture;
}): JSX.Element {
  return (
    <span className={`rounded-md border px-2 py-1 ${postureClass(variant)}`}>
      {label}: <strong className="font-semibold">{count}</strong>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-200">{value}</span>
    </div>
  );
}
