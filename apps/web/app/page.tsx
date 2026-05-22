import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { loadBoardState, type BoardStateData, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { isDemoPicksEnabled, isStubMode } from "@sports/db";

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
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-950 text-gray-100">
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
        <ThreeQuestions />
        <MethodologySection />
        <ResponsibleBand />
        <EmptyPicksState />
      </main>
      <Footer />
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
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
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
    <section aria-label="Live board state" className="border-b border-gray-800 bg-gray-950">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
        {stateRows.map(([label, value]) => (
          <div key={label} className="min-h-14 border border-gray-800 bg-gray-900/55 px-3 py-2">
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
    <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(244,114,182,0.10),transparent_28%),#030712] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">Galaxy Sports Edge</p>
        <h1 className="mt-5 max-w-4xl break-words text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
          We&apos;re not AI. We&apos;re math you can read.
        </h1>
        <p className="mt-6 max-w-2xl break-words text-lg leading-8 text-gray-300">
          Deterministic sports betting research with the factor breakdown attached.
          We post when the model finds edge. Most days that is fewer than five picks.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/board" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
            See today&apos;s board
          </Link>
          <Link href="/methodology" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300">
            Read the methodology
          </Link>
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
    <article className="border border-gray-800 bg-gray-900/70 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">{lane}</p>
      <div className="mt-4 flex flex-col gap-3">
        {rows.length > 0 ? rows.slice(0, 4).map((row) => (
          <div key={row.id} className="border border-gray-800 bg-gray-950/45 p-3">
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
    <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="PREVIEW MODE" title="Public Ledger preview" meta="Six recent settlements" />
        <div className="mt-8 overflow-hidden border border-gray-800">
          {LEDGER.map(([pick, result, note]) => (
            <div key={pick} className="grid gap-3 border-b border-gray-800 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_2fr]">
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
        <div className="mt-8 border border-gray-800 bg-gray-900/60 p-5">
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
    <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow={isSampleData ? "PREVIEW MODE" : "LIVE BOARD"}
          title="The Pass List"
          meta="Evaluated, then withheld"
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {passes.length > 0 ? passes.slice(0, 6).map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 border border-gray-800 bg-gray-950/60 px-4 py-4">
              <span className="font-semibold text-white">{row.matchup}</span>
              <span className="text-right text-sm text-gray-400">{row.reason}</span>
            </div>
          )) : (
            <p className="border border-gray-800 bg-gray-950/60 px-4 py-5 text-sm text-gray-500 sm:col-span-2">
              No passes recorded for this slate yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function StackSection(): JSX.Element {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="The Stack" title="Read the board. Score the math. Gate the slate." meta="10+ factors, 14 books, 30-minute refresh cycle" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STACK.map(([title, body], index) => (
            <article key={title} className="border border-gray-800 bg-gray-900/65 p-6">
              <span className="font-mono text-xs text-cyan-300">0{index + 1}</span>
              <h3 className="mt-3 text-xl font-bold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreeQuestions(): JSX.Element {
  return (
    <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Three questions" title="What changed, what did we skip, what happened after?" meta="Touch-friendly comparison" />
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {QUESTIONS.map(([question, answer]) => (
            <article key={question} className="min-h-44 border border-gray-800 bg-gray-950/70 p-5">
              <h3 className="text-lg font-bold text-white">{question}</h3>
              <p className="mt-4 text-sm leading-6 text-gray-400">{answer}</p>
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
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>
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
