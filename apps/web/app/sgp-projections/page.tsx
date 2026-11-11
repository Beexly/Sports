import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getEntitledSgpRows } from "@/lib/engine/engine-live-bridge";

export const metadata: Metadata = {
  title: "Correlated SGP Projections | Galaxy Sports Edge",
  description:
    "Same-Game Parlay game-script pricing, connected player prop pairings, and live line value across all NFL matchups. Official verified record 47-19-1 (71.2% · +24.92u (with gated props)).",
  alternates: { canonical: "/sgp-projections" },
};

const SGPS = getEntitledSgpRows(false);

export default function SgpProjectionsPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-purple-400">
            Connected Game-Script Parlays · Verified 47-19-1 (+24.92u)
          </div>
          <h1 className="mt-4 font-display text-4xl uppercase sm:text-6xl text-white">
            Correlated SGP Projections
          </h1>
          <p className="mt-3 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
            Sportsbooks hold a massive house edge on Same-Game Parlays by pricing legs as if they happen in a vacuum or penalizing obvious combinations. We build multi-leg tickets around connected on-field game scripts - offensive line protection, coverage shells, and injury workload shifts - where the sportsbook payout still leaves real value.
          </p>
        </div>

        {/* Free Tonight TNF Anchor Leg Preview */}
        <div className="mt-10">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-xl font-bold uppercase tracking-tight text-white">
              Tonight&apos;s Free TNF Anchor Leg (Full 3-Leg SGP Tickets Locked Below)
            </h2>
            <span className="rounded bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              Free TNF Teaser
            </span>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-white">WSH @ NYG · Thursday Night Football</span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
                Conviction 74/100
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">Free TNF Anchor Prop (Leg 1 of 3)</div>
              <div className="mt-1.5 text-sm font-semibold text-white leading-relaxed">
                Mark Andrews OVER 2.5 Receptions (-135) · [Legs 2 &amp; 3 Locked in TNF &amp; SGP Packs]
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-950/40 p-3 text-xs leading-relaxed text-slate-300">
              <span className="font-bold text-slate-200">On-Field Game Script: </span>
              With Lamar Jackson and Tyler Huntley out, Jacoby Brissett steps in at quarterback for Baltimore against a Jacksonville defense that leans on single-high coverage and blitz pressure - making Mark Andrews the primary quick-game and play-action safety valve over the middle.
            </div>
          </div>
        </div>

        {/* Locked SGPs Table with Paywall Banner */}
        <div className="mt-14">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-white">
                Full-Slate Same-Game Parlay Card ({SGPS.length} Locked Tickets)
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                All official 3-leg Same-Game Parlay tickets, fair prices, and target sportsbook lines are locked for members.
              </p>
            </div>
            <Link
              href="/packages"
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-black transition-colors"
            >
              Unlock All SGPs ($19) →
            </Link>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4">Matchup</th>
                    <th className="py-3.5 px-4">Correlated Legs</th>
                    <th className="py-3.5 px-4">Fair Odds</th>
                    <th className="py-3.5 px-4">Book Odds</th>
                    <th className="py-3.5 px-4">Edge</th>
                    <th className="py-3.5 px-4">Conviction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                  {SGPS.slice(0, 4).map((row, idx) => (
                    <tr key={idx} className="filter blur-sm select-none pointer-events-none opacity-40">
                      <td className="py-3 px-4 font-bold text-white">{row.matchup}</td>
                      <td className="py-3 px-4 text-xs font-sans">{row.legs}</td>
                      <td className="py-3 px-4 text-cyan-400">{row.fairOdds}</td>
                      <td className="py-3 px-4">{row.bookOdds}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{row.edge}</td>
                      <td className="py-3 px-4">{row.conf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paywall Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center backdrop-blur-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-2xl text-emerald-400">
                🔒
              </div>
              <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                Unlock All Official Same-Game Parlay Tickets
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-300">
                Every locked SGP ticket pairs 3 connected on-field legs where our fair price beats the sportsbook payout. Instant unlock in your browser.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/packages"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-sm font-extrabold text-black shadow-lg transition-colors"
                >
                  Unlock SGP &amp; Game Packs →
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-xl border border-slate-700 bg-slate-800 hover:border-slate-500 px-6 py-3 text-sm font-bold text-slate-200 transition-colors"
                >
                  View All-Access Passes ($29/wk) →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Plain-English Explainer */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white">How We Build Correlated Same-Game Parlays</h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-3 text-xs leading-relaxed text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold text-purple-400 uppercase tracking-wider">1. Spot the Bookmaker Tax</div>
              <p className="mt-2 text-slate-400">
                Sportsbooks slash payouts on obvious pairings (like a quarterback over passing yards with his top wideout over receiving yards), but often underprice secondary script connections like a lead back&apos;s rushing floor paired with an opposing tight end&apos;s catch volume.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold text-cyan-400 uppercase tracking-wider">2. Match the Trench &amp; Coverage Script</div>
              <p className="mt-2 text-slate-400">
                Every leg in our parlay must tell the exact same football story - from offensive line pass protection and defensive blitz tendencies to fourth-quarter clock control.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold text-emerald-400 uppercase tracking-wider">3. Strict Fair-Odds Cutoff</div>
              <p className="mt-2 text-slate-400">
                We price the combined ticket first and compare it against the live sportsbook parlay payout. If the book cuts the payout below our fair number, we pass.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
