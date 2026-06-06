import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import {
  loadNflversePlayerLab,
  type DefenseVsPositionRank,
  type PlayerSeasonLine,
  type SkillPosition,
} from "@/lib/nflverse/player-lab";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Production Lab - Real NFL Season + Last-5 Form & Defense Ranks",
  description:
    "A read-only nflverse production lab: per-position season leaders, last-5 recent-form splits, and positional defense-allowed ranks computed from real player-week rows. Historical fact, not projections or picks.",
  alternates: { canonical: "/players" },
};

const numberFormatter = new Intl.NumberFormat("en-US");
const POSITIONS: readonly SkillPosition[] = ["RB", "WR", "TE"];
const POSITION_LABEL: Record<SkillPosition, string> = {
  RB: "Running backs",
  WR: "Wide receivers",
  TE: "Tight ends",
};

function fmtNumber(value: number): string {
  return numberFormatter.format(value);
}

function fmtDecimal(value: number | null, digits = 1): string {
  return value === null ? "N/A" : value.toFixed(digits);
}

function fmtPercent(value: number | null): string {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function fmtSigned(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

/** Heating up = cyan, cooling = amber, flat = muted. Real form, color-coded. */
function deltaClass(delta: number): string {
  if (delta >= 1.5) return "text-orbital-cyan";
  if (delta <= -1.5) return "text-alert";
  return "text-ion-2";
}

export default async function PlayersPage(): Promise<JSX.Element> {
  const lab = await loadNflversePlayerLab();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
              Production Lab
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Who is producing, who is heating up, who is easy to score on.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Season leaders, last-5 recent form, and positional defense ranks &mdash; all
              computed from real nflverse player-week rows. These are settled, historical
              facts, not forecasts. No projection, ownership, or salary is invented here;
              what we cannot source stays gated.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/api/nflverse/player-lab" className="btn-primary min-h-11 px-5 py-3">
                JSON lab
              </Link>
              <Link
                href="/nflverse"
                className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
              >
                Usage Pulse
              </Link>
              <Link
                href="/fantasy/baseline"
                className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
              >
                Baseline map
              </Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Source window
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {lab.status === "live"
                    ? `Season ${lab.season}, through week ${lab.throughWeek ?? "N/A"}`
                    : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                {lab.seasonType}
              </p>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Source rows" value={fmtNumber(lab.sourceRows)} />
              <Metric label="Season rows" value={fmtNumber(lab.seasonRows)} />
              <Metric
                label="Leaders"
                value={fmtNumber(lab.leaders.RB.length + lab.leaders.WR.length + lab.leaders.TE.length)}
              />
              <Metric label="Projections" value={lab.canPublishProjections ? "open" : "gated"} />
            </dl>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{lab.blockReason}</p>
            </div>
          </div>
        </section>

        {lab.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">
              The lab is intentionally empty.
            </h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              We could not load real nflverse rows, so nothing is shown rather than fabricating
              production. {lab.error ?? "UNKNOWN"}
            </p>
          </section>
        ) : (
          <>
            {POSITIONS.map((position) => (
              <LeaderTable
                key={position}
                position={position}
                rows={lab.leaders[position]}
                throughWeek={lab.throughWeek}
              />
            ))}

            <section className="border-b border-mineral pb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Matchup context
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                Defense ranks &mdash; who gives up production by position.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ion-1">
                PPR opportunity allowed per game to each position, ranked across qualifying
                defenses. Rank 1 is the softest matchup (allows the most). This is what actually
                happened on the field &mdash; not a spread, a projection, or a pick.
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              {POSITIONS.map((position) => (
                <DefenseTable key={position} position={position} rows={lab.defenseVsPosition[position]} />
              ))}
            </div>

            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Source URLs
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SourceUrl label="Player stats (weekly)" href={lab.sourceUrls.playerStats} />
                <SourceUrl label="Rosters" href={lab.sourceUrls.rosters} />
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function LeaderTable({
  position,
  rows,
  throughWeek,
}: {
  position: SkillPosition;
  rows: readonly PlayerSeasonLine[];
  throughWeek: number | null;
}): JSX.Element {
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="flex flex-col justify-between gap-3 border-b border-mineral px-5 py-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
            {position} leaders
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ion-white">{POSITION_LABEL[position]}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ion-1">
          Ranked by PPR per game over {throughWeek ? `the first ${throughWeek} weeks` : "the season"}.
          The 5g column is last-5-game form; &Delta; is recent form minus season pace.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ion-1">No qualifying players in the source window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">G</th>
                <th className="px-4 py-3">PPR/G</th>
                <th className="px-4 py-3">5g</th>
                <th className="px-4 py-3">&Delta;</th>
                <th className="px-4 py-3">Boom%</th>
                <th className="px-4 py-3">Bust%</th>
                <th className="px-4 py-3">Oppty/G</th>
                <th className="px-4 py-3">Tgt/G</th>
                <th className="px-4 py-3">Rec/G</th>
                <th className="px-4 py-3">RecYd/G</th>
                <th className="px-4 py-3">RushYd/G</th>
                <th className="px-4 py-3">Tgt sh</th>
                <th className="px-4 py-3">WOPR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mineral bg-carbon">
              {rows.map((row, index) => (
                <tr key={`${row.playerId}-${row.team}`}>
                  <td className="px-4 py-3 font-mono text-ion-2">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ion-white">{row.playerName}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                      {row.position}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{row.team}</td>
                  <td className="px-4 py-3 font-mono text-ion">{row.games}</td>
                  <td className="px-4 py-3 font-mono text-ion-white">{fmtDecimal(row.pprPerGame)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.last5PprPerGame)}</td>
                  <td className={`px-4 py-3 font-mono ${deltaClass(row.last5PprDelta)}`}>
                    {fmtSigned(row.last5PprDelta)}
                  </td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{fmtPercent(row.boomRate)}</td>
                  <td className="px-4 py-3 font-mono text-alert">{fmtPercent(row.bustRate)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.opportunitiesPerGame)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.targetsPerGame)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.receptionsPerGame)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.receivingYardsPerGame)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.rushingYardsPerGame)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtPercent(row.targetShare)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtDecimal(row.wopr, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DefenseTable({
  position,
  rows,
}: {
  position: SkillPosition;
  rows: readonly DefenseVsPositionRank[];
}): JSX.Element {
  const softest = rows.slice(0, 12);
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="border-b border-mineral px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
          vs {position}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-ion-white">Softest matchups</h3>
        <p className="mt-1 text-xs leading-5 text-ion-2">
          {rows.length > 0 ? `Ranked across ${rows.length} defenses` : "No qualifying defenses yet"}
        </p>
      </div>
      {softest.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ion-1">Not enough games in the source window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Def</th>
                <th className="px-4 py-3">G</th>
                <th className="px-4 py-3">PPR/G</th>
                <th className="px-4 py-3">Oppty/G</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mineral bg-carbon">
              {softest.map((row) => (
                <tr key={`${row.team}-${row.position}`}>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{row.rank}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-ion-white">{row.team}</td>
                  <td className="px-4 py-3 font-mono text-ion">{row.games}</td>
                  <td className="px-4 py-3 font-mono text-ion-white">{fmtDecimal(row.pprAllowedPerGame)}</td>
                  <td className="px-4 py-3 font-mono text-ion">
                    {fmtDecimal(row.opportunitiesAllowedPerGame)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</dt>
      <dd className="mt-1 font-numerals text-xl font-semibold tabular-nums text-ion-white">{value}</dd>
    </div>
  );
}

function SourceUrl({ label, href }: { label: string; href: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon p-4">
      <p className="font-semibold text-ion-white">{label}</p>
      <p className="mt-2 break-all font-mono text-xs leading-5 text-ion-2">{href}</p>
    </div>
  );
}
