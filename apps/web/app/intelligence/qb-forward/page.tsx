import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadQbForward, type QbForwardRow } from "@/lib/intelligence/qb-forward";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "QB Forward Prior — DAKOTA & ANY/A",
  description:
    "The most forward-looking QB reads: DAKOTA (EPA+CPOE composite) and Adjusted Net Yards per Attempt, with the agreement between them. Real nflverse data, agreement surfaced — a forward prior, not a pick.",
  alternates: { canonical: "/intelligence/qb-forward" },
};

// The lib surfaces agreement (0-1) rather than hiding disagreement. We read a
// high-agreement QB as a clean forward signal (cyan); a divergent one is a
// "second look", which we treat as neutral (ion-2). Mirrors AGREEMENT_THRESHOLD.
const AGREE_THRESHOLD = 0.8;
function readLabel(r: QbForwardRow): string {
  return r.agreement >= AGREE_THRESHOLD ? "Agree" : "Diverge";
}
function readClass(r: QbForwardRow): string {
  if (r.agreement >= AGREE_THRESHOLD) return "text-orbital-cyan";
  if (r.dakotaPct < 50 && r.anyaPct < 50) return "text-plasma";
  return "text-ion-2";
}

export default async function QbForwardPage(): Promise<JSX.Element> {
  const f = await loadQbForward();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">QB Forward Prior</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              QB Forward Prior &mdash; DAKOTA &amp; ANY/A
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              The most forward-looking QB reads: DAKOTA (EPA+CPOE composite) and Adjusted Net Yards per
              Attempt, with the agreement between them.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/intelligence/qb-forward" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">How we read it</p>
            <dl className="mt-4 space-y-3 text-sm leading-6 text-ion-1">
              <div>
                <dt className="font-semibold text-ion-white">DAKOTA — EPA + CPOE composite</dt>
                <dd className="text-ion-2">nflverse&apos;s adjusted EPA + accuracy composite, tuned to predict next-year adjusted EPA/play. The closest public &ldquo;forward&rdquo; QB number.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">ANY/A — adjusted net yards per attempt</dt>
                <dd className="text-ion-2">The classic efficiency yardstick, built transparently from raw box columns. A genuinely different forward lens than the composite.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">The edge — agreement, not an average</dt>
                <dd className="text-ion-2">When both priors land in the same tier we read a <span className="text-orbital-cyan">clean</span> forward signal; when they diverge it&apos;s a <span className="text-ion-2">second look</span>. We surface the disagreement, we don&apos;t average it away.</dd>
              </div>
            </dl>
          </div>
        </section>

        {f.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{f.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Forward prior leaders{f.throughWeek ? ` · ${f.season} through week ${f.throughWeek}` : f.season ? ` · ${f.season}` : ""}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Who the forward lenses like</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{f.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3" title="games">G</th>
                    <th className="px-4 py-3" title="pass attempts">Att</th>
                    <th className="px-4 py-3" title="DAKOTA EPA + CPOE composite">DAKOTA</th>
                    <th className="px-4 py-3" title="adjusted net yards per attempt">ANY/A</th>
                    <th className="px-4 py-3" title="DAKOTA percentile within QB pool">DAK%</th>
                    <th className="px-4 py-3" title="ANY/A percentile within QB pool">ANY/A%</th>
                    <th className="px-4 py-3" title="mean of the two percentiles">Grade</th>
                    <th className="px-4 py-3" title="how closely the two priors agree">Agmt</th>
                    <th className="px-4 py-3">The read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {f.rows.map((r, i) => (
                    <tr key={r.playerId} title={r.note}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.games}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.attempts}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{r.dakota.toFixed(3)}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{r.anyA.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.dakotaPct.toFixed(0)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.anyaPct.toFixed(0)}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{r.forwardGrade}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.agreement.toFixed(2)}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${readClass(r)}`}>{readLabel(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">{f.note}</p>
          </section>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
