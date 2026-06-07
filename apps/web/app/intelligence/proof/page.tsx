import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadPredictiveness, type PredictivenessSplit } from "@/lib/intelligence/predictiveness";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Does It Predict? — Process Grade Backtest",
  description:
    "A split-half backtest on real nflverse data: we build the process grade on the first half of the season and measure how it ranks second-half production vs the past-production baseline. In-sample, honest about it — the PROVE layer.",
  alternates: { canonical: "/intelligence/proof" },
};

function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}
function corr(v: number | null): string {
  return v == null ? "—" : v.toFixed(2);
}
// Lift is the headline: does the grade beat raw past production? Positive = yes.
function liftClass(v: number | null): string {
  if (v == null) return "text-ion-2";
  if (v > 0.02) return "text-orbital-cyan";
  if (v < -0.02) return "text-plasma";
  return "text-ion";
}
// A hit rate above the coin flip is signal; below is noise (or worse).
function hitClass(v: number | null): string {
  if (v == null) return "text-ion-2";
  if (v > 0.55) return "text-orbital-cyan";
  if (v < 0.45) return "text-plasma";
  return "text-ion";
}

function Row({ s, label }: { s: PredictivenessSplit; label: string }): JSX.Element {
  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-ion-white">{label}</td>
      <td className="px-4 py-3 font-mono text-ion-2">{s.n}</td>
      <td className="px-4 py-3 font-mono text-ion-white">{corr(s.gradeCorr)}</td>
      <td className="px-4 py-3 font-mono text-ion">{corr(s.baselineCorr)}</td>
      <td className={`px-4 py-3 font-mono ${liftClass(s.lift)}`}>{s.lift == null ? "—" : `${s.lift > 0 ? "+" : ""}${s.lift.toFixed(2)}`}</td>
      <td className={`px-4 py-3 font-mono ${hitClass(s.buyLowHitRate)}`}>{pct(s.buyLowHitRate)}<span className="ml-1 text-[10px] text-ion-2">n={s.buyLowN}</span></td>
      <td className={`px-4 py-3 font-mono ${hitClass(s.sellHighHitRate)}`}>{pct(s.sellHighHitRate)}<span className="ml-1 text-[10px] text-ion-2">n={s.sellHighN}</span></td>
    </tr>
  );
}

export default async function ProofPage(): Promise<JSX.Element> {
  const p = await loadPredictiveness();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">The PROVE layer</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Does the grade actually predict?
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Anyone can publish a rating. We backtest ours. Build the process grade on the first half of the
              season, then measure how well it ranks <em>second-half</em> production — against the obvious baseline,
              past production predicting future production. If the grade adds lift, it carries forward signal.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/intelligence/predictiveness" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/intelligence/players" className="btn-ghost min-h-11 px-5 py-3">The grades →</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">How to read it</p>
            <dl className="mt-4 space-y-3 text-sm leading-6 text-ion-1">
              <div>
                <dt className="font-semibold text-ion-white">Grade ρ — does the grade rank the future?</dt>
                <dd className="text-ion-2">Spearman rank correlation between the first-half process grade and second-half production, within position. Higher is better.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">Lift — does it beat the past?</dt>
                <dd className="text-ion-2">Grade ρ minus baseline ρ (past production → future production). <span className="text-orbital-cyan">Positive</span> means the grade adds signal the box score didn&apos;t already have.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">Call hit-rate — were buy/sell right?</dt>
                <dd className="text-ion-2">Of first-half buy-lows, how many <span className="text-orbital-cyan">rose</span>; of sell-highs, how many <span className="text-plasma">fell</span>. Read against the 50% coin flip.</dd>
              </div>
            </dl>
          </div>
        </section>

        {p.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{p.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="border border-mineral bg-eclipse p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">Grade ρ (overall)</p>
                <p className="mt-2 font-display text-4xl font-semibold text-ion-white">{corr(p.overall.gradeCorr)}</p>
                <p className="mt-1 text-xs text-ion-2">vs {corr(p.overall.baselineCorr)} past-production baseline</p>
              </div>
              <div className="border border-mineral bg-eclipse p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">Lift over the past</p>
                <p className={`mt-2 font-display text-4xl font-semibold ${liftClass(p.overall.lift)}`}>{p.overall.lift == null ? "—" : `${p.overall.lift > 0 ? "+" : ""}${p.overall.lift.toFixed(2)}`}</p>
                <p className="mt-1 text-xs text-ion-2">{p.sampleSize} players · {p.season}</p>
              </div>
              <div className="border border-mineral bg-eclipse p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">Sell-high hit-rate</p>
                <p className={`mt-2 font-display text-4xl font-semibold ${hitClass(p.overall.sellHighHitRate)}`}>{pct(p.overall.sellHighHitRate)}</p>
                <p className="mt-1 text-xs text-ion-2">buy-low {pct(p.overall.buyLowHitRate)} · vs 50% coin flip</p>
              </div>
            </section>

            <section className="border border-mineral bg-eclipse/80">
              <div className="border-b border-mineral px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  {p.season} · trained on weeks {p.trainWeeks[0]}–{p.trainWeeks[p.trainWeeks.length - 1]} · tested on weeks {p.testWeeks[0]}–{p.testWeeks[p.testWeeks.length - 1]}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">The backtest, by position</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{p.verdict}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                    <tr>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3" title="paired players in both halves">N</th>
                      <th className="px-4 py-3" title="rank corr: 1st-half grade -> 2nd-half production">Grade ρ</th>
                      <th className="px-4 py-3" title="rank corr: 1st-half production -> 2nd-half production">Baseline ρ</th>
                      <th className="px-4 py-3" title="grade rho minus baseline rho">Lift</th>
                      <th className="px-4 py-3" title="fraction of buy-low calls whose per-game rose">Buy-low ✓</th>
                      <th className="px-4 py-3" title="fraction of sell-high calls whose per-game fell">Sell-high ✓</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mineral bg-carbon">
                    <Row s={p.overall} label="Overall" />
                    {p.byPosition.map((s) => (
                      <Row key={s.position} s={s} label={s.position} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">{p.note}</p>
            </section>
          </>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
