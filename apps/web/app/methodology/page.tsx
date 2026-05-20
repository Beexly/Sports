import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { MethodologySection } from "@/components/ui/methodology-section";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the model evaluates matchups: live odds ingestion, factor scoring, calibrated confidence, and a public performance gate that opens only after enough canonical picks have settled.",
};

/**
 * Methodology page.
 *
 * The brief asks for elegant diagrams rather than walls of text. This page
 * is structured as four numbered phases — Ingest, Score, Publish, Calibrate —
 * each rendered as its own card with explicit input/output language. The
 * shared `MethodologySection` (registry-driven) appears below as the
 * canonical claim list.
 */
export default function MethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-ink-800/60 bg-stadium-glow px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Methodology</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              How {BRAND_NAME} actually evaluates a matchup.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-300">
              No black box. The pipeline is four phases — Ingest, Score,
              Publish, Calibrate — and every public surface is gated by what
              the data can honestly support.
            </p>
          </div>
        </section>

        {/* Four-phase pipeline */}
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <ol className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <PhaseCard
                step="01"
                title="Ingest"
                inputs="Live lines from multiple sportsbooks, on a schedule."
                outputs="Normalized markets — spread, total, moneyline — timestamped per fetch."
                body="The data pipeline runs on a regular cadence (every 30 minutes during peak hours, more often as a slate approaches kickoff). Every odds row is stamped with bookmaker count and a freshness timestamp. If a market is thin, the data-quality score reflects that on the pick card."
              />
              <PhaseCard
                step="02"
                title="Score"
                inputs="Normalized markets + historical team-game logs (after the model-history gate opens)."
                outputs="A confidence range, an edge projection, and a risk profile per side."
                body="The scoring engine computes implied probabilities, weighs sharp line movement, evaluates head-to-head context, and looks at venue form. Each contributor is exposed in the factor breakdown so a serious reviewer can see exactly what moved the dial."
              />
              <PhaseCard
                step="03"
                title="Publish"
                inputs="Engine output + the readiness gates."
                outputs="The pick card you see — selection, confidence band, risk, reasoning, freshness, and factor breakdown."
                body="A pick is only published when the public-picks gate is open, and a numeric confidence value is only shown when the calibration gate is open. Until then, confidence is presented as a label (Lean / Strong / Top Pick) and the page surfaces a &quot;collecting baseline data&quot; note."
              />
              <PhaseCard
                step="04"
                title="Calibrate"
                inputs="Settled outcomes from real games, paired with the engine state at prediction time."
                outputs="A calibration proposal. Not a silent weight change."
                body="The model only learns from real outcomes paired with the signal state at the moment a pick was made — never from its own prior reasoning text. When a proposed weight change improves out-of-sample calibration, it lands in a versioned model bump that a human reviews and merges. Customers see the model version on every pick card."
              />
            </ol>
          </div>
        </section>

        {/* Registry-driven claim grid */}
        <MethodologySection />

        {/* Trust gates */}
        <section className="border-t border-ink-800/60 px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Readiness gates</p>
            <h2 className="mt-3 font-display text-display-lg text-white">
              The customer surface is gated by what the data supports.
            </h2>
            <p className="mt-4 text-ink-300">
              These flags are public-facing on purpose. They&apos;re the
              difference between a tout site and a system you can audit.
            </p>

            <dl className="mt-10 flex flex-col divide-y divide-ink-800/60 overflow-hidden rounded-2xl border border-ink-800">
              {GATES.map((gate) => (
                <div
                  key={gate.flag}
                  className="grid grid-cols-1 gap-2 bg-ink-950/60 px-6 py-5 sm:grid-cols-3 sm:gap-6"
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

            <p className="mt-6 text-xs text-ink-500">
              The full gate sequence and its prerequisites are documented in
              the operator runbook in this repo, not just in marketing copy.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-ink-800/60 bg-ink-1000/80 px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <h2 className="font-display text-display-lg text-white">
              See how it looks on a real card.
            </h2>
            <p className="text-ink-300">
              The Picks page is the same engine, the same calibration policy,
              and the same disclosure stack — just one slate at a time.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/picks" className="btn-primary px-7 py-3.5 text-base">
                View today&apos;s picks
              </Link>
              <Link
                href="/performance"
                className="btn-secondary px-7 py-3.5 text-base"
              >
                See the public performance page
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
      "Once on, every new pick and team-game log is recorded as canonical — eligible to count toward the public record. Bootstrap-era rows stay flagged and never enter customer-visible stats.",
  },
  {
    flag: "DERIVED_MODEL_HISTORY_ENABLED",
    title: "Derived model history",
    description:
      "Once on, the scoring engine starts using head-to-head, venue-form, and ATS-form signals. Only canonical logs feed in — never bootstrap rows.",
  },
  {
    flag: "PUBLIC_PICKS_ENABLED",
    title: "Public picks",
    description:
      "Once on, the /api/picks endpoints return picks publicly. Until then, the picks endpoints respond honestly with a not-yet-ready state instead of fabricated data.",
  },
  {
    flag: "PERFORMANCE_STATS_ENABLED",
    title: "Performance stats",
    description:
      "Once on, the dashboard and the public Performance page display the record and win-rate. Requires at least 100 canonical settled picks before the operator may even consider flipping it.",
  },
  {
    flag: "OUTCOME_LEARNING_ENABLED",
    title: "Outcome learning",
    description:
      "Once on, settled canonical picks become eligible data for the next calibration cycle. This gates data collection only — weight changes still require an explicit model version bump and a human review.",
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
        <div className="rounded-xl border border-ink-800 bg-ink-950/60 px-4 py-3">
          <p className="eyebrow text-ink-500">Inputs</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{inputs}</p>
        </div>
        <div className="rounded-xl border border-ink-800 bg-ink-950/60 px-4 py-3">
          <p className="eyebrow text-ink-500">Outputs</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
            {outputs}
          </p>
        </div>
      </div>
    </li>
  );
}
