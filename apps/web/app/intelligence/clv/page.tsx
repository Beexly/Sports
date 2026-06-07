import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadClvBacktest, type ClvBacktestRow } from "@/lib/intelligence/clv-calibration";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CLV Calibration — the engine grades itself",
  description:
    "Closing-line-value backtest against nflverse schedules — does the model beat the closing line? Self-grading, never a bet; forward odds stay gated.",
  alternates: { canonical: "/intelligence/clv" },
};

// CLV is the signal: positive = beat the close (buy), negative = trailed (sell), flat = neutral.
function clvClass(clv: number): string {
  if (clv > 0) return "text-orbital-cyan";
  if (clv < 0) return "text-plasma";
  return "text-ion-2";
}
function clvRead(clv: number): string {
  if (clv > 0) return "Beat close";
  if (clv < 0) return "Trailed";
  return "At close";
}
function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(4)}`;
}
function prob(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export default async function ClvCalibrationPage(): Promise<JSX.Element> {
  const c = await loadClvBacktest();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">CLV Calibration</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            CLV Calibration — the engine grades itself
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            Closing-line-value backtest against nflverse schedules — does the model beat the closing line?
            Self-grading, never a bet; forward odds stay gated.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/api/intelligence/clv-calibration" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
          </div>
        </section>

        {c.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{c.note}</p>
            <p className="mt-2 font-mono text-[11px] leading-5 text-ion-2">{c.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                CLV self-grade{c.seasonTo ? ` · ${c.seasonFrom}–${c.seasonTo}` : ""} · {c.gamesGraded} games graded
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Did the model beat the close?</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{c.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Season</th>
                    <th className="px-4 py-3">Wk</th>
                    <th className="px-4 py-3">Game</th>
                    <th className="px-4 py-3">Market</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3" title="model implied probability for the side taken">Model</th>
                    <th className="px-4 py-3" title="implied probability from the closing line">Close</th>
                    <th className="px-4 py-3" title="probability points beaten vs the close">CLV</th>
                    <th className="px-4 py-3" title="did the side actually cover/win?">Covered</th>
                    <th className="px-4 py-3">The read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {c.rows.map((r: ClvBacktestRow, i) => (
                    <tr key={`${r.season}-${r.week}-${r.game}-${r.market}`}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.season}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.week}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.game}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.market}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.side}</td>
                      <td className="px-4 py-3 font-mono text-ion">{prob(r.modelProb)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{prob(r.closingProb)}</td>
                      <td className={`px-4 py-3 font-mono ${clvClass(r.clv)}`}>{signed(r.clv)}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.covered ? "Yes" : "—"}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${clvClass(r.clv)}`}>{clvRead(r.clv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">{c.note}</p>
          </section>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
