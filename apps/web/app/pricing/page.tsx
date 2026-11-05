import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Pricing & Plans | Galaxy Sports Edge",
  description:
    "Galaxy Sports Edge pricing plans: Single Game Pass ($9), Weekly All-Access ($29), VIP Season Pass ($199), and Pro Syndicate Data Feed ($499). Backed by our verified 62-23-1 (72.9% · +26.50u) official NFL record.",
  alternates: { canonical: "/pricing" },
};

const TIERS = [
  {
    id: "single-game",
    name: "Single Game Pass",
    price: "$9",
    cadence: "per game",
    description: "Full game breakdown, official spread and total calls, top 3 player props, and 1 correlated Same-Game Parlay for any marquee island game.",
    popular: false,
    slug: "tnf-all-in-pack",
    features: [
      "Official Spread & Total Calls",
      "Top 3 High-Conviction Player Props",
      "1 Correlated Same-Game Parlay",
      "Offensive & Defensive Line Matchup Notes",
      "Instant In-Place Browser Unlock",
    ],
    cta: "Get Single Game Pass",
    ctaLink: "/packages#tnf-all-in-pack",
  },
  {
    id: "weekly-all-access",
    name: "Weekly All-Access",
    price: "$29",
    cadence: "per week",
    description: "Complete slate coverage across all 13+ games from Thursday Night through Monday Night Football, plus our full DraftKings & FanDuel DFS lineup portfolio.",
    popular: true,
    slug: "week8-all-access",
    features: [
      "All 13+ Game Cards (Thursday to Monday)",
      "18+ Locked Player Props (Full Board)",
      "13 Correlated Same-Game Parlays",
      "Full DFS Portfolio (Cash & GPP Lineups)",
      "16-Player Expanded Position Core",
      "Trench Matchup & Injury Workload Breakdowns",
    ],
    cta: "Unlock Weekly All-Access",
    ctaLink: "/packages#week8-all-access",
  },
  {
    id: "vip-season-pass",
    name: "VIP Season Pass",
    price: "$199",
    cadence: "rest of season & playoffs",
    description: "Unrestricted VIP access for the remainder of the 2026 season through Super Bowl LXI. One-time payment with zero recurring rebills.",
    popular: false,
    slug: "vip-season-pass",
    features: [
      "Every Game Card Through Super Bowl LXI",
      "Complete Player Props & Derivatives Suite",
      "Daily Fantasy (DFS) Cash & Tournament Lineups",
      "Friday Injury & Target Redistribution Reports",
      "Real-Time Line Movement & Injury Alerts",
      "Direct Access to the Football Research Desk",
    ],
    cta: "Join VIP Season Pass",
    ctaLink: "/packages#week8-all-access",
  },
  {
    id: "pro-analytics-gsi-api",
    name: "Pro Syndicate Data Feed",
    price: "$499",
    cadence: "per month",
    description: "Direct data feed for high-volume bettors and syndicate desks. Real-time de-vigged fair odds, injury workload updates, and full-slate matchup grades.",
    popular: false,
    slug: "pro-analytics-gsi-api",
    features: [
      "Programmatic REST & WebSocket Feed Access",
      "Full-Slate Snap & Target Share Projections",
      "Injury Workload & Depth Chart Redistribution",
      "Live Sportsbook Odds & De-Vigged Fair Prices",
      "Historical Play-by-Play & Closing Line Archive",
      "Dedicated Analyst Desk Support",
    ],
    cta: "Contact Syndicate Desk",
    ctaLink: "/research",
  },
];

export default function PricingPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF4D2E]">
            Official Verified NFL Record: 62-23-1 (72.9%) · +26.50u
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-tight text-white sm:text-6xl">
            Choose Your Edge
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#C4BFB6] sm:text-lg">
            Built on film tendencies, trench matchups, verified injury reports, and de-vigged line comparisons. Honest conviction scores (strictly XX/100, never raw percentages), audited public ledger, and disciplined pass rules.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid gap-8 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col justify-between rounded-xl border p-7 transition-all ${
                tier.popular
                  ? "border-[#FF4D2E] bg-[#12141C] shadow-[0_0_30px_rgba(255,77,46,0.18)]"
                  : "border-[#252833] bg-[#0E1015] hover:border-[#3A3F50]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl uppercase tracking-wide text-white">{tier.name}</h3>
                  {tier.popular && (
                    <span className="rounded bg-[#FF4D2E] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#08090C]">
                      Most Popular
                    </span>
                  )}
                </div>
                <div className="mt-5 flex items-baseline">
                  <span className="font-display text-5xl uppercase tracking-tight text-white">{tier.price}</span>
                  <span className="ml-2 text-xs uppercase tracking-wider text-[#8F8A82]">/{tier.cadence}</span>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-[#C4BFB6]">{tier.description}</p>

                <div className="my-6 border-t border-[#252833]" />

                <ul className="space-y-3 text-xs text-[#EDE8E0]">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="font-bold text-[#FF4D2E]">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href={tier.ctaLink}
                  className={`inline-flex min-h-[46px] w-full items-center justify-center rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                    tier.popular
                      ? "bg-[#FF4D2E] text-[#08090C] hover:opacity-90 shadow-md"
                      : "border border-[#EDE8E0]/40 text-[#EDE8E0] hover:border-[#FF4D2E] hover:text-[#FF4D2E]"
                  }`}
                >
                  {tier.cta} →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Verification Guarantee & Pass Discipline */}
        <div className="mt-16 rounded-xl border border-[#252833] bg-[#0E1015] p-8 text-center sm:p-10">
          <h2 className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
            Honest Football Grading &amp; Strict Pass Discipline
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-[#C4BFB6]">
            Every call published on Galaxy Sports Edge is built from coaching tendencies, offensive and defensive line pass-protection matchups, active injury reports, and de-vigged sportsbook price comparisons. If a game or prop does not give us a clear edge over the market number, we mark it <strong>PASS · NO BET</strong>. We never force action.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-[#8F8A82]">
            <span>✓ Verified Record: 62-23-1 (72.9%) · +26.50u</span>
            <span>✓ Week 8 Settled Sweep: 22-8-1 · +12.40u</span>
            <span>✓ Timestamped Pre-Kickoff Ledger</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
