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
import { MatchupCompareTool } from "@/components/lab/matchup-compare-tool";
import { NoVigTool } from "@/components/lab/no-vig-tool";
import { WeatherImpactTool } from "@/components/lab/weather-impact-tool";
import { GlassBoxExplainer } from "@/components/lab/glass-box-explainer";
import { CalibrationExplorer } from "@/components/lab/calibration-explorer";
import { loadGlassBoxPicks } from "@/lib/lab/glass-box";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

export const dynamic = "force-dynamic";

const LAB_TITLE = "Galaxy Lab — Run the Model Yourself";
const LAB_DESCRIPTION =
  "A free interactive workbench of nine decision tools: matchup simulation, no-vig odds, weather impact, parlay risk, bankroll sizing, calibration. Exploration, not picks.";

export const metadata: Metadata = {
  title: LAB_TITLE,
  description: LAB_DESCRIPTION,
  alternates: { canonical: "/lab" },
  openGraph: {
    title: LAB_TITLE,
    description: LAB_DESCRIPTION,
    url: "/lab",
    type: "website",
    siteName: "Galaxy Sports Edge",
  },
  twitter: { card: "summary_large_image", title: LAB_TITLE, description: LAB_DESCRIPTION },
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
    name: "Multi-sport matchup compare",
    status: "live",
    desc: "Pick a league, enter two teams' season stats, and get league-normalized power ratings, an expected-margin frame, and a plain-language read — built on the dormant power-ranking + ELO libraries.",
  },
  {
    name: "No-vig fair odds & hold calculator",
    status: "live",
    desc: "Enter a market's prices across one or more books and see each side's vig-free fair probability, the book's hold, the fair odds, and a consensus fair line — the price you see has the book's margin baked in.",
  },
  {
    name: "Weather impact explorer",
    status: "live",
    desc: "Enter game-day conditions — temp, wind speed + direction, precip, humidity, stadium — and see the modeled effect on scoring and totals: NFL wind-and-cold passing impact, MLB ballpark wind in/out, and a total adjustment — built on the dormant weather-modeling libraries.",
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
            <p className="mt-3 text-sm leading-relaxed text-ink-400">
              Nine tools live here: the Monte Carlo game simulator, parlay
              stress-tester, bankroll &amp; Kelly optimizer, pace &amp; schedule
              optimizer, multi-sport matchup compare, no-vig fair-odds
              calculator, weather impact explorer, glass-box pick explainer, and
              calibration explorer. All free, all educational — exploration
              tools, not picks.
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
          <section className="mt-10">
            <h2 className="mb-1 font-display text-lg font-semibold text-white">
              Multi-sport matchup compare
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-ink-300">
              Pick a league and enter two teams&apos; season stats — win pct,
              points for and against per game, schedule strength, recent form.
              The tool returns league-normalized power ratings, an
              expected-margin frame with an honest interval, and a
              plain-language read. The per-league coefficients are transparent
              model parameters, not measured outcomes; it runs on your inputs and
              excludes injury and availability data.
            </p>
            <MatchupCompareTool />
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-10">
            <h2 className="mb-1 font-display text-lg font-semibold text-white">
              No-vig fair odds &amp; hold calculator
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-ink-300">
              Enter a market&apos;s American prices for each side — across as
              many books as you like — and the tool strips out the book&apos;s
              margin: each side&apos;s vig-free fair probability, the hold/vig %,
              the fair (no-vig) odds, and a consensus fair line across the books.
              It teaches a core idea — the price you see already includes the
              book&apos;s cut. Every figure is computed only from the prices you
              enter.
            </p>
            <NoVigTool />
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-10">
            <h2 className="mb-1 font-display text-lg font-semibold text-white">
              Weather impact explorer
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-ink-300">
              Enter a game&apos;s conditions — sport, temperature, wind speed and
              direction, precipitation, humidity, and stadium type — and the tool
              models the effect on scoring and totals: the NFL/NCAAF wind-and-cold
              passing impact, the MLB ballpark wind blowing in or out, a total
              adjustment on a neutral reference total, and a plain-language
              summary. It models weather only — it runs on your inputs and
              excludes injury, availability, and roster data.
            </p>
            <WeatherImpactTool />
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
