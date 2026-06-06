import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadSleeperMarketSignal, type SleeperTrendingPlayer } from "@/lib/sleeper/market-signal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fantasy Market Signal — Live Adds & Drops (Sleeper)",
  description:
    "Live fantasy add/drop activity across Sleeper leagues over the last 24 hours — real crowd market sentiment, attributed to Sleeper. Not a projection or a betting pick.",
  alternates: { canonical: "/players/market" },
};

const numberFormatter = new Intl.NumberFormat("en-US");

export default async function MarketSignalPage(): Promise<JSX.Element> {
  const signal = await loadSleeperMarketSignal();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Market signal</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              What the crowd is doing right now.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Live add/drop activity across Sleeper fantasy leagues over the last{" "}
              {signal.lookbackHours} hours. This is real crowd behavior &mdash; useful as a sentiment
              and breaking-news tell &mdash; not our projection or a betting pick. It is the first
              non-nflverse feed wired through our legal source registry.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/sleeper/market-signal" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/players" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Production Lab</Link>
              <Link href="/data" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">How we source data</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {signal.status === "live" ? `Last ${signal.lookbackHours} hours` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">Sleeper</p>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Player pool" value={numberFormatter.format(signal.playerPool)} />
              <Metric label="Rising" value={String(signal.adds.length)} />
              <Metric label="Falling" value={String(signal.drops.length)} />
            </dl>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Note</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{signal.note}</p>
            </div>
          </div>
        </section>

        {signal.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{signal.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <TrendTable eyebrow="Rising · most added" title="Buying" tone="up" rows={signal.adds} />
              <TrendTable eyebrow="Falling · most dropped" title="Selling" tone="down" rows={signal.drops} />
            </div>

            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SourceUrl label="Trending adds" href={signal.sourceUrls.trendingAdd} />
                <SourceUrl label="Trending drops" href={signal.sourceUrls.trendingDrop} />
                <SourceUrl label="Player map" href={signal.sourceUrls.players} />
              </div>
              <Attribution sourceIds={["sleeper"]} className="mt-4" />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function TrendTable({
  eyebrow,
  title,
  tone,
  rows,
}: {
  eyebrow: string;
  title: string;
  tone: "up" | "down";
  rows: readonly SleeperTrendingPlayer[];
}): JSX.Element {
  const accent = tone === "up" ? "text-orbital-cyan" : "text-alert";
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="border-b border-mineral px-5 py-4">
        <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${accent}`}>{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-ion-white">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ion-1">No trending players in this window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Tm</th>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Moves</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mineral bg-carbon">
              {rows.map((r, i) => (
                <tr key={r.playerId}>
                  <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                  <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                  <td className="px-4 py-3 font-mono text-ion-2">
                    {r.injuryStatus ? <span className="text-amber-300">{r.injuryStatus}</span> : "—"}
                  </td>
                  <td className={`px-4 py-3 font-mono font-semibold ${accent}`}>
                    {numberFormatter.format(r.count)}
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
