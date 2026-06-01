import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { loadBoardState } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { LiveBoard } from "@/components/board/live-board";

export const metadata: Metadata = {
  title: "Today's Board - Galaxy Sports Edge",
  description:
    "Live board state, published picks, gated games, and calibration status from the Galaxy Sports Edge scoring pipeline.",
  alternates: { canonical: "/board" },
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

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-950 text-gray-100">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {isSampleData && (
          <div className="flex flex-col gap-2 border border-cyan-900 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100 sm:flex-row sm:items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              Preview mode
            </span>
            <span className="break-words sm:ml-3">
              Showing deterministic sample board data while live ingestion is unavailable.
            </span>
          </div>
        )}

        <section className="border-b border-gray-800 pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Today&apos;s Board</p>
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-4xl break-words text-3xl font-black tracking-tight text-white sm:text-5xl">
                Scored, published, and passed.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
                The board shows what is being evaluated now, what cleared the gate today,
                and what was evaluated without becoming a pick.
              </p>
            </div>
            <Link
              href="/methodology"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
            >
              Read methodology
            </Link>
          </div>
        </section>

        <LiveBoard initialData={state} initialIsSample={isSampleData} />

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="border border-gray-800 bg-gray-900/45 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">Pass List</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Evaluated without publishing</h2>
              </div>
              <span className="font-mono text-xs text-gray-500">{passesResult.data.date}</span>
            </div>
            <div className="mt-5 divide-y divide-gray-800 border border-gray-800">
              {passes.length > 0 ? (
                passes.map((row) => <PassListItem key={row.id} row={row} />)
              ) : (
                <p className="px-4 py-5 text-sm text-gray-500">No passes recorded for this slate yet.</p>
              )}
            </div>
          </div>

          <div className="border border-gray-800 bg-gray-900/45 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">Live Calibration</p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {calibration.isCollecting ? "Building history" : "Calibration sample"}
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-400">{calibration.publicMessage}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <Metric label="Sample" value={String(calibration.sampleSize)} />
              <Metric label="Brier" value={calibration.brierScore === null ? "N/A" : String(calibration.brierScore)} />
            </dl>
            <p className="mt-5 text-xs text-gray-500">Updated {timeLabel(calibration.updatedAt)}</p>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}

function PassListItem({ row }: { row: PassListRow }): JSX.Element {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_1.4fr]">
      <span>
        <Link href={`/room/${row.gameId}`} className="font-semibold text-white hover:text-cyan-100">
          {row.matchup}
        </Link>
      </span>
      <span className="font-mono text-xs text-cyan-200">{row.edgeIndex === null ? "EI N/A" : `EI ${row.edgeIndex}`}</span>
      <span className="text-sm text-gray-400 sm:text-right">{row.reason}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-gray-800 bg-gray-950/55 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}
