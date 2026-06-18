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

// Plain-language meaning of each posture — this legend IS the explanation the
// page leads with, so the read is self-documenting instead of jargon.
const POSTURE_META: Readonly<
  Record<MarketTwinPosture, { label: string; chip: string; dot: string; blurb: string }>
> = {
  READY_TO_SCORE: {
    label: "Ready to score",
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
    blurb: "5+ books agree and the read is fresh (under 2h) — stable enough to run the model against.",
  },
  CONFLICT: {
    label: "Conflict",
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
    blurb: "The line has swung 3+ points — the market disagrees with itself. Let it settle first.",
  },
  WATCH_ONLY: {
    label: "Watch only",
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
    blurb: "Some market data, but not enough book coverage or freshness to trust yet.",
  },
  QUIET: {
    label: "Quiet",
    chip: "border-white/[0.10]/50 bg-obsidian/40 text-ink-500",
    dot: "bg-ion-3/50",
    blurb: "No book coverage yet — nothing to read here.",
  },
};

const POSTURE_ORDER: readonly MarketTwinPosture[] = [
  "READY_TO_SCORE",
  "CONFLICT",
  "WATCH_ONLY",
  "QUIET",
];

// Timezone-independent, dashboard-friendly relative time (no raw ISO strings).
function fromNow(d: Date): string {
  const ms = d.getTime() - Date.now();
  const past = ms < 0;
  const mins = Math.round(Math.abs(ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return past ? `${mins}m ago` : `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return past ? `${hrs}h ago` : `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  return past ? `${days}d ago` : `in ${days}d`;
}

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
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Market Twin</h1>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-400 hover:border-white/[0.10]/70 hover:bg-white/[0.03]"
          >
            ← Back to Jarvis
          </Link>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-400">
          A read-only mirror of where the betting market sits for each upcoming game — so you can
          see at a glance which boards are stable enough to score, which are still moving, and which
          we can&apos;t read yet. It&apos;s not a pick, and it&apos;s never published.
        </p>
      </header>

      {/* Legend = explanation + live counts in one bucket */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
          How to read this
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {POSTURE_ORDER.map((p) => (
            <div key={p} className="flex items-start gap-2.5">
              <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${POSTURE_META[p].dot}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">
                  {POSTURE_META[p].label}
                  <span className="ml-2 font-mono tabular-nums text-ink-500">{counts[p]}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-400">{POSTURE_META[p].blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-6 text-sm text-ink-500">
          No upcoming games in the next 7 days.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.gameId}
              className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-4 transition-colors hover:border-white/[0.10]/70"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-ink-500">
                      {row.sport}
                    </span>
                    <span className="text-[10px] text-ink-500">· starts {fromNow(row.commenceTime)}</span>
                  </div>
                  <h2 className="text-base font-semibold text-white">{row.matchup}</h2>
                </div>
                <span
                  className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${POSTURE_META[row.posture].chip}`}
                >
                  {POSTURE_META[row.posture].label}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-ink-400 md:grid-cols-3">
                <Metric
                  label="Line move"
                  value={
                    row.lineMovementSpread === null
                      ? "—"
                      : `${row.lineMovementSpread > 0 ? "+" : ""}${row.lineMovementSpread} pts`
                  }
                />
                <Metric label="Book coverage" value={`${row.bookmakerCoverageMax} books`} />
                <Metric
                  label="Context read"
                  value={row.contextComputedAt ? fromNow(row.contextComputedAt) : "—"}
                />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-wide text-ink-500">{label}</span>
      <span className="text-sm font-medium text-ink-300">{value}</span>
    </div>
  );
}
