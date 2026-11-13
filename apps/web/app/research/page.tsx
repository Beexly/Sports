import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: { absolute: "Football Film, Trench & Matchup Research | Galaxy Sports Edge" },
  description:
    "How Galaxy Sports Edge grades NFL matchups: offensive and defensive line pass protection, injury target redistribution, short-week fatigue, and de-vigged sportsbook line value.",
  alternates: { canonical: "/research" },
};

export default function ResearchPortalPage(): JSX.Element {
  const researchNotes = [
    {
      id: "NOTE-01",
      title: "Why We Pass on 87% of Markets: Line Value & Pass Discipline",
      category: "Line Value & Bankroll Protection",
      status: "Live Process Standard",
      abstract:
        "Sportsbooks shade popular sides and inflate hold on Same-Game Parlays. Rather than forcing action on every television game, we compare our film-graded fair price against the de-vigged market number and automatically pass whenever the price is already baked in.",
      keywords: ["Pass Discipline", "De-Vigged Odds", "Closing Line Value", "Bankroll Protection"],
    },
    {
      id: "NOTE-02",
      title: "Vacated Targets & Carries: Pricing Mid-Week Injury Replacements",
      category: "Depth Chart & Volume Redistribution",
      status: "Live Process Standard",
      abstract:
        "When a starting quarterback, bellcow running back, or alpha receiver is ruled out, those snaps, routes, and red-zone touches do not disappear - they shift to specific secondary outlets based on formation tendencies and blocking assignments.",
      keywords: ["Injury Reports", "Target Share", "Red-Zone Carries", "Depth Chart Roles"],
    },
    {
      id: "NOTE-03",
      title: "Trench Pressure, Short Rest & Fourth-Quarter Fatigue",
      category: "Offensive & Defensive Line Film",
      status: "Live Process Standard",
      abstract:
        "Short Thursday Night turnarounds and cross-country travel hit offensive and defensive linemen hardest. When an offensive line with a missing starter faces a high-blitz or stunt-heavy defensive front, fourth-quarter sack and stall rates climb sharply.",
      keywords: ["Pass Protection", "Blitz & Stunt Rates", "Short-Week Rest", "Fourth-Quarter Pace"],
    },
    {
      id: "NOTE-04",
      title: "Same-Game Parlay Game Scripts: How On-Field Events Connect",
      category: "Correlated Parlay Construction",
      status: "Live Process Standard",
      abstract:
        "Most sportsbooks price multi-leg Same-Game Parlays as if player stats happen in a vacuum. We build tickets around connected football scripts - such as a road favorite controlling the clock on the ground while the trailing quarterback is forced into checkdown volume.",
      keywords: ["Game Script", "Correlated Parlays", "Slot & Seam Volume", "Clock Control"],
    },
    {
      id: "NOTE-05",
      title: "Full-Spectrum Tracking, Charting & Film Synthesis",
      category: "Multi-Source Football Intelligence",
      status: "Live Process Standard",
      abstract:
        "Our research desk ingests every available layer of football intelligence -- from play-by-play tendencies, receiver separation and route-win charting, and quarterback pressure-to-sack survival curves to red-zone formation usage and weather-adjusted ball-flight physics -- synthesizing them into our own independent matchup grades.",
      keywords: ["Separation Charting", "Pressure Survival", "Formation Tendencies", "Weather Physics"],
    },
    {
      id: "NOTE-06",
      title: "Fourth-Down Decision Value & Mid-Game Pace Shifts",
      category: "Coaching Strategy & Live Regimes",
      status: "Live Process Standard",
      abstract:
        "Aggressive fourth-down go-for-it tendencies and two-minute hurry-up scripts swing totals and player prop ceilings by full possessions. We grade each head coach and coordinator on true fourth-down aggressiveness, neutral-script tempo, and how quickly they abandon the run when trailing.",
      keywords: ["Fourth-Down Aggressiveness", "Neutral Pace", "Script Elasticity", "Possession Volume"],
    },
    {
      id: "NOTE-07",
      title: "Return-to-Play Biomechanics: High-Ankle, Hamstring & Turf-Toe Curves (GSI)",
      category: "Galaxy Sports Institute (GSI) Sports Medicine",
      status: "Live Process Standard",
      abstract:
        "Clearing the Friday injury report does not mean a player is back at 100%. Through Galaxy Sports Institute (GSI), we track position-specific return-to-play degradation -- including lateral cutting loss in Weeks 1-3 after a high-ankle sprain, top-speed sprinting caps and re-injury risk after a hamstring strain, and quarterback deep-out velocity loss after shoulder or rib trauma.",
      keywords: ["Return-to-Play Curves", "High-Ankle Cutting Loss", "Hamstring Re-Injury Risk", "GSI Biomechanics"],
    },
    {
      id: "NOTE-08",
      title: "Second-Order Trench Trauma, Safety Spin Disguises & 32-Team Beat Tells",
      category: "Deep Situational & Scheme Intelligence",
      status: "Live Process Standard",
      abstract:
        "Surface stats miss what happens inside a game when a backup guard enters and immediately draws targeted defensive stunts, or when early interior hits speed up a quarterback's internal clock on clean-pocket snaps. We combine 32-team beat-writer practice rep tracking with coaching-tree scheme matchups and officiating crew tendencies.",
      keywords: ["Weak-Link Trench Protection", "Post-Snap Safety Spin", "32-Team Beat Tracking", "Officiating Crew Tendencies"],
    },
    {
      id: "NOTE-09",
      title: "Cumulative Contact Load & Mid-Game Fatigue Tipping Points (GSI)",
      category: "Galaxy Sports Institute (GSI) Contact & Recovery Science",
      status: "Live Process Standard",
      abstract:
        "Repeated interior line collisions and back-to-back quarterback hits accumulate across a four-quarter game rather than resetting between drives. Galaxy Sports Institute (GSI) tracks cumulative contact load, helmet and turf impact conditions, and fourth-quarter fatigue tipping points where pass-rush win rates and tackling missed-yardage spikes accelerate.",
      keywords: ["Cumulative Contact Load", "Fourth-Quarter Tipping Points", "Trench Fatigue", "GSI Recovery Science"],
    },
    {
      id: "NOTE-10",
      title: "Pre-Snap Motion Synchrony, Snap-Count Timing & Late-Game Clock Management",
      category: "On-Field Execution & Late-Game Situational Film",
      status: "Live Process Standard",
      abstract:
        "Elite offensive lines gain a half-step advantage on the road when pre-snap motion and silent snap counts stay in rhythm, while late-game victory-formation kneeldowns quietly strip 2 to 4 rushing yards from quarterback rushing props. We account for pre-snap motion timing, coordinator script adjustments, and end-of-game clock-drain scenarios on every player prop.",
      keywords: ["Pre-Snap Motion Rhythm", "Silent Count Timing", "Kneeldown Prop Adjustment", "Late-Game Clock Drain"],
    },
  ];

  const processMetrics = [
    { label: "Official Verified Record", value: "47-19-1", sub: "71.2% · +24.92u · with gated props" },
    { label: "TNF CAR@GB Wedge", value: "14-6-1", sub: "+7.19u on the official TNF card" },
    { label: "Main Slate Evaluated", value: "573", sub: "295 published · 278 abstained/passed" },
    { label: "Graded Plays", value: "50", sub: "36 wins · 13 losses · 1 push" },
    { label: "32-Team Roster Checks", value: "100%", sub: "Verified Starters & Injury Tags" },
  ];

  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Hero Section */}
        <div className="border-b border-slate-800 pb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
            Football Film &amp; Matchup Desk
          </div>
          <h1 className="mt-4 font-display text-4xl uppercase sm:text-6xl text-white">
            How We Break Down the Slate
          </h1>
          <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
            Our football desk grades every NFL game from the inside out: <strong className="text-white">offensive and defensive line matchups, coaching play-calling tendencies, verified mid-week injury reports, and de-vigged sportsbook prices</strong>.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
            <span className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5">Focus: Trench &amp; Coverage Matchups</span>
            <span className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5">32-Team Active Depth Chart Tracking</span>
            <span className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5">Timestamped Public Ledger</span>
          </div>
        </div>

        {/* Verified On-Field Process Summary */}
        <div className="mt-14 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
              Public Settlement Ledger · 2026 NFL Season
            </span>
            <span className="text-xs font-mono text-slate-400">Updated Through Week 8</span>
          </div>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
            Discipline First: Why Passing Beats Forcing Action
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            The fastest way to lose money in sports betting is betting every game on TV. We review over 1,800 main lines, quarter/half derivatives, and player props every week, and we abstain or pass anything without clear value so our members only play spots where the film and the number line up:
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {processMetrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="font-mono text-3xl font-extrabold text-cyan-400">{m.value}</div>
                <div className="mt-1 text-xs font-bold text-slate-200">{m.label}</div>
                <div className="mt-1 text-[11px] text-slate-400">{m.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs leading-relaxed text-slate-300">
            <strong className="text-cyan-300">Bottom Line:</strong> When a line moves past our fair trigger price, we mark the ticket <code className="text-amber-400">PASS · NO BET</code> and wait for the next mispriced matchup.
          </div>
        </div>

        {/* Football Breakdown Pillars */}
        <div className="mt-16">
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                Core Football Breakdown Pillars
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                What our analysts check before any spread, total, prop, or parlay makes the official card.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400">NOTE-01 through NOTE-04</span>
          </div>

          <div className="mt-8 space-y-6">
            {researchNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-extrabold text-cyan-400">{note.id}</span>
                    <span className="rounded bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                      {note.category}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">{note.status}</span>
                </div>

                <h3 className="mt-3 text-xl font-bold text-white">{note.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{note.abstract}</p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/60">
                  <div className="flex flex-wrap gap-2">
                    {note.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-mono text-slate-400"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Galaxy Sports Edge Film &amp; Matchup Desk
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Syndicate Inquiries */}
        <div className="mt-16 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-[#0c0e14] p-8 sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Research Desk &amp; Syndicate Inquiries
              </span>
              <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                Questions About Our Matchup Grading or Syndicate Feed?
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                Reach out directly to our football research desk for custom data feed inquiries, historical closing-line audits, or weekly slate access.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col shrink-0">
              <a
                href="mailto:research@galaxysportsedge.com?subject=Football%20Research%20Desk%20Inquiry"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3.5 text-sm font-bold text-black shadow-lg transition-colors whitespace-nowrap"
              >
                Contact Research Desk →
              </a>
              <Link
                href="/calibration"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 hover:border-slate-500 px-6 py-3.5 text-sm font-bold text-slate-200 transition-colors whitespace-nowrap"
              >
                View Calibration Proof Room →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
