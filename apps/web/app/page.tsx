import type { Metadata } from "next";
import Link from "next/link";
import { CalibrationCurve } from "@/components/home/calibration-curve";
import { InteractiveGalaxy } from "@/components/hero/interactive-galaxy";
import { Reveal } from "@/components/motion/reveal";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { loadBoardState, type BoardStateData, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { db, isDemoPicksEnabled, isStubMode } from "@sports/db";

// Reads live board state per request; never statically prerendered.
export const dynamic = "force-dynamic";

// Homepage is the most-linked, highest-priority URL. Give it bespoke, proof-led
// SEO copy instead of inheriting the generic brand default from the root layout.
// (Title flows through the layout's "%s | Galaxy Sports Edge" template.)
export const metadata: Metadata = {
  title: "Graded in Public — Calibrated Sports Predictions",
  description:
    "Galaxy Sports Edge shows the full reasoning behind every pick, grades them in public, and posts its losses. Calibrated confidence, not tout hype. Start free.",
  alternates: { canonical: "/" },
};

type CalibrationData = Awaited<ReturnType<typeof loadPublicCalibrationReport>>["data"];

interface HomeAutopsy {
  readonly pickId: string;
  readonly headline: string;
  readonly matchup: string;
  readonly selection: string;
  readonly sport: string;
  readonly processText: string;
  readonly outcomeText: string;
  readonly learnedText: string;
  readonly status: "PUBLISHED" | "PENDING_REVIEW";
  readonly settledAt: string;
}

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "settled";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

async function loadHomepageAutopsy(): Promise<HomeAutopsy | null> {
  const pick = await db.pick
    .findFirst({
      where: {
        result: "LOSS",
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: {
        game: { include: { sport: { select: { name: true } } } },
        lossAutopsy: true,
        signalSnapshot: true,
      },
      orderBy: { settledAt: "desc" },
    })
    .catch(() => null);

  if (!pick) return null;

  const publishedAutopsy =
    pick.lossAutopsy?.isPublic && pick.lossAutopsy.status === "PUBLISHED"
      ? pick.lossAutopsy
      : null;
  const activeSignals = [
    pick.signalSnapshot?.hadLineMovementSignal ? "line movement" : null,
    pick.signalSnapshot?.hadRestSignal ? "rest" : null,
    pick.signalSnapshot?.hadScheduleSignal ? "schedule" : null,
  ].filter((item): item is string => item !== null);
  const snapshotText = pick.signalSnapshot
    ? `${pick.signalSnapshot.bookmakerCount} books, ${Math.round(
        pick.signalSnapshot.dataQualityScore
      )} data quality, active signals: ${activeSignals.length > 0 ? activeSignals.join(", ") : "odds"}.`
    : "Original signal snapshot is pending backfill.";

  return {
    pickId: pick.id,
    headline: publishedAutopsy?.headline ?? `Autopsy pending for ${pick.selection}`,
    matchup: `${pick.game.awayTeamName} at ${pick.game.homeTeamName}`,
    selection: pick.selection,
    sport: pick.game.sport.name,
    processText: publishedAutopsy?.whatWeSaw ?? snapshotText,
    outcomeText:
      publishedAutopsy?.whatHappened ??
      "The pick settled as a loss. A full operator-written autopsy is required before we publish a cause.",
    learnedText:
      publishedAutopsy?.whatWeLearned ??
      "The original reasoning stays attached while review is pending.",
    status: publishedAutopsy ? "PUBLISHED" : "PENDING_REVIEW",
    settledAt: (pick.settledAt ?? pick.generatedAt).toISOString(),
  };
}

export default async function HomePage(): Promise<JSX.Element> {
  const [stateResult, passesResult, calibrationResult, autopsy] = await Promise.all([
    loadBoardState(),
    loadBoardPasses(),
    loadPublicCalibrationReport(),
    loadHomepageAutopsy(),
  ]);
  const demoActive = isStubMode() && isDemoPicksEnabled();
  const surfaceSampleActive =
    stateResult.meta.isSampleData ||
    passesResult.meta.isSampleData ||
    calibrationResult.meta.isSampleData;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-carbon text-ion">
      <Nav />
      <main>
        {(demoActive || surfaceSampleActive) && <SampleDataBanner />}
        <Hero state={stateResult.data} />
        <EngineCenterpiece
          state={stateResult.data}
          passes={passesResult.data.passes}
          calibration={calibrationResult.data}
          autopsy={autopsy}
          isSampleData={surfaceSampleActive}
        />
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
      className="surface-card mx-auto mt-4 flex max-w-7xl flex-col gap-2 px-4 py-3 text-sm text-ion sm:flex-row sm:items-center"
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orbital-cyan">
        Preview mode
      </span>
      <span>
        The board examples are deterministic samples used while live wiring is
        completed. They never settle and never produce a verified win-rate claim.
      </span>
    </div>
  );
}

function Hero({ state }: { state: BoardStateData }): JSX.Element {
  const modelVersion = state.modelVersion.trim();
  const telemetryRows: Array<readonly [string, string]> = [
    ["Sports watched", String(state.sportsWatched)],
    ["Books polled", String(state.booksPolled)],
    ["Open picks", String(state.openPicks)],
    ["Last refresh", timeLabel(state.lastRefresh)],
  ];
  if (modelVersion.length > 0 && modelVersion.toLowerCase() !== "unknown") {
    telemetryRows.push(["Model", modelVersion]);
  }

  return (
    <section className="relative isolate min-h-[88vh] overflow-hidden border-b border-mineral bg-carbon px-4 sm:px-6 lg:px-8">
      <InteractiveGalaxy />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,var(--carbon)_0%,rgba(13,17,23,0.84)_32%,rgba(13,17,23,0.20)_72%,rgba(13,17,23,0.58)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32 bg-[linear-gradient(180deg,transparent,var(--carbon))]" />

      <div className="relative z-[2] mx-auto flex min-h-[88vh] w-full max-w-7xl flex-col justify-center py-24">
        <Reveal duration={880} distance={4}>
          <p className="eyebrow text-ion-1">
            GALAXY SPORTS EDGE / SPORTS INTELLIGENCE
          </p>
        </Reveal>

        <Reveal delay={80} duration={880} distance={4}>
          <div className="relative mt-5 max-w-5xl">
            <span
              className="pointer-events-none absolute -inset-x-6 inset-y-4 -z-10 bg-[radial-gradient(ellipse_at_34%_48%,rgba(255,45,214,0.16),rgba(0,229,255,0.08)_38%,transparent_72%)] blur-2xl"
              aria-hidden="true"
            />
            <h1
              aria-label="Math you can read."
              data-testid="homepage-arch-headline"
              className="text-balance font-arch text-[clamp(2.5rem,9vw,8rem)] font-black uppercase leading-[0.86] tracking-normal text-ion-white drop-shadow-[0_0_34px_rgba(255,45,214,0.18)]"
            >
              <span>Math you can read</span>
              <span className="text-plasma">.</span>
            </h1>
          </div>
        </Reveal>

        <Reveal delay={160} duration={880} distance={4}>
          <p className="mt-7 max-w-2xl text-pretty font-sans text-[17px] leading-[1.55] text-ion sm:text-xl">
            Deterministic sports research with odds, market depth, schedule
            context, and source freshness exposed before a pick reaches the board.
          </p>
        </Reveal>

        <Reveal delay={240} duration={880} distance={4}>
          <div
            aria-label="Live board telemetry"
            className="mt-10 w-full border-y border-mineral/80 py-4"
          >
            <div className="grid grid-cols-2 gap-y-4 sm:flex sm:min-w-max sm:items-stretch sm:gap-0">
              {telemetryRows.map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 border-mineral/70 px-4 odd:border-r sm:min-w-[9.5rem] sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0"
                >
                  <p className="eyebrow text-ion-2">{label}</p>
                  <p className="mt-2 font-numerals text-xl font-semibold tabular-nums text-orbital-cyan sm:text-2xl">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={320} duration={880} distance={4}>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/board" className="btn-primary min-h-11 px-6 py-3">
              See today&apos;s board
            </Link>
            <Link
              href="/methodology"
              className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-6 py-3 text-sm font-semibold text-ion transition-colors hover:border-orbital-cyan hover:text-ion-white"
            >
              Read the methodology
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function EngineCenterpiece({
  state,
  passes,
  calibration,
  autopsy,
  isSampleData,
}: {
  state: BoardStateData;
  passes: PassListRow[];
  calibration: CalibrationData;
  autopsy: HomeAutopsy | null;
  isSampleData: boolean;
}): JSX.Element {
  const evaluatedCount = state.publishedToday.length + state.gatedTodayRows.length;
  const publishedCount = state.publishedToday.length;
  const restraintCount = state.gatedTodayRows.length;
  const allRows = [...state.scoringNow, ...state.publishedToday, ...state.gatedTodayRows];
  const hasFreshRows =
    !isSampleData &&
    allRows.some((row) => Date.now() - new Date(row.updatedAt).getTime() < 45 * 60 * 1000);

  return (
    <section
      data-testid="engine-centerpiece"
      className="border-y border-mineral bg-carbon px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="engine-centerpiece-heading"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal duration={880} distance={8}>
          <div className="max-w-3xl">
            <p className="eyebrow text-ion-1">The engine in the open</p>
            <h2
              id="engine-centerpiece-heading"
              className="mt-4 font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl"
            >
              Watch it think, decline, and grade itself.
            </h2>
            <p className="mt-5 text-base leading-7 text-ion sm:text-lg">
              The public record is built around restraint. If evidence is thin,
              the engine waits. If a pick loses, the reasoning stays attached.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 flex flex-col gap-8 lg:gap-10">
          <Reveal duration={880} distance={10}>
            <GateBeat
              state={state}
              evaluatedCount={evaluatedCount}
              publishedCount={publishedCount}
              restraintCount={restraintCount}
              hasFreshRows={hasFreshRows}
              isSampleData={isSampleData}
            />
          </Reveal>

          <Reveal duration={880} distance={10}>
            <PassListBeat passes={passes} isSampleData={isSampleData} />
          </Reveal>

          <Reveal duration={880} distance={10}>
            <CalibrationBeat calibration={calibration} />
          </Reveal>

          <Reveal duration={880} distance={10}>
            <AutopsyBeat autopsy={autopsy} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function GateBeat({
  state,
  evaluatedCount,
  publishedCount,
  restraintCount,
  hasFreshRows,
  isSampleData,
}: {
  state: BoardStateData;
  evaluatedCount: number;
  publishedCount: number;
  restraintCount: number;
  hasFreshRows: boolean;
  isSampleData: boolean;
}): JSX.Element {
  const headline =
    evaluatedCount > 0
      ? `Evaluated ${evaluatedCount} / Published ${publishedCount} / ${restraintCount} did not clear.`
      : "Evaluated 0 / Published 0 / the engine is still watching.";

  return (
    <article className="surface-lifted overflow-hidden p-5 sm:p-7 lg:p-8" data-testid="engine-gate-beat">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <span className="eyebrow text-ion-1">01 / The Gate</span>
            {hasFreshRows ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-mineral px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
                <span className="live-dot" aria-hidden="true" />
                Fresh data
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 font-display text-3xl font-semibold leading-tight text-ion-white sm:text-5xl">
            It says no far more than it says yes.
          </h3>
          <p className="mt-5 font-numerals text-2xl font-semibold tabular-nums text-orbital-cyan sm:text-4xl">
            {headline}
          </p>
          <p className="mt-4 text-sm leading-6 text-ion-1">
            {isSampleData
              ? "Preview rows stay labeled as sample data. They do not settle and do not become performance claims."
              : "The gate is quiet until real evaluated rows exist. No row is invented to make the page feel busy."}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <GateLane lane="Scoring" rows={state.scoringNow} tone="cyan" />
          <GateLane lane="Published" rows={state.publishedToday} tone="plasma" />
          <GateLane lane="Gated" rows={state.gatedTodayRows} tone="mineral" />
        </div>
      </div>
    </article>
  );
}

function GateLane({
  lane,
  rows,
  tone,
}: {
  lane: string;
  rows: BoardStateRow[];
  tone: "cyan" | "plasma" | "mineral";
}): JSX.Element {
  const accent =
    tone === "plasma"
      ? "text-plasma"
      : tone === "cyan"
        ? "text-orbital-cyan"
        : "text-ion-1";

  return (
    <div className="surface-card min-h-64 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${accent}`}>{lane}</p>
        <span className="font-numerals text-sm tabular-nums text-ion-1">{rows.length}</span>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {rows.length > 0 ? (
          rows.slice(0, 3).map((row) => (
            <div key={row.id} className="border-l border-mineral pl-3">
              <p className="text-sm font-semibold leading-5 text-ion-white">{row.matchup}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ion-1">
                {row.sport} / {row.market}
              </p>
              <p className="mt-2 text-xs leading-5 text-ion-1">
                {row.edgeIndex === null ? "Edge Index pending" : `Edge Index ${row.edgeIndex}`}
              </p>
              {row.gateReason ? (
                <p className="mt-1 text-xs leading-5 text-ion">{row.gateReason}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-ion-1">
            {lane === "Published"
              ? "No pick has earned the plasma state."
              : "No rows in this lane right now."}
          </p>
        )}
      </div>
    </div>
  );
}

function PassListBeat({
  passes,
  isSampleData,
}: {
  passes: PassListRow[];
  isSampleData: boolean;
}): JSX.Element {
  return (
    <article className="surface-card p-5 sm:p-7 lg:p-8" data-testid="engine-pass-list-beat">
      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="eyebrow text-ion-1">02 / The Pass List</p>
          <h3 className="mt-4 font-display text-3xl font-semibold leading-tight text-ion-white sm:text-5xl">
            What we passed, and why.
          </h3>
          <p className="mt-5 font-editorial text-3xl italic leading-tight text-ion-white sm:text-5xl">
            No edge, no pick.
          </p>
          <p className="mt-4 text-sm leading-6 text-ion-1">
            {isSampleData
              ? "Sample passes are marked as preview evidence only."
              : "A quiet slate is not a content gap. It is the gate doing its job."}
          </p>
        </div>
        <div className="flex flex-col divide-y divide-mineral">
          {passes.length > 0 ? (
            passes.slice(0, 6).map((row) => (
              <div key={row.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_0.9fr_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-ion-white">{row.matchup}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ion-1">
                    {row.sport} / {shortDate(row.evaluatedAt)}
                  </p>
                </div>
                <p className="font-mono text-xs leading-5 text-ion">{row.reason}</p>
                <p className="font-numerals text-sm tabular-nums text-orbital-cyan">
                  {row.edgeIndex === null ? "pending" : row.edgeIndex}
                </p>
              </div>
            ))
          ) : (
            <div className="surface-glass p-5">
              <p className="text-base font-semibold text-ion-white">The engine is watching.</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">
                Nothing has failed the publish gate yet because no real evaluated pass
                has been recorded for this slate.
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CalibrationBeat({ calibration }: { calibration: CalibrationData }): JSX.Element {
  const actualBuckets = calibration.buckets.filter((bucket) => bucket.sampleSize > 0);
  const collecting = calibration.sampleSize < 30;

  return (
    <article className="surface-lifted p-5 sm:p-7 lg:p-8" data-testid="engine-calibration-beat">
      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="eyebrow text-ion-1">03 / Calibration</p>
          <h3 className="mt-4 font-display text-3xl font-semibold leading-tight text-ion-white sm:text-5xl">
            We grade ourselves.
          </h3>
          <p className="mt-5 text-sm leading-6 text-ion">
            {calibration.publicMessage} The diagonal is perfect calibration:
            predicted confidence matching observed outcomes.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <MetricPill label="Settled canonical" value={String(calibration.sampleSize)} />
            <MetricPill label="Public floor" value="30" />
          </div>
          <p className="mt-4 text-sm leading-6 text-ion-1">
            {collecting
              ? `Calibration in progress - ${calibration.sampleSize} of 30 settled picks.`
              : "The curve is evidence, not a license to change the model. Proposals still require review."}
          </p>
        </div>

        <div className="surface-card p-4 sm:p-6">
          <CalibrationCurve
            points={calibration.buckets}
            sampleSize={calibration.sampleSize}
          />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {actualBuckets.length > 0 ? (
              actualBuckets.slice(0, 4).map((bucket) => (
                <div key={bucket.label} className="border border-mineral px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-1">
                    {bucket.label} / n={bucket.sampleSize}
                  </p>
                  <p className="mt-1 text-sm text-ion">
                    observed {percent(bucket.observedWinRate)} / predicted {percent(bucket.expectedWinRate)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-ion-1 sm:col-span-2">
                No reliability curve is drawn until real settled canonical picks exist.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function MetricPill({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-mineral px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-1">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold tabular-nums text-orbital-cyan">{value}</p>
    </div>
  );
}

function AutopsyBeat({ autopsy }: { autopsy: HomeAutopsy | null }): JSX.Element {
  return (
    <article className="surface-card p-5 sm:p-7 lg:p-8" data-testid="engine-autopsy-beat">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow text-ion-1">04 / The Autopsy</p>
          <h3 className="mt-4 font-display text-3xl font-semibold leading-tight text-ion-white sm:text-5xl">
            When we are wrong, we say so.
          </h3>
          <p className="mt-5 font-editorial text-3xl italic leading-tight text-ion-white sm:text-5xl">
            The receipt stays attached.
          </p>
          <p className="mt-4 text-sm leading-6 text-ion-1">
            Losses are not hidden inside a performance table. They become a
            review surface with process, outcome, and lesson separated.
          </p>
        </div>

        {autopsy ? (
          <div className="surface-lifted p-5">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ion-1">
              <span>{autopsy.sport}</span>
              <span>{shortDate(autopsy.settledAt)}</span>
              <span>{autopsy.status.replace(/_/g, " ")}</span>
            </div>
            <h4 className="mt-3 text-xl font-semibold text-ion-white">{autopsy.headline}</h4>
            <p className="mt-1 text-sm text-ion-1">{autopsy.matchup} / {autopsy.selection}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <AutopsyPanel label="Process" body={autopsy.processText} />
              <AutopsyPanel label="Outcome" body={autopsy.outcomeText} />
            </div>
            <p className="mt-4 text-sm leading-6 text-ion">{autopsy.learnedText}</p>
            <Link
              href={`/performance/losses/${autopsy.pickId}`}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-4 py-2 text-sm font-semibold text-ion transition-colors hover:border-orbital-cyan hover:text-ion-white"
            >
              Open the autopsy
            </Link>
          </div>
        ) : (
          <div className="surface-lifted p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-1">
              Collecting state
            </p>
            <h4 className="mt-3 text-xl font-semibold text-ion-white">The autopsy room is quiet.</h4>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <AutopsyPanel
                label="Process"
                body="No published, non-bootstrap pick has settled as a loss yet."
              />
              <AutopsyPanel
                label="Outcome"
                body="When one does, the original signal and the operator review appear here."
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-ion-1">
              Empty is an honest state. Nothing is staged to simulate self-grading.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

function AutopsyPanel({ label, body }: { label: string; body: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-eclipse/70 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">{label}</p>
      <p className="mt-3 text-sm leading-6 text-ion">{body}</p>
    </div>
  );
}

function ResponsibleBand(): JSX.Element {
  return (
    <section
      data-testid="homepage-responsible-close"
      className="relative isolate overflow-hidden bg-carbon px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="homepage-responsible-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-rule-fade" aria-hidden="true" />
      <div className="mx-auto max-w-7xl">
        <Reveal duration={880} distance={8}>
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow text-ion-1">Close / Responsible Intelligence</p>
            <blockquote className="mt-5 font-editorial text-4xl italic leading-[1.08] text-ion-white sm:text-6xl">
              The math can point. The decision stays yours.
            </blockquote>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ion sm:text-lg">
              Galaxy Sports Edge is sportsbook research, not sportsbook hype.
              Treat the model as one input in a disciplined decision.
            </p>
          </div>
        </Reveal>

        <Reveal duration={880} distance={8}>
          <div className="surface-lifted mx-auto mt-12 grid max-w-5xl gap-5 p-5 sm:p-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
                Research first / limits first
              </p>
              <h2
                id="homepage-responsible-heading"
                className="mt-3 text-2xl font-semibold text-ion-white"
              >
                The close is not a pitch. It is a boundary.
              </h2>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                Every route should leave the same impression: understand the
                signal, understand the uncertainty, and set limits before action.
              </p>
            </div>

            <div className="surface-card p-4">
              <RiskDisclosure
                variant="compact"
                includePastPerformance
                className="text-ion-1"
              />
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/methodology"
                  className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-4 py-2 text-sm font-semibold text-ion transition-colors hover:border-orbital-cyan hover:text-ion-white"
                >
                  Read the methodology
                </Link>
                <Link
                  href="/responsible-play"
                  className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-4 py-2 text-sm font-semibold text-ion transition-colors hover:border-orbital-cyan hover:text-ion-white"
                >
                  Set limits
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function EmptyPicksState(): JSX.Element {
  return (
    <div data-testid="homepage-empty-picks-state" className="hidden">
      No picks are fabricated for the homepage.
    </div>
  );
}
