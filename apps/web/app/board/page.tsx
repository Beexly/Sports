import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { loadBoardState, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BRAND_COLORS } from "@/lib/brand";
import { Reveal } from "@/components/motion/reveal";

const BOARD_TITLE = "Today's Board - Galaxy Sports Edge";
const BOARD_DESCRIPTION =
  "Live board state, published picks, gated games, and calibration status from the Galaxy Sports Edge scoring pipeline.";

export const metadata: Metadata = {
  title: BOARD_TITLE,
  description: BOARD_DESCRIPTION,
  alternates: { canonical: "/board" },
  openGraph: {
    title: BOARD_TITLE,
    description: BOARD_DESCRIPTION,
    url: "/board",
    type: "website",
    siteName: "Galaxy Sports Edge",
  },
  twitter: { card: "summary_large_image", title: BOARD_TITLE, description: BOARD_DESCRIPTION },
};

// Reads live board state per request; never statically prerendered.
export const dynamic = "force-dynamic";

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

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
    <div
      className="relative isolate min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack, color: "white" }}
    >
      <GeneratedPlate assetId="board-command" className="absolute inset-0 -z-10 opacity-10" />
      <Nav />

      {/* ── Cinematic hero ── */}
      <section
        className="relative overflow-hidden px-4 pb-14 pt-20 sm:px-6 sm:pt-24 lg:px-8"
        style={{ borderBottom: `1px solid ${BRAND_COLORS.orbitalCyan}15` }}
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${BRAND_COLORS.orbitalCyan}18 0%, transparent 70%)`,
          }}
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Today&apos;s Board
                </p>
                <h1 className="mt-4 max-w-4xl break-words font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Scored, published, and passed.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-400">
                  The board shows what is being evaluated now, what cleared the gate today,
                  and what was evaluated without becoming a pick.
                </p>
              </div>
              <Link
                href="/methodology"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-3 text-sm font-bold transition-colors hover:bg-white/[0.04]"
                style={{
                  border: `1px solid ${BRAND_COLORS.orbitalCyan}40`,
                  color: BRAND_COLORS.orbitalCyan,
                }}
              >
                Read methodology
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {dbUnreachable && (
          <div
            className="flex flex-col gap-2 px-4 py-3 text-sm text-ink-300 sm:flex-row sm:items-center"
            style={{ border: "1px solid rgba(255,100,112,0.30)", background: "rgba(255,100,112,0.06)" }}
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-alert">
              Data store unreachable
            </span>
            <span className="break-words sm:ml-3">
              The local database did not respond, so this board is showing an empty nonblocking state.
            </span>
          </div>
        )}

        {isSampleData && (
          <div
            className="flex flex-col gap-2 px-4 py-3 text-sm text-ink-300 sm:flex-row sm:items-center"
            style={{
              border: `1px solid ${BRAND_COLORS.orbitalCyan}30`,
              background: `${BRAND_COLORS.orbitalCyan}08`,
            }}
          >
            <span
              className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: BRAND_COLORS.orbitalCyan }}
            >
              Preview mode
            </span>
            <span className="break-words sm:ml-3">
              Showing deterministic sample board data while live ingestion is unavailable.
            </span>
          </div>
        )}

        <Reveal>
          <section
            aria-label="Board state"
            className="grid gap-px overflow-hidden rounded-ds-md sm:grid-cols-2 lg:grid-cols-6"
            style={{ border: `1px solid ${BRAND_COLORS.orbitalCyan}14`, background: `${BRAND_COLORS.orbitalCyan}08` }}
          >
            <StateTile label="Sports watched" value={String(state.sportsWatched)} />
            <StateTile label="Books polled" value={String(state.booksPolled)} />
            <StateTile label="Open picks" value={String(state.openPicks)} />
            <StateTile label="Gated today" value={String(state.gatedToday)} />
            <StateTile label="Last refresh" value={timeLabel(state.lastRefresh)} />
            <StateTile label="Model" value={state.modelVersion} />
          </section>
        </Reveal>

        <section className="grid gap-4 lg:grid-cols-3">
          <BoardLane title="Scoring Now" rows={state.scoringNow} empty="No games are currently scoring." variant="scoring" />
          <BoardLane title="Published Today" rows={state.publishedToday} empty="No picks have cleared today." variant="published" />
          <BoardLane title="Gated Today" rows={state.gatedTodayRows} empty="No passed games logged yet." variant="gated" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Reveal>
            <div
              className="p-5"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(8,6,20,0.6)",
                borderRadius: "var(--radius-ds-lg, 16px)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    Pass List
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Evaluated without publishing</h2>
                </div>
                <span className="font-mono text-xs text-ink-500">{passesResult.data.date}</span>
              </div>
              <div
                className="mt-5 overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px" }}
              >
                {passes.length > 0 ? (
                  passes.map((row, i) => (
                    <PassListItem
                      key={row.id}
                      row={row}
                      divider={i < passes.length - 1}
                    />
                  ))
                ) : (
                  <p className="px-4 py-5 text-sm text-ink-500">No passes recorded for this slate yet.</p>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div
              className="p-5"
              style={{
                border: `1px solid ${BRAND_COLORS.softUltraviolet}25`,
                background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}08 0%, rgba(8,6,20,0.7) 100%)`,
                borderRadius: "var(--radius-ds-lg, 16px)",
              }}
            >
              <div
                className="mb-4 h-0.5 w-12 rounded-full"
                style={{ background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet}, transparent)` }}
                aria-hidden="true"
              />
              <p
                className="font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                Live Calibration
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {calibration.isCollecting ? "Building history" : "Calibration sample"}
              </h2>
              <p className="mt-4 text-sm leading-6 text-ink-400">{calibration.publicMessage}</p>
              <dl className="mt-6 grid grid-cols-2 gap-3">
                <Metric label="Sample" value={String(calibration.sampleSize)} />
                <Metric label="Brier" value={calibration.brierScore === null ? "N/A" : String(calibration.brierScore)} />
              </dl>
              <p className="mt-5 text-xs text-ink-500">Updated {timeLabel(calibration.updatedAt)}</p>
            </div>
          </Reveal>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}

type LaneVariant = "scoring" | "published" | "gated";

const LANE_CONFIG: Record<LaneVariant, { color: string; dotClass: string }> = {
  scoring:   { color: BRAND_COLORS.orbitalCyan,     dotClass: "bg-orbital-cyan animate-live-pulse" },
  published: { color: "#4ADE80",                    dotClass: "bg-verify" },
  gated:     { color: BRAND_COLORS.ionMagenta,      dotClass: "bg-plasma" },
};

function StateTile({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div
      className="min-h-16 px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
      style={{ background: BRAND_COLORS.obsidianBlack }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">{label}</p>
      <p className="mt-1 break-words text-lg font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function BoardLane({
  title,
  rows,
  empty,
  variant,
}: {
  title: string;
  rows: BoardStateRow[];
  empty: string;
  variant: LaneVariant;
}): JSX.Element {
  const cfg = LANE_CONFIG[variant];
  return (
    <Reveal>
      <section
        className="rounded-xl p-4 transition-shadow"
        style={{
          border: `1px solid ${cfg.color}20`,
          background: "rgba(8,6,20,0.55)",
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} aria-hidden="true" />
          <h2
            className="font-mono text-[10px] uppercase tracking-[0.2em]"
            style={{ color: cfg.color }}
          >
            {title}
          </h2>
          <span
            className="ml-auto font-mono text-xs tabular-nums"
            style={{ color: cfg.color }}
          >
            {rows.length}
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {rows.length > 0 ? rows.map((row) => <BoardRowItem key={row.id} row={row} variant={variant} />) : (
            <p className="py-4 text-center text-xs text-ink-500">{empty}</p>
          )}
        </div>
      </section>
    </Reveal>
  );
}

function BoardRowItem({ row, variant }: { row: BoardStateRow; variant: LaneVariant }): JSX.Element {
  const cfg = LANE_CONFIG[variant];
  return (
    <article
      className="rounded-lg p-3 transition-colors hover:bg-white/[0.03]"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,6,20,0.55)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{row.matchup}</h3>
          <p className="mt-0.5 truncate text-xs text-ink-500">{row.sport} · {row.market}</p>
        </div>
        <span
          className="shrink-0 font-mono text-xs font-semibold tabular-nums"
          style={{ color: cfg.color }}
        >
          {row.edgeIndex === null ? "EI —" : `EI ${row.edgeIndex}`}
        </span>
      </div>
      {row.gateReason && (
        <p className="mt-2 text-xs leading-relaxed text-ink-400">{row.gateReason}</p>
      )}
      <Link
        href={`/room/${row.gameId}`}
        className="mt-2.5 inline-flex text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ color: cfg.color }}
      >
        Open room →
      </Link>
    </article>
  );
}

function PassListItem({ row, divider }: { row: PassListRow; divider: boolean }): JSX.Element {
  return (
    <div
      className="grid gap-2 px-4 py-3 transition-colors hover:bg-white/[0.03] sm:grid-cols-[1fr_auto_1.4fr]"
      style={divider ? { borderBottom: "1px solid rgba(255,255,255,0.06)" } : undefined}
    >
      <span>
        <Link
          href={`/room/${row.gameId}`}
          className="font-semibold text-white transition-colors hover:text-orbital-cyan"
        >
          {row.matchup}
        </Link>
      </span>
      <span
        className="font-mono text-xs tabular-nums"
        style={{ color: BRAND_COLORS.orbitalCyan }}
      >
        {row.edgeIndex === null ? "EI —" : `EI ${row.edgeIndex}`}
      </span>
      <span className="text-sm text-ink-400 sm:text-right">{row.reason}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div
      className="rounded-lg p-3"
      style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(8,6,20,0.5)" }}
    >
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold tabular-nums text-white">{value}</dd>
    </div>
  );
}
