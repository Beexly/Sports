import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import {
  loadNflverseNextGenStats,
  type NgsPassingLine,
  type NgsReceivingLine,
  type NgsRushingLine,
} from "@/lib/nflverse/next-gen-stats";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Next Gen Stats — Separation, CPOE, RYOE (Real Tracking Data)",
  description:
    "Read-only NFL Next Gen Stats from nflverse: receiver separation & YAC-over-expected, QB completion-percentage-over-expected and time-to-throw, RB rush-yards-over-expected. Tracking data no box score shows.",
  alternates: { canonical: "/players/nextgen" },
};

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function fmtSigned(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function signedClass(value: number): string {
  if (value > 0.05) return "text-orbital-cyan";
  if (value < -0.05) return "text-alert";
  return "text-ion-2";
}

export default async function NextGenStatsPage(): Promise<JSX.Element> {
  const ngs = await loadNflverseNextGenStats();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
              Next Gen Stats
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              The metrics that aren&apos;t in the box score.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Player-tracking data from nflverse: how open a receiver gets (separation, cushion,
              YAC over expected), how accurate a quarterback is versus expectation (CPOE) and how
              fast he throws, and how many yards a back earns over what the blocking gave him
              (RYOE). Real season aggregates &mdash; not projections, not picks.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/api/nflverse/next-gen-stats" className="btn-primary min-h-11 px-5 py-3">
                JSON
              </Link>
              <Link
                href="/players"
                className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
              >
                Production Lab
              </Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {ngs.status === "live" ? `Season ${ngs.season}` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{ngs.seasonType}</p>
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{ngs.blockReason}</p>
            </div>
          </div>
        </section>

        {ngs.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This page is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{ngs.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <ReceivingTable rows={ngs.receiving} />
            <PassingTable rows={ngs.passing} />
            <RushingTable rows={ngs.rushing} />

            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source URLs</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SourceUrl label="NGS receiving" href={ngs.sourceUrls.receiving} />
                <SourceUrl label="NGS passing" href={ngs.sourceUrls.passing} />
                <SourceUrl label="NGS rushing" href={ngs.sourceUrls.rushing} />
              </div>
              <Attribution sourceIds={["nflverse"]} className="mt-4" />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function TableShell({
  eyebrow,
  title,
  blurb,
  empty,
  children,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  empty: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="flex flex-col justify-between gap-3 border-b border-mineral px-5 py-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ion-white">{title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ion-1">{blurb}</p>
      </div>
      {empty ? (
        <p className="px-5 py-6 text-sm text-ion-1">No qualifying players in the source window.</p>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </section>
  );
}

function ReceivingTable({ rows }: { rows: readonly NgsReceivingLine[] }): JSX.Element {
  return (
    <TableShell
      eyebrow="Receiving · tracking"
      title="Who gets open"
      blurb="Ranked by average separation (yards of space at the catch point). Cushion is pre-snap space; YAC+/- is yards after catch over expected."
      empty={rows.length === 0}
    >
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Tm</th>
            <th className="px-4 py-3">Tgt</th>
            <th className="px-4 py-3">Sep</th>
            <th className="px-4 py-3">Cush</th>
            <th className="px-4 py-3">YAC+/-</th>
            <th className="px-4 py-3">Air sh</th>
            <th className="px-4 py-3">Catch%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mineral bg-carbon">
          {rows.map((r, i) => (
            <tr key={`${r.playerId}-${r.team}`}>
              <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
              <td className="px-4 py-3">
                <p className="font-semibold text-ion-white">{r.playerName}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{r.position}</p>
              </td>
              <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
              <td className="px-4 py-3 font-mono text-ion">{r.targets}</td>
              <td className="px-4 py-3 font-mono text-ion-white">{fmt(r.avgSeparation)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmt(r.avgCushion)}</td>
              <td className={`px-4 py-3 font-mono ${signedClass(r.avgYacAboveExpectation)}`}>{fmtSigned(r.avgYacAboveExpectation)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmtPct(r.shareOfIntendedAirYards)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmtPct(r.catchPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function PassingTable({ rows }: { rows: readonly NgsPassingLine[] }): JSX.Element {
  return (
    <TableShell
      eyebrow="Passing · tracking"
      title="Who is accurate beyond expectation"
      blurb="Ranked by CPOE (completion % over expected, given throw difficulty). Time-to-throw and aggressiveness describe process, not just results."
      empty={rows.length === 0}
    >
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Tm</th>
            <th className="px-4 py-3">Att</th>
            <th className="px-4 py-3">CPOE</th>
            <th className="px-4 py-3">Comp%</th>
            <th className="px-4 py-3">xComp%</th>
            <th className="px-4 py-3">TT throw</th>
            <th className="px-4 py-3">Aggr</th>
            <th className="px-4 py-3">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mineral bg-carbon">
          {rows.map((r, i) => (
            <tr key={`${r.playerId}-${r.team}`}>
              <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
              <td className="px-4 py-3 font-semibold text-ion-white">{r.playerName}</td>
              <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
              <td className="px-4 py-3 font-mono text-ion">{r.attempts}</td>
              <td className={`px-4 py-3 font-mono ${signedClass(r.cpoe)}`}>{fmtSigned(r.cpoe)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmt(r.completionPct, 1)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmt(r.expectedCompletionPct, 1)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmt(r.avgTimeToThrow)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmt(r.aggressiveness, 1)}</td>
              <td className="px-4 py-3 font-mono text-ion-white">{fmt(r.passerRating, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function RushingTable({ rows }: { rows: readonly NgsRushingLine[] }): JSX.Element {
  return (
    <TableShell
      eyebrow="Rushing · tracking"
      title="Who beats the blocking"
      blurb="Ranked by rush yards over expected per attempt — production above what the blocking and box gave them. Stacked-box% is the share of carries vs 8+ defenders."
      empty={rows.length === 0}
    >
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Tm</th>
            <th className="px-4 py-3">Att</th>
            <th className="px-4 py-3">RYOE/att</th>
            <th className="px-4 py-3">Eff</th>
            <th className="px-4 py-3">Stacked%</th>
            <th className="px-4 py-3">TT LOS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mineral bg-carbon">
          {rows.map((r, i) => (
            <tr key={`${r.playerId}-${r.team}`}>
              <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
              <td className="px-4 py-3 font-semibold text-ion-white">{r.playerName}</td>
              <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
              <td className="px-4 py-3 font-mono text-ion">{r.rushAttempts}</td>
              <td className={`px-4 py-3 font-mono ${signedClass(r.ryoePerAtt)}`}>{fmtSigned(r.ryoePerAtt, 2)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmt(r.efficiency)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmtPct(r.pctStackedBox)}</td>
              <td className="px-4 py-3 font-mono text-ion">{fmt(r.avgTimeToLos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
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
