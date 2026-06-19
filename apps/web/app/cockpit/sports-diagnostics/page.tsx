import Link from "next/link";

import {
  loadSportsDiagnostics,
  SPORTS_DIAGNOSTICS_MIN_TEAM_GAMES,
  type SportsDiagnosticsReport,
  type SportDiagnostics,
  type RestDistribution,
  type HomeFieldBaseline,
  type TeamRatingRow,
} from "@/lib/cockpit/load-sports-diagnostics";

/**
 * Cockpit · Sports Diagnostics (Wave A internal workbench).
 *
 * Admin-only by virtue of the cockpit layout's ADMIN gate; INTERNAL, not public.
 * This is a DISPLAY-ONLY surface that wires dormant per-league + structural sports
 * libraries (schedule-utils rest/home-field, power-ranking composite + tiering,
 * elo-utils leaderboard, team-normalize canonical names) onto the TEAM GAME LOGS
 * WE ALREADY STORE — via the never-throw loader. It scores nothing, flips no gate,
 * changes no published pick, and NEVER calls any external sports API. Every figure
 * traces to stored team-game-log + game rows or to an explicit honest empty state.
 *
 * Ratings here are SUPPLEMENTARY descriptive context over the stored record — not
 * a forward-looking edge and never a pick driver.
 */
export const dynamic = "force-dynamic";

export default async function CockpitSportsDiagnosticsPage(): Promise<JSX.Element> {
  const { dataMode, loadedAtIso, note, report } = await loadSportsDiagnostics();
  const live = dataMode === "live";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Sports Diagnostics · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Sports Diagnostics Workbench</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          A read-only workbench that runs the per-league and structural sports libraries over the team
          game logs we already store: rest / back-to-back distribution, the home-field baseline (win
          rate edge and scoring margin), recent form, ATS cover rate, and a power / Elo rating replayed
          from stored outcomes.{" "}
          <span className="text-ink-200">
            It reads only the stored game history — no external sports API is ever called here.
          </span>{" "}
          The ratings are supplementary context, not a pick driver.
        </p>
        <p className="text-[11px] text-ink-600">
          Data mode: <DataModeBadge live={live} /> · loaded {new Date(loadedAtIso).toLocaleString("en-US")}
        </p>
        <p className="max-w-3xl text-[11px] leading-relaxed text-ink-600">
          Caveat: only canonical (non-bootstrap) game logs feed this, and only decided (WIN/LOSS) rows
          count toward win rates — unsettled rows never inflate a denominator. A sport below the games
          floor reports as building history rather than rendering a power/Elo table; a team below the
          per-team floor ({SPORTS_DIAGNOSTICS_MIN_TEAM_GAMES} games) is listed but left unrated. Power
          and Elo are descriptive reads of the stored record, not a forward-looking signal.
        </p>
      </header>

      {/* ── Headline counts ──────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Game-log rows" value={String(report.totalRows)} />
        <Metric label="Sports tracked" value={String(report.sports.length)} />
        <Metric label="Sports rated" value={String(report.sportsRated)} />
        <Metric label="Sports building" value={String(report.sportsBuilding)} />
      </section>

      <StatusBanner report={report} live={live} note={note} />

      {report.sports.length === 0 ? (
        <EmptyState live={live} />
      ) : (
        <div className="flex flex-col gap-6">
          {report.sports.map((s) => (
            <SportBlock key={s.sport} sport={s} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. No fabricated numbers: every figure is
        read from the stored team-game-log history or shown as an explicit empty state. Power and Elo
        ratings are descriptive context over the stored outcomes — they never re-score a pick, never
        flip a gate, and never call any external sports API.
      </p>
    </div>
  );
}

// ── Status banner ───────────────────────────────────────────────────────────────

function StatusBanner({
  report,
  live,
  note,
}: {
  readonly report: SportsDiagnosticsReport;
  readonly live: boolean;
  readonly note: string;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-sky-700/40 bg-sky-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-sky-700/60 bg-sky-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-300">
            Coverage
          </span>
          <span className="font-mono text-sm font-semibold text-sky-100">
            {report.sportsRated} / {report.sports.length} sports rated
          </span>
        </div>
        <span className="font-mono text-xs text-sky-200/80">
          {report.sportsBuilding} building history
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-sky-100/90">{note}</p>
      {!live && (
        <p className="mt-3 text-[11px] font-semibold text-sky-300">
          Database unreachable / stub mode — this is an honest-empty report. Restore the connection to
          populate it. No external sports API is ever called from this surface.
        </p>
      )}
    </section>
  );
}

function EmptyState({ live }: { readonly live: boolean }): JSX.Element {
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <h2 className="text-sm font-semibold text-white">No canonical game logs</h2>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-ink-400">
        {live
          ? "The database is reachable but holds no canonical (non-bootstrap) team game logs yet. Per-sport " +
            "diagnostics appear here once settled games have populated the team-game-log history. Nothing " +
            "here calls any external sports API."
          : "The database is unreachable or in stub mode, so no game logs could be read. This is an " +
            "honest-empty report, not an error."}
      </p>
    </section>
  );
}

// ── Per-sport block ───────────────────────────────────────────────────────────────

function SportBlock({ sport }: { readonly sport: SportDiagnostics }): JSX.Element {
  const insufficient = sport.status === "INSUFFICIENT";
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-white">
            {sport.sport}
          </h2>
          <StatusBadge status={sport.status} />
        </div>
        <span className="font-mono text-[11px] text-ink-500">
          {sport.decidedRows} decided · {sport.teamCount} team{sport.teamCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Rest / schedule context — always shown (honest for any sample). */}
        <RestPanel rest={sport.rest} />

        {/* Home-field baseline — always shown. */}
        <HomeFieldPanel homeField={sport.homeField} />

        {/* Power / Elo ratings — only when the sport clears the floor. */}
        {insufficient ? (
          <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3">
            <p className="text-xs leading-relaxed text-amber-100/90">
              {sport.insufficientNote ??
                "Building history — ratings withheld below the games floor."}
            </p>
          </div>
        ) : (
          <RatingsPanel sport={sport} />
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { readonly status: SportDiagnostics["status"] }): JSX.Element {
  if (status === "OK") {
    return (
      <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-200">
        rated
      </span>
    );
  }
  return (
    <span className="rounded-md border border-amber-600/40 bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-200">
      building
    </span>
  );
}

// ── Rest / schedule panel ───────────────────────────────────────────────────────

function RestPanel({ rest }: { readonly rest: RestDistribution }): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
        Rest &amp; schedule context
      </h3>
      {rest.withRestData === 0 ? (
        <p className="mt-2 text-xs text-ink-500">
          No rest/schedule context stored for this sport&apos;s games yet. It appears once the
          scheduling-context job has populated rest days on the games.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Rows with rest data" value={String(rest.withRestData)} />
            <Metric label="Mean rest (days)" value={formatNum(rest.meanRestDays)} />
            <Metric label="Back-to-backs" value={String(rest.backToBackGames)} />
            <Metric label="Mean games / 7d" value={formatNum(rest.meanScheduleDensity)} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Short-rest games (<3d)"
              value={`${rest.shortRestGames} · ${formatRate(rest.shortRestWinRate)}`}
            />
            <Metric
              label="Long-rest games (>7d)"
              value={`${rest.longRestGames} · ${formatRate(rest.longRestWinRate)}`}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-600">
            Win rates beside the short/long-rest counts are decided (WIN/LOSS) only over the stored
            sample. They describe the record, not a forward-looking rest effect.
          </p>
        </>
      )}
    </div>
  );
}

// ── Home-field panel ──────────────────────────────────────────────────────────────

function HomeFieldPanel({ homeField }: { readonly homeField: HomeFieldBaseline }): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
        Home-field baseline
      </h3>
      {homeField.homeDecided === 0 && homeField.awayDecided === 0 ? (
        <p className="mt-2 text-xs text-ink-500">
          No decided home or away games stored for this sport yet.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Home win rate"
              value={`${formatRate(homeField.homeWinRate)} (${homeField.homeDecided})`}
            />
            <Metric
              label="Away win rate"
              value={`${formatRate(homeField.awayWinRate)} (${homeField.awayDecided})`}
            />
            <Metric label="Home edge" value={formatRate(homeField.homeEdge)} />
            <Metric
              label="Margin (home / away)"
              value={`${formatSigned(homeField.meanHomeMargin)} / ${formatSigned(homeField.meanAwayMargin)}`}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-600">
            Home edge is the home decided win rate minus the away decided win rate over the stored
            sample. Mean margin is the average scoring differential (team minus opponent).
          </p>
        </>
      )}
    </div>
  );
}

// ── Ratings panel (power + Elo) ─────────────────────────────────────────────────

function RatingsPanel({ sport }: { readonly sport: SportDiagnostics }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-black/20">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          Power &amp; Elo ratings
        </h3>
        <p className="mt-1 max-w-3xl text-[11px] text-ink-600">
          {sport.powerSummary ? `Tier distribution: ${sport.powerSummary}. ` : ""}
          Power is a composite over win rate, scoring margin, schedule strength, recent form, and Elo.
          Elo is replayed chronologically from stored results. Both are supplementary context, not a
          pick driver. Teams below the per-team floor are listed but unrated.
        </p>
      </div>
      {sport.teams.length === 0 ? (
        <p className="px-3 py-5 text-sm text-ink-500">No teams to rate yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-titanium/30 text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">W–L</th>
                <th className="px-3 py-2">Recent form</th>
                <th className="px-3 py-2">ATS cover</th>
                <th className="px-3 py-2">Power</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Elo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {sport.teams.map((t) => (
                <TeamRow key={t.teamName} team={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TeamRow({ team }: { readonly team: TeamRatingRow }): JSX.Element {
  return (
    <tr className="text-ink-300">
      <td className="px-3 py-2">
        <span className="block font-mono text-xs text-white">{team.teamName}</span>
        {team.underRated && (
          <span className="text-[10px] uppercase tracking-wide text-amber-300/80">
            thin sample · unrated
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono">
        {team.wins}–{team.losses}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono">{formatRate(team.recentForm)}</td>
      <td className="whitespace-nowrap px-3 py-2 font-mono">{formatRate(team.atsCoverRate)}</td>
      <td className="whitespace-nowrap px-3 py-2 font-mono">{formatNum(team.powerScore)}</td>
      <td className="whitespace-nowrap px-3 py-2 text-xs">{team.powerTier ?? "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 font-mono">{formatNum(team.elo)}</td>
    </tr>
  );
}

// ── shared primitives ───────────────────────────────────────────────────────────

function DataModeBadge({ live }: { readonly live: boolean }): JSX.Element {
  return live ? (
    <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
      live
    </span>
  ) : (
    <span className="rounded-md border border-red-500/30 bg-red-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200">
      unavailable
    </span>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function formatRate(rate: number | null | undefined): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatNum(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function formatSigned(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}
