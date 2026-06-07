import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadTeamEnvironment } from "@/lib/intelligence/team-environment";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

export const metadata: Metadata = {
  title: "Team Environment — EPA, PROE & pace",
  description:
    "Neutral-script offensive and defensive EPA per play, success rate, PROE (pass rate over expected), and pace from real nflverse play-by-play — the top-down team prior every player share sits in front of. Not a pick.",
  alternates: { canonical: "/intelligence/team" },
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
function epaClass(v: number): string {
  if (v > 0) return "text-orbital-cyan";
  if (v < 0) return "text-plasma";
  return "text-ion-2";
}
function signed(v: number, d = 3): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(d)}`;
}

export default async function TeamEnvironmentPage(): Promise<JSX.Element> {
  const t = await loadTeamEnvironment();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Team Environment</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            Team Environment — EPA, PROE &amp; pace
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ion-1">
            Neutral-script offensive and defensive EPA per play, success rate, PROE (pass rate over expected),
            and pace — the top-down team prior every player share sits in front of.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/api/intelligence/team-environment" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
          </div>
        </section>

        {t.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{t.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Team scoring environment{t.season ? ` · ${t.season}` : ""}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">The top-down team prior</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{t.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3" title="offensive EPA per play (neutral script, early down)">Off EPA</th>
                    <th className="px-4 py-3" title="within-league offensive EPA percentile">Off%ile</th>
                    <th className="px-4 py-3" title="offensive success rate">Off SR</th>
                    <th className="px-4 py-3" title="defensive EPA per play (lower is better)">Def EPA</th>
                    <th className="px-4 py-3" title="within-league defensive EPA percentile (EPA inverted)">Def%ile</th>
                    <th className="px-4 py-3" title="defensive success rate (lower is better)">Def SR</th>
                    <th className="px-4 py-3" title="PROE — pass rate over expected">PROE</th>
                    <th className="px-4 py-3" title="no-huddle rate — pace proxy">Pace</th>
                    <th className="px-4 py-3">The read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {t.rows.map((r, i) => (
                    <tr key={r.team}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-orbital-cyan">{r.team}</td>
                      <td className={`px-4 py-3 font-mono ${epaClass(r.offEpaPerPlay)}`}>{signed(r.offEpaPerPlay)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.offEpaPct)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.offSuccessRate)}</td>
                      <td className={`px-4 py-3 font-mono ${epaClass(-r.defEpaPerPlay)}`}>{signed(r.defEpaPerPlay)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.defEpaPct)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.defSuccessRate)}</td>
                      <td className={`px-4 py-3 font-mono ${epaClass(r.proe)}`}>{signed(r.proe, 1)}%</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.noHuddleRate)}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${epaClass(r.offEpaPerPlay)}`}>
                        {r.offEpaPerPlay > 0 ? "Buy offense" : r.offEpaPerPlay < 0 ? "Fade offense" : "Neutral"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">{t.note}</p>
          </section>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
