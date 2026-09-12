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
import { BoardSurfaceChip } from "@/components/board/board-surface-chip";

export const metadata: Metadata = {
  title: "Board",
  description:
    "The full decision surface: what scored, what cleared, and what we held with a reason. Edge rank is a ranking score, not a probability. Published picks with reasoning live at /picks.",
  alternates: { canonical: "/board" },
  openGraph: {
    title: "Board",
    description:
      "Today's scored markets: what cleared, what we held, and why. Edge rank is a ranking score, not a probability.",
  },
};

// Reads live board state per request; never statically prerendered.
export const dynamic = "force-dynamic";

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function BoardPage(): Promise<JSX.Element> {
  // Entitlement resolves BEFORE the query so the refusal trail is withheld
  // server-side rather than fetched and then hidden — a logged-out visitor's
  // payload never contains it at all. The refusal ITSELF is unconditional and
  // rendered for everyone; see PassListItem.
  const session = await auth();
  const viewerEntitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : undefined;
  const canSeeNoBetDetail = viewerEntitlements?.canSeeNoBetDetail ?? false;

  const [stateResult, passesResult, calibrationResult] = await Promise.all([
    loadBoardState(new Date(), viewerEntitlements),
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
      <Nav />
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
              stateResult.meta.degradationCharacter === "stale_refreshing" ? (
                <>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-caution">
                    Temporarily stale
                  </span>
                  <span className="break-words sm:ml-3">
                    Board is temporarily stale — awaiting fresh data. The board
                    reopens on the next real ingestion. Methodology and pricing
                    stay available while it refreshes.
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-caution">
                    Quiet board
                  </span>
                  <span className="break-words sm:ml-3">
                    Model signals are quiet (no fresh published slate). This is
                    restraint, not an outage — free tools and methodology stay
                    open. Counts read zero until the next signal generation lands.
                  </span>
                </>
              )
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

        {/* Non-suppressed stale detection: kill switch is OFF but the board
            loaded zero rows while data age exceeds the Refresh SLA. Surface a
            truthful "temporarily stale, refreshing" message — NOT "quiet board"
            which would imply an intentional empty slate. (CLAUDE.md honesty
            rule: an outage must never wear the empty state's copy.) */
          stateResult.meta.degradationCharacter === "stale_refreshing" &&
          !suppression && (
            <div
              data-testid="board-stale-refreshing-banner"
              className="flex flex-col gap-2 border border-caution/40 bg-caution/[0.08] px-4 py-3 text-sm text-ion-white sm:flex-row sm:items-center"
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-caution">
                Temporarily stale
              </span>
              <span className="break-words sm:ml-3">
                Board is temporarily stale — awaiting fresh data. The board
                reopens on the next real ingestion. Methodology and pricing
                stay available while it refreshes.
              </span>
            </div>
          )}

        {/* Honest-empty classifier: a closed board is not a quiet winning day */
          stateResult.meta.boardClass.honestEmpty &&
          !dbUnreachable &&
          !suppression &&
          stateResult.meta.degradationCharacter !== "stale_refreshing" && (
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

        {/* ── FULL-BLEED OPENING · the premier surface ────────────────────── */}
        <section
          className="relative isolate flex min-h-[58vh] flex-col justify-end overflow-hidden border-b border-mineral px-4 pb-10 pt-24 sm:px-6 lg:px-8"
          aria-labelledby="board-title"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 80% 0%, rgba(255,77,46,0.12), transparent 60%)," +
                "radial-gradient(ellipse 50% 40% at 10% 100%, rgba(25,28,35,0.9), transparent 65%)," +
                "linear-gradient(180deg, #08090C 0%, #12141A 50%, #08090C 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(237,232,224,0.5) 2px, rgba(237,232,224,0.5) 3px)",
            }}
          />
          <div className="mx-auto w-full max-w-6xl">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-plasma">The board</p>
            <h1
              id="board-title"
              className="mt-5 max-w-4xl font-display text-balance text-ion-white"
              style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", lineHeight: 0.94, letterSpacing: "-0.03em" }}
            >
              Scored.
              <br />
              <span className="text-plasma">Published or held.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              What is scoring now, what cleared the gate, and what we refused with a reason.
              Edge rank orders the board. It does not predict the final score.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/pricing" className="btn-primary min-h-11 px-5 py-3">
                See what Pro unlocks
              </Link>
              <Link
                href="/calibration"
                className="inline-flex min-h-11 items-center justify-center border border-mineral px-5 py-3 text-sm font-semibold text-ion-1 hover:border-plasma hover:text-ion-white"
              >
                Record
              </Link>
              <Link
                href="/intelligence"
                className="inline-flex min-h-11 items-center justify-center border border-mineral px-5 py-3 text-sm font-semibold text-ion-1 hover:border-plasma hover:text-ion-white"
              >
                Method
              </Link>
            </div>
          </div>
        </section>

        {/* ── YOU ARE HERE · three surfaces, one sentence each ────────────── */}
        <section
          aria-label="Where you are"
          className="border-b border-mineral px-4 py-5 sm:px-6 lg:px-8"
        >
          <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-plasma/50 bg-plasma/[0.06] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-plasma">You are here</p>
              <p className="mt-1 text-sm font-semibold text-ion-white">The board</p>
              <p className="mt-0.5 text-xs leading-5 text-ion-2">
                Every decision today — scoring, published, and held. The full picture.
              </p>
            </div>
            <Link
              href="/picks"
              className="rounded-xl border border-mineral bg-eclipse/40 px-4 py-3 transition-colors hover:border-orbital-cyan/50"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">Also open</p>
              <p className="mt-1 text-sm font-semibold text-ion-white">Published picks</p>
              <p className="mt-0.5 text-xs leading-5 text-ion-2">
                Only the ones that cleared — with price, timing, and the reason.
              </p>
            </Link>
            <Link
              href="/founder-picks"
              className="rounded-xl border border-mineral bg-eclipse/40 px-4 py-3 transition-colors hover:border-orbital-cyan/50"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">Also open</p>
              <p className="mt-1 text-sm font-semibold text-ion-white">Founder picks</p>
              <p className="mt-0.5 text-xs leading-5 text-ion-2">
                The owner&apos;s personal calls, on the same honest record.
              </p>
            </Link>
          </div>
        </section>

        <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl pt-8">

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <BoardSurfaceChip />
          <BoardHealthBadge meta={stateResult.meta} />
        </div>

        <section aria-label="Board state" className="grid gap-px border border-mineral bg-mineral sm:grid-cols-2 lg:grid-cols-6">
          <StateTile label="Sports watched" value={String(state.sportsWatched)} />
          <StateTile label="Books polled" value={String(state.booksPolled)} />
          <StateTile label="Open picks" value={String(state.openPicks)} />
          <StateTile label="Held today" value={String(state.gatedToday)} />
          <StateTile label="Last refresh" value={timeLabel(state.lastRefresh)} dataTestid="board-freshness" />
          <StateTile label="Model" value={state.modelVersion} />
        </section>

        <section className="grid gap-10 lg:grid-cols-3">
          <BoardLane
            index="01"
            title="Scoring Now"
            rows={state.scoringNow}
            empty={
              stateResult.meta.boardClass.honestEmpty
                ? "The board is closed until the data checks pass. An empty lane is not a claim about results."
                : "No games are currently scoring."
            }
          />
          <BoardLane
            index="02"
            title="Published Today"
            rows={state.publishedToday}
            empty={
              stateResult.meta.boardClass.refusePublicFire
                ? "No public fires: nothing is published while the board is closed."
                : "No picks have cleared today."
            }
          />
          <BoardLane
            index="03"
            title="Held Today"
            rows={state.gatedTodayRows}
            empty={
              stateResult.meta.boardClass.honestEmpty
                ? "No held rows while the board is honestly empty."
                : "Nothing held yet today."
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
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">Results</p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {calibration.isCollecting ? "Building history" : "Results tracked"}
            </h2>
            <p className="mt-4 text-sm leading-6 text-ion-2">{calibration.publicMessage}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <Metric label="Sample" value={String(calibration.sampleSize)} />
              {/* C-224: Brier score treats confidence as a forecast
                  probability, which the Edge Index is not. NOT replaced with
                  a win rate: lib/performance/public-performance-policy.ts is
                  explicit that the win-rate number is reserved for a
                  governed headline slot behind evaluatePublicPerformancePolicy
                  (min sample, bootstrap exclusion, CLV-first) and is
                  deliberately never a type this page can construct on its
                  own — "it can never silently fall back to a win-rate
                  number." A settled-picks count is a fact, not a
                  performance claim, so it carries no such gate. */}
              <Metric label="Decided" value={String(calibration.population.decided)} />
            </dl>
            <p className="mt-5 text-xs text-ion-3">
              <Link href="/calibration" className="font-semibold text-orbital-cyan hover:text-ion-white">
                How to read this →
              </Link>
            </p>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StateTile({ label, value, dataTestid }: { label: string; value: string; dataTestid?: string }): JSX.Element {
  return (
    <div className="min-h-16 border border-titanium bg-carbon/60 px-3 py-2" {...(dataTestid ? { "data-testid": dataTestid } : {})}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function BoardLane({ title, rows, empty, index }: { title: string; rows: BoardStateRow[]; empty: string; index: string }): JSX.Element {
  const live = index === "02";
  return (
    <section>
      <div className="flex items-baseline gap-3 border-b border-mineral pb-3">
        <span className={`font-display text-2xl font-semibold ${live ? "text-plasma" : "text-ion-3"}`}>{index}</span>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-1">{title}</h2>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-ion-3">{rows.length}</span>
      </div>
      <div className="divide-y divide-mineral">
        {rows.length > 0 ? rows.map((row) => <BoardRowItem key={row.id} row={row} live={live} />) : (
          <p className="py-5 text-sm text-ion-3">{empty}</p>
        )}
      </div>
    </section>
  );
}

function BoardRowItem({ row, live }: { row: BoardStateRow; live: boolean }): JSX.Element {
  const held = row.status !== "PUBLISHED_TODAY";
  return (
    <article className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-4">
      <div className="min-w-0">
        <h3 className={`font-display text-xl font-semibold tracking-tight ${held ? "text-ion-3" : "text-ion-white"}`}>{row.matchup}</h3>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-3">{row.sport} · {row.market}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">Edge</p>
        <p className={`font-display text-2xl font-semibold tabular-nums ${held ? "text-ion-3" : live ? "text-plasma" : "text-ion-white"}`}>
          {row.edgeIndex === null ? "—" : row.edgeIndex}
        </p>
      </div>
      {/* The ranking sort key and its source are model internals; the public
          row does not render them (FE-10). Confidence stays on the pick view
          behind the paywall (FE-15); C-224 forbids scoring it here. */}
      {row.gateReason && (
        <p className="col-span-2 mt-1 text-sm text-ion-2">
          {held && <span className="font-semibold text-plasma">Held. </span>}{row.gateReason}
        </p>
      )}
      <Link href={`/room/${row.gameId}`} className="col-span-2 mt-2 inline-flex text-sm font-semibold text-ion-1 hover:text-ion-white">
        Open room →
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
