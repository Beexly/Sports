import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { loadBoardState, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

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
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-obsidian text-ion-white">
      <GeneratedPlate assetId="board-command" className="-z-10 opacity-20" />
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {dbUnreachable && (
          <div className="flex flex-col gap-2 border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-ion-1 sm:flex-row sm:items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-alert">
              Data store unreachable
            </span>
            <span className="break-words sm:ml-3">
              The local database did not respond, so this board is showing an empty nonblocking state.
            </span>
          </div>
        )}

        {isSampleData && (
          <div className="flex flex-col gap-2 border border-ion-blue/40 bg-ion-blue/10 px-4 py-3 text-sm text-ion-1 sm:flex-row sm:items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ion-blue">
              Preview mode
            </span>
            <span className="break-words sm:ml-3">
              Showing deterministic sample board data while live ingestion is unavailable.
            </span>
          </div>
        )}

        <section className="border-b border-titanium pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Today&apos;s Board</p>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-4xl break-words text-3xl font-black tracking-tight text-white sm:text-5xl">
                Scored, published, and passed.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ion-2">
                The board shows what is being evaluated now, what cleared the gate today,
                and what was evaluated without becoming a pick.
              </p>
            </div>
            <Link
              href="/methodology"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-titanium px-5 py-3 text-sm font-bold text-ion-white hover:border-ion-blue"
            >
              Read methodology
            </Link>
          </div>
        </section>

        <section aria-label="Board state" className="grid gap-px sm:grid-cols-2 lg:grid-cols-6">
          <StateTile label="Sports watched" value={String(state.sportsWatched)} />
          <StateTile label="Books polled" value={String(state.booksPolled)} />
          <StateTile label="Open picks" value={String(state.openPicks)} />
          <StateTile label="Gated today" value={String(state.gatedToday)} />
          <StateTile label="Last refresh" value={timeLabel(state.lastRefresh)} />
          <StateTile label="Model" value={state.modelVersion} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <BoardLane title="Scoring Now" rows={state.scoringNow} empty="No games are currently scoring." variant="scoring" />
          <BoardLane title="Published Today" rows={state.publishedToday} empty="No picks have cleared today." variant="published" />
          <BoardLane title="Gated Today" rows={state.gatedTodayRows} empty="No passed games logged yet." variant="gated" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="border border-titanium bg-carbon/45 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">Pass List</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Evaluated without publishing</h2>
              </div>
              <span className="font-mono text-xs text-ion-3">{passesResult.data.date}</span>
            </div>
            <div className="mt-5 divide-y divide-titanium border border-titanium">
              {passes.length > 0 ? (
                passes.map((row) => <PassListItem key={row.id} row={row} />)
              ) : (
                <p className="px-4 py-5 text-sm text-ion-3">No passes recorded for this slate yet.</p>
              )}
            </div>
          </div>

          <div className="border border-titanium bg-carbon/45 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">Live Calibration</p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {calibration.isCollecting ? "Building history" : "Calibration sample"}
            </h2>
            <p className="mt-4 text-sm leading-6 text-ion-2">{calibration.publicMessage}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <Metric label="Sample" value={String(calibration.sampleSize)} />
              <Metric label="Brier" value={calibration.brierScore === null ? "N/A" : String(calibration.brierScore)} />
            </dl>
            <p className="mt-5 text-xs text-ion-3">Updated {timeLabel(calibration.updatedAt)}</p>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}

type LaneVariant = "scoring" | "published" | "gated";

const LANE_STYLES: Record<LaneVariant, { accent: string; border: string; dot: string; label: string }> = {
  scoring:   { accent: "text-ion-blue",  border: "border-ion-blue/20",  dot: "bg-ion-blue animate-live-pulse", label: "text-ion-blue" },
  published: { accent: "text-verify",    border: "border-verify/20",    dot: "bg-verify",                      label: "text-verify" },
  gated:     { accent: "text-plasma",    border: "border-plasma/20",    dot: "bg-plasma",                      label: "text-plasma" },
};

function StateTile({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="min-h-16 rounded-lg border border-titanium bg-carbon/60 px-3 py-2.5 transition-colors hover:border-ion-blue/30">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</p>
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
  const s = LANE_STYLES[variant];
  return (
    <section className={`rounded-xl border ${s.border} bg-carbon/45 p-4 transition-shadow hover:shadow-[0_0_20px_rgba(0,0,0,0.4)]`}>
      <div className="mb-4 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
        <h2 className={`font-mono text-[10px] uppercase tracking-[0.2em] ${s.label}`}>
          {title}
        </h2>
        <span className={`ml-auto font-mono text-xs tabular-nums ${s.accent}`}>{rows.length}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.length > 0 ? rows.map((row) => <BoardRowItem key={row.id} row={row} variant={variant} />) : (
          <p className="py-4 text-center text-xs text-ion-3">{empty}</p>
        )}
      </div>
    </section>
  );
}

function BoardRowItem({ row, variant }: { row: BoardStateRow; variant: LaneVariant }): JSX.Element {
  const s = LANE_STYLES[variant];
  return (
    <article className={`rounded-lg border border-titanium/60 bg-obsidian/55 p-3 transition-colors hover:border-${variant === "scoring" ? "ion-blue" : variant === "published" ? "verify" : "plasma"}/30`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{row.matchup}</h3>
          <p className="mt-0.5 truncate text-xs text-ion-3">{row.sport} · {row.market}</p>
        </div>
        <span className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${s.accent}`}>
          {row.edgeIndex === null ? "EI —" : `EI ${row.edgeIndex}`}
        </span>
      </div>
      {row.gateReason && (
        <p className="mt-2 text-xs leading-relaxed text-ion-2">{row.gateReason}</p>
      )}
      <Link
        href={`/room/${row.gameId}`}
        className={`mt-2.5 inline-flex text-xs font-semibold ${s.accent} transition-opacity hover:opacity-80`}
      >
        Open room →
      </Link>
    </article>
  );
}

function PassListItem({ row }: { row: PassListRow }): JSX.Element {
  return (
    <div className="grid gap-2 px-4 py-3 transition-colors hover:bg-titanium/10 sm:grid-cols-[1fr_auto_1.4fr]">
      <span>
        <Link href={`/room/${row.gameId}`} className="font-semibold text-white transition-colors hover:text-ion-blue">
          {row.matchup}
        </Link>
      </span>
      <span className="font-mono text-xs tabular-nums text-ion-blue">
        {row.edgeIndex === null ? "EI —" : `EI ${row.edgeIndex}`}
      </span>
      <span className="text-sm text-ion-2 sm:text-right">{row.reason}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-titanium bg-obsidian/55 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</dt>
      <dd className="mt-1 text-lg font-bold tabular-nums text-white">{value}</dd>
    </div>
  );
}
