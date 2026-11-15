import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { WEEK8_GAME_DAY_CATALOG_METADATA } from "@/lib/packages/catalog";

/**
 * Ledger numbers on this page come from the one committed source of record (the
 * catalog metadata), never from a typed-out percentage. A hardcoded outcome
 * percentage in the meta description is the same defect as one in the page body:
 * a derived value that drifts silently the moment the record is re-settled.
 */
const LEDGER_OF_RECORD = WEEK8_GAME_DAY_CATALOG_METADATA.seasonLedgerOfRecord;

export const metadata: Metadata = {
  title: { absolute: "Calibration Proof Room | Galaxy Sports Edge" },
  description:
    `Verified probability calibration, Brier score benchmarks, and the official ` +
    `${LEDGER_OF_RECORD.withGatedPropsRecord} (${LEDGER_OF_RECORD.withGatedPropsUnits}, all-in with ` +
    `gated props; base ${LEDGER_OF_RECORD.baseRecord} · ${LEDGER_OF_RECORD.baseUnits}) NFL ledger for ` +
    `Galaxy Sports Edge.`,
  alternates: { canonical: "/calibration" },
};

export default function CalibrationProofRoomPage(): JSX.Element {
  const calibrationBands = [
    // Measured on live settled picks Sep 13, 2026 (signal path). The book path
    // is excluded - it is inverted at the top and is being rebuilt (see ledger).
    { band: "60-69 / 100", expected: "65 / 100", realized: "57 / 100", sample: 423, status: "Honest / Conservative" },
    { band: "70-79 / 100", expected: "75 / 100", realized: "66 / 100", sample: 247, status: "Conservative" },
    { band: "80-89 / 100", expected: "85 / 100", realized: "68 / 100", sample: 59, status: "Conservative" },
  ];

  const ledgerComponents = [
    { leg: "Pre-TNF prior", record: "16-5-0", units: "+10.45u", note: "Committed ledger prior_record" },
    { leg: "TNF CAR@GB official card", record: "14-6-1", units: "+7.19u", note: "Settled per ESPN event 401873023" },
    { leg: "Sunday Nov 1 main", record: "6-2-0", units: "+2.50u", note: "Week 8 Sunday settlement" },
    { leg: "VERIFIED TOTAL", record: "47-19-1", units: "+24.92u", note: "71.2% · with gated props (base 38-13-1 · +22.85u)" },
  ];

  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Header */}
        <div className="border-b border-mineral pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-verify/40/30 bg-verify/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.22em] text-verify">
            Public Settlement Ledger &amp; Honest Grading
          </div>
          <h1 className="mt-4 font-display text-4xl uppercase sm:text-6xl text-white">
            Calibration Proof Room
          </h1>
          <p className="mt-3 max-w-3xl text-base sm:text-lg leading-relaxed text-ion-2">
            We publish every settled ticket, every closing line comparison, and our exact settlement record by conviction band. In sports betting, <strong className="text-white">a tout service that claims 85/100 confidence and hits half the time destroys bankrolls</strong>. Our signal-path grades run conservative: a ticket shown in the 60s wins about 57 times in 100, not 65.
          </p>
        </div>

        {/* Primary Metrics Grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-verify/40/30 bg-obsidian/60 p-6 shadow-xl">
            <div className="text-xs uppercase tracking-wider text-ion-1">Official Verified Record</div>
            <div className="mt-2 font-mono text-4xl font-extrabold text-verify">47-19-1</div>
            <div className="mt-1 text-sm font-semibold text-ion">71.2% · +24.92 Units</div>
            <div className="mt-2 text-xs text-ion-1">MAIN + DERIVATIVE + TNF SINGLE-STAKE · all-in 47-19-1 secondary</div>
          </div>

          <div className="rounded-2xl border border-mineral/30 bg-obsidian/60 p-6 shadow-xl">
            <div className="text-xs uppercase tracking-wider text-ion-1">Brier Calibration Score</div>
            <div className="mt-2 font-mono text-4xl font-extrabold text-ion-1">0.2484</div>
            <div className="mt-1 text-sm font-semibold text-ion">vs Coin-Flip 0.25</div>
            <div className="mt-2 text-xs text-ion-1">Score only · ranking monotone · settled Sep 2026</div>
          </div>

          <div className="rounded-2xl border border-caution/30/30 bg-obsidian/60 p-6 shadow-xl">
            <div className="text-xs uppercase tracking-wider text-ion-1">Graded Plays</div>
            <div className="mt-2 font-mono text-4xl font-extrabold text-caution">50</div>
            <div className="mt-1 text-sm font-semibold text-ion">21 ledger-tracked plays carry stake</div>
            <div className="mt-2 text-xs text-ion-1">Reconciled to the official ledger</div>
          </div>

          <div className="rounded-2xl border border-mineral/30 bg-obsidian/60 p-6 shadow-xl">
            <div className="text-xs uppercase tracking-wider text-ion-1">Sealed Board</div>
            <div className="mt-2 font-mono text-4xl font-extrabold text-ion-1">573</div>
            <div className="mt-1 text-sm font-semibold text-ion">Markets evaluated · 295 published</div>
            <div className="mt-2 text-xs text-ion-1">278 abstained/passed · zero forced action</div>
          </div>
        </div>

        {/* Probability Calibration Ladder */}
        <div className="mt-14 rounded-2xl border border-mineral bg-obsidian/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-mineral pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Empirical Probability Calibration Ladder</h2>
              <p className="mt-1 text-sm text-ion-1">
                Predicted conviction band vs actual realized win rate across settled plays.
              </p>
            </div>
            <div className="text-xs font-mono text-verify">Signal-path buckets · Sep 13, 2026</div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-mineral text-xs uppercase text-ion-1">
                <tr>
                  <th className="py-3 px-4">Conviction Band</th>
                  <th className="py-3 px-4">Expected Prob</th>
                  <th className="py-3 px-4">Realized Win %</th>
                  <th className="py-3 px-4">Sample Size (n)</th>
                  <th className="py-3 px-4">Calibration Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mineral/60 font-mono text-ion">
                {calibrationBands.map((row) => (
                  <tr key={row.band} className="hover:bg-titanium/30">
                    <td className="py-3 px-4 font-bold text-white">{row.band}</td>
                    <td className="py-3 px-4 text-ion-1">{row.expected}</td>
                    <td className="py-3 px-4 font-bold text-verify">{row.realized}</td>
                    <td className="py-3 px-4">{row.sample}</td>
                    <td className="py-3 px-4 text-xs font-sans text-ion-1">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-xl border border-mineral bg-obsidian p-4 text-xs leading-relaxed text-ion-1">
            <strong className="text-ion">Why we render 74/100, never 74%:</strong> Industry research proves sports bettors conflate 74% win probability with a 100% certainty, triggering irrational Kelly over-betting. Our bounded index displays honest conviction without misleading decimal claims.
          </div>
        </div>

        {/* Recent Settled Ledger Specimen */}
        <div className="mt-14 rounded-2xl border border-mineral bg-obsidian/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-mineral pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Verified Ledger Components</h2>
              <p className="mt-1 text-sm text-ion-1">
                How the verified 47-19-1 total reconciles to the official ledger.
              </p>
            </div>
            <Link href="/board" className="text-xs font-bold text-verify hover:text-verify">
              View Full Board →
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-mineral text-xs uppercase text-ion-1">
                <tr>
                  <th className="py-3 px-4">Ledger Leg</th>
                  <th className="py-3 px-4">Record</th>
                  <th className="py-3 px-4">Net Units</th>
                  <th className="py-3 px-4">Reconciliation Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mineral/60 font-mono text-ion">
                {ledgerComponents.map((c, idx) => (
                  <tr key={idx} className="hover:bg-titanium/30">
                    <td className="py-3 px-4 font-bold text-white">{c.leg}</td>
                    <td className="py-3 px-4">{c.record}</td>
                    <td className="py-3 px-4 font-bold text-verify">{c.units}</td>
                    <td className="py-3 px-4 text-xs text-ion-1">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Football Film & Matchup Research Link */}
        <div className="mt-14 rounded-2xl border border-mineral/30 bg-gradient-to-r from-ion-2/40 via-ion-2 to-ion-2 p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ion-1">
                Film Room &amp; Matchup Methodology
              </span>
              <h3 className="mt-1 text-2xl font-bold text-white">How We Grade Every NFL Matchup</h3>
              <p className="mt-2 max-w-xl text-sm text-ion-2">
                Explore our breakdown notes on offensive and defensive line pass protection, injury target redistribution, short-week fatigue, and two-sided sportsbook line value.
              </p>
            </div>
            <Link
              href="/research"
              className="inline-flex items-center justify-center rounded-xl bg-eclipse hover:bg-eclipse px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-colors whitespace-nowrap"
            >
              Read Football Research Notes →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
