import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { loadBoardState, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { BoardHealthBadge } from "@/components/board/board-health-badge";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { SignalRoomAtmosphere } from "@/components/motion/signal-room-atmosphere";

export const metadata: Metadata = {
  title: "Today's Board",
  description:
    "Model-signal board, gated games, and calibration posture from Galaxy Sports Edge. Quiet when the slate is empty — free tools stay open. Not a PROVEN track record while eligibility is RED.",
  alternates: { canonical: "/board" },
  openGraph: {
    title: "Today's Board",
    description:
      "Model-signal board, gated games, and calibration posture from Galaxy Sports Edge. Quiet when the slate is empty — free tools stay open. Not a PROVEN track record while eligibility is RED.",
  },
};

// Reads live board state per request; never statically prerendered.
export const dynamic = "force-dynamic";

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function BoardPage(): Promise<JSX.Element> {
  // Entitlement resolves BEFORE the query so the refusal trail is withheld
  // server-side rather than fetched and then hidden — a logged-out visitor's
  // payload never contains it at all. The refusal ITSELF is unconditional and
  // rendered for everyone; see PassListItem.
  const session = await auth();
  const canSeeNoBetDetail = session?.user?.id
    ? (await getUserEntitlements(session.user.id)).canSeeNoBetDetail
    : false;

  const [stateResult, passesResult, calibrationResult] = await Promise.all([
    loadBoardState(),
    loadBoardPasses(new Date(), { includeNoBetDetail: canSeeNoBetDetail }),
    loadPublicCalibrationReport(),
  ]);

  const state = stateResult.data;
  const passes = passesResult.data.passes;
  const calibration = calibrationResult.data;
  const dbUnreachable =
    stateResult.meta.dataError === "DB_UNREACHABLE" ||
    passesResult.meta.dataError === "DB_UNREACHABLE";
  // Honest suppression signal. When the board is intentionally zeroed — demo
  // rows held off the public board, or the stale-data kill switch parking a
  // slate that failed the freshness check — say which and why. Empty lanes plus
  // zeroed counts with no explanation would read as a quiet day, a false healthy
  // state. The loader already classifies the reason as a degradation code; we
  // only surface it. (The old isSampleData banner was dead: every loader
  // hardcodes isSampleData=false, so it could never render.)
  const suppression = stateResult.meta.degradations.find(
    (degradation) =>
      degradation.code === "STALE_DATA_SUPPRESSED" ||
      degradation.code === "DEMO_DATA_SUPPRESSED",
  );

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-obsidian text-ion-white">
      <GeneratedPlate assetId="board-command" className="-z-10 opacity-20" />
      <Nav />
      <SignalRoomAtmosphere mode="ambient" />
      <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
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

        {suppression && (
          <div
            data-testid="board-suppression-banner"
            className={`flex flex-col gap-2 border px-4 py-3 text-sm text-ion-white sm:flex-row sm:items-center ${
              suppression.code === "STALE_DATA_SUPPRESSED"
                ? "border-caution/40 bg-caution/[0.08]"
                : "border-orbital-cyan/30 bg-orbital-cyan/[0.06]"
            }`}
          >
            {suppression.code === "STALE_DATA_SUPPRESSED" ? (
              <>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-caution">
                  Quiet board
                </span>
                <span className="break-words sm:ml-3">
                  Model signals are quiet (no fresh published slate). This is
                  restraint, not an outage — free tools and methodology stay open.
                  Counts read zero until the next signal generation lands.
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orbital-cyan">
                  Demo rows hidden
                </span>
                <span className="break-words sm:ml-3">
                  Demo rows are kept off the public board. Counts read zero here
                  until real slates publish.
                </span>
              </>
            )}
          </div>
        )}

        {/* Honest-empty classifier — LIVE_BOARD off is not a quiet winning day */}
        {stateResult.meta.boardClass.honestEmpty &&
          !dbUnreachable &&
          !suppression && (
            <div
              data-testid="board-class-banner"
              className="flex flex-col gap-2 border border-orbital-cyan/30 bg-orbital-cyan/[0.06] px-4 py-3 text-sm text-ion-white sm:flex-row sm:items-center"
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orbital-cyan">
                {stateResult.meta.boardClass.state.replaceAll("_", " ")}
              </span>
              <span className="break-words sm:ml-3">
                {stateResult.meta.boardClass.publicMessage}
              </span>
            </div>
          )}

        <section className="border-b border-titanium pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">Today&apos;s Board</p>
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
            <div className="flex min-w-0 flex-col gap-3 sm:items-end">
              <BoardHealthBadge meta={stateResult.meta} />
              <div className="flex flex-wrap gap-3 sm:justify-end">
                <Link href="/pricing" className="btn btn-primary min-h-11 px-5 py-3">
                  See what Pro unlocks
                </Link>
                <Link
                  href="/accountability"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-titanium px-5 py-3 text-sm font-bold text-ion-white hover:border-orbital-cyan"
                >
                  See the receipts
                </Link>
                <Link
                  href="/methodology"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-titanium px-5 py-3 text-sm font-bold text-ion-white hover:border-orbital-cyan"
                >
                  Read methodology
                </Link>
              </div>
            </div>
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
          <BoardLane
            title="Scoring Now"
            rows={state.scoringNow}
            empty={
              stateResult.meta.boardClass.honestEmpty
                ? "Held — empty is refuse-default, not a scoring drought claim."
                : "No games are currently scoring."
            }
          />
          <BoardLane
            title="Published Today"
            rows={state.publishedToday}
            empty={
              stateResult.meta.boardClass.refusePublicFire
                ? "No public fires — LIVE_BOARD / gate held by law."
                : "No picks have cleared today."
            }
          />
          <BoardLane
            title="Gated Today"
            rows={state.gatedTodayRows}
            empty={
              stateResult.meta.boardClass.honestEmpty
                ? "No gated rows while the board is honestly empty."
                : "No passed games logged yet."
            }
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="border border-titanium bg-carbon/45 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">Pass List</p>
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
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">Live Calibration</p>
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

function StateTile({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="min-h-16 border border-titanium bg-carbon/60 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function BoardLane({ title, rows, empty }: { title: string; rows: BoardStateRow[]; empty: string }): JSX.Element {
  return (
    <section className="border border-titanium bg-carbon/45 p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">{title}</h2>
      <div className="mt-4 flex flex-col gap-3">
        {rows.length > 0 ? rows.map((row) => <BoardRowItem key={row.id} row={row} />) : (
          <p className="text-sm text-ion-3">{empty}</p>
        )}
      </div>
    </section>
  );
}

function BoardRowItem({ row }: { row: BoardStateRow }): JSX.Element {
  return (
    <article className="border border-titanium bg-obsidian/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{row.matchup}</h3>
          <p className="mt-1 text-xs text-ion-3">{row.sport} / {row.market}</p>
        </div>
        <span className="font-mono text-xs text-orbital-cyan">
          {row.edgeIndex === null ? "EI N/A" : `EI ${row.edgeIndex}`}
        </span>
      </div>
      {row.rankingP !== null && (
        <p className="mt-3 font-mono text-xs text-ion-1">
          rankingP {row.rankingP.toFixed(3)}
          {row.rankingSource ? ` · ${row.rankingSource}` : ""}
          <span className="text-ion-3"> — model sort key, not verified ROI</span>
        </p>
      )}
      {row.confidence !== null && (
        <p className="mt-3 text-sm text-ion-1">Confidence label available on the pick view.</p>
      )}
      {row.gateReason && <p className="mt-3 text-sm text-ion-2">{row.gateReason}</p>}
      <Link href={`/room/${row.gameId}`} className="mt-4 inline-flex text-sm font-semibold text-orbital-cyan hover:text-ion-white">
        Open room
      </Link>
    </article>
  );
}

function PassListItem({ row }: { row: PassListRow }): JSX.Element {
  return (
    <div className="px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1.4fr]">
        <span>
          <Link href={`/room/${row.gameId}`} className="font-semibold text-white hover:text-ion-white">
            {row.matchup}
          </Link>
        </span>
        <span className="font-mono text-xs text-orbital-cyan">{row.edgeIndex === null ? "EI N/A" : `EI ${row.edgeIndex}`}</span>
        {/* The refusal and its plain-language reason are UNCONDITIONAL — no
            entitlement check wraps this. Declining to bet is the credibility
            claim; gating it would sell volume instead of judgement. */}
        <span className="text-sm text-ion-2 sm:text-right">{row.reason}</span>
      </div>

      {row.detail && (
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-l-2 border-orbital-cyan/40 pl-3 font-mono text-[11px] text-ion-3">
          <div className="flex gap-1.5">
            <dt className="text-ion-2">code</dt>
            <dd className="text-ion-1">{row.detail.reasonCode}</dd>
          </div>
          {row.detail.confidence !== null && (
            <div className="flex gap-1.5">
              <dt className="text-ion-2">confidence at refusal</dt>
              <dd className="text-ion-1">{row.detail.confidence}</dd>
            </div>
          )}
          <div className="flex gap-1.5">
            <dt className="text-ion-2">model</dt>
            <dd className="text-ion-1">{row.detail.modelVersion}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ion-2">evidence refs</dt>
            <dd className="text-ion-1">{row.detail.evidenceRefCount}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-titanium bg-obsidian/55 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}
