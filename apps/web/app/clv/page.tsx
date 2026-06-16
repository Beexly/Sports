import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import {
  loadPublicClvPolicy,
  type PublicClvPolicy,
} from "@/lib/performance/public-clv-policy";
import { glossaryEntry } from "@/lib/glossary";

export const metadata: Metadata = {
  title: "Closing Line Value — Did We Beat the Close?",
  description:
    "Closing line value (CLV) is the sharp-credible leading indicator of a real edge — and the one benchmark tout services and AI prediction sites almost never publish. We publish it under the same gate-until-defensible discipline as the public win rate.",
  alternates: { canonical: "/clv" },
};

export const dynamic = "force-dynamic";

export default async function ClvPage() {
  const gates = getReadinessGates();
  const minGraded =
    gates.minSettledPicksForLearning > 0 ? gates.minSettledPicksForLearning : 25;

  const policy = await loadPublicClvPolicy(db, {
    canExposePerformanceStats: gates.canExposePerformanceStats,
    minGradedForPublic: gates.minSettledPicksForLearning,
  }).catch(() => null);

  const clv = glossaryEntry("clv");

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-carbon">
      <Nav />
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Hero */}
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-orbital-cyan">
              The benchmark nobody publishes
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ion-white sm:text-5xl">
              Closing Line Value
            </h1>
            <p className="mt-5 text-lg text-ion-1">{clv?.plain}</p>
            {clv?.more && <p className="mt-3 text-sm text-ion-2">{clv.more}</p>}
          </div>

          {/* Why CLV is the honest benchmark */}
          <section className="mb-10 rounded-2xl border border-mineral bg-eclipse/60 p-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ion-2">
              Why this is the number that matters
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-ion-1">
              <p>
                A win rate tells you what already happened. Closing line value
                tells you whether you were <em>right to be in</em> — the strongest
                leading indicator that an edge is real, because the closing line is
                the market&apos;s most efficient estimate. Beat it consistently and
                profit tends to follow; lose to it and even a lucky run erodes.
              </p>
              <p>
                It is also the one number tout services and &ldquo;AI
                prediction&rdquo; sites almost never show. A curated win streak is
                easy to screenshot. Beating the close, counted over every settled
                pick, is not. That is exactly why we publish it.
              </p>
            </div>
          </section>

          {/* The report — gated or open */}
          {policy?.canExposeClv ? (
            <ClvScoreboard policy={policy} />
          ) : (
            <ClvGatedState
              graded={policy?.gradedSampleSize ?? 0}
              minGraded={minGraded}
              message={
                policy?.publicMessage ??
                "Closing line value is still accruing. The CLV report opens once enough picks have settled and been graded against the closing line."
              }
            />
          )}

          {/* Track your own CLV — the funnel */}
          <div className="mt-8 rounded-2xl border border-orbital-cyan/30 bg-orbital-cyan/[0.06] p-6">
            <h2 className="text-sm font-semibold text-ion-white">
              Now measure your own.
            </h2>
            <p className="mt-1.5 text-sm text-ion-1">
              The CLV Tracker logs your bets, settles them against the closing line,
              and shows whether <em>you</em> beat the close — your real scoreboard,
              stored in your browser. The same metric we hold ourselves to.
            </p>
            <Link
              href="/track"
              className="mt-4 inline-flex items-center rounded-lg border border-orbital-cyan/50 bg-orbital-cyan/10 px-4 py-2 text-sm font-semibold text-orbital-cyan hover:bg-orbital-cyan/20"
            >
              Open the CLV Tracker →
            </Link>
          </div>

          {/* Cross-links */}
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/methodology"
              className="rounded-lg border border-mineral px-4 py-2 text-ion-1 hover:bg-eclipse/80"
            >
              How a signal is scored &amp; graded →
            </Link>
            <Link
              href="/performance"
              className="rounded-lg border border-mineral px-4 py-2 text-ion-1 hover:bg-eclipse/80"
            >
              The Calibration Report →
            </Link>
            <Link
              href="/observatory"
              className="rounded-lg border border-mineral px-4 py-2 text-ion-1 hover:bg-eclipse/80"
            >
              Live market &amp; line shop →
            </Link>
            <Link
              href="/accountability"
              className="rounded-lg border border-mineral px-4 py-2 text-ion-1 hover:bg-eclipse/80"
            >
              Full accountability →
            </Link>
          </div>

          <div className="mt-8">
            <RiskDisclosure variant="card" includePastPerformance />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ClvGatedState({
  graded,
  minGraded,
  message,
}: {
  graded: number;
  minGraded: number;
  message: string;
}) {
  const pct = Math.min(100, Math.round((graded / Math.max(minGraded, 1)) * 100));
  return (
    <section
      data-testid="clv-gated"
      className="rounded-2xl border border-mineral bg-eclipse/60 p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-caution animate-live-pulse" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-2">
          CLV report — accruing
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-ion-1">{message}</p>
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-ion-2">
          <span>Graded against the close</span>
          <span className="font-mono tabular-nums text-ion-1">
            {graded} / {minGraded}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-titanium">
          <div
            className="h-full rounded-full bg-orbital-cyan transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="mt-4 text-xs text-ion-3">
        No beat-close rate is shown until the sample is large enough to be honest —
        the same discipline as the public win rate.
      </p>
    </section>
  );
}

function ClvScoreboard({ policy }: { policy: PublicClvPolicy }) {
  return (
    <section data-testid="clv-scoreboard">
      <div className="overflow-hidden rounded-2xl border border-mineral bg-gradient-to-br from-eclipse to-carbon">
        <div className="border-b border-mineral px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
            Beat the close
          </h2>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-6xl font-extrabold tabular-nums text-orbital-cyan">
            {policy.beatCloseRatePct}%
          </p>
          <p className="mt-2 text-sm text-ion-2">
            of {policy.gradedSampleSize} graded canonical picks
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-mineral/60 border-t border-mineral">
          <VerdictStat label="Beat" value={policy.beatCloseCount} accent="text-orbital-cyan" />
          <VerdictStat label="Matched" value={policy.matchedCloseCount} accent="text-ion-2" />
          <VerdictStat label="Lost" value={policy.lostToCloseCount} accent="text-alert" />
        </div>
      </div>
      <p className="mt-4 text-xs text-ion-3">{policy.publicMessage}</p>
    </section>
  );
}

function VerdictStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-ion-2">
        {label}
      </p>
      <p className={["text-2xl font-extrabold tabular-nums", accent].join(" ")}>
        {value}
      </p>
    </div>
  );
}
