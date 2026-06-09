import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadMoneyPuckNhl, type NhlSkaterRow } from "@/lib/moneypuck/nhl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NHL Expected Goals — MoneyPuck (free advanced stats)",
  description:
    "Read-only NHL expected-goals leaders from MoneyPuck: xG, goals over expected, and on-ice share. The first non-NFL sport wired through our legal source registry. Not a betting pick.",
  alternates: { canonical: "/nhl" },
};

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}
function gxClass(value: number): string {
  if (value > 2) return "text-orbital-cyan";
  if (value < -2) return "text-alert";
  return "text-ion-2";
}

export default async function NhlPage(): Promise<JSX.Element> {
  const nhl = await loadMoneyPuckNhl();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">NHL · expected goals</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Hockey, by the chances created.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              NHL expected-goals leaders from MoneyPuck &mdash; xG measures the quality of chances a
              skater generates; goals-over-expected splits finishing from luck. This is the first
              non-NFL sport wired through our legal source registry. Real advanced stats, not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/moneypuck/nhl" className="inline-flex min-h-11 items-center gap-1.5 rounded-ds-sm border border-surface-line bg-surface-raised px-4 py-2 text-xs font-medium text-ion-1 transition-colors hover:border-surface-line-strong hover:text-ion-white">↓ Export</Link>
              <Link href="/data" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">How we source data</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {nhl.status === "live" ? `${nhl.seasonLabel} · regular season` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">MoneyPuck</p>
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{nhl.note}</p>
            </div>
          </div>
        </section>

        {nhl.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{nhl.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <section className="border border-mineral bg-eclipse/80">
              <div className="border-b border-mineral px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Skaters · xG leaders</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">Who creates the most</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3">Tm</th>
                      <th className="px-4 py-3">Pos</th>
                      <th className="px-4 py-3">GP</th>
                      <th className="px-4 py-3">xG</th>
                      <th className="px-4 py-3">G</th>
                      <th className="px-4 py-3">G–xG</th>
                      <th className="px-4 py-3">Pts</th>
                      <th className="px-4 py-3">Shots</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mineral bg-carbon">
                    {nhl.skaters.map((r: NhlSkaterRow, i) => (
                      <tr key={r.playerId}>
                        <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                        <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                        <td className="px-4 py-3 font-mono text-ion">{r.games}</td>
                        <td className="px-4 py-3 font-mono text-ion-white">{r.xGoals.toFixed(1)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{r.goals}</td>
                        <td className={`px-4 py-3 font-mono ${gxClass(r.goalsOverExpected)}`}>{signed(r.goalsOverExpected)}</td>
                        <td className="px-4 py-3 font-mono text-ion">{r.points}</td>
                        <td className="px-4 py-3 font-mono text-ion">{r.shots}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">
                G–xG = goals minus expected goals (positive = finishing above the chances created).
              </p>
            </section>

            {nhl.goalies.length > 0 && (
              <section className="border border-mineral bg-eclipse/80">
                <div className="border-b border-mineral px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Goalies · GSAx</p>
                  <h2 className="mt-2 text-2xl font-semibold text-ion-white">Goals saved above expected</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Goalie</th>
                        <th className="px-4 py-3">Tm</th>
                        <th className="px-4 py-3">GP</th>
                        <th className="px-4 py-3">xGA</th>
                        <th className="px-4 py-3">GA</th>
                        <th className="px-4 py-3">GSAx</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mineral bg-carbon">
                      {nhl.goalies.map((g, i) => (
                        <tr key={g.playerId}>
                          <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                          <td className="px-4 py-3 font-semibold text-ion-white">{g.name}</td>
                          <td className="px-4 py-3 font-mono text-orbital-cyan">{g.team}</td>
                          <td className="px-4 py-3 font-mono text-ion">{g.games}</td>
                          <td className="px-4 py-3 font-mono text-ion">{g.xGoalsAgainst.toFixed(1)}</td>
                          <td className="px-4 py-3 font-mono text-ion">{g.goalsAgainst}</td>
                          <td className={`px-4 py-3 font-mono ${gxClass(g.gsax)}`}>{signed(g.gsax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">
                  GSAx = expected goals against minus actual goals allowed (positive = stopping more than expected).
                </p>
              </section>
            )}

            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SourceUrl label="Skaters" href={nhl.sourceUrls.skaters} />
                <SourceUrl label="Goalies" href={nhl.sourceUrls.goalies} />
                <SourceUrl label="Teams" href={nhl.sourceUrls.teams} />
              </div>
              <Attribution sourceIds={["moneypuck"]} className="mt-4" />
            </section>
          </>
        )}
      </main>
      <Footer />
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
