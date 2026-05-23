import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { MethodologySection } from "@/components/ui/methodology-section";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

export const metadata: Metadata = {
  title: "Methodology — How Galaxy IQ Scores Every Signal",
  description:
    "The four-check decision stack behind every Galaxy Sports Edge signal: market shape, price pressure, risk, and evidence quality. Weak inputs don't get published.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        <section className="border-b border-ink-800/60 bg-stadium-glow px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Galaxy IQ Methodology</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              A signal is not a hunch. It is a decision stack.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-300">
              Noise gets separated from action by four checks: market shape,
              price pressure, risk, and evidence quality. If the stack is
              weak, nothing ships.
            </p>
          </div>
        </section>

        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <ol className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <PhaseCard
                step="01"
                title="Read the board"
                inputs="Spread, total, moneyline, bookmaker count, timestamp."
                outputs="A clean market snapshot for each matchup."
                body="The work starts with the board, not a story. Price, freshness, and market depth are recorded before any opinion forms."
              />
              <PhaseCard
                step="02"
                title="Measure pressure"
                inputs="Movement, consensus, volatility, and matchup context."
                outputs="A pressure map showing where the board is tightening or drifting."
                body="Most bettors see a number. The model studies how that number got there: who moved, how far, how fast, and whether the market is deep enough to trust."
              />
              <PhaseCard
                step="03"
                title="Gate the signal"
                inputs="Score, risk, freshness, and confidence policy."
                outputs="Selection, risk label, reasoning, and factor trail."
                body="A signal only ships when the edge is explainable. Weak inputs, stale prices, or thin markets stay off the customer surface. If it can't be defended, it doesn't get published."
              />
              <PhaseCard
                step="04"
                title="Learn slowly"
                inputs="Settled outcomes paired with the engine state at pick time."
                outputs="A reviewed calibration change, never a silent rewrite."
                body="Outcomes matter, but overreacting is expensive. Calibration draws on settled history only after enough data exists to make the lesson meaningful — and every weight change goes through review."
              />
            </ol>
          </div>
        </section>

        <MethodologySection />

        <section className="border-t border-ink-800/60 px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Control gates</p>
            <h2 className="mt-3 font-display text-display-lg text-white">
              The interface says what the data can support.
            </h2>
            <p className="mt-4 text-ink-300">
              These gates keep the product honest. They decide what can appear,
              what stays hidden, and when performance numbers are mature enough
              to show.
            </p>

            <dl className="mt-10 grid grid-cols-1 gap-3">
              {GATES.map((gate) => (
                <div
                  key={gate.flag}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-ink-800 bg-ink-950/60 px-5 py-4 sm:grid-cols-3 sm:gap-6"
                >
                  <dt className="flex flex-col gap-1">
                    <span className="font-mono text-xs uppercase tracking-wide text-accent-300">
                      {gate.flag}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {gate.title}
                    </span>
                  </dt>
                  <dd className="text-sm leading-relaxed text-ink-300 sm:col-span-2">
                    {gate.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-ink-800/60 bg-ink-1000/80 px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <h2 className="font-display text-display-lg text-white">
              See the stack on today&apos;s board.
            </h2>
            <p className="text-ink-300">
              The Signal Feed turns those four checks into a ticket you can scan
              in seconds: pick, risk, freshness, and the reason.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/picks" className="btn-primary px-7 py-3.5 text-base">
                Open Signal Feed
              </Link>
              <Link
                href="/performance"
                className="btn-secondary px-7 py-3.5 text-base"
              >
                View Calibration Report
              </Link>
            </div>
            <RiskDisclosure variant="compact" className="text-center" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

const GATES = [
  {
    flag: "CANONICAL_HISTORY_ENABLED",
    title: "Canonical history",
    description:
      "Only verified pick and game logs become eligible for the public record.",
  },
  {
    flag: "DERIVED_MODEL_HISTORY_ENABLED",
    title: "Derived history",
    description:
      "Historical matchup signals stay off until the canonical data is mature.",
  },
  {
    flag: "PUBLIC_PICKS_ENABLED",
    title: "Public picks",
    description:
      "The Signal Feed opens only when the readiness gate says the current slate can be shown honestly.",
  },
  {
    flag: "PERFORMANCE_STATS_ENABLED",
    title: "Performance stats",
    description:
      "Record and win-rate stay hidden until enough canonical settled picks exist.",
  },
  {
    flag: "OUTCOME_LEARNING_ENABLED",
    title: "Outcome learning",
    description:
      "Settled outcomes can inform calibration, but weight changes still require review.",
  },
] as const;

function PhaseCard({
  step,
  title,
  inputs,
  outputs,
  body,
}: {
  step: string;
  title: string;
  inputs: string;
  outputs: string;
  body: string;
}) {
  return (
    <li className="surface-lifted flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="font-mono text-eyebrow font-semibold uppercase text-accent-300">
          Phase {step}
        </span>
        <div className="section-rule flex-1" />
      </div>
      <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-300">{body}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-ink-800 bg-ink-950/60 px-4 py-3">
          <p className="eyebrow text-ink-500">Inputs</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{inputs}</p>
        </div>
        <div className="rounded-lg border border-ink-800 bg-ink-950/60 px-4 py-3">
          <p className="eyebrow text-ink-500">Outputs</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
            {outputs}
          </p>
        </div>
      </div>
    </li>
  );
}
