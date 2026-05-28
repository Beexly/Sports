import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Coaching Edge Model — Tendencies & Market Implications | ${BRAND_NAME}`,
  description:
    "Coaching tendencies — pace preferences, rotation depth, fourth-quarter aggression, ATS discipline — are among the most stable signals in the model.",
  alternates: { canonical: "/coaching-edge" },
  openGraph: {
    title: `Coaching Edge Model | ${BRAND_NAME}`,
    description:
      "Coaches are the most consistent signal in a variable game. Pace, rotation, ATS discipline, and late-game aggression — scored and structured.",
  },
};

const COACHING_FACTORS = [
  {
    title: "Pace Preference",
    body: "Coaches who consistently slow or push pace create predictable totals behavior. A fast-paced coach in a slow-opponent matchup creates structural tension. That tension is modelable.",
  },
  {
    title: "Rotation Depth",
    body: "Short-rotation coaches are vulnerable in B2Bs and long travel stretches. Deep-rotation coaches maintain performance. This interacts directly with rest analytics.",
  },
  {
    title: "ATS Discipline",
    body: "Some coaches consistently cover as underdogs. Some struggle to cover as heavy favorites. This is structural, not lucky, and appears in the model's factor mix.",
  },
  {
    title: "Fourth-Quarter Aggression",
    body: "Late-game tendencies affect spread outcomes disproportionately. A conservative coach who goes to a prevent defense in close games has measurable ATS implications.",
  },
  {
    title: "Scheme vs. Matchup",
    body: "Scheme-first coaches create opportunity when the matchup exploits a known weakness. This is the slowest signal to price — books need player-data; this is team-data.",
  },
] as const;

const HOW_GALAXY_USES = [
  {
    step: "01",
    title: "Identify coach baseline",
    detail: "Historical ATS behavior across role, opponent tier, and schedule context.",
  },
  {
    step: "02",
    title: "Score matchup context",
    detail: "Opponent tendencies, travel distance, rest days, and slate density.",
  },
  {
    step: "03",
    title: "Check line for structural misalignment",
    detail: "Does the current price account for coaching tendency in this specific matchup type?",
  },
  {
    step: "04",
    title: "Gate: coaching factor only adds weight if supported by schedule/rest factors",
    detail: "Coaching signal is never standalone — it amplifies or dampens other model inputs.",
  },
] as const;

const BETTING_PRINCIPLES = [
  "Coaching edge decays quickly with roster turnover — validate the baseline after significant personnel changes.",
  "Offensive coordinator matters as much as head coach in scoring models — scheme ownership determines output.",
  "Playoff and tournament coaching adjustments reduce historical signals — preparation variance increases.",
  "Mid-season changes invalidate prior data — use post-change baseline only, minimum 10-game sample.",
  "Short-term trends (fewer than 10 games) are sample-size noise — do not weight them against a multi-season baseline.",
] as const;

const CROSS_LINKS = [
  { label: "Picks", href: "/picks" },
  { label: "Intelligence", href: "/intelligence" },
  { label: "Market Gravity", href: "/market-gravity" },
  { label: "Academy", href: "/academy" },
] as const;

export default function CoachingEdgePage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_20%_60%,rgba(122,92,255,0.10),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Coaching Edge Model
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Coaches are the most consistent signal in a variable game.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Player health changes weekly. Schedules are fixed. But coaching
              tendencies — pace preferences, rotation depth, fourth-quarter
              aggression, ATS discipline — are among the most stable signals in
              the model.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
              Model-supported analysis. No predicted outcome is certain.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/picks"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                View Today&apos;s Picks
              </Link>
              <Link
                href="/intelligence"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-mineral px-5 py-3 text-sm font-bold text-gray-100 hover:border-ion-blue"
              >
                Intelligence Hub
              </Link>
            </div>
          </div>
        </section>

        {/* Five Coaching Factors */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Factor Model
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Five coaching factors in the model
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                Each factor is scored independently and combined into a
                Coaching Edge composite. High composite scores indicate
                structural alignment between coaching tendency and matchup
                context — not a predicted outcome.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {COACHING_FACTORS.map((factor, idx) => (
                <div
                  key={factor.title}
                  className="border border-mineral bg-gray-900/60 p-6 hover:border-ion-blue/40 transition-colors"
                >
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-purple-400">
                    Factor {String(idx + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-base font-bold text-white">{factor.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{factor.body}</p>
                </div>
              ))}
              {/* Spacer card */}
              <div className="hidden border border-mineral/20 bg-carbon/20 p-6 lg:block" />
            </div>
          </div>
        </section>

        {/* How Galaxy Uses Coaching Data */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Methodology
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                How Galaxy uses coaching data
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
                Coaching signal flows through a four-step gate before it adds
                weight to a pick. It does not operate in isolation.
              </p>
            </div>
            <div className="relative flex flex-col gap-0">
              {HOW_GALAXY_USES.map((item, idx) => (
                <div key={item.step} className="flex gap-6">
                  {/* Step indicator + connector */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ion-blue/50 bg-carbon font-mono text-xs font-bold text-ion-blue">
                      {item.step}
                    </div>
                    {idx < HOW_GALAXY_USES.length - 1 && (
                      <div className="my-1 w-px flex-1 bg-mineral" />
                    )}
                  </div>
                  {/* Content */}
                  <div className={`pb-8 ${idx === HOW_GALAXY_USES.length - 1 ? "pb-0" : ""}`}>
                    <h3 className="mt-2 text-base font-bold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-400">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coaching-Aware Betting Principles */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Principles
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Coaching-aware wagering principles
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
                These are not rules — they are constraints the model respects
                when evaluating coaching factor weight.
              </p>
            </div>
            <div className="border border-mineral bg-carbon/50">
              {BETTING_PRINCIPLES.map((principle, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-4 px-6 py-5 ${
                    idx < BETTING_PRINCIPLES.length - 1 ? "border-b border-mineral" : ""
                  }`}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                  <p className="text-sm leading-6 text-gray-300">{principle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Risk Disclosure */}
        <section className="border-t border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <RiskDisclosure variant="card" includePastPerformance />
          </div>
        </section>

        {/* Cross-links */}
        <section className="border-t border-mineral bg-gray-900/20 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Related surfaces
            </p>
            <div className="flex flex-wrap gap-3">
              {CROSS_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1 border border-mineral px-4 py-2 text-sm font-medium text-gray-300 hover:border-ion-blue hover:text-ion-blue transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
