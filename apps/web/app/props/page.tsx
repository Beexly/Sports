import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Player Props Intelligence — Galaxy Sports Edge",
  description:
    "Galaxy grades player props on role stability, line value, matchup fit, and volatility — not just hit rate. Sports prop research built for informed bettors.",
  alternates: { canonical: "/props" },
  openGraph: {
    title: `Player Props Intelligence — ${BRAND_NAME}`,
    description:
      "Role stability, line value, matchup fit, volatility grade. Prop research built for the most mispriced market in sports betting.",
  },
};

const DIMENSIONS = [
  {
    id: "role-stability",
    label: "Role Stability",
    short: "Usage Signal",
    body: "Is the player's role stable enough to project? Snap share trend, target share, carry distribution, and scheme changes all factor in. A moving role invalidates the line faster than any matchup variable.",
    accent: "border-cyan-800",
    accentText: "text-ion-blue",
  },
  {
    id: "line-value",
    label: "Line Value",
    short: "Price Signal",
    body: "Is the prop number priced correctly relative to the underlying probability? Line value compares the implied probability baked into the juice against Galaxy's projected distribution — identifying when the market is off.",
    accent: "border-emerald-800",
    accentText: "text-emerald-300",
  },
  {
    id: "matchup-fit",
    label: "Matchup Fit",
    short: "Opponent Signal",
    body: "Does the matchup favor this player's usage and production profile? Positional coverage grade, defensive scheme, pace of play, and game script all shape whether a prop number is beatable this week.",
    accent: "border-yellow-800",
    accentText: "text-yellow-300",
  },
  {
    id: "volatility",
    label: "Volatility Grade",
    short: "Variance Signal",
    body: "How wide is the outcome range? High-volatility props carry more variance even when the edge is real. Galaxy grades volatility separately from expected value — a playable prop with HIGH volatility requires different sizing.",
    accent: "border-purple-800",
    accentText: "text-purple-300",
  },
] as const;

const SPORTS_COVERAGE = [
  { sport: "NFL", status: "beta", note: "Skill positions — WR, RB, TE, QB passing props" },
  { sport: "NBA", status: "beta", note: "Points, rebounds, assists, threes, combos" },
  { sport: "MLB", status: "coming-soon", note: "Strikeout, hit, total base props" },
  { sport: "NHL", status: "coming-soon", note: "Points, shots on goal, goalie saves" },
  { sport: "College Football", status: "coming-soon", note: "Passing and rushing props — Power 4" },
  { sport: "College Basketball", status: "coming-soon", note: "Points and assists — major conferences" },
  { sport: "Soccer", status: "coming-soon", note: "Shots, goals, assists — top leagues" },
] as const;

type SportStatus = "beta" | "coming-soon";

const STATUS_STYLES: Record<SportStatus, string> = {
  beta: "text-ion-blue border-cyan-700 bg-cyan-950/30",
  "coming-soon": "text-gray-500 border-gray-700 bg-gray-900/30",
};

const STATUS_LABELS: Record<SportStatus, string> = {
  beta: "Beta",
  "coming-soon": "Coming Soon",
};

const GRADE_DIMENSIONS = [
  {
    label: "Signal Grade",
    scale: "A → F",
    body: "Overall composite grade factoring EV, role certainty, and matchup quality. A-grade props are high-conviction. F is a pass.",
  },
  {
    label: "Role Stability",
    scale: "High / Medium / Low",
    body: "Tracks how consistent the player's usage has been over the last 3–5 games. Low stability is a red flag regardless of line value.",
  },
  {
    label: "Playable-To Price",
    scale: "Line limit",
    body: "The worst price at which the prop still carries positive expected value. Betting past this number erases the edge.",
  },
  {
    label: "Why It Fails",
    scale: "Risk case",
    body: "Every graded prop includes the scenario that invalidates it — injury, role change, blowout script, or defensive adjustment. Galaxy names the failure mode explicitly.",
  },
] as const;

export default function PropsPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">

        {/* Hero */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_70%_0%,rgba(122,92,255,0.11),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Props Intelligence
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              The most mispriced market in sports betting.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Player props are the most mispriced market in sports betting. Galaxy identifies role stability, line value, and matchup fit before you bet.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
              Not a hit-rate leaderboard. Not "expert picks." Props Intelligence grades the four dimensions that determine whether a prop number is actually beatable — then tells you why it might not be.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                Join the waitlist
              </Link>
              <Link
                href="/methodology"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
              >
                How signals are graded
              </Link>
            </div>
          </div>
        </section>

        {/* Why Props */}
        <section className="border-b border-mineral bg-gray-900/40 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="border-l-2 border-cyan-700 pl-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-blue">
                Why props
              </p>
              <p className="mt-2 text-base leading-7 text-gray-300">
                Props markets correct slower than game lines. Sportsbooks reprice spreads and totals within minutes of new information. Player props can lag by hours — or not move at all. Sharper edges exist in props, and they persist longer. That asymmetry is the opportunity.
              </p>
            </div>
          </div>
        </section>

        {/* Prop Dimensions */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Framework
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Four dimensions. One grade.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
                Galaxy evaluates every prop across four independent dimensions before issuing a Signal Grade. A strong matchup cannot overcome a collapsing role. A high-value line cannot overcome HIGH volatility without proper sizing.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {DIMENSIONS.map((dim) => (
                <div
                  key={dim.id}
                  className={`border border-mineral bg-gray-900/60 p-6 border-t-2 ${dim.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-white">{dim.label}</h3>
                    <span className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] ${dim.accentText}`}>
                      {dim.short}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{dim.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sports Coverage */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Coverage
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Sports coverage.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
                NFL and NBA are in beta. All other sports are in the roadmap. No live data is surfaced until grading is calibrated and the model is validated.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {SPORTS_COVERAGE.map(({ sport, status, note }) => (
                <div key={sport} className="border border-mineral bg-carbon/60 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{sport}</h3>
                    <span
                      className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${STATUS_STYLES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How we grade props */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Grading methodology
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                How Galaxy grades props.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400">
                Every published prop carries four data points. Not a hot take. Not a hit rate. A structured assessment with an explicit failure case.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {GRADE_DIMENSIONS.map(({ label, scale, body }) => (
                <div key={label} className="border border-mineral bg-gray-900/60 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-blue">
                    {scale}
                  </p>
                  <h3 className="mt-2 text-base font-bold text-white">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border border-mineral bg-gray-900/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
                Grading principle
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-300">
                Galaxy does not grade on hit rate alone. A prop can hit more than half the time and still be a losing long-run bet if the price is wrong. Galaxy's grading starts with the probability distribution, then prices the line against it. The grade reflects edge — not outcomes.
              </p>
            </div>
          </div>
        </section>

        {/* Beta Signup CTA */}
        <section className="border-t border-mineral px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Beta access
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Props Intelligence is in beta.
            </h2>
            <p className="mt-4 text-base text-gray-400">
              NFL and NBA props are in active grading. Pro and Elite subscribers get beta access first. Galaxy will not surface prop grades publicly until the model is calibrated against settled results.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                See plans and get beta access
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
              >
                Contact us
              </Link>
            </div>
            <div className="mt-10 mx-auto max-w-lg">
              <RiskDisclosure variant="compact" includePastPerformance />
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
