import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadLahmanMlbTeams, type MlbTeamRow } from "@/lib/lahman/mlb-teams";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MLB Run Differential & Pythagorean Wins: Lahman (free)",
  description:
    "Read-only MLB team-season run differential and Pythagorean win expectation from the Lahman Baseball Database (CC-BY-SA). The third sport wired through our legal source registry, with multi-host failover. Not a betting pick.",
  alternates: { canonical: "/mlb" },
};

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}
function luckClass(value: number): string {
  if (value > 0.02) return "text-orbital-cyan";
  if (value < -0.02) return "text-alert";
  return "text-ion-2";
}
function pct(value: number): string {
  return value.toFixed(3).replace(/^0/, "");
}

export default async function MlbPage(): Promise<JSX.Element> {
  const mlb = await loadLahmanMlbTeams();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">MLB · run differential</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Baseball, by the runs that matter.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Team-season run differential and the Pythagorean win expectation (R<sup>1.83</sup> /
              (R<sup>1.83</sup> + RA<sup>1.83</sup>)) from the Lahman database &mdash; the canonical split of
              skill from luck. The third sport on our legal source registry, served through a multi-host
              failover so one outage never drops the feed. Real stats, not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/board" className="btn-primary min-h-11 px-5 py-3">See today&apos;s board</Link>
              <Link href="/api/mlb/teams" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">View as JSON</Link>
              <Link href="/data" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">How we source data</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {mlb.status === "live" ? `${mlb.season} · regular season` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">Lahman{mlb.servedBy?.includes("jsdelivr") ? " · jsDelivr" : ""}</p>
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{mlb.note}</p>
            </div>
          </div>
        </section>

        {mlb.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{mlb.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Teams · by run differential</p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Who outscored their opponents</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th scope="col" className="px-4 py-3">#</th>
                    <th scope="col" className="px-4 py-3">Team</th>
                    <th scope="col" className="px-4 py-3">Lg</th>
                    <th scope="col" className="px-4 py-3">W</th>
                    <th scope="col" className="px-4 py-3">L</th>
                    <th scope="col" className="px-4 py-3">R</th>
                    <th scope="col" className="px-4 py-3">RA</th>
                    <th scope="col" className="px-4 py-3">Diff</th>
                    <th scope="col" className="px-4 py-3">Win%</th>
                    <th scope="col" className="px-4 py-3">Pyth%</th>
                    <th scope="col" className="px-4 py-3">Luck</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {mlb.teams.map((r: MlbTeamRow, i) => (
                    <tr key={`${r.franchise}-${i}`}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.league}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.wins}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.losses}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.runsScored}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.runsAllowed}</td>
                      <td className={`px-4 py-3 font-mono ${r.runDiff > 0 ? "text-orbital-cyan" : r.runDiff < 0 ? "text-alert" : "text-ion-2"}`}>{signed(r.runDiff)}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{pct(r.winPct)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{pct(r.pythagWinPct)}</td>
                      <td className={`px-4 py-3 font-mono ${luckClass(r.luck)}`}>{r.luck > 0 ? "+" : ""}{r.luck.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">
              Luck = actual win% minus Pythagorean win% (positive = won more than the run differential predicts).
            </p>
          </section>
        )}

        <Attribution sourceIds={["lahman-db"]} />
      </main>
      <Footer />
    </div>
  );
}
