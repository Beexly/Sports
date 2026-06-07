import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadRouteRate, type RouteRateSignal } from "@/lib/intelligence/route-rate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Route Rate — targets per route run (proxy)",
  description:
    "A snaps×dropbacks proxy for targets per route run — high TPRR on low routes is the breakout signal; empty volume is the fade. Labelled a proxy (true routes are PFF-gated).",
  alternates: { canonical: "/intelligence/route-rate" },
};

const SIGNAL_LABEL: Record<RouteRateSignal, string> = { breakout: "Breakout", fade: "Fade", steady: "Steady" };
function signalClass(s: RouteRateSignal): string {
  if (s === "breakout") return "text-orbital-cyan";
  if (s === "fade") return "text-plasma";
  return "text-ion-2";
}

export default async function RouteRatePage(): Promise<JSX.Element> {
  const rr = await loadRouteRate();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Route Rate (TPRR)</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            Route Rate — targets per route run (proxy)
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            A snaps&times;dropbacks proxy for targets per route run &mdash; high TPRR on low routes is the breakout
            signal; empty volume is the fade. Labelled a proxy (true routes are PFF-gated).
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/api/intelligence/route-rate" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
          </div>
        </section>

        {rr.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{rr.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Route-rate leaders{rr.throughWeek ? ` · ${rr.season} through week ${rr.throughWeek}` : ""}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Targets per route run (proxy)</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{rr.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3" title="approximate routes run (proxy)">Routes</th>
                    <th className="px-4 py-3">Tgt</th>
                    <th className="px-4 py-3" title="targets per route run (proxy)">TPRR</th>
                    <th className="px-4 py-3" title="within-pool TPRR percentile">TPRR%</th>
                    <th className="px-4 py-3">The read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {rr.rows.map((r, i) => (
                    <tr key={r.playerId} title={r.note}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.routes}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.targets}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{r.tprr.toFixed(3)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.tprrPct}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${signalClass(r.signal)}`}>{SIGNAL_LABEL[r.signal]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">{rr.note}</p>
          </section>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
