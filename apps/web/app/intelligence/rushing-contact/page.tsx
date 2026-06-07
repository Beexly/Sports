import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadRushingContact, type RushingContactRow } from "@/lib/intelligence/rushing-contact";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rushing Contact — YAC vs YBC per Carry",
  description:
    "PFR advanced charting: yards after contact per carry (the back's own elusiveness and power, independent of blocking) vs yards before contact (the line and scheme). An independent estimator to triangulate against Next Gen RYOE. Real nflverse data, honest empty state.",
  alternates: { canonical: "/intelligence/rushing-contact" },
};

// YAC/att is the back's own talent term; high is good (cyan). The divergence read:
// a back with elite YAC/att but low YBC/att is winning on his own behind a poor
// line — a buy on talent. We color the talent term, treat broken-tackle rate as
// supporting evidence, and never average the two terms away.
const TALENT_PCT = 70;
function readLabel(r: RushingContactRow): string {
  if (r.yacPerAtt > r.ybcPerAtt) return "Wins after contact";
  if (r.ybcPerAtt > r.yacPerAtt * 1.5) return "Line-aided";
  return "Balanced";
}
function readClass(r: RushingContactRow): string {
  if (r.yacPct >= TALENT_PCT) return "text-orbital-cyan";
  if (r.ybcPerAtt > r.yacPerAtt * 1.5) return "text-ion-2";
  return "text-ion";
}
function yacClass(r: RushingContactRow): string {
  if (r.yacPct >= TALENT_PCT) return "text-orbital-cyan";
  if (r.yacPct < 40) return "text-plasma";
  return "text-ion-white";
}

export default async function RushingContactPage(): Promise<JSX.Element> {
  const f = await loadRushingContact();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Rushing Contact</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Rushing Contact &mdash; YAC vs YBC per carry
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              PFR advanced charting splits each carry into yards <em>after</em> contact &mdash; the back&apos;s own
              elusiveness and power &mdash; and yards <em>before</em> contact, the line and scheme term.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/intelligence/rushing-contact" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">How we read it</p>
            <dl className="mt-4 space-y-3 text-sm leading-6 text-ion-1">
              <div>
                <dt className="font-semibold text-ion-white">YAC/att — the back&apos;s own talent</dt>
                <dd className="text-ion-2">Yards after contact per carry isolates elusiveness and power. It&apos;s blocking-independent, so a <span className="text-orbital-cyan">high</span> figure is the back doing the work himself.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">YBC/att — the line and scheme</dt>
                <dd className="text-ion-2">Yards before contact per carry is the room the offensive line and design hand him. High YBC with modest YAC reads as a line-aided profile.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">The divergence — who&apos;s driving the yards</dt>
                <dd className="text-ion-2">Elite <span className="text-orbital-cyan">YAC</span> behind thin YBC is a back winning on his own &mdash; a second, independent estimator to triangulate against Next Gen RYOE. We surface the split, we don&apos;t average it away.</dd>
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
                Yards after contact leaders{f.season ? ` · ${f.season}` : ""}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Who creates yards on their own</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{f.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3" title="rushing attempts">Att</th>
                    <th className="px-4 py-3" title="yards after contact per attempt — the back's own talent">YAC/att</th>
                    <th className="px-4 py-3" title="yards before contact per attempt — the line/scheme">YBC/att</th>
                    <th className="px-4 py-3" title="broken tackles, total">Brk</th>
                    <th className="px-4 py-3" title="broken tackles per attempt">Brk/att</th>
                    <th className="px-4 py-3" title="YAC/att percentile within the qualified pool">YAC%</th>
                    <th className="px-4 py-3">The read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {f.rows.map((r, i) => (
                    <tr key={r.playerId}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.attempts}</td>
                      <td className={`px-4 py-3 font-mono ${yacClass(r)}`}>{r.yacPerAtt.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.ybcPerAtt.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.brokenTackles}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.brokenPerAtt.toFixed(3)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.yacPct.toFixed(0)}</td>
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
