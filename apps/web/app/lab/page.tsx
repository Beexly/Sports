import type { Metadata } from "next";
import Link from "next/link";

import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { BRAND_COLORS } from "@/lib/brand";
import { GameSimulatorTool } from "@/components/lab/game-simulator-tool";
import { ParlayAnalyzerTool } from "@/components/lab/parlay-analyzer-tool";
import { BankrollOptimizerTool } from "@/components/lab/bankroll-optimizer-tool";
import { PaceScheduleTool } from "@/components/lab/pace-schedule-tool";
import { GlassBoxExplainer } from "@/components/lab/glass-box-explainer";
import { CalibrationExplorer } from "@/components/lab/calibration-explorer";
import { loadGlassBoxPicks } from "@/lib/lab/glass-box";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galaxy Lab — Run the Model Yourself",
  description:
    "An interactive sports-intelligence workbench. Simulate any matchup thousands of times, see the outcome distribution, and compare the model to the market line. A tool, not a tip sheet.",
  alternates: { canonical: "/lab" },
};

const TOOLS = [
  {
    name: "Monte Carlo game simulator",
    status: "live",
    desc: "Simulate a matchup thousands of times from team ratings; see win probability, the margin distribution, and where the model disagrees with the spread.",
  },
  {
    name: "Parlay stress-tester",
    status: "live",
    desc: "Real correlation and risk-of-ruin on your slip — built on the parlay + combinatorics + risk-analytics libraries.",
  },
  {
    name: "Bankroll & Kelly optimizer",
    status: "live",
    desc: "Size stakes to your edge and variance tolerance, with a Monte Carlo drawdown + risk-of-ruin simulation.",
  },
  {
    name: "Pace & schedule optimizer",
    status: "live",
    desc: "Turn a matchup's rest situation and tempo into an expected margin shift with a confidence interval — built on the dormant schedule + pace analytics libraries.",
  },
  {
    name: "Glass-box pick explainer",
    status: "live",
    desc: "The full devig → edge → distribution trail behind a real published pick. Unlocks with Pro.",
  },
  {
    name: "Calibration explorer",
    status: "live",
    desc: "The live reliability curve — honest 'building the record' until the settled-pick sample clears the gate.",
  },
] as const;

function StatusChip({ status }: { status: string }): JSX.Element {
  const map: Record<string, { label: string; color: string }> = {
    live: { label: "Live", color: BRAND_COLORS.orbitalCyan },
    soon: { label: "Coming soon", color: BRAND_COLORS.softUltravioletText },
    pro: { label: "Pro", color: BRAND_COLORS.ionMagenta },
    gated: { label: "Data-gated", color: BRAND_COLORS.softUltravioletText },
  };
  const s = map[status] ?? map.soon;
  return (
    <span
      className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em]"
      style={{
        color: s?.color,
        border: `1px solid ${s?.color}40`,
        background: `${s?.color}10`,
      }}
    >
      {s?.label}
    </span>
  );
}

export default async function GalaxyLabPage(): Promise<JSX.Element> {
  const [entitlements, glassBox, calibration] = await Promise.all([
    getViewerEntitlements(),
    loadGlassBoxPicks(),
    loadPublicCalibrationReport(),
  ]);
  return (
    <div style={{ backgroundColor: BRAND_COLORS.obsidianBlack }} className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <Reveal>
          <header className="max-w-2xl">
            <p
              className="font-mono text-[11px] uppercase tracking-[0.22em]"
              style={{ color: BRAND_COLORS.orbitalCyan }}
            >
              Galaxy Lab
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Run the model yourself.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-300 sm:text-base">
              Every tout hides their math behind a paywall. We hand you the
              engine. Simulate any matchup thousands of times, watch the outcome
              distribution form, and see exactly where a model&apos;s number
              disagrees with the market price. These are tools that run on{" "}
              <span className="text-white">your</span> inputs — model
              exploration, not published picks.
            </p>
          </header>
        </Reveal>

        <Reveal>
          <section className="mt-10">
            <h2 className="mb-4 font-display text-lg font-semibold text-white">
              Monte Carlo game simulator
            </h2>
            <GameSimulatorTool />
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-10">
            <h2 className="mb-4 font-display text-lg font-semibold text-white">
              Parlay stress-tester
            </h2>
            <ParlayAnalyzerTool />
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-10">
            <h2 className="mb-4 font-display text-lg font-semibold text-white">
              Bankroll &amp; Kelly optimizer
            </h2>
            <BankrollOptimizerTool />
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-10">
            <h2 className="mb-1 font-display text-lg font-semibold text-white">
              Pace &amp; schedule optimizer
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-ink-300">
              Enter a matchup&apos;s rest picture — days rest, back-to-back legs,
              optional tempo — and see the expected scoring-margin shift the
              schedule alone implies, with an honest confidence interval. It runs
              on your inputs and excludes injury and availability data.
            </p>
            <PaceScheduleTool />
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-12">
            <h2 className="mb-1 font-display text-lg font-semibold text-white">
              Glass-box pick explainer
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-ink-300">
              The full scoring trail behind real published picks. The header —
              grade, Edge Index, result — is public on every tier; the per-factor
              point contributions unlock with Pro.
            </p>
            <GlassBoxExplainer picks={glassBox} entitlements={entitlements} />
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-12">
            <h2 className="mb-1 font-display text-lg font-semibold text-white">
              Calibration explorer
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-ink-300">
              The reliability picture from real settled picks: predicted
              confidence versus observed win rate per bucket, the Brier score,
              and whether higher confidence actually ranks into higher win
              rates. Honest &ldquo;building the record&rdquo; until the
              settled-pick sample clears the gate.
            </p>
            <CalibrationExplorer report={calibration} />
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-12">
            <h2 className="font-display text-lg font-semibold text-white">
              The workbench
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-300">
              The Lab is built directly on Galaxy&apos;s open analytics
              libraries. Tools ship as they&apos;re wired; the proprietary picks
              themselves stay gated — the tools that run on your own numbers do
              not.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {TOOLS.map((t) => (
                <li
                  key={t.name}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-white">
                      {t.name}
                    </h3>
                    <StatusChip status={t.status} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-300">
                    {t.desc}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal>
          <section
            className="mt-12 rounded-2xl border p-6"
            style={{
              borderColor: `${BRAND_COLORS.orbitalCyan}22`,
              background: `${BRAND_COLORS.orbitalCyan}06`,
            }}
          >
            <h2 className="font-display text-base font-semibold text-white">
              Why give the tools away?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
              Because the moat isn&apos;t the calculator — it&apos;s the data and
              the published methodology behind the picks. Letting you
              pressure-test the method yourself is how trust gets earned. See the public
              methodology and track record on{" "}
              <Link
                href="/methodology"
                className="underline"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                how it works
              </Link>{" "}
              and{" "}
              <Link
                href="/board"
                className="underline"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                today&apos;s board
              </Link>
              .
            </p>
          </section>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
