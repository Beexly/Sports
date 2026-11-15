import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { verifiedLedger, formatWlp, formatUnits } from "@/lib/ledger/verified-ledger-view";

export const metadata: Metadata = {
  title: { absolute: "Correlated SGP Projections | Galaxy Sports Edge" },
  description:
    "Same-game and multi-leg correlation diagnostics built around offensive script coherence, defensive shells, and strict fair-odds gates.",
  alternates: { canonical: "/sgp-projections" },
};

const FREE_TNF_GAME_ENVIRONMENT_ANALYTICS = {
  windowLabel: "Featured Primetime Matchup Environment",
  headline: "Offensive Script & Trench Environment Read",
  note: "Public preview covers team tempo, pass-rate-over-expectation, and trench disruption rates only. Playable tickets, exact prop numbers, and correlated legs stay behind member access.",
  metrics: [
    { label: "Neutral Pass Rate Expectation", value: "+3.4% vs NFL Avg" },
    { label: "Combined Defensive Pressure Rate", value: "36.8% Dropbacks" },
    { label: "Red-Zone TD Conversion Gap", value: "+11.2 pp" },
    { label: "Play Volume Tempo Index", value: "27.1 sec / snap" },
  ],
} as const;

const REDACTED_CORRELATION_PREVIEW = [
  {
    id: "sgp-slot-1",
    scriptTheme: "Up-Tempo Passing Script + Quick-Game Slot Usage",
    legCount: "2 correlated legs",
    edge: "Locked",
    conviction: "Locked",
  },
  {
    id: "sgp-slot-2",
    scriptTheme: "Heavy-Box Run Funnel + Goal-Line Carry Share",
    legCount: "3 correlated legs",
    edge: "Locked",
    conviction: "Locked",
  },
  {
    id: "sgp-slot-3",
    scriptTheme: "Two-High Shell Response + Tight End Seam Targets",
    legCount: "2 correlated legs",
    edge: "Locked",
    conviction: "Locked",
  },
] as const;

export default function SgpProjectionsPage(): JSX.Element {
  const verifiedRecordLabel = `${formatWlp(verifiedLedger.official.wlp)} (${formatUnits(verifiedLedger.official.units.total)})`;

  return (
    <div className="min-h-screen bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-verify">
              Correlated Ticket Desk - {verifiedRecordLabel} Recomputed at /record
            </p>
            <h1 className="mt-2 font-display text-4xl uppercase tracking-tight text-white sm:text-5xl">
              Correlated SGP Projections
            </h1>
          </div>
          <Link
            href="/record"
            className="rounded-xl border border-mineral bg-eclipse px-4 py-2 font-mono text-xs uppercase tracking-wider text-ion-1 hover:border-plasma"
          >
            Audit Verified Record
          </Link>
        </div>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ion-1">
          Every correlated card starts from a shared football script before looking at price. If the
          combined book payout falls short of our joint fair probability, the ticket is marked PASS
          and never sold.
        </p>

        {/* Free pick-free game environment preview */}
        <section className="mt-8 rounded-2xl border border-verify/30 bg-obsidian/60 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded bg-verify/20 border border-verify/30 px-2.5 py-0.5 text-xs font-bold text-verify">
              FREE ENVIRONMENT PREVIEW
            </span>
            <span className="font-mono text-xs text-ion-2">
              {FREE_TNF_GAME_ENVIRONMENT_ANALYTICS.windowLabel}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-bold text-white">
            {FREE_TNF_GAME_ENVIRONMENT_ANALYTICS.headline}
          </h2>
          <p className="mt-2 text-sm text-ion-2">
            {FREE_TNF_GAME_ENVIRONMENT_ANALYTICS.note}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FREE_TNF_GAME_ENVIRONMENT_ANALYTICS.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-mineral bg-eclipse p-4"
              >
                <p className="text-xs text-ion-2">{metric.label}</p>
                <p className="mt-1 font-mono text-lg font-bold text-ion-white">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Redacted member board preview */}
        <section className="mt-10 rounded-2xl border border-mineral bg-eclipse p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Member Correlated Tickets (Protected)
              </h2>
              <p className="mt-1 text-sm text-ion-2">
                Exact selections, target lines, edge margins, and 100-point conviction scores are
                available inside active member access and slate packs.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/packages#pack-cards"
                className="rounded-lg bg-plasma px-5 py-2.5 text-sm font-bold text-plasma-ink hover:bg-plasma-glow transition-colors"
              >
                Explore Slate Packs
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-mineral px-5 py-2.5 text-sm font-semibold text-ion-white hover:border-plasma transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-mineral font-mono text-xs uppercase text-ion-2">
                  <th className="py-2 pr-4">Script Structure</th>
                  <th className="py-2 pr-4">Legs</th>
                  <th className="py-2 pr-4">Edge</th>
                  <th className="py-2">Conviction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mineral/60">
                {REDACTED_CORRELATION_PREVIEW.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-4 text-ion-1 blur-[2px] select-none">
                      {row.scriptTheme}
                    </td>
                    <td className="py-3 pr-4 text-ion-2">{row.legCount}</td>
                    <td className="py-3 pr-4 font-mono text-ion-2">{row.edge}</td>
                    <td className="py-3 font-mono text-ion-2">{row.conviction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Correlation Methodology */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-white">How Correlated SGPs Are Built</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-mineral bg-obsidian p-4">
              <div className="font-bold text-verify uppercase tracking-wider">1. Script Coherence</div>
              <p className="mt-2 text-ion-1">
                Legs are paired only when offensive play-calling, pace, and opponent coverage shells
                reinforce the same scoring environment.
              </p>
            </div>
            <div className="rounded-xl border border-mineral bg-obsidian p-4">
              <div className="font-bold text-verify uppercase tracking-wider">2. Joint Tail Calibration</div>
              <p className="mt-2 text-ion-1">
                Every leg in our parlay must tell the exact same football story - from offensive line pass protection and defensive blitz tendencies to fourth-quarter clock control.
              </p>
            </div>
            <div className="rounded-xl border border-mineral bg-obsidian p-4">
              <div className="font-bold text-verify uppercase tracking-wider">3. Strict Fair-Odds Cutoff</div>
              <p className="mt-2 text-ion-1">
                We price the combined ticket first and compare it against the live sportsbook parlay payout. If the book cuts the payout below our fair number, we pass.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
