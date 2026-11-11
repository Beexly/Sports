import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getCurrentWeek10Slate } from "@/lib/live-board/current-slate-loader";

export const metadata: Metadata = {
  title: "Calibration Proof Room & Public Glass Ledger | Galaxy Sports Edge",
  description:
    "Openly auditable NFL settlement ledger, exact component-leg reconciliation (Weeks 8-9 staked 43-17-1 +22.20u n=61; Week 8 staked 36-13-1 +20.14u n=50; Week 8 all-in 47-19-1 +24.92u n=67), Brier score benchmarks, and pre-kickoff SHA-256 Merkle commitments.",
  alternates: { canonical: "/calibration" },
};

export default function CalibrationProofRoomPage(): JSX.Element {
  const slate = getCurrentWeek10Slate();
  const s = slate.scopes;
  const m = slate.calibrationMetrics;

  const calibrationBands = [
    {
      band: "60-69 / 100",
      expected: "65 / 100",
      realized: "57 / 100",
      sample: 423,
      status: "Historical Signal-Path Baseline (Sep 13, 2026)",
    },
    {
      band: "70-79 / 100",
      expected: "75 / 100",
      realized: "66 / 100",
      sample: 247,
      status: "Historical Signal-Path Baseline (Sep 13, 2026)",
    },
    {
      band: "80-89 / 100",
      expected: "85 / 100",
      realized: "68 / 100",
      sample: 59,
      status: "Historical Signal-Path Baseline (Sep 13, 2026)",
    },
  ];

  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
            Public Settlement Ledger &amp; Open Recompute Protocol
          </div>
          <h1 className="mt-4 font-display text-4xl uppercase sm:text-6xl text-white">
            Calibration Proof Room
          </h1>
          <p className="mt-3 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
            Every pick is on the public ledger, wins and losses alike. Below is the complete,
            component-by-component reconciliation of our Weeks 8 and 9 NFL settlement records, sample
            sizes (<code className="text-emerald-400">n</code>), Brier calibration scores, and
            pre-kickoff SHA-256 Merkle commitments for Week {slate.activeWeek}. Anyone can recompute
            every integer and cent from raw repo JSON by running{" "}
            <code className="text-cyan-300">python scripts/audit/recompute_public_ledger.py --strict</code>.
          </p>
        </div>

        {/* Primary Reconciled Scope Cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-6 shadow-xl">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              Weeks 8-9 Staked Main/Deriv
            </div>
            <div className="mt-2 font-mono text-4xl font-extrabold text-emerald-400">
              {s.weeks8_9_cumulative_staked.record}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-200">
              {s.weeks8_9_cumulative_staked.net_units_display} · n={s.weeks8_9_cumulative_staked.n} graded
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Week 8 staked {s.week8_staked_main_and_tnf.record} ({s.week8_staked_main_and_tnf.net_units_display}, n={s.week8_staked_main_and_tnf.n}) + Week 9 Sunday 7-4-0 (+2.06u, n=11)
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-6 shadow-xl">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              Weeks 8-9 All-In Secondary
            </div>
            <div className="mt-2 font-mono text-4xl font-extrabold text-cyan-400">
              {s.weeks8_9_cumulative_all_in.record}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-200">
              {s.weeks8_9_cumulative_all_in.net_units_display} · n={s.weeks8_9_cumulative_all_in.n} graded
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Week 8 all-in {s.week8_all_in_with_gated_props.record} ({s.week8_all_in_with_gated_props.net_units_display}, n={s.week8_all_in_with_gated_props.n}; base {s.week8_base_with_mnf_main.record}) + Week 9 7-4-0 (+2.06u)
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-6 shadow-xl">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              Brier Calibration Score
            </div>
            <div className="mt-2 font-mono text-4xl font-extrabold text-amber-400">
              {m.week9_sunday_11_official_plays_brier}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-200">
              Week 9 NFL Official Plays (n=11) vs 0.2500 Coin-Flip
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Historical Sep 13 multi-sport signal-path Brier: {m.historical_multi_sport_signal_brier_sep2026} (n=729)
            </div>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-slate-900/60 p-6 shadow-xl">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              Week {slate.activeWeek} Pre-Kickoff Merkle Seal
            </div>
            <div className="mt-2 font-mono text-2xl font-extrabold text-purple-400">
              {slate.merkleRootSha256.slice(0, 12)}…
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-200">
              {slate.gamesCount} NFL Games Sealed Before Kickoff
            </div>
            <div className="mt-2 text-xs text-slate-400">
              First kickoff {slate.firstKickoffUtc} · Sealed {slate.sealedAtUtc}
            </div>
          </div>
        </div>

        {/* Complete Additive Component-Leg Table */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Complete Component-Leg Reconciliation (Exact Integer &amp; Cent Identity)
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Every subtotal and cumulative scope is the exact arithmetic sum of its component rows below. No hidden legs, no omitted slates.
              </p>
            </div>
            <Link href="/board" className="text-xs font-bold text-emerald-400 hover:text-emerald-300">
              View Active Board →
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">Window / Leg</th>
                  <th className="py-3 px-4">W-L-P</th>
                  <th className="py-3 px-4">Sample (n)</th>
                  <th className="py-3 px-4">Net Units</th>
                  <th className="py-3 px-4">Scope Inclusion &amp; Source Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                {slate.componentLegs.map((leg) => (
                  <tr key={leg.leg_id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{leg.week}</td>
                    <td className="py-3 px-4">{leg.record}</td>
                    <td className="py-3 px-4">{leg.n}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{leg.net_units_display}</td>
                    <td className="py-3 px-4 font-sans text-xs text-slate-300">
                      {leg.event_scope}{" "}
                      <span className="text-slate-400">
                        [
                        {[
                          leg.IncludedInStakedMain ? "Staked Main" : null,
                          leg.IncludedInBaseMain ? "Base View" : null,
                          leg.IncludedInAllIn ? "All-In View" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        ]
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Subtotals and Totals */}
                <tr className="bg-slate-950/80 font-bold text-emerald-300">
                  <td className="py-3 px-4">SUBTOTAL · Week 8 Staked Main/Deriv + TNF</td>
                  <td className="py-3 px-4">{s.week8_staked_main_and_tnf.record}</td>
                  <td className="py-3 px-4">{s.week8_staked_main_and_tnf.n}</td>
                  <td className="py-3 px-4">{s.week8_staked_main_and_tnf.net_units_display}</td>
                  <td className="py-3 px-4 font-sans text-xs text-slate-300">
                    16-5-0 (+10.45u) + 14-6-1 (+7.19u) + 6-2-0 (+2.50u) = 36-13-1 (+20.14u), n=50
                  </td>
                </tr>
                <tr className="bg-slate-950/80 font-bold text-cyan-300">
                  <td className="py-3 px-4">SUBTOTAL · Week 8 Base (+MNF Main Lines Only)</td>
                  <td className="py-3 px-4">{s.week8_base_with_mnf_main.record}</td>
                  <td className="py-3 px-4">{s.week8_base_with_mnf_main.n}</td>
                  <td className="py-3 px-4">{s.week8_base_with_mnf_main.net_units_display}</td>
                  <td className="py-3 px-4 font-sans text-xs text-slate-300">
                    36-13-1 (+20.14u) + 2-0-0 (+2.71u MNF main lines) = 38-13-1 (+22.85u), n=52
                  </td>
                </tr>
                <tr className="bg-slate-950/80 font-bold text-cyan-300">
                  <td className="py-3 px-4">SUBTOTAL · Week 8 All-In (+Gated Props &amp; MNF 6-Play Card)</td>
                  <td className="py-3 px-4">{s.week8_all_in_with_gated_props.record}</td>
                  <td className="py-3 px-4">{s.week8_all_in_with_gated_props.n}</td>
                  <td className="py-3 px-4">{s.week8_all_in_with_gated_props.net_units_display}</td>
                  <td className="py-3 px-4 font-sans text-xs text-slate-300">
                    36-13-1 (+20.14u) + 7-4-0 (+2.42u Sun props) + 4-2-0 (+2.36u MNF card) = 47-19-1 (+24.92u), n=67
                  </td>
                </tr>
                <tr className="border-t-2 border-emerald-500/40 bg-emerald-950/30 font-extrabold text-white">
                  <td className="py-3.5 px-4">CUMULATIVE · Weeks 8-9 Staked Main/Derivative</td>
                  <td className="py-3.5 px-4 text-emerald-400">{s.weeks8_9_cumulative_staked.record}</td>
                  <td className="py-3.5 px-4">{s.weeks8_9_cumulative_staked.n}</td>
                  <td className="py-3.5 px-4 text-emerald-400">{s.weeks8_9_cumulative_staked.net_units_display}</td>
                  <td className="py-3.5 px-4 font-sans text-xs text-slate-200">
                    36-13-1 (+20.14u) + Week 9 TNF 0-0-0 + Week 9 Sun 7-4-0 (+2.06u) + Week 9 MNF 0-0-0 = 43-17-1 (+22.20u), n=61
                  </td>
                </tr>
                <tr className="bg-cyan-950/30 font-extrabold text-white">
                  <td className="py-3.5 px-4">CUMULATIVE · Weeks 8-9 All-In Secondary View</td>
                  <td className="py-3.5 px-4 text-cyan-400">{s.weeks8_9_cumulative_all_in.record}</td>
                  <td className="py-3.5 px-4">{s.weeks8_9_cumulative_all_in.n}</td>
                  <td className="py-3.5 px-4 text-cyan-400">{s.weeks8_9_cumulative_all_in.net_units_display}</td>
                  <td className="py-3.5 px-4 font-sans text-xs text-slate-200">
                    47-19-1 (+24.92u) + Week 9 Sun 7-4-0 (+2.06u) = 54-23-1 (+26.98u), n=78
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300">
            <div>Reconciled Ledger SHA-256: {slate.ledgerSha256}</div>
            <div className="mt-1">Week {slate.activeWeek} Pre-Kickoff Merkle Root: {slate.merkleRootSha256}</div>
            <div className="mt-1 text-emerald-400">
              Open Verification Command: python scripts/audit/recompute_public_ledger.py --strict
            </div>
          </div>
        </div>

        {/* Probability Calibration Ladder */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Empirical Probability Calibration Ladder</h2>
              <p className="mt-1 text-sm text-slate-400">
                Historical signal-path conviction bands measured on settled multi-sport picks (Sep 13, 2026, n=729) alongside Week 9 NFL accuracy.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400">Signal-path buckets · Sep 13, 2026</div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">Conviction Band</th>
                  <th className="py-3 px-4">Expected Index</th>
                  <th className="py-3 px-4">Realized Rate</th>
                  <th className="py-3 px-4">Sample Size (n)</th>
                  <th className="py-3 px-4">Calibration Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                {calibrationBands.map((row) => (
                  <tr key={row.band} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{row.band}</td>
                    <td className="py-3 px-4 text-slate-400">{row.expected}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{row.realized}</td>
                    <td className="py-3 px-4">{row.sample}</td>
                    <td className="py-3 px-4 text-xs font-sans text-cyan-300">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-400">
            <strong className="text-slate-200">Why we render 74/100, never 74%:</strong> Industry research proves sports bettors conflate 74% win probability with a 100% certainty, triggering irrational Kelly over-betting. Our bounded index displays honest conviction without misleading decimal claims. Past results promise nothing about the next one.
          </div>
        </div>

        {/* Football Film & Matchup Research Link */}
        <div className="mt-14 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Film Room &amp; Matchup Methodology
              </span>
              <h3 className="mt-1 text-2xl font-bold text-white">How We Grade Every NFL Matchup</h3>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Explore our breakdown notes on offensive and defensive line pass protection, injury target redistribution, short-week fatigue, and two-sided sportsbook line value.
              </p>
            </div>
            <Link
              href="/research"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-colors whitespace-nowrap"
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
