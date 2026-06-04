import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { ProjectionsBadge } from "@/components/integrations/projections-badge";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Galaxy Fantasy — A Decision OS for Your Roster",
  description:
    "Not a projections list with a waiver button. A glass-box fantasy-football operating system: draft, waivers, lineups, trades, DFS, and two first-of-kind systems — the League Twin and the GM Ledger.",
  alternates: { canonical: "/fantasy" },
};

const FLAGSHIP = [
  {
    title: "GM Autopilot",
    href: "/fantasy/autopilot",
    tag: "First of its kind",
    desc: "A delegation dial from waiver suggestions to a fully remote GM — where every move is explained before it happens, committed to your tamper-evident ledger, reversible, and teaches you. Delegation with proof, not a black box.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    title: "The League Twin",
    href: "/fantasy/league-twin",
    tag: "First of its kind",
    desc: "Your roster as a navigable galaxy — players as star systems, projection as brightness, volatility as the halo, byes as eclipses, scheme shocks as impact events. Nobody renders a roster this way.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    title: "The GM Ledger",
    href: "/fantasy/gm-ledger",
    tag: "First of its kind",
    desc: "Every roster decision committed before the games and graded on process, not luck — building a calibrated, un-cherry-pickable GM Rating. “I would've started him” becomes impossible to fake.",
    accent: BRAND_COLORS.orbitalCyan,
  },
];

const TOOLS = [
  { title: "Draft Assistant", href: "/fantasy/draft", tag: "Draft", desc: "Tiers, VOR, best-available, bye conflicts, and live pick guidance.", accent: BRAND_COLORS.softUltraviolet },
  { title: "Waiver & FAAB", href: "/fantasy/waivers", tag: "In-season", desc: "Ranked adds and FAAB bids by budget — with the why on every move.", accent: BRAND_COLORS.orbitalCyan },
  { title: "Lineup Optimizer", href: "/fantasy/lineup", tag: "Start / Sit", desc: "Optimal lineup, start-sit calls, floor vs. ceiling, and call leverage.", accent: BRAND_COLORS.ionMagenta },
  { title: "Trade Analyzer", href: "/fantasy/trade", tag: "Trades", desc: "Value both sides, fairness, roster fit, win-now vs. dynasty.", accent: BRAND_COLORS.softUltraviolet },
  { title: "DFS Optimizer", href: "/fantasy/dfs", tag: "DFS", desc: "Cash / GPP / leverage objectives, stacking, exposure — every lineup glass-box.", accent: BRAND_COLORS.ionMagenta },
  { title: "Pick'em Edge", href: "/fantasy/props", tag: "Props", desc: "Where our number beats Underdog & DK Pick6 lines — plus the best alt-line EV.", accent: BRAND_COLORS.softUltraviolet },
  { title: "Scheme Intelligence", href: "/fantasy/scheme", tag: "Edge", desc: "How a single coaching or scheme change cascades through fantasy values.", accent: BRAND_COLORS.orbitalCyan },
  { title: "Contests", href: "/fantasy/contests", tag: "Play", desc: "Best ball, survivor, pick'em, squares — skill-first, real money founder-gated.", accent: BRAND_COLORS.softUltraviolet },
  { title: "Galaxy Studios", href: "/fantasy/studio", tag: "Media", desc: "The weekly Galaxy Brief and waiver transmission, generated from the OS.", accent: BRAND_COLORS.orbitalCyan },
  { title: "GM Academy", href: "/fantasy/academy", tag: "Train", desc: "Drill the process behind great decisions — graded on reasoning, building your GM IQ.", accent: BRAND_COLORS.softUltraviolet },
];

function Card({ title, href, tag, desc, accent, large }: { title: string; href: string; tag: string; desc: string; accent: string; large?: boolean }) {
  return (
    <Link
      href={href}
      className={`surface-card group relative flex flex-col overflow-hidden p-6 transition-transform duration-300 ease-out hover:-translate-y-1 ${large ? "sm:p-8" : ""}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>{tag}</span>
      <h3 className={`mt-2 font-semibold text-white ${large ? "font-display text-2xl" : "text-lg"}`}>{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-300">{desc}</p>
      <span aria-hidden className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-transform duration-200 group-hover:translate-x-1" style={{ color: accent }}>
        Open →
      </span>
    </Link>
  );
}

export default function FantasyHubPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.softUltraviolet}1c, transparent 70%), radial-gradient(40% 60% at 74% 8%, ${BRAND_COLORS.orbitalCyan}12, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.softUltraviolet }}>
                <span className="live-dot" />
                Galaxy Fantasy
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-3xl font-display text-balance text-white"
                style={{ fontSize: "clamp(2.5rem, 7.5vw, 5.5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
              >
                A decision OS for your{" "}
                <span className="gse-editorial" style={{ fontSize: "1.08em" }}>roster</span>.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Every fantasy app is a projections list with a waiver button. This is the glass box:
                it shows the reasoning, models your league as a living system, and grades your
                decisions on process — not luck.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Flagship first-of-kind */}
        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2">
            {FLAGSHIP.map((f) => (
              <Card key={f.href} {...f} large />
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8" aria-labelledby="tools-heading">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 id="tools-heading" className="font-display text-2xl text-white sm:text-3xl">The toolkit, done glass-box.</h2>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TOOLS.map((t) => (
                <Card key={t.href} {...t} />
              ))}
            </div>
            <Reveal delay={120}>
              <div className="mt-8 space-y-3">
                <ProjectionsBadge />
                <p className="text-xs leading-relaxed text-ink-500">
                  Illustrative player universe — fictional players and illustrative projections,
                  a demonstration of the intelligence. Real-money contests and league sync are
                  founder-gated and activate behind compliance review.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
