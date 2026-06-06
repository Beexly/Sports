import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadNflverseEdgeSignals, type EdgeSignalRow } from "@/lib/nflverse/edge-signals";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edge Signals — Buy-Low / Sell-High From Tracking vs Production",
  description:
    "We fuse real NFL Next Gen Stats (separation, YAC over expected, air-yards share) with real production to flag regression-to-mean buy-low and sell-high receivers. A transparent research lens — not a betting pick.",
  alternates: { canonical: "/players/edge" },
};

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function fmtPct(value: number | null): string {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function fmtSigned(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export default async function EdgeSignalsPage(): Promise<JSX.Element> {
  const edge = await loadNflverseEdgeSignals();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Edge Signals</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Getting open, not yet getting paid.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              We standardize a receiver&apos;s tracking signal &mdash; how open he gets (separation),
              how many yards he earns after the catch over expected, and his share of the team&apos;s
              intended air yards &mdash; and compare it to his actual PPR production. When the
              underlying runs hotter than the box score, that&apos;s a regression-to-mean
              <span className="text-orbital-cyan"> buy-low</span>. When output outruns the
              underlying, it&apos;s a <span className="text-alert">sell-high</span> flag. Real data,
              shown math &mdash; not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/nflverse/edge-signals" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/players/nextgen" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Next Gen Stats</Link>
              <Link href="/players" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Production Lab</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {edge.status === "live" ? `Season ${edge.season}` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{edge.seasonType}</p>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Qualified" value={String(edge.qualifiedPlayers)} />
              <Metric label="Buy-low" value={String(edge.buyLow.length)} />
              <Metric label="Sell-high" value={String(edge.sellHigh.length)} />
            </dl>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{edge.blockReason}</p>
            </div>
          </div>
        </section>

        {edge.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{edge.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <EdgeTable
              eyebrow="Buy-low · regression up"
              title="Underlying ahead of the box score"
              blurb="Tracking signal runs hotter than production. Ranked by the gap (underlying z minus production z)."
              tone="buy"
              rows={edge.buyLow}
            />
            <EdgeTable
              eyebrow="Sell-high · regression risk"
              title="Production ahead of the underlying"
              blurb="Output is outrunning the tracking signal. Ranked by the most negative gap."
              tone="sell"
              rows={edge.sellHigh}
            />
            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source URLs</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SourceUrl label="Player stats (weekly)" href={edge.sourceUrls.playerStats} />
                <SourceUrl label="NGS receiving" href={edge.sourceUrls.ngsReceiving} />
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

function EdgeTable({
  eyebrow,
  title,
  blurb,
  tone,
  rows,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  tone: "buy" | "sell";
  rows: readonly EdgeSignalRow[];
}): JSX.Element {
  const gapClass = tone === "buy" ? "text-orbital-cyan" : "text-alert";
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="flex flex-col justify-between gap-3 border-b border-mineral px-5 py-4 sm:flex-row sm:items-end">
        <div>
          <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${gapClass}`}>{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ion-white">{title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ion-1">{blurb}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ion-1">No players cleared the gap threshold in the source window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Tm</th>
                <th className="px-4 py-3">G</th>
                <th className="px-4 py-3">PPR/G</th>
                <th className="px-4 py-3">Tgt sh</th>
                <th className="px-4 py-3">Sep</th>
                <th className="px-4 py-3">YAC+/-</th>
                <th className="px-4 py-3">Air sh</th>
                <th className="px-4 py-3">Undr z</th>
                <th className="px-4 py-3">Prod z</th>
                <th className="px-4 py-3">Gap</th>
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
                  <td className="px-4 py-3 font-mono text-ion">{r.games}</td>
                  <td className="px-4 py-3 font-mono text-ion-white">{fmt(r.pprPerGame, 1)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtPct(r.targetShare)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmt(r.avgSeparation)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtSigned(r.yacAboveExpectation)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtPct(r.shareIntendedAirYards)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtSigned(r.underlyingZ)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{fmtSigned(r.productionZ)}</td>
                  <td className={`px-4 py-3 font-mono font-semibold ${gapClass}`}>{fmtSigned(r.gap)}</td>
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
