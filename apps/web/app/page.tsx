import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { loadBoardState, type BoardStateData, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { isDemoPicksEnabled, isStubMode } from "@sports/db";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Deterministic Sports Intelligence`,
  description:
    "Sports betting research backed by deterministic scoring, tiered evidence, and a factor trail on every pick. Ten factors. A publish gate. Every settled pick recorded.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND_NAME} — Deterministic Sports Intelligence`,
    description:
      "We post when the model finds edge. Most days that is fewer than five picks. Factor trail attached to every one.",
  },
};

const HOMEPAGE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://galaxysportsedge.com/#website",
      name: BRAND_NAME,
      description: "Deterministic sports betting research with factor trails, tiered evidence, and calibrated confidence scores.",
      url: "https://galaxysportsedge.com",
    },
    {
      "@type": "Organization",
      "@id": "https://galaxysportsedge.com/#organization",
      name: BRAND_NAME,
      url: "https://galaxysportsedge.com",
      sameAs: [],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://galaxysportsedge.com/#app",
      name: `${BRAND_NAME} Intelligence Platform`,
      applicationCategory: "SportsApplication",
      description:
        "Multi-surface sports intelligence platform: Market Gravity, Rumor Radar, Fantasy War Room, Research Brain, and a deterministic picks engine with ten scoring factors.",
      featureList: [
        "Deterministic ten-factor pick scoring",
        "Market Gravity — line movement and book disagreement analysis",
        "Rumor Radar — five-state weak signal watchlist",
        "Fantasy War Room — start/sit, usage trends, scheme fit",
        "Research Brain — structured Q&A backed by the Evidence Vault",
        "Calibrated 0–100 confidence scores",
        "Append-only Public Ledger for settled picks",
      ],
    },
  ],
} as const;

const LEDGER = [
  ["SEA -1.5", "WIN", "Line movement led the factor mix"],
  ["ATL/NYM under", "LOSS", "Late lineup change broke the setup"],
  ["LA moneyline", "PUSH", "Market depth was strong, price closed flat"],
  ["CHI +4.5", "WIN", "Rest and travel both supported the side"],
  ["TOR total", "LOSS", "Weather moved after scoring"],
  ["PHI -2.5", "WIN", "Consensus held through close"],
] as const;

const STACK = [
  ["Read the board", "Odds, depth, line movement, freshness, and consensus are collected before a pick can be evaluated."],
  ["Score the math", "More than 10 deterministic factors score the market against schedule, venue, volatility, and data quality context."],
  ["Gate the slate", "Publish thresholds and freshness checks decide what reaches the board. Most evaluated games do not publish."],
] as const;

const QUESTIONS = [
  ["What changed?", "Every pick has a factor trail. You can see the inputs that moved the score."],
  ["What did we skip?", "The Pass List shows evaluated games that did not clear the gate, with the reason attached."],
  ["What happened after?", "The Public Ledger keeps settled picks tied to the original signal snapshot."],
] as const;

type CalibrationData = Awaited<ReturnType<typeof loadPublicCalibrationReport>>["data"];

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function HomePage(): Promise<JSX.Element> {
  const [stateResult, passesResult, calibrationResult] = await Promise.all([
    loadBoardState(),
    loadBoardPasses(),
    loadPublicCalibrationReport(),
  ]);
  const demoActive = isStubMode() && isDemoPicksEnabled();
  const surfaceSampleActive =
    stateResult.meta.isSampleData ||
    passesResult.meta.isSampleData ||
    calibrationResult.meta.isSampleData;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-carbon text-gray-100">
      <Nav />
      <main>
        {(demoActive || surfaceSampleActive) && <SampleDataBanner />}
        <LiveStateStrip state={stateResult.data} />
        <Hero />
        <GateCam state={stateResult.data} isSampleData={stateResult.meta.isSampleData} />
        <LedgerPreview />
        <CalibrationPreview calibration={calibrationResult.data} />
        <PassList passes={passesResult.data.passes} isSampleData={passesResult.meta.isSampleData} />
        <StackSection />
        <IntelligenceSurfaces />
        <ThreeQuestions />
        <MethodologySection />
        <ResponsibleBand />
        <EmptyPicksState />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOMEPAGE_LD) }} />
    </div>
  );
}

function SampleDataBanner(): JSX.Element {
  return (
    <div
      data-testid="sample-data-banner-home"
      role="status"
      aria-live="polite"
      className="mx-auto mt-4 flex max-w-7xl flex-col gap-2 border border-cyan-900 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100 sm:flex-row sm:items-center"
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ion-blue">
        Preview mode
      </span>
      <span>
        The board examples are deterministic samples used while live wiring is
        completed. They never settle and never produce a verified win-rate claim.
      </span>
    </div>
  );
}

function LiveStateStrip({ state }: { state: BoardStateData }): JSX.Element {
  const stateRows = [
    ["Sports watched", String(state.sportsWatched)],
    ["Books polled", String(state.booksPolled)],
    ["Open picks", String(state.openPicks)],
    ["Gated today", String(state.gatedToday)],
    ["Last refresh", timeLabel(state.lastRefresh)],
    ["Model", state.modelVersion],
  ] as const;

  return (
    <section aria-label="Live board state" className="border-b border-mineral bg-carbon">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
        {stateRows.map(([label, value]) => (
          <div key={label} className="min-h-14 border border-mineral bg-gray-900/55 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hero(): JSX.Element {
  return (
    <section
      className="relative isolate overflow-hidden border-b border-mineral px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8 lg:pb-40 lg:pt-36"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(34,211,238,0.18), transparent)," +
          "radial-gradient(ellipse 60% 40% at 80% 60%, rgba(139,92,246,0.12), transparent)," +
          "radial-gradient(ellipse 50% 50% at 10% 80%, rgba(244,114,182,0.09), transparent)," +
          "#030712",
      }}
    >
      {/* Dot-grid texture overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Glow ring */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/50 bg-cyan-950/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            Galaxy Sports Edge
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600 sm:inline">
            Intelligence Platform
          </span>
        </div>

        <h1 className="mt-8 max-w-5xl break-words text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-7xl lg:text-8xl">
          See the game{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-400 bg-clip-text text-transparent">
            differently.
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400">
          Deterministic sports intelligence — line movement, market gravity, sharp signals,
          and calibrated confidence scores. Not a picks feed. An analytical edge.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/today"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-gray-950 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-200 hover:shadow-cyan-400/30"
          >
            Open Today&apos;s Board
          </Link>
          <Link
            href="/picks"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-700 px-6 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-cyan-700 hover:text-white"
          >
            Explore picks →
          </Link>
          <Link
            href="/methodology"
            className="font-mono text-xs uppercase tracking-[0.16em] text-gray-500 hover:text-gray-300 sm:ml-2"
          >
            Read the methodology
          </Link>
        </div>

        {/* Trust signals */}
        <div className="mt-12 flex flex-wrap items-center gap-5 border-t border-mineral/50 pt-8">
          {[
            ["10+ factors", "per pick scored"],
            ["14 books", "polled every 30 min"],
            ["Evidence Vault", "every claim cited"],
            ["No fabricated stats", "ever"],
          ].map(([label, sub]) => (
            <div key={label} className="flex flex-col">
              <span className="font-mono text-sm font-bold text-white">{label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GateCam({ state, isSampleData }: { state: BoardStateData; isSampleData: boolean }): JSX.Element {
  const lanes = [
    ["SCORING NOW", state.scoringNow],
    ["PUBLISHED TODAY", state.publishedToday],
    ["GATED TODAY", state.gatedTodayRows],
  ] as const;

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow={isSampleData ? "PREVIEW MODE" : "LIVE BOARD"}
          title="Gate Cam"
          meta={isSampleData ? "Sample rows while live ingestion is unavailable" : "Scoring, published, and gated rows from today's board"}
        />
        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {lanes.map(([lane, rows]) => (
            <GateLane key={lane} lane={lane} rows={rows} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GateLane({ lane, rows }: { lane: string; rows: BoardStateRow[] }): JSX.Element {
  return (
    <article className="border border-mineral bg-gray-900/70 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">{lane}</p>
      <div className="mt-4 flex flex-col gap-3">
        {rows.length > 0 ? rows.slice(0, 4).map((row) => (
          <div key={row.id} className="border border-mineral bg-carbon/45 p-3">
            <h3 className="text-base font-bold text-white">{row.matchup}</h3>
            <p className="mt-1 text-xs text-gray-500">{row.sport} / {row.market}</p>
            <p className="mt-3 text-sm text-gray-300">
              {row.edgeIndex === null ? "Edge Index pending" : `Edge Index ${row.edgeIndex}`}
            </p>
            {row.gateReason && <p className="mt-2 text-xs leading-5 text-gray-400">{row.gateReason}</p>}
          </div>
        )) : (
          <p className="text-sm text-gray-500">No rows in this lane right now.</p>
        )}
      </div>
    </article>
  );
}

function LedgerPreview(): JSX.Element {
  return (
    <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="PREVIEW MODE" title="Public Ledger preview" meta="Six recent settlements" />
        <div className="mt-8 overflow-hidden border border-mineral">
          {LEDGER.map(([pick, result, note]) => (
            <div key={pick} className="grid gap-3 border-b border-mineral px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_2fr]">
              <span className="font-semibold text-white">{pick}</span>
              <span className="font-mono text-xs text-cyan-200">{result}</span>
              <span className="text-sm text-gray-400">{note}</span>
            </div>
          ))}
        </div>
        <Link href="/ledger" className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100">
          Open the full ledger
        </Link>
      </div>
    </section>
  );
}

function CalibrationPreview({ calibration }: { calibration: CalibrationData }): JSX.Element {
  const points = [
    [20, 72],
    [42, 55],
    [64, 39],
    [84, 23],
  ] as const;
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="LIVE CALIBRATION"
          title="Live Calibration"
          meta={`Updated: ${timeLabel(calibration.updatedAt)}. Sample: ${calibration.sampleSize} canonical settled picks.`}
        />
        <div className="mt-8 border border-mineral bg-gray-900/60 p-5">
          <div className="relative h-72 border-l border-b border-gray-700">
            <div className="absolute inset-x-0 bottom-0 h-px -rotate-45 bg-cyan-300/50" aria-hidden="true" />
            {points.map(([x, y]) => (
              <span key={`${x}-${y}`} className="absolute h-3 w-3 rounded-full bg-pink-300" style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
            <p className="absolute left-4 top-4 max-w-sm text-sm text-gray-400">
              {calibration.publicMessage} The diagonal shows perfect calibration.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PassList({ passes, isSampleData }: { passes: PassListRow[]; isSampleData: boolean }): JSX.Element {
  return (
    <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow={isSampleData ? "PREVIEW MODE" : "LIVE BOARD"}
          title="The Pass List"
          meta="Evaluated, then withheld"
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {passes.length > 0 ? passes.slice(0, 6).map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 border border-mineral bg-carbon/60 px-4 py-4">
              <span className="font-semibold text-white">{row.matchup}</span>
              <span className="text-right text-sm text-gray-400">{row.reason}</span>
            </div>
          )) : (
            <p className="border border-mineral bg-carbon/60 px-4 py-5 text-sm text-gray-500 sm:col-span-2">
              No passes recorded for this slate yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

const WORKFLOW_STEPS = [
  {
    step: "01",
    phase: "Collect",
    title: "14 books. Every 30 minutes.",
    body: "The engine polls live odds, lines, market depth, and line movement across 14 sportsbooks. Data freshness is validated on every cycle. Stale data fails the gate before scoring begins.",
    detail: "Sources: The Odds API, Tier 1-2 data partners. Sports: NFL · NCAAF · NBA · NCAAB · MLB · NHL · MLS.",
    accent: "border-l-cyan-500",
  },
  {
    step: "02",
    phase: "Score",
    title: "10 factors. Deterministic math.",
    body: "Each game is scored across ten factors: line movement velocity, book disagreement, market depth, rest days, schedule density, venue, ATS form, opening line divergence, data quality, and consensus. Every number is auditable.",
    detail: "Output: Edge Index (0–100). Factor trail attached. No black box.",
    accent: "border-l-blue-500",
  },
  {
    step: "03",
    phase: "Gate",
    title: "Most games don't publish.",
    body: "A publish gate checks confidence threshold, data freshness, and Edge Index minimum. Most evaluated games fail the gate — intentionally. The pass list shows exactly why each game was withheld.",
    detail: "Gate criteria: confidence ≥ threshold · data fresh ≤ 30 min · Edge Index ≥ floor.",
    accent: "border-l-violet-500",
  },
  {
    step: "04",
    phase: "Settle",
    title: "Every result recorded.",
    body: "When a game ends, the settlement worker calculates the result and records it to the Signal Ledger — an append-only log that cannot be edited. The calibration report updates automatically.",
    detail: "Signal Ledger: append-only. No edits. No deletions. Every win and loss committed.",
    accent: "border-l-pink-500",
  },
] as const;

function StackSection(): JSX.Element {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-ion-blue">How Galaxy Works</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            Four stages. No shortcuts.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-500">
            Every published pick has passed through all four stages. The factor trail shows you which inputs moved the score at each one.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {WORKFLOW_STEPS.map(({ step, phase, title, body, detail, accent }) => (
            <article
              key={step}
              className={`flex flex-col rounded-2xl border border-mineral bg-gray-900/50 p-7 border-l-4 ${accent}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-gray-600">{step}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-blue">{phase}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white lg:text-2xl">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-gray-400">{body}</p>
              <p className="mt-4 rounded border border-mineral/50 bg-carbon/60 px-3 py-2 font-mono text-[11px] leading-5 text-gray-500">{detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
          <Link href="/methodology" className="font-mono text-xs uppercase tracking-[0.16em] text-ion-blue hover:text-cyan-300">
            Full methodology →
          </Link>
          <Link href="/picks/how-picks-are-scored" className="font-mono text-xs uppercase tracking-[0.16em] text-gray-500 hover:text-gray-300">
            How picks are scored →
          </Link>
          <Link href="/intelligence/source-hierarchy" className="font-mono text-xs uppercase tracking-[0.16em] text-gray-500 hover:text-gray-300">
            Source hierarchy →
          </Link>
        </div>
      </div>
    </section>
  );
}

function ThreeQuestions(): JSX.Element {
  return (
    <section className="border-y border-mineral bg-gray-900/25 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Transparency" title="Three things most picks sites hide." meta="Galaxy publishes all three." />
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {QUESTIONS.map(([question, answer]) => (
            <article key={question} className="min-h-44 rounded-xl border border-mineral bg-carbon/70 p-6">
              <h3 className="text-lg font-bold text-white">{question}</h3>
              <p className="mt-4 text-sm leading-6 text-gray-400">{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const SURFACES = [
  {
    href: "/today",
    title: "Today's Board",
    eyebrow: "Daily brief",
    badge: "Live",
    badgeColor: "text-green-300 border-green-800/50 bg-green-950/40",
    accent: "from-cyan-500/20 to-blue-600/10",
    description: "Every morning's intelligence brief — scored picks, board passes, market signals, and what the model skipped. Open it before the first game.",
    links: [],
  },
  {
    href: "/picks",
    title: "Picks Engine",
    eyebrow: "Core product",
    badge: "Beta",
    badgeColor: "text-cyan-300 border-cyan-800/50 bg-cyan-950/40",
    accent: "from-blue-500/15 to-indigo-600/10",
    description: "Deterministic 10-factor scoring. Spread, moneyline, total. Gated by freshness and data quality. Factor trail on every published pick.",
    links: [{ href: "/picks/how-picks-are-scored", label: "How scoring works" }, { href: "/picks/confidence-scores", label: "Confidence scores" }],
  },
  {
    href: "/props",
    title: "Props Intelligence",
    eyebrow: "Player props",
    badge: "Coming soon",
    badgeColor: "text-gray-400 border-gray-700 bg-gray-900/40",
    accent: "from-violet-500/15 to-purple-600/10",
    description: "Player props graded on role stability, line value, matchup fit, and volatility — not just hit rate. Props markets price slower. The edge is real.",
    links: [],
  },
  {
    href: "/market-gravity",
    title: "Market Gravity",
    eyebrow: "Market intelligence",
    badge: "Preview",
    badgeColor: "text-yellow-300 border-yellow-800/50 bg-yellow-950/30",
    accent: "from-orange-500/15 to-yellow-600/10",
    description: "Line movement, book disagreement, and market depth scored across four inputs. The difference between informative movement and noise.",
    links: [{ href: "/market-gravity/line-movement", label: "Line movement" }, { href: "/market-gravity/book-disagreement", label: "Book disagreement" }],
  },
  {
    href: "/fantasy",
    title: "Fantasy War Room",
    eyebrow: "Fantasy",
    badge: "Preview",
    badgeColor: "text-yellow-300 border-yellow-800/50 bg-yellow-950/30",
    accent: "from-green-500/15 to-emerald-600/10",
    description: "Start/sit decisions, usage trends, and scheme fit — structured fantasy intelligence on the same tiered evidence as picks.",
    links: [{ href: "/fantasy/usage-trends", label: "Usage trends" }, { href: "/fantasy/scheme-fit", label: "Scheme fit" }],
  },
  {
    href: "/brain",
    title: "Research Brain",
    eyebrow: "AI analyst",
    badge: "Beta",
    badgeColor: "text-pink-300 border-pink-800/50 bg-pink-950/30",
    accent: "from-pink-500/15 to-rose-600/10",
    description: "Structured sports Q&A backed by the Evidence Vault. Cites source tiers. Refuses to speculate when evidence is insufficient.",
    links: [{ href: "/brain/how-brain-works", label: "How it works" }, { href: "/brain/evidence-vault-explained", label: "Evidence Vault" }],
  },
  {
    href: "/academy",
    title: "Galaxy Academy",
    eyebrow: "Education",
    badge: "New",
    badgeColor: "text-indigo-300 border-indigo-700/50 bg-indigo-950/30",
    accent: "from-indigo-500/15 to-blue-600/10",
    description: "From odds basics to CLV, bankroll theory, and the No-Bet Doctrine. Three tracks: Foundation, Signal, Edge. Learn the framework behind every pick.",
    links: [{ href: "/academy", label: "Start learning" }],
  },
] as const;

function IntelligenceSurfaces(): JSX.Element {
  const [featured, ...rest] = SURFACES;
  return (
    <section className="border-y border-mineral bg-gray-900/20 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="The platform"
          title="Seven intelligence surfaces."
          meta="One engine. Every surface backed by the same tiered evidence and publish-gate rules."
        />

        {/* Featured card — Today's Board */}
        <Link
          href={featured.href}
          className="group mt-10 flex flex-col overflow-hidden rounded-2xl border border-mineral bg-gray-900/60 transition-all hover:border-cyan-800/50 hover:shadow-lg hover:shadow-cyan-900/20 sm:flex-row"
        >
          <div className={`flex-1 bg-gradient-to-br ${featured.accent} p-8 sm:p-10`}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">{featured.eyebrow}</span>
              <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${featured.badgeColor}`}>{featured.badge}</span>
            </div>
            <h3 className="mt-4 text-3xl font-black text-white group-hover:text-cyan-100 sm:text-4xl">{featured.title}</h3>
            <p className="mt-4 max-w-lg text-base leading-7 text-gray-400">{featured.description}</p>
            <span className="mt-6 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.16em] text-ion-blue group-hover:text-cyan-300">
              Open today&apos;s board <span aria-hidden>→</span>
            </span>
          </div>
          <div className="hidden w-72 items-center justify-center border-l border-mineral bg-carbon/60 p-8 sm:flex">
            <div className="space-y-3 text-center">
              {["Scored", "Gated", "Published"].map((s) => (
                <div key={s} className="rounded border border-mineral bg-gray-950/80 px-4 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">{s}</p>
                  <p className="mt-1 text-xl font-bold text-white">—</p>
                </div>
              ))}
            </div>
          </div>
        </Link>

        {/* 3-col grid for remaining surfaces */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map(({ href, title, eyebrow, badge, badgeColor, accent, description, links }) => (
            <article key={href} className={`group flex flex-col overflow-hidden rounded-xl border border-mineral bg-gradient-to-br ${accent} bg-gray-900/50 p-6 transition-all hover:border-gray-600`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">{eyebrow}</span>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${badgeColor}`}>{badge}</span>
              </div>
              <h3 className="mt-3 text-xl font-bold text-white">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">{description}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {links.map(({ href: lhref, label }) => (
                  <Link key={lhref} href={lhref} className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500 hover:text-gray-300">
                    {label} →
                  </Link>
                ))}
                <Link href={href} className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-ion-blue hover:text-cyan-300">
                  Open →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResponsibleBand(): JSX.Element {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold text-white">Research first. Limits first.</h2>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          Galaxy Sports Edge is sportsbook research, not sportsbook hype. Treat the math as one input in a disciplined decision.
        </p>
        <RiskDisclosure variant="compact" className="mt-5 text-center" />
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta: string;
}): JSX.Element {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">{eyebrow}</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h2>
      </div>
      <p className="max-w-xs text-sm text-gray-500 sm:text-right">{meta}</p>
    </div>
  );
}

function EmptyPicksState(): JSX.Element {
  return (
    <div data-testid="homepage-empty-picks-state" className="hidden">
      No picks are fabricated for the homepage.
    </div>
  );
}
