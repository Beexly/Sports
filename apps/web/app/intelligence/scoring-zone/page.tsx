import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadScoringZone, type ScoringZoneSignal } from "@/lib/intelligence/scoring-zone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scoring-Zone Equity — TD equity from opportunity",
  description:
    "Red-zone and goal-line opportunity share, with the TD rate regressed toward the positional mean — TD equity from sticky opportunity, not noisy past touchdowns.",
  alternates: { canonical: "/intelligence/scoring-zone" },
};

const SIGNAL_LABEL: Record<ScoringZoneSignal, string> = { buy: "Buy", sell: "Sell", "in-line": "In-line" };
function signalClass(s: ScoringZoneSignal): string {
  if (s === "buy") return "text-orbital-cyan";
  if (s === "sell") return "text-plasma";
  return "text-ion-2";
}
function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function ScoringZonePage(): Promise<JSX.Element> {
  const z = await loadScoringZone();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Scoring-Zone Equity</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            Scoring-Zone Equity — TD equity from opportunity
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ion-1">
            Red-zone and goal-line opportunity share, with the TD rate regressed toward the positional mean — TD equity
            from sticky opportunity, not noisy past touchdowns.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/api/intelligence/scoring-zone" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
          </div>
        </section>

        {z.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{z.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Scoring-zone leaders{z.throughWeek ? ` · ${z.season} through week ${z.throughWeek}` : ""}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Who owns the looks inside the 20</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{z.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3" title="red-zone carries (inside the 20)">RZ Car</th>
                    <th className="px-4 py-3" title="red-zone targets (inside the 20)">RZ Tgt</th>
                    <th className="px-4 py-3" title="carries + targets inside the 5">In-5</th>
                    <th className="px-4 py-3" title="player's share of his team's scoring-zone opportunities">RZ Share</th>
                    <th className="px-4 py-3" title="scoring-zone touchdowns">RZ TD</th>
                    <th className="px-4 py-3" title="raw TD per scoring-zone opportunity">TD Rate</th>
                    <th className="px-4 py-3" title="TD rate regressed toward the positional mean">xTD Rate</th>
                    <th className="px-4 py-3">The read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {z.rows.map((r, i) => (
                    <tr key={r.playerId} title={r.note}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.rzCarries}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.rzTargets}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.inside5}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{pct(r.rzShare)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.rzTds}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.tdRate)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.expectedTdRate)}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${signalClass(r.signal)}`}>{SIGNAL_LABEL[r.signal]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">{z.note}</p>
          </section>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
