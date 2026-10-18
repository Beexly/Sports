import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { formatCentralTime, CT_SUFFIX } from "@/lib/time/central";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { boardMarketLabel } from "@/lib/board/market-label";
import { loadBoardState, type BoardStateRow } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { BoardHealthBadge, boardStateLabel } from "@/components/board/board-health-badge";
import { BoardSurfaceChip } from "@/components/board/board-surface-chip";
import { PICK_TYPE, PickStat, PickStatRow } from "@/components/picks/pick-stat";

export const metadata: Metadata = {
  title: "Board",
  description:
    "Every game we scored today. What we're on, what we passed on, and why.",
  alternates: { canonical: "/board" },
  openGraph: {
    title: "Board",
    description:
      "Every game we scored today. What we're on, what we passed on, and why.",
  },
};

// Reads live board state per request; never statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Board timestamps read Central, and say so.
 *
 * This is a server component, so a bare toLocaleTimeString() formatted in the
 * SERVER's zone — UTC on Vercel — and printed a UTC clock face with no zone
 * label at all. Measured on production 2026-09-13: /api/board/state reported
 * lastRefresh 18:06:07Z and the page rendered "Last refresh 6:06 PM". It was
 * 1:06 PM in Central. Five hours wrong, and nothing on the page said which zone
 * it meant, so a reader could not even correct for it.
 *
 * formatCentralTime pins the zone explicitly, and the CT suffix makes the
 * reading self-describing rather than something the viewer has to infer.
 */
function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return `${formatCentralTime(date)} ${CT_SUFFIX}`;
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
              The board couldn&apos;t load. Try again in a minute.
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
                    No picks yet today. New picks post as lines come in.
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
                {boardStateLabel(stateResult.meta.boardClass.state)}
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
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-plasma">The Board</p>
            <h1
              id="board-title"
              className="mt-5 max-w-4xl font-display text-balance text-ion-white"
              style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", lineHeight: 0.94, letterSpacing: "-0.03em" }}
            >
              Board
            </h1>
            <p className="mt-3 max-w-4xl font-display text-balance text-ion-1" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1.05, letterSpacing: "-0.02em" }}>
              Every game.
              <br />
              <span className="text-plasma">Scored and honest.</span>
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              What we&apos;re on today, what we passed on, and why. The board shows every
              game we looked at, not just the ones we liked.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/pricing" className="btn-primary min-h-11 px-5 py-3">
                See what Pro unlocks
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
                Every game today: scoring, published, and passed on. The full picture.
              </p>
            </div>
            <Link
              href="/picks"
              className="rounded-xl border border-mineral bg-eclipse/40 px-4 py-3 transition-colors hover:border-orbital-cyan/50"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">Also open</p>
              <p className="mt-1 text-sm font-semibold text-ion-white">Today&apos;s picks</p>
              <p className="mt-0.5 text-xs leading-5 text-ion-2">
                Only the ones we&apos;re on, with the line, timing, and reason.
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
        <div className="mx-auto flex max-w-6xl flex-col gap-12 pt-8">

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <BoardSurfaceChip />
            <BoardHealthBadge meta={stateResult.meta} />
          </div>

          <dl aria-label="Board state" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-mineral bg-mineral sm:grid-cols-5">
            <StateTile label="Sports watched" value={String(state.sportsWatched)} />
            <StateTile label="Books polled" value={String(state.booksPolled)} />
            <StateTile label="Open picks" value={String(state.openPicks)} />
            <StateTile label="Passed on" value={String(state.gatedToday)} />
            <StateTile label="Last refresh" value={timeLabel(state.lastRefresh)} dataTestid="board-freshness" className="col-span-2 sm:col-span-1" />
          </dl>
        </div>

        <section className="grid gap-12 lg:grid-cols-3 lg:gap-10">
          <BoardLane
            index="01"
            title="Scoring Now"
            rows={state.scoringNow}
            empty={
              stateResult.meta.boardClass.honestEmpty
                ? "The board is closed until the data checks pass."
                : "No games are currently scoring."
            }
          />
          <BoardLane
            index="02"
            title="Today's Picks"
            rows={state.publishedToday}
            empty={
              stateResult.meta.boardClass.refusePublicFire
                ? "Nothing published while the board is paused."
                : "No picks published yet today."
            }
          />
          <BoardLane
            index="03"
            title="Passed On"
            rows={state.gatedTodayRows}
            empty={
              stateResult.meta.boardClass.honestEmpty
                ? "Nothing passed on while the board is closed."
                : "Nothing passed on yet today."
            }
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl border border-mineral bg-eclipse p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className={PICK_TYPE.label}>Pass List</p>
                <h2 className={`mt-1.5 text-ion-white ${PICK_TYPE.pick}`}>Evaluated without publishing</h2>
              </div>
              <span className={PICK_TYPE.meta}>{passesResult.data.date}</span>
            </div>
            <div className="mt-4 divide-y divide-mineral">
              {passes.length > 0 ? (
                passes.map((row) => <PassListItem key={row.id} row={row} />)
              ) : (
                <p className="py-5 text-sm text-ion-2">No passes recorded for this slate yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-mineral bg-eclipse p-5 sm:p-6">
            <p className={PICK_TYPE.label}>Results</p>
            <h2 className={`mt-1.5 text-ion-white ${PICK_TYPE.pick}`}>
              {calibration.isCollecting ? "Building history" : "Results tracked"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{calibration.publicMessage}</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
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

function StateTile({
  label,
  value,
  dataTestid,
  className = "",
}: {
  label: string;
  value: string;
  dataTestid?: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={`bg-eclipse px-4 py-4 ${className}`} {...(dataTestid ? { "data-testid": dataTestid } : {})}>
      <dt className={PICK_TYPE.label}>{label}</dt>
      <dd className={`mt-1.5 break-words text-ion-white ${PICK_TYPE.value}`}>{value}</dd>
    </div>
  );
}

function BoardLane({ title, rows, empty, index }: { title: string; rows: BoardStateRow[]; empty: string; index: string }): JSX.Element {
  const live = index === "02";
  return (
    <section>
      <div className="flex items-baseline gap-3 border-b border-mineral pb-3">
        <span className={`${PICK_TYPE.value} ${live ? "text-plasma" : "text-ion-3"}`}>{index}</span>
        <h2 className={`${PICK_TYPE.label} text-ion-1`}>{title}</h2>
        <span className={`ml-auto tabular-nums ${PICK_TYPE.label}`}>{rows.length}</span>
      </div>
      {rows.length > 0 ? (
        <div className="divide-y divide-mineral">
          {rows.map((row) => <BoardRowItem key={row.id} row={row} live={live} />)}
        </div>
      ) : (
        <p className="py-6 text-sm leading-6 text-ion-2">{empty}</p>
      )}
    </section>
  );
}

/**
 * One board row, in the pick card's grammar: meta line, the matchup at the
 * pick display size, then the same Edge / Confidence stat row. There is no
 * per-row book count on the board payload, so the Books column is not drawn
 * rather than filled with a placeholder.
 */
function BoardRowItem({ row, live }: { row: BoardStateRow; live: boolean }): JSX.Element {
  const held = row.status !== "PUBLISHED_TODAY";
  return (
    <article className="flex flex-col gap-4 py-6">
      <div className="min-w-0">
        {/* The market slot is a tier-redaction sentinel for non-premium viewers
            and was rendering as the literal "ALL_MARKETS". A redacted row has
            nothing truthful to say about the market, so it shows the sport
            alone rather than a token or a guess. */}
        <p className={PICK_TYPE.meta}>
          {row.sport}
          {boardMarketLabel(row.market) ? ` · ${boardMarketLabel(row.market)}` : ""}
        </p>
        <h3 className={`mt-1.5 break-words ${PICK_TYPE.pick} ${held ? "text-ion-3" : "text-ion-white"}`}>{row.matchup}</h3>
      </div>
      {/* The ranking sort key and its source are model internals; the public
          row does not render them (FE-10). Confidence is redacted inside the
          loader for viewers without canSeeConfidence (applyViewerRedaction in
          lib/board/state.ts), so this renders what arrived: N/100 or a dash.
          It is shown as a score, never scored as a probability (C-224). */}
      <PickStatRow>
        <PickStat label="Edge" tone={held ? "muted" : live ? "accent" : "default"}>
          {row.edgeIndex === null ? "—" : row.edgeIndex}
        </PickStat>
        <PickStat label="Confidence" tone={held ? "muted" : "default"}>
          {row.confidence === null ? "—" : `${row.confidence}/100`}
        </PickStat>
      </PickStatRow>
      {row.gateReason && (
        <p className="text-sm leading-6 text-ion-1">
          {held && <span className="font-semibold text-plasma">Passed. </span>}{row.gateReason}
        </p>
      )}
      <Link href={`/room/${row.gameId}`} className="-my-2 inline-flex min-h-11 w-fit items-center text-sm font-semibold text-ion-1 hover:text-ion-white">
        Open room →
      </Link>
    </article>
  );
}

function PassListItem({ row }: { row: PassListRow }): JSX.Element {
  return (
    <div className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-8">
      <div className="min-w-0">
        <Link href={`/room/${row.gameId}`} className="text-base font-semibold text-ion-white hover:text-plasma">
          {row.matchup}
        </Link>
        {/* The refusal and its plain-language reason are UNCONDITIONAL — no
            entitlement check wraps this. Declining to bet is the credibility
            claim; gating it would sell volume instead of judgement. */}
        <p className="mt-1 text-sm leading-6 text-ion-1">{row.reason}</p>
      </div>

      <dl className="flex gap-8">
        <PickStat label="Edge">{row.edgeIndex === null ? "—" : row.edgeIndex}</PickStat>
        {/* Pro detail: the reason code, model version and evidence-ref count
            are operator fields and are not rendered; confidence at the pass is. */}
        {row.detail && row.detail.confidence !== null && (
          <PickStat label="Confidence">{row.detail.confidence}/100</PickStat>
        )}
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className={PICK_TYPE.label}>{label}</dt>
      <dd className={`mt-1.5 text-ion-white ${PICK_TYPE.value}`}>{value}</dd>
    </div>
  );
}
