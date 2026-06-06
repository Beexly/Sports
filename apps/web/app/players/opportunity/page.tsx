import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadReceivingOpportunity, type OppSignal } from "@/lib/intelligence/receiving-opportunity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Receiving Opportunity — WOPR, Air Yards & the Buy-Low Signal",
  description:
    "Real nflverse opportunity metrics — WOPR, target share, air-yards share, aDOT, RACR — read the way a sharp does: opportunity precedes production, and where they diverge is the buy-low / sell-high edge. Not a pick.",
  alternates: { canonical: "/players/opportunity" },
};

const SIGNAL_LABEL: Record<OppSignal, string> = { "buy-low": "Buy-low", "sell-high": "Sell-high", stable: "Stable" };
function signalClass(s: OppSignal): string {
  if (s === "buy-low") return "text-orbital-cyan";
  if (s === "sell-high") return "text-plasma";
  return "text-ion-2";
}
function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function OpportunityPage(): Promise<JSX.Element> {
  const o = await loadReceivingOpportunity();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Receiving opportunity</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Opportunity comes before production.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              A receiver&apos;s value is the <em>volume and depth</em> of his looks, not last week&apos;s box
              score &mdash; and opportunity is far more stable than the points it yields. We read WOPR
              (target share + air-yards share), aDOT, and RACR from real nflverse play-by-play, then flag
              where opportunity and production <em>disagree</em>: that gap is the edge. Not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/intelligence/receiving-opportunity" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/players/snaps" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Snap share</Link>
              <Link href="/fantasy/waivers" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Waiver tool</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">How we read it</p>
            <dl className="mt-4 space-y-3 text-sm leading-6 text-ion-1">
              <div>
                <dt className="font-semibold text-ion-white">WOPR — weighted opportunity rating</dt>
                <dd className="text-ion-2">1.5·target share + 0.7·air-yards share. The single best summary of a receiver&apos;s role; it leads fantasy points.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">aDOT &amp; RACR</dt>
                <dd className="text-ion-2">Depth of target, and yards earned per air yard. Together they separate volume from efficiency.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">The edge — opportunity vs. production</dt>
                <dd className="text-ion-2">When opportunity ≫ production we read <span className="text-orbital-cyan">buy-low</span> (positive regression); when production ≫ opportunity, <span className="text-plasma">sell-high</span>. We surface the gap, we don&apos;t average it away.</dd>
              </div>
            </dl>
          </div>
        </section>

        {o.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{o.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Opportunity leaders{o.throughWeek ? ` · ${o.season} through week ${o.throughWeek}` : ""}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Who&apos;s earning the looks</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{o.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3">Tgt</th>
                    <th className="px-4 py-3">WOPR</th>
                    <th className="px-4 py-3" title="target share">Tgt%</th>
                    <th className="px-4 py-3" title="air-yards share">AY%</th>
                    <th className="px-4 py-3" title="avg depth of target">aDOT</th>
                    <th className="px-4 py-3" title="receiver air conversion ratio">RACR</th>
                    <th className="px-4 py-3">The read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {o.rows.map((r, i) => (
                    <tr key={r.playerId} title={r.note}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.targets}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{r.wopr.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.targetShare)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.airYardsShare)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.aDOT.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.racr.toFixed(2)}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${signalClass(r.signal)}`}>{SIGNAL_LABEL[r.signal]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">
              WOPR = 1.5·target share + 0.7·air-yards share (mean per game); min {20} targets. The read compares
              opportunity vs. production percentiles — the input the waiver tool and optimizer should weight, not the box score.
            </p>
          </section>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
