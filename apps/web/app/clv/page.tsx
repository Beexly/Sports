import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BRAND_COLORS } from "@/lib/brand";
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
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Atmosphere />
      <Nav />

      <main className="flex-1">
        {/* Cinematic hero */}
        <section className="relative isolate overflow-hidden px-4 pb-12 pt-24 sm:px-6 lg:px-8">
          <GeneratedPlate assetId="proof-crystal" className="-z-20 opacity-40" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
            style={{
              background: `radial-gradient(55% 80% at 50% -5%, ${BRAND_COLORS.orbitalCyan}16, transparent 60%), radial-gradient(35% 50% at 85% 20%, ${BRAND_COLORS.softUltraviolet}0d, transparent 65%)`,
            }}
          />
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                The benchmark nobody publishes
              </span>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.4rem, 7vw, 4.5rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                Closing Line{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Value
                </span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              {clv?.plain && (
                <p className="mt-5 text-lg leading-8 text-ink-300">{clv.plain}</p>
              )}
              {clv?.more && (
                <p className="mt-3 text-sm leading-7 text-ink-400">{clv.more}</p>
              )}
            </Reveal>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-6 px-4 pb-24 sm:px-6 lg:px-8">
          {/* Why CLV matters */}
          <Reveal>
            <section
              className="rounded-2xl border p-6"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                background: `linear-gradient(135deg, rgba(0,229,255,0.04) 0%, rgba(26,18,48,0.6) 100%)`,
              }}
            >
              <p
                className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Why this is the number that matters
              </p>
              <div className="space-y-4 text-sm leading-7 text-ink-300">
                <p>
                  A win rate tells you what already happened. Closing line value
                  tells you whether you were <em className="text-white not-italic font-medium">right to be in</em> — the strongest
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
          </Reveal>

          {/* The report */}
          <Reveal delay={80}>
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
          </Reveal>

          {/* Track your own CLV */}
          <Reveal delay={120}>
            <div
              className="rounded-2xl border p-6"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                background: `${BRAND_COLORS.orbitalCyan}08`,
              }}
            >
              <h2 className="text-sm font-bold text-white">
                Now measure your own.
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-ink-300">
                The CLV Tracker logs your bets, settles them against the closing line,
                and shows whether <em className="not-italic font-medium text-white">you</em> beat the close — your real scoreboard,
                stored in your browser. The same metric we hold ourselves to.
              </p>
              <Link
                href="/track"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-orbital-cyan/20"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}50`,
                  color: BRAND_COLORS.orbitalCyan,
                }}
              >
                Open the CLV Tracker →
              </Link>
            </div>
          </Reveal>

          {/* Cross-links */}
          <Reveal delay={160}>
            <Stagger className="flex flex-wrap gap-3 text-sm" step={50}>
              {[
                { href: "/methodology", label: "How a signal is scored & graded →" },
                { href: "/performance", label: "The Calibration Report →" },
                { href: "/observatory", label: "Live market & line shop →" },
                { href: "/accountability", label: "Full accountability →" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border px-4 py-2 text-ink-300 transition-colors hover:border-orbital-cyan/30 hover:text-white"
                  style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}
                >
                  {link.label}
                </Link>
              ))}
            </Stagger>
          </Reveal>

          <Reveal delay={200}>
            <RiskDisclosure variant="card" includePastPerformance />
          </Reveal>
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
      className="rounded-2xl border p-6"
      style={{
        borderColor: "rgba(255,180,84,0.25)",
        background: "linear-gradient(135deg, rgba(255,180,84,0.05) 0%, rgba(26,18,48,0.6) 100%)",
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-caution animate-live-pulse" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
          CLV report — accruing
        </h2>
      </div>
      <p className="text-sm leading-7 text-ink-300">{message}</p>
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-400">
          <span>Graded against the close</span>
          <span className="font-mono tabular-nums text-ink-300">
            {graded} / {minGraded}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: BRAND_COLORS.orbitalCyan }}
          />
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-500">
        No beat-close rate is shown until the sample is large enough to be honest —
        the same discipline as the public win rate.
      </p>
    </section>
  );
}

function ClvScoreboard({ policy }: { policy: PublicClvPolicy }) {
  return (
    <section data-testid="clv-scoreboard">
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: `${BRAND_COLORS.orbitalCyan}28`,
          background: `linear-gradient(140deg, rgba(0,229,255,0.06) 0%, rgba(18,14,36,0.95) 60%)`,
        }}
      >
        <div
          className="border-b px-6 py-4"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: BRAND_COLORS.orbitalCyan }}
          >
            Beat the close
          </p>
        </div>
        <div className="px-6 py-10 text-center">
          <p
            className="font-display text-7xl font-extrabold tabular-nums"
            style={{ color: BRAND_COLORS.orbitalCyan }}
          >
            {policy.beatCloseRatePct}%
          </p>
          <p className="mt-3 text-sm text-ink-400">
            of {policy.gradedSampleSize} graded canonical picks
          </p>
        </div>
        <div
          className="grid grid-cols-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <VerdictStat label="Beat" value={policy.beatCloseCount} accent={BRAND_COLORS.orbitalCyan} />
          <VerdictStat label="Matched" value={policy.matchedCloseCount} accent="#9AA3B2" />
          <VerdictStat label="Lost" value={policy.lostToCloseCount} accent="#FF6470" />
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-500">{policy.publicMessage}</p>
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
    <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {label}
      </p>
      <p className="font-display text-3xl font-extrabold tabular-nums" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
