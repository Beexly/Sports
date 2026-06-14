import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { loadBoardState, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Command Board — Galaxy Sports Edge",
  description:
    "The live command console: what's scoring now, what cleared the gate today, what was held, the pass ledger, and live calibration — straight from the scoring pipeline.",
  alternates: { canonical: "/board" },
};

// Reads live board state per request; never statically prerendered.
export const dynamic = "force-dynamic";

const cyan = BRAND_COLORS.orbitalCyan;
const mag = BRAND_COLORS.ionMagenta;
const uv = BRAND_COLORS.softUltraviolet;

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Lane accent vocabulary — color = operational status. */
const LANES = {
  scoring: { hex: cyan, label: "Scoring Now", sub: "Evaluating live", empty: "No games are currently scoring." },
  published: { hex: mag, label: "Published Today", sub: "Cleared the gate", empty: "No picks have cleared today." },
  gated: { hex: uv, label: "Held Today", sub: "Evaluated, not published", empty: "No games held yet." },
} as const;

export default async function BoardPage(): Promise<JSX.Element> {
  const [stateResult, passesResult, calibrationResult] = await Promise.all([
    loadBoardState(),
    loadBoardPasses(),
    loadPublicCalibrationReport(),
  ]);

  const state = stateResult.data;
  const passes = passesResult.data.passes;
  const calibration = calibrationResult.data;
  const isSampleData =
    stateResult.meta.isSampleData ||
    passesResult.meta.isSampleData ||
    calibrationResult.meta.isSampleData;
  const dbUnreachable =
    stateResult.meta.dataError === "DB_UNREACHABLE" ||
    passesResult.meta.dataError === "DB_UNREACHABLE";

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-x-hidden bg-void text-ion-white">
      <GeneratedPlate assetId="board-command" className="-z-20 opacity-30" />
      <Atmosphere />
      <Nav />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        {dbUnreachable && (
          <div className="flex flex-col gap-2 rounded-xl border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-ion-white sm:flex-row sm:items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-alert">
              Data store unreachable
            </span>
            <span className="break-words text-ink-200 sm:ml-3">
              The local database did not respond, so the console is showing an empty nonblocking state.
            </span>
          </div>
        )}

        {isSampleData && (
          <div className="flex flex-col gap-2 rounded-xl border border-orbital-cyan/30 bg-ion-blue/10 px-4 py-3 text-sm text-ion-white sm:flex-row sm:items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orbital-cyan">
              Preview mode
            </span>
            <span className="break-words text-ink-200 sm:ml-3">
              Showing deterministic sample board data while live ingestion is unavailable.
            </span>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────── */}
        <section className="relative">
          <Reveal>
            <p className="eyebrow inline-flex items-center gap-2" style={{ color: cyan }}>
              <span className="live-dot" /> Command Board · Live
            </p>
          </Reveal>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Reveal delay={80}>
                <h1
                  className="max-w-3xl text-balance font-display text-white"
                  style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
                >
                  Scored, published, <span className="gse-editorial" style={{ fontSize: "1.06em" }}>and held</span>.
                </h1>
              </Reveal>
              <Reveal delay={150}>
                <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                  The console shows what the engine is evaluating right now, what cleared the
                  board, price, timing, and discipline checks today — and what was evaluated
                  without becoming a pick. Nothing hidden.
                </p>
              </Reveal>
            </div>
            <Reveal delay={210}>
              <Link
                href="/methodology"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-mineral px-5 py-3 text-sm font-bold text-ion-white transition-colors hover:border-orbital-cyan hover:text-orbital-cyan"
              >
                Read methodology
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ── Telemetry rail ─────────────────────────────────────── */}
        <Reveal delay={120}>
          <section
            aria-label="Board telemetry"
            className="relative grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-mineral bg-mineral/40 sm:grid-cols-3 lg:grid-cols-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.6) 30%, rgba(255,45,214,0.6) 70%, transparent)" }}
            />
            <Telemetry label="Sports watched" value={String(state.sportsWatched)} />
            <Telemetry label="Books polled" value={String(state.booksPolled)} />
            <Telemetry label="Cleared today" value={String(state.openPicks)} accent={mag} />
            <Telemetry label="Held today" value={String(state.gatedToday)} accent={uv} />
            <Telemetry label="Last refresh" value={timeLabel(state.lastRefresh)} live accent={cyan} />
            <Telemetry label="Model" value={state.modelVersion} mono />
          </section>
        </Reveal>

        {/* ── Operational lanes ──────────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-3">
          <BoardLane meta={LANES.scoring} rows={state.scoringNow} />
          <BoardLane meta={LANES.published} rows={state.publishedToday} />
          <BoardLane meta={LANES.gated} rows={state.gatedTodayRows} />
        </section>

        {/* ── Pass ledger + calibration ──────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-2xl border border-mineral bg-eclipse/50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow" style={{ color: uv }}>Pass ledger</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                  Evaluated without publishing
                </h2>
              </div>
              <span className="font-mono text-xs text-ink-400">{passesResult.data.date}</span>
            </div>
            <p className="mt-3 max-w-xl text-sm text-ink-300">
              Discipline is the product. Every game the engine looked at and chose not to
              publish is logged here with the reason — the receipts on restraint.
            </p>
            <div className="mt-5 overflow-hidden rounded-xl border border-mineral/70">
              {passes.length > 0 ? (
                <div className="divide-y divide-mineral/60">
                  {passes.map((row) => (
                    <PassListItem key={row.id} row={row} />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-ink-400">No passes recorded for this slate yet.</p>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-mineral bg-eclipse/50 p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
              style={{ background: `radial-gradient(circle, ${cyan}, transparent 70%)` }}
            />
            <p className="eyebrow" style={{ color: cyan }}>Live calibration</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white">
              {calibration.isCollecting ? "Building history" : "Calibration sample"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-300">{calibration.publicMessage}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <Instrument label="Sample" value={String(calibration.sampleSize)} />
              <Instrument
                label="Brier"
                value={calibration.brierScore === null ? "N/A" : String(calibration.brierScore)}
              />
            </dl>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
              Updated {timeLabel(calibration.updatedAt)}
            </p>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}

/* ── Presentational sub-components ────────────────────────────── */

function Telemetry({
  label,
  value,
  accent,
  live,
  mono,
}: {
  label: string;
  value: string;
  accent?: string;
  live?: boolean;
  mono?: boolean;
}): JSX.Element {
  return (
    <div className="min-h-20 bg-carbon px-4 py-4">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
        {live && <span className="live-dot" />}
        {label}
      </p>
      <p
        className={`mt-1.5 break-words text-2xl font-semibold ${mono ? "font-mono text-lg" : "font-display"}`}
        style={{ color: accent ?? BRAND_COLORS.ionWhite }}
      >
        {value}
      </p>
    </div>
  );
}

function BoardLane({
  meta,
  rows,
}: {
  meta: { hex: string; label: string; sub: string; empty: string };
  rows: BoardStateRow[];
}): JSX.Element {
  return (
    <section
      className="flex flex-col rounded-2xl border border-mineral bg-eclipse/40"
      style={{ boxShadow: `inset 0 1px 0 0 ${meta.hex}22` }}
    >
      <header
        className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-mineral px-5 py-4"
        style={{ background: `linear-gradient(180deg, ${meta.hex}14, transparent)` }}
      >
        <div>
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: meta.hex }}>
            {meta.label}
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-400">{meta.sub}</p>
        </div>
        <span
          className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-mono text-xs font-bold"
          style={{ background: `${meta.hex}1a`, color: meta.hex }}
        >
          {rows.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {rows.length > 0 ? (
          rows.map((row) => <BoardRowItem key={row.id} row={row} hex={meta.hex} />)
        ) : (
          <p className="px-1 py-6 text-sm text-ink-500">{meta.empty}</p>
        )}
      </div>
    </section>
  );
}

function BoardRowItem({ row, hex }: { row: BoardStateRow; hex: string }): JSX.Element {
  return (
    <Link
      href={`/room/${row.gameId}`}
      className="group block rounded-xl border border-mineral/70 bg-carbon/80 p-4 transition-colors hover:border-[color:var(--lane)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbital-cyan"
      style={{ ["--lane" as string]: hex }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white group-hover:text-ion-white">{row.matchup}</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
            {row.sport} · {row.market}
          </p>
        </div>
        <span
          className="shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold"
          style={{ background: `${hex}14`, color: hex }}
        >
          {row.edgeIndex === null ? "EI —" : `EI ${row.edgeIndex}`}
        </span>
      </div>
      {row.confidence !== null && (
        <p className="mt-3 text-xs text-ink-400">Confidence label available on the pick view.</p>
      )}
      {row.gateReason && <p className="mt-3 text-sm leading-5 text-ink-300">{row.gateReason}</p>}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-300 group-hover:text-orbital-cyan">
        Open room
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

function PassListItem({ row }: { row: PassListRow }): JSX.Element {
  return (
    <div className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_1.4fr]">
      <Link
        href={`/room/${row.gameId}`}
        className="truncate font-semibold text-white transition-colors hover:text-orbital-cyan"
      >
        {row.matchup}
      </Link>
      <span className="font-mono text-xs text-soft-ultraviolet">
        {row.edgeIndex === null ? "EI —" : `EI ${row.edgeIndex}`}
      </span>
      <span className="text-sm text-ink-400 sm:text-right">{row.reason}</span>
    </div>
  );
}

function Instrument({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-mineral/70 bg-carbon/70 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">{label}</dt>
      <dd className="mt-1 font-display text-xl font-semibold text-white">{value}</dd>
    </div>
  );
}
