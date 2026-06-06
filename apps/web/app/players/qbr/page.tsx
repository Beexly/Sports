import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadNflverseQbr } from "@/lib/nflverse/qbr";
import { loadQbConsensus, type Divergence } from "@/lib/intelligence/qb-consensus";

export const dynamic = "force-dynamic";

const DIVERGENCE_LABEL: Record<Divergence, string> = {
  aligned: "Aligned",
  "results-over-accuracy": "Results › accuracy",
  "accuracy-over-results": "Accuracy › results",
  "single-source": "Single source",
};
function divergenceClass(d: Divergence): string {
  if (d === "aligned") return "text-orbital-cyan";
  if (d === "results-over-accuracy") return "text-ultraviolet";
  if (d === "accuracy-over-results") return "text-plasma";
  return "text-ion-2";
}

export const metadata: Metadata = {
  title: "Total QBR — ESPN via nflverse (independent QB estimate)",
  description:
    "Read-only ESPN Total QBR leaders, play-weighted to the season, via nflverse. One independent QB-quality estimate to triangulate against CPOE and pressure. Not a pick.",
  alternates: { canonical: "/players/qbr" },
};

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

export default async function QbrPage(): Promise<JSX.Element> {
  const [q, consensus] = await Promise.all([loadNflverseQbr(), loadQbConsensus()]);

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Total QBR</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              A second opinion on the quarterback.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              ESPN&apos;s Total QBR (0&ndash;100), play-weighted across the season, via nflverse. We
              show it as one <em>independent</em> estimate to triangulate against our CPOE (Next Gen)
              and pressure (PFR) views &mdash; when three different lenses agree, you trust the read more.
              Not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/nflverse/qbr" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/players/nextgen" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Next Gen (CPOE)</Link>
              <Link href="/players/trenches" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Pressure</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {q.status === "live" ? `Season ${q.season}` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">ESPN · nflverse</p>
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{q.blockReason}</p>
            </div>
          </div>
        </section>

        {q.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This page is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{q.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <section className="border border-mineral bg-eclipse/80">
              <div className="border-b border-mineral px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">QBR leaders</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">Play-weighted, {q.season} regular season</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3">Tm</th>
                      <th className="px-4 py-3">G</th>
                      <th className="px-4 py-3">QBR</th>
                      <th className="px-4 py-3">EPA</th>
                      <th className="px-4 py-3">Pts added</th>
                      <th className="px-4 py-3">Plays</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mineral bg-carbon">
                    {q.leaders.map((r, i) => (
                      <tr key={r.playerId}>
                        <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                        <td className="px-4 py-3 font-mono text-ion">{r.games}</td>
                        <td className="px-4 py-3 font-mono text-ion-white">{r.qbr.toFixed(1)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{signed(r.epaTotal)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{signed(r.ptsAdded)}</td>
                        <td className="px-4 py-3 font-mono text-ion-2">{r.plays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">
                QBR is play-weighted across the season; min {6} games. EPA = total expected points added.
              </p>
            </section>

            {consensus.status !== "source-error" && consensus.rows.length > 0 && (
              <section className="border border-mineral bg-eclipse/80">
                <div className="border-b border-mineral px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                    Consensus · two independent lenses
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ion-white">Where the estimators agree — and where they don&apos;t</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{consensus.note}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Tm</th>
                        <th className="px-4 py-3" title="QBR percentile within the qualified pool">QBR %ile</th>
                        <th className="px-4 py-3" title="CPOE (Next Gen accuracy) percentile">CPOE %ile</th>
                        <th className="px-4 py-3" title="Mean of the available percentiles">Consensus</th>
                        <th className="px-4 py-3">The read</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mineral bg-carbon">
                      {consensus.rows.map((r, i) => (
                        <tr key={`${r.name}-${i}`} title={r.note}>
                          <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                          <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                          <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                          <td className="px-4 py-3 font-mono text-ion">{r.qbrPct === null ? "—" : r.qbrPct.toFixed(0)}</td>
                          <td className="px-4 py-3 font-mono text-ion">{r.cpoePct === null ? "—" : r.cpoePct.toFixed(0)}</td>
                          <td className="px-4 py-3 font-mono text-ion-white">{r.consensus}</td>
                          <td className={`px-4 py-3 font-mono text-[11px] ${divergenceClass(r.divergence)}`}>{DIVERGENCE_LABEL[r.divergence]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">
                  Two independent estimators, each as a within-pool percentile. We surface disagreement
                  (results vs. accuracy) instead of averaging it into false precision. Hover a row for the read.
                  {!consensus.sources.ngs && " CPOE feed unavailable — single-source reads only."}
                </p>
              </section>
            )}

            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source</p>
              <p className="mt-3 break-all font-mono text-xs leading-5 text-ion-2">{q.sourceUrl}</p>
              <Attribution sourceIds={["nflverse"]} className="mt-4" />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
