import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import {
  loadNflversePressureCoverage,
  type CoverageRow,
  type QbPressureRow,
} from "@/lib/nflverse/pressure-coverage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pressure & Coverage — PFR Advanced (real charting)",
  description:
    "Read-only PFR advanced charting via nflverse: how much pressure each QB faces and handles, and which defenders are throwable. Charting facts no box score carries — not a pick.",
  alternates: { canonical: "/players/trenches" },
};

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function TrenchesPage(): Promise<JSX.Element> {
  const pc = await loadNflversePressureCoverage();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Pressure &amp; Coverage</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              The trenches, charted.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              PFR advanced charting from nflverse: how often each quarterback is pressured and how he
              throws under it, and which defenders in coverage are actually throwable. These are
              charting facts that never reach a box score &mdash; context for a read, not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/nflverse/pressure-coverage" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/players/nextgen" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Next Gen Stats</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {pc.status === "live" ? `Season ${pc.season}` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{pc.seasonType}</p>
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{pc.blockReason}</p>
            </div>
          </div>
        </section>

        {pc.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This page is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{pc.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <QbTable rows={pc.qbPressure} />
            <CoverageTable rows={pc.coverage} />
            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source URLs</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SourceUrl label="PFR advanced — passing" href={pc.sourceUrls.pass} />
                <SourceUrl label="PFR advanced — defense" href={pc.sourceUrls.def} />
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

function QbTable({ rows }: { rows: readonly QbPressureRow[] }): JSX.Element {
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="flex flex-col justify-between gap-3 border-b border-mineral px-5 py-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">QB pressure</p>
          <h2 className="mt-2 text-2xl font-semibold text-ion-white">Most pressured passers</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ion-1">Share of dropbacks pressured (season mean). Bad-throw% and sacks show how it cashes out.</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ion-1">No qualifying quarterbacks in the source window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Tm</th>
                <th className="px-4 py-3">G</th>
                <th className="px-4 py-3">Pressure%</th>
                <th className="px-4 py-3">Bad throw%</th>
                <th className="px-4 py-3">Sacks</th>
                <th className="px-4 py-3">Blitzes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mineral bg-carbon">
              {rows.map((r, i) => (
                <tr key={r.playerId}>
                  <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                  <td className="px-4 py-3 font-mono text-ion">{r.games}</td>
                  <td className="px-4 py-3 font-mono text-alert">{fmtPct(r.pressurePct)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtPct(r.badThrowPct)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{r.sacks}</td>
                  <td className="px-4 py-3 font-mono text-ion">{r.blitzesFaced}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CoverageTable({ rows }: { rows: readonly CoverageRow[] }): JSX.Element {
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="flex flex-col justify-between gap-3 border-b border-mineral px-5 py-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Coverage</p>
          <h2 className="mt-2 text-2xl font-semibold text-ion-white">Lockdown defenders</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ion-1">Lowest passer rating allowed in coverage (target-weighted), minimum 25 targets. Who you can&apos;t throw at.</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ion-1">No qualifying defenders in the source window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Tm</th>
                <th className="px-4 py-3">Tgt</th>
                <th className="px-4 py-3">Cmp%</th>
                <th className="px-4 py-3">Yd/Tgt</th>
                <th className="px-4 py-3">Rating allowed</th>
                <th className="px-4 py-3">Miss tkl%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mineral bg-carbon">
              {rows.map((r, i) => (
                <tr key={r.playerId}>
                  <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                  <td className="px-4 py-3 font-mono text-ion">{r.targets}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtPct(r.completionPct)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{r.yardsPerTarget}</td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{r.passerRatingAllowed}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtPct(r.missedTacklePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
