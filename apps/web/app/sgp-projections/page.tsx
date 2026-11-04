import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Correlated SGP Projections | Galaxy Sports Edge",
  description:
    "Same-Game Parlay copula correlation pricing, Fréchet-Hoeffding bounds, and live edge detection across all NFL matchups.",
  alternates: { canonical: "/sgp-projections" },
};

const SGPS = [
  {
    matchup: "BAL @ BUF",
    legs: "Zay Flowers 70+ Rec Yds · James Cook III 75+ Rush+Rec Yds · Josh Allen Anytime Rush TD",
    fairOdds: "+252",
    bookOdds: "+340",
    edge: "+25.0%",
    conf: "82/100",
    free: true,
    correlation: "Positive Game Script Synergies: High-pace red-zone rush equity correlates directly with intermediate passing volume.",
  },
  {
    matchup: "TEN @ CIN",
    legs: "CIN -11.5 · Tee Higgins 70+ Rec Yds · Samaje Perine Over 22.5 Rush Yds",
    fairOdds: "+214",
    bookOdds: "+290",
    edge: "+24.2%",
    conf: "79/100",
    free: true,
    correlation: "Blowout Script Elasticity: 1H separation via Higgins air yards transitions to Perine clock-killing 2H ground workload.",
  },
  {
    matchup: "ARI @ DAL",
    legs: "ARI +7.0 · Jake Ferguson Over 14.5 Rec Yds · Kendrick Bourne (ARI) Over 3.5 Receptions",
    fairOdds: "+192",
    bookOdds: "+275",
    edge: "+28.4%",
    conf: "78/100",
    free: false,
    correlation: "Underdog Trailing Volume: Brissett short-game distribution to Bourne paired with Ferguson red-zone checkdowns.",
  },
  {
    matchup: "MIN @ DET",
    legs: "Kyler Murray (MIN) Under 225.5 Pass Yds · Will Reichard Over 1.5 FGM · Isaac TeSlaa (DET) Over 17.5 Rec Yds",
    fairOdds: "+143",
    bookOdds: "+215",
    edge: "+29.6%",
    conf: "77/100",
    free: false,
    correlation: "Trench Stifling & Red-Zone Stall: DET interior pressure caps Murray passing while driving conservative FG attempts.",
  },
  {
    matchup: "LV @ NYJ",
    legs: "NYJ ML (-122) · Braelon Allen Anytime TD · Michael Mayer Over 2.5 Receptions",
    fairOdds: "+135",
    bookOdds: "+205",
    edge: "+29.8%",
    conf: "76/100",
    free: false,
    correlation: "Short Yardage Dominance: Allen goal-line conversion package coupled with Mayer intermediate checkdown funnel.",
  },
  {
    matchup: "CLE @ PIT",
    legs: "PIT -3.5 · Chris Boswell Over 1.5 FGM · Quinshon Judkins (CLE) Over 1.5 Receptions",
    fairOdds: "+175",
    bookOdds: "+245",
    edge: "+25.5%",
    conf: "75/100",
    free: false,
    correlation: "AFC North Defensive Slog: Field-position attrition yields Boswell kicks and Judkins checkdowns under blitz.",
  },
  {
    matchup: "ATL @ TB",
    legs: "Chris Godwin Jr. Over 3.5 Receptions · Chris Godwin Jr. Over 30.5 Rec Yds · Jahan Dotson (ATL) Over 21.5 Rec Yds",
    fairOdds: "-120",
    bookOdds: "+120",
    edge: "+21.8%",
    conf: "74/100",
    free: false,
    correlation: "Target Concentration Surge: Egbuka OUT channels 32% slot target share directly to Chris Godwin.",
  },
  {
    matchup: "IND @ JAX",
    legs: "Trevor Lawrence Over 1.5 Pass TDs · Jakobi Meyers Over 35.5 Rec Yds · Chris Rodriguez Jr. Over 6.5 Rush Att",
    fairOdds: "+157",
    bookOdds: "+225",
    edge: "+26.5%",
    conf: "73/100",
    free: false,
    correlation: "Balanced Red-Zone Efficiency: Goal line play-action creates TD distribution across Meyers and short yardage Rodriguez carries.",
  },
  {
    matchup: "LAC @ LAR",
    legs: "LA -6.5 · LAC Team Total Under 18.5 · Nate Landman Under 8.5 Tackles+Ast",
    fairOdds: "+114",
    bookOdds: "+175",
    edge: "+28.5%",
    conf: "72/100",
    free: false,
    correlation: "Pass-Heavy Incompletion Script: Reduced tackle opportunities on boundary deep shots while limiting total scoring.",
  },
  {
    matchup: "KC @ DEN",
    legs: "KC ML (-118) · Patrick Mahomes Over 225.5 Pass Yds · J.K. Dobbins (DEN) Over 21.5 Rush Yds",
    fairOdds: "+132",
    bookOdds: "+200",
    edge: "+29.3%",
    conf: "75/100",
    free: false,
    correlation: "High Altitude Pace: Mahomes transition game keeps clock moving while Dobbins maintains early-down baseline.",
  },
  {
    matchup: "NE @ MIA",
    legs: "Jaylen Wright Over 4.5 Rush Att · Jaylen Wright Over 14.5 Rush Yds · Efton Chism III (NE) Over 15.5 Rec Yds",
    fairOdds: "-159",
    bookOdds: "+100",
    edge: "+22.4%",
    conf: "74/100",
    free: false,
    correlation: "Specialty Role Floor: Wright rotational change-of-pace combined with Chism quick-separation slot routes.",
  },
  {
    matchup: "PHI @ WAS",
    legs: "Dyami Brown (WAS) Over 12.5 Rec Yds · Treylon Burks (WAS) Over 21.5 Rec Yds · Rachaad White (WAS) Anytime TD",
    fairOdds: "+107",
    bookOdds: "+160",
    edge: "+25.6%",
    conf: "73/100",
    free: false,
    correlation: "Vacated Target Cascade: Washington perimeter redistributions against injured Philadelphia secondary.",
  },
  {
    matchup: "CHI @ SEA",
    legs: "CHI ML (+142) · Kalif Raymond (CHI) Over 21.5 Rec Yds · Rome Odunze (CHI) Over 2.5 Receptions",
    fairOdds: "+165",
    bookOdds: "+280",
    edge: "+43.4%",
    conf: "76/100",
    free: false,
    correlation: "Chicago Upset Pathway: Multi-receiver intermediate conversions beating Seattle single-high shell.",
  },
];

export default function SgpProjectionsPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-purple-400">
            Fréchet-Hoeffding Copula Engine
          </div>
          <h1 className="mt-4 font-display text-4xl uppercase sm:text-6xl text-white">
            Correlated SGP Projections
          </h1>
          <p className="mt-3 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
            Sportsbooks hold a massive 15–30% house edge on Same-Game Parlays by assuming independent probabilities or mispricing event correlations. Our Copula Engine computes true joint distributions across 10,000 game worlds to identify structural bookmaker pricing errors.
          </p>
        </div>

        {/* Free Teaser Cards */}
        <div className="mt-10">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-xl font-bold uppercase tracking-tight text-white">
              Free Teaser SGP Blueprints (2 of 13)
            </h2>
            <span className="rounded bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              Free Preview
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {SGPS.filter((s) => s.free).map((sgp) => (
              <div
                key={sgp.matchup}
                className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-6 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white">{sgp.matchup}</span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
                    Conviction {sgp.conf}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Correlated Ticket</div>
                  <div className="mt-1.5 text-sm font-semibold text-white leading-relaxed">{sgp.legs}</div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                    <div className="text-slate-400">Fair Odds</div>
                    <div className="mt-1 font-bold text-cyan-400">{sgp.fairOdds}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                    <div className="text-slate-400">Book Odds</div>
                    <div className="mt-1 font-bold text-white">{sgp.bookOdds}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                    <div className="text-slate-400">Calculated Edge</div>
                    <div className="mt-1 font-bold text-emerald-400">{sgp.edge}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-slate-950/40 p-3 text-xs leading-relaxed text-slate-300">
                  <span className="font-bold text-slate-200">Joint Correlation Mechanic: </span>
                  {sgp.correlation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Locked SGPs Table with Paywall Banner */}
        <div className="mt-14">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-white">
                Full Slate SGP Copula Matrix (11 Locked Plays)
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Unlock all 13 weekly Same-Game Parlay tickets with mathematical fair odds and book execution lines.
              </p>
            </div>
            <Link
              href="/packages"
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-black transition-colors"
            >
              Unlock All SGPs ($9) →
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
                  {SGPS.filter((s) => !s.free).slice(0, 4).map((row, idx) => (
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
                Unlock All 13 High-Edge Same-Game Parlays
              </h3>
              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-300">
                Our subscribers hit +25.0% to +43.4% mathematical edges on correlated multi-leg tickets every single week. Instant unlock in your browser.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/packages"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-sm font-extrabold text-black shadow-lg transition-colors"
                >
                  Unlock Single Game ($9) →
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

        {/* Theoretical Framework Explainer */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white">How the Copula Engine Exploits Sportsbook SGP Vig</h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-3 text-xs leading-relaxed text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold text-purple-400 uppercase tracking-wider">1. The Bookmaker Flaw</div>
              <p className="mt-2 text-slate-400">
                Sportsbooks use heuristic correlation tables that systematically penalize underdog game scripts and defensive stalls. When two positive-correlation events occur in low-frequency states, books drastically overpay.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold text-cyan-400 uppercase tracking-wider">2. Fréchet-Hoeffding Bounds</div>
              <p className="mt-2 text-slate-400">
                For any two marginal distributions $F(x)$ and $G(y)$, our engine defines the strict theoretical bounds $\max(0, F+G-1) \le C(u,v) \le \min(F,G)$ before fitting empirical Clayton/Gumbel copula copulas.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold text-emerald-400 uppercase tracking-wider">3. 10,000 PBP Trajectories</div>
              <p className="mt-2 text-slate-400">
                Every SGP ticket is validated across 10,000 full-game play-by-play simulations driven by JEV snapshot distributions. If the empirical joint probability does not clear market odds by +15% expected value, it is discarded.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
