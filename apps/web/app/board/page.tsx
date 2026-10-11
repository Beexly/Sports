import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
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
import { BoardHealthBadge } from "@/components/board/board-health-badge";
import { BoardSurfaceChip } from "@/components/board/board-surface-chip";
import { PickCard } from "@/components/picks/pick-card";
import { LineFreshnessBadge } from "@/components/picks/line-freshness-badge";
import { freshestLineTimestamp } from "@/lib/picks/line-freshness";
import { getCurrentPricingPhase } from "@/lib/pricing/pricing-phases";
import { getEntitlements, type DailySlate, type SubscriptionTier } from "@sports/types";
import { isStubMode, isDemoPicksEnabled } from "@sports/db";
import { copyClientIpHeaders } from "@/lib/api/rate-limit";
import { GET as getPicks } from "@/app/api/picks/route";
import { GET as getDailySlate } from "@/app/api/picks/daily-slate/route";
import {
  bindPublicConsensusClaim,
  consensusEvidenceCaption,
  isBookmakerConsensusClaim,
  type PublicConsensusPick,
} from "@/lib/claims/public-consensus-claim";

export const metadata: Metadata = {
  title: "The Board",
  description:
    "Every game we scored today. What we're on, what we passed on, and why.",
  alternates: { canonical: "/board" },
  openGraph: {
    title: "The Board",
    description:
      "Every game we scored today. What we're on, what we passed on, and why.",
  },
};

// Reads live board state per request; never statically prerenderable.
export const dynamic = "force-dynamic";

interface BoardPageProps {
  searchParams?: {
    tab?: string;
    sport?: string;
    date?: string;
    grade?: string;
  };
}

interface PicksResponse {
  success: boolean;
  data: PublicConsensusPick[];
  meta: {
    tier: string;
    total: number;
    date: string;
    totalAvailableToday?: number;
    hitDailyLimit?: boolean;
  };
  bootstrap?: {
    message: string;
    kind: "gated" | "stale";
  };
}

function timeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return `${formatCentralTime(date)} ${CT_SUFFIX}`;
}

function buildRequest(pathname: string, params: URLSearchParams): NextRequest {
  const h = headers();
  const initHeaders = new Headers();
  copyClientIpHeaders(h, initHeaders);
  const cookie = h.get("cookie");
  if (cookie) initHeaders.set("cookie", cookie);
  const url = `http://localhost${pathname}${params.toString() ? `?${params}` : ""}`;
  return new NextRequest(url, { headers: initHeaders });
}

function bindPublicPickReasoning(
  pick: PublicConsensusPick,
  canSeeFactorBreakdown: boolean,
): PublicConsensusPick {
  const reasoning = canSeeFactorBreakdown ? pick.reasoning : pick.reasoningShort;
  const bound = bindPublicConsensusClaim({
    reasoningShort: reasoning,
    consensusPct: pick.consensusPct,
    bookmakerCount: pick.bookmakerCount,
    dataFreshnessAt: pick.dataFreshnessAt,
    consensusProvider: pick.consensusProvider,
    consensusSourceId: pick.consensusSourceId,
    consensusBooks: pick.consensusBooks,
    consensusBookSetId: pick.consensusBookSetId,
    consensusCapturedAt: pick.consensusCapturedAt,
  });
  if (isBookmakerConsensusClaim(reasoning) && !bound) {
    return { ...pick, reasoning: null, reasoningShort: null, consensusEvidence: null };
  }
  return {
    ...pick,
    consensusEvidence: bound ? consensusEvidenceCaption(bound) : null,
  };
}

async function fetchPicks(
  sport?: string,
  date?: string,
  grade?: string,
): Promise<PicksResponse> {
  const params = new URLSearchParams();
  if (sport) params.set("sport", sport);
  if (date) params.set("date", date);
  if (grade) params.set("grade", grade);
  const req = buildRequest("/api/picks", params);
  const res = await getPicks(req);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      bootstrapMode?: boolean;
      reason?: string;
    } | null;
    if (
      body?.bootstrapMode ||
      body?.reason === "stale_data" ||
      body?.reason === "feature_gate" ||
      body?.reason === "bootstrap"
    ) {
      const kind =
        body?.reason === "stale_data"
          ? "stale"
          : "gated";
      return {
        success: false,
        data: [],
        meta: {
          tier: "FREE",
          total: 0,
          date: date ?? new Date().toISOString().split("T")[0]!,
        },
        bootstrap: {
          message: body.error ?? "Published picks are collecting live history.",
          kind,
        },
      };
    }
    throw new Error(`Failed to fetch picks: ${res.status}`);
  }
  return (await res.json()) as PicksResponse;
}

async function fetchSlate(): Promise<DailySlate | null> {
  try {
    const req = buildRequest("/api/picks/daily-slate", new URLSearchParams());
    const res = await getDailySlate(req);
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data: DailySlate };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export default async function BoardPage({ searchParams }: BoardPageProps): Promise<JSX.Element> {
  const session = await auth();
  const viewerEntitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : undefined;
  const canSeeNoBetDetail = viewerEntitlements?.canSeeNoBetDetail ?? false;
  const entitlements = viewerEntitlements ?? getEntitlements("FREE");
  const isPro = entitlements.tier === "PRO" || entitlements.tier === "ELITE";
  const isFreeTier = !entitlements.canSeePremiumPicks;
  const hasAccount = Boolean(session?.user);
  const phase = getCurrentPricingPhase();

  const tabParam = searchParams?.tab?.toLowerCase();
  const activeTab = tabParam === "held" ? "held" : "signals"; // tab === "held" or default tab = "signals"

  const sport = searchParams?.sport;
  const date = searchParams?.date;
  const grade = searchParams?.grade;

  const [boardResults, slateResult, picksResult] = await Promise.all([
    Promise.all([
      loadBoardState(new Date(), viewerEntitlements),
      loadBoardPasses(new Date(), { includeNoBetDetail: canSeeNoBetDetail }),
      loadPublicCalibrationReport(),
    ]),
    fetchSlate().catch(() => null),
    fetchPicks(sport, date, grade).catch((err) => ({
      success: false,
      data: [] as PublicConsensusPick[],
      meta: {
        tier: "FREE",
        total: 0,
        date: date ?? new Date().toISOString().split("T")[0]!,
      },
      error: err instanceof Error ? err.message : "Failed to load picks.",
    })),
  ]);

  const [stateResult, passesResult, calibrationResult] = boardResults;
  const state = stateResult.data;
  const passes = passesResult.data.passes;
  const calibration = calibrationResult.data;
  const slate = slateResult;

  const picksData = "data" in picksResult ? picksResult.data : [];
  const picks: PublicConsensusPick[] = picksData.map((pick) =>
    bindPublicPickReasoning(pick, Boolean(entitlements.canSeeFactorBreakdown)),
  );
  const bootstrapState = "bootstrap" in picksResult ? picksResult.bootstrap : null;
  const fetchError = "error" in picksResult ? (picksResult.error as string) : null;
  const metaDate = "meta" in picksResult && picksResult.meta ? picksResult.meta.date : (date ?? new Date().toISOString().split("T")[0]!);
  const meta = "meta" in picksResult ? picksResult.meta : null;
  const totalAvailableToday = meta?.totalAvailableToday ?? null;
  const hitDailyLimit = meta?.hitDailyLimit ?? false;
  const teaserSize = entitlements.dailyPickLimit ?? 2;

  const dbUnreachable =
    stateResult.meta.dataError === "DB_UNREACHABLE" ||
    passesResult.meta.dataError === "DB_UNREACHABLE";

  const suppression = stateResult.meta.degradations.find(
    (degradation) =>
      degradation.code === "STALE_DATA_SUPPRESSED" ||
      degradation.code === "DEMO_DATA_SUPPRESSED",
  );

  const SPORTS = [
    { key: "", label: "All" },
    { key: "nfl", label: "NFL" },
    { key: "nba", label: "NBA" },
    { key: "mlb", label: "MLB" },
    { key: "nhl", label: "NHL" },
    { key: "ncaaf", label: "NCAAF" },
    { key: "ncaab", label: "NCAAB" },
    { key: "mls", label: "MLS" },
  ];

  const GRADES = [
    { key: "", label: "All Grades" },
    { key: "ELITE_PLAY", label: "Elite Play" },
    { key: "STRONG_PLAY", label: "Strong Play" },
    { key: "SOLID_PLAY", label: "Solid Play" },
  ];

  const activeSportLabel = sport
    ? (SPORTS.find((s) => s.key === sport.toLowerCase())?.label ?? null)
    : null;

  const lockedByPaywall =
    isFreeTier &&
    picks.length === 0 &&
    totalAvailableToday !== null &&
    totalAvailableToday > 0;

  const demoActive = isStubMode() && isDemoPicksEnabled();

  const signalsTabParams = new URLSearchParams();
  signalsTabParams.set("tab", "signals");
  if (sport) signalsTabParams.set("sport", sport);
  if (date) signalsTabParams.set("date", date);
  if (grade) signalsTabParams.set("grade", grade);
  const signalsTabHref = `/board?${signalsTabParams.toString()}`;

  const heldTabParams = new URLSearchParams();
  heldTabParams.set("tab", "held");
  if (sport) heldTabParams.set("sport", sport);
  if (date) heldTabParams.set("date", date);
  const heldTabHref = `/board?${heldTabParams.toString()}`;

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
                    Board is temporarily stale, awaiting fresh data. The board
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
                    restraint, not an outage. Free tools and methodology stay
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

        {stateResult.meta.degradationCharacter === "stale_refreshing" &&
          !suppression && (
            <div
              data-testid="board-stale-refreshing-banner"
              className="flex flex-col gap-2 border border-caution/40 bg-caution/[0.08] px-4 py-3 text-sm text-ion-white sm:flex-row sm:items-center"
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-caution">
                Temporarily stale
              </span>
              <span className="break-words sm:ml-3">
                Board is temporarily stale, awaiting fresh data. The board
                reopens on the next real ingestion. Methodology and pricing
                stay available while it refreshes.
              </span>
            </div>
          )}

        {stateResult.meta.boardClass.honestEmpty &&
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
          className="relative isolate flex min-h-[48vh] flex-col justify-end overflow-hidden border-b border-mineral px-4 pb-8 pt-16 sm:px-6 lg:px-8"
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
              Every game.
              <br />
              <span className="text-plasma">Scored and honest.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              What we&apos;re on today, what we passed on, and why. The board shows every
              game we looked at, not just the ones we liked.
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

        {/* ── TABS: Actionable Signals vs Gated & Held Games ───────────────── */}
        <section aria-label="Board tabs" className="border-b border-mineral px-4 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl gap-4">
            <Link
              href={signalsTabHref}
              aria-current={activeTab === "signals" ? "page" : undefined}
              className={[
                "inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                activeTab === "signals"
                  ? "border-plasma text-ion-white"
                  : "border-transparent text-ion-2 hover:border-mineral hover:text-ion-1",
              ].join(" ")}
            >
              <span>Actionable Signals</span>
              {picks.length > 0 && (
                <span className="rounded-full bg-plasma/20 px-2 py-0.5 font-mono text-[11px] font-bold text-plasma">
                  {picks.length}
                </span>
              )}
            </Link>
            <Link
              href={heldTabHref}
              aria-current={activeTab === "held" ? "page" : undefined}
              className={[
                "inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                activeTab === "held"
                  ? "border-plasma text-ion-white"
                  : "border-transparent text-ion-2 hover:border-mineral hover:text-ion-1",
              ].join(" ")}
            >
              <span>Gated &amp; Held Games</span>
              {state.gatedToday > 0 && (
                <span className="rounded-full bg-caution/20 px-2 py-0.5 font-mono text-[11px] font-bold text-caution">
                  {state.gatedToday}
                </span>
              )}
            </Link>
          </div>
        </section>

        {/* ── TAB CONTENT ──────────────────────────────────────────────────── */}
        {activeTab === "signals" ? (
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl pt-4">
              {demoActive && (
                <div data-testid="sample-data-banner-picks" role="status" aria-live="polite" className="mb-4 flex items-start gap-3 rounded-xl border border-caution/50 bg-caution/10 p-3 text-xs">
                  <span className="mt-0.5 rounded-md bg-caution/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution">Sample data</span>
                  <p className="flex-1 text-ion-1 leading-relaxed">These picks are deterministic samples shown while live ingestion is being wired up. They never settle, they never count toward a verified record, and no win-rate claim is published from them.</p>
                </div>
              )}

              {/* Daily Slate Bar */}
              {slate && <BoardSlateBar slate={slate} currentGrade={grade} currentDate={date} />}

              {/* Paywall Banner */}
              {isFreeTier && (
                <BoardPaywallBanner
                  hasAccount={!!session?.user}
                  totalAvailableToday={totalAvailableToday}
                  hitDailyLimit={hitDailyLimit}
                  dailyPickLimit={entitlements.dailyPickLimit}
                  tier={entitlements.tier}
                />
              )}

              <BoardPicksTrustStrip />

              {/* Filters row */}
              <div className="mb-6 flex flex-col gap-3">
                {/* Sport tabs */}
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map(({ key, label }) => {
                    const isActive = (sport ?? "") === key;
                    const p = new URLSearchParams();
                    p.set("tab", "signals");
                    if (key) p.set("sport", key);
                    if (date) p.set("date", date);
                    if (grade) p.set("grade", grade);
                    return (
                      <Link
                        key={key}
                        href={`/board?${p.toString()}`}
                        aria-current={isActive ? "page" : undefined}
                        className={[
                          "inline-flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                          isActive
                            ? "border-orbital-cyan bg-orbital-cyan text-eclipse shadow-[0_0_18px_rgba(255,77,46,0.35)]"
                            : "border-titanium bg-carbon text-ion-1 hover:border-orbital-cyan hover:text-ion-white",
                        ].join(" ")}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>

                {/* Grade filter + date picker */}
                <div className="flex flex-wrap items-center gap-2">
                  {GRADES.map(({ key, label }) => {
                    const isActive = (grade ?? "") === key;
                    const p = new URLSearchParams();
                    p.set("tab", "signals");
                    if (sport) p.set("sport", sport);
                    if (date) p.set("date", date);
                    if (key) p.set("grade", key);
                    return (
                      <Link
                        key={key}
                        href={`/board?${p.toString()}`}
                        aria-current={isActive ? "page" : undefined}
                        className={[
                          "inline-flex min-h-11 items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                          isActive
                            ? "border-plasma bg-plasma text-plasma-ink shadow-[0_0_18px_rgba(255,77,46,0.35)]"
                            : "border-titanium bg-carbon text-ion-1 hover:border-plasma hover:text-ion-white",
                        ].join(" ")}
                      >
                        {label}
                      </Link>
                    );
                  })}

                  <div className="w-full sm:ml-auto sm:w-auto">
                    <BoardDatePickerForm currentDate={metaDate} currentSport={sport} currentGrade={grade} />
                  </div>
                </div>
              </div>

              {/* Backend-outage state */}
              {fetchError && (
                <div
                  role="alert"
                  className="mb-8 rounded-xl border border-caution/40 bg-caution/10 p-6 text-center"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-caution">
                    Connection paused
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-white">
                    Picks feed temporarily unreachable.
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-ion-2">
                    Our live signal pipeline is refreshing its upstream connection.
                    Methodology, transparency, and pricing stay open while it recovers.
                  </p>
                  <div className="mt-5 flex justify-center gap-3">
                    <Link
                      href="/pricing"
                      className="inline-flex min-h-11 items-center rounded-lg border border-titanium bg-carbon px-4 py-2 text-xs font-semibold text-ion-1 hover:border-orbital-cyan hover:text-white"
                    >
                      View pricing plans
                    </Link>
                    <Link
                      href="/calibration"
                      className="inline-flex min-h-11 items-center rounded-lg border border-titanium bg-carbon px-4 py-2 text-xs font-semibold text-ion-1 hover:border-orbital-cyan hover:text-white"
                    >
                      Audit our record
                    </Link>
                  </div>
                </div>
              )}

              {/* Locked paywall state */}
              {!fetchError && lockedByPaywall && (
                <div className="mb-8 rounded-xl border border-orbital-cyan/30 bg-carbon p-8 text-center shadow-[0_0_32px_rgba(194,46,26,0.08)]">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-orbital-cyan">
                    Premium slate active
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    {activeSportLabel
                      ? `${activeSportLabel} signals published today are Pro & Elite.`
                      : "Today's published signals are Pro & Elite."}
                  </h2>
                  <p className="mx-auto mt-2 max-w-lg text-sm text-ion-2">
                    {totalAvailableToday === 1
                      ? "1 pick was published for this view, available on our paid tiers with full confidence scores and plain-English factor reasoning."
                      : `${totalAvailableToday} picks were published for this view, available on our paid tiers with full confidence scores and plain-English factor reasoning.`}
                  </p>
                  <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link
                      href="/pricing"
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-plasma px-6 py-2.5 text-sm font-semibold text-plasma-ink shadow-[0_0_20px_rgba(255,77,46,0.35)] transition-colors hover:bg-plasma-glow sm:w-auto"
                    >
                      {`Upgrade to Pro · $${phase.pro.monthly}/mo`}
                    </Link>
                    <Link
                      href="/calibration"
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-titanium bg-carbon px-5 py-2.5 text-sm font-semibold text-ion-1 transition-colors hover:border-orbital-cyan hover:text-white sm:w-auto"
                    >
                      Audit our record
                    </Link>
                  </div>
                </div>
              )}

              {/* Signal gate collecting / quiet board state */}
              {!fetchError && !lockedByPaywall && picks.length === 0 && (
                <div
                  data-testid="picks-empty-state"
                  className="mb-8 rounded-xl border border-titanium bg-carbon/50 p-8 text-center"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-orbital-cyan">
                    {bootstrapState?.kind === "stale"
                      ? "Freshness pause"
                      : "Signal gate collecting"}
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-white">
                    {bootstrapState?.kind === "stale"
                      ? "Data freshness check paused new picks."
                      : "The board is closed until the data checks pass."}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-ion-2">
                    {bootstrapState?.message ??
                      "Every game evaluated today is visible on the Gated & Held Games tab. When edges clear our threshold, signals publish here."}
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <Link
                      href={heldTabHref}
                      className="inline-flex min-h-11 items-center rounded-lg border border-titanium bg-carbon px-4 py-2 text-xs font-semibold text-ion-1 hover:border-orbital-cyan hover:text-white"
                    >
                      View Gated &amp; Held Games
                    </Link>
                    <Link
                      href="/calibration"
                      className="inline-flex min-h-11 items-center rounded-lg border border-titanium bg-carbon px-4 py-2 text-xs font-semibold text-ion-1 hover:border-orbital-cyan hover:text-white"
                    >
                      Audit our record
                    </Link>
                  </div>
                </div>
              )}

              {/* Picks grid */}
              {!fetchError && picks.length > 0 && (
                <>
                  {(() => {
                    const freshest = freshestLineTimestamp(picks);
                    return freshest ? (
                      <div className="mb-4" data-testid="picks-freshness">
                        <LineFreshnessBadge freshestIso={freshest} />
                      </div>
                    ) : null;
                  })()}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {picks.map((pick) => (
                      <PickCard
                        key={pick.id}
                        pick={pick}
                        canSeeConfidence={entitlements.canSeeConfidence}
                        canSeeEdgeScore={entitlements.canSeeEdgeScore ?? false}
                        canSeeFactorBreakdown={entitlements.canSeeFactorBreakdown ?? false}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Upgrade CTAs */}
              {isFreeTier && picks.length > 0 && (
                <div className="mt-10 rounded-xl border border-ultraviolet/40 bg-ultraviolet/20 p-6 text-center">
                  <p className="text-sm font-semibold text-ultraviolet-glow">
                    {hasAccount
                      ? entitlements.tier !== "FREE"
                        ? `Your plan sees the daily teaser on the betting board: up to ${teaserSize} picks with the public Edge Index, no confidence scores.`
                        : `You're on Free: a daily teaser of up to ${teaserSize} picks with the public Edge Index, no confidence scores.`
                      : `Today's free teaser: up to ${teaserSize} picks with the public Edge Index, no confidence scores.`}
                  </p>
                  <p className="mt-1 text-xs text-ultraviolet-glow">
                    Pro unlocks the full board plus the confidence score, the full factor trail, and line movement behind each pick.
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-plasma px-6 py-2.5 text-sm font-semibold text-plasma-ink transition-colors hover:bg-plasma-glow"
                  >
                    {`Upgrade to Pro · $${phase.pro.monthly}/mo`}
                  </Link>
                </div>
              )}

              {isPro && entitlements.tier === "PRO" && picks.length > 0 && (
                <div className="mt-8 rounded-xl border border-ultraviolet/30 bg-ultraviolet/10 p-4 text-center">
                  <p className="text-xs text-ultraviolet-glow">
                    Want email + push alerts when your followed picks grade?{" "}
                    <Link href="/pricing" className="font-semibold underline underline-offset-2">
                      {`Upgrade to Elite · $${phase.elite.monthly}/mo`}
                    </Link>
                  </p>
                </div>
              )}

              <RiskDisclosure variant="compact" className="mt-8 text-center" />
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl pt-4">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <BoardSurfaceChip />
                <BoardHealthBadge meta={stateResult.meta} />
              </div>

              <section aria-label="Board state" className="grid gap-px border border-mineral bg-mineral sm:grid-cols-2 lg:grid-cols-6">
                <StateTile label="Sports watched" value={String(state.sportsWatched)} />
                <StateTile label="Books polled" value={String(state.booksPolled)} />
                <StateTile label="Open picks" value={String(state.openPicks)} />
                <StateTile label="Passed on" value={String(state.gatedToday)} />
                <StateTile label="Last refresh" value={timeLabel(state.lastRefresh)} dataTestid="board-freshness" />
                <StateTile label="Model" value={state.modelVersion} />
              </section>

              <section className="mt-8 grid gap-10 lg:grid-cols-3">
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
                  title="Today's Picks"
                  rows={state.publishedToday}
                  empty={
                    stateResult.meta.boardClass.refusePublicFire
                      ? "Nothing published right now. The board is paused until data checks pass."
                      : "No picks published yet today."
                  }
                />
                <BoardLane
                  index="03"
                  title="Passed On"
                  rows={state.gatedTodayRows}
                  empty={
                    stateResult.meta.boardClass.honestEmpty
                      ? "Nothing to pass on while the board is honestly empty."
                      : "Nothing passed on yet today."
                  }
                />
              </section>

              <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
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
                    <Metric label="Decided" value={String(calibration.population.decided)} />
                  </dl>
                  <p className="mt-5 text-xs text-ion-3">
                    <Link href="/calibration" className="font-semibold text-orbital-cyan hover:text-ion-white">
                      How to read this →
                    </Link>
                  </p>
                </div>
              </section>

              <RiskDisclosure variant="compact" className="mt-8 text-center" />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function StateTile({ label, value, dataTestid }: { label: string; value: ReactNode; dataTestid?: string }): JSX.Element {
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
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-3">
          {row.sport}
          {boardMarketLabel(row.market) ? ` · ${boardMarketLabel(row.market)}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">Edge</p>
        <p className={`font-display text-2xl font-semibold tabular-nums ${held ? "text-ion-3" : live ? "text-plasma" : "text-ion-white"}`}>
          {row.edgeIndex === null ? "—" : row.edgeIndex}
        </p>
      </div>
      {row.gateReason && (
        <p className="col-span-2 mt-1 text-sm text-ion-2">
          {held && <span className="font-semibold text-plasma">Passed. </span>}{row.gateReason}
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

function BoardSlateBar({
  slate,
  currentGrade,
  currentDate,
}: {
  slate: DailySlate;
  currentGrade?: string;
  currentDate?: string;
}) {
  const record = slate.recentRecord;
  const lastUpdated = slate.lastUpdatedAt
    ? `${formatCentralTime(new Date(slate.lastUpdatedAt))} ${CT_SUFFIX}`
    : null;
  return (
    <div className="mb-6 rounded-xl border border-orbital-cyan/20 bg-obsidian/80 px-5 py-4 shadow-[0_0_28px_rgba(194,46,26,0.12)]">
      <div className="flex flex-wrap items-center gap-3">
        <StatPill label="Games Today" value={String(slate.totalGames)} />
        <StatPill label="Total Picks" value={String(slate.totalPicks)} />
        <StatPill
          label="Premium Picks"
          value={String(slate.premiumPickCount)}
          highlight
        />

        {record && (
          <div className="rounded-lg border border-titanium bg-carbon px-3 py-2">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ion-2">{record.period}</span>
            <span className="text-xs font-bold text-orbital-cyan">{record.wins}W</span>
            <span className="mx-1 text-xs text-ion-3">/</span>
            <span className="text-xs font-bold text-alert">{record.losses}L</span>
            {record.pushes > 0 && (
              <>
                <span className="mx-1 text-xs text-ion-3">/</span>
                <span className="text-xs font-semibold text-ion-2">{record.pushes}P</span>
              </>
            )}
          </div>
        )}

        {lastUpdated && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orbital-cyan shadow-[0_0_10px_rgba(255,77,46,0.6)]" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orbital-cyan">Updated {lastUpdated}</span>
          </div>
        )}
      </div>

      {slate.sportBreakdown.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-orbital-cyan/10 pt-3">
          {slate.sportBreakdown.map(({ sport: sName, pickCount }) => {
            const p = new URLSearchParams();
            p.set("tab", "signals");
            p.set("sport", sName.toLowerCase());
            if (currentDate) p.set("date", currentDate);
            if (currentGrade) p.set("grade", currentGrade);
            return (
              <Link
                key={sName}
                href={`/board?${p.toString()}`}
                className="rounded-full border border-orbital-cyan/25 bg-orbital-cyan/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-orbital-cyan transition-colors hover:border-orbital-cyan hover:bg-orbital-cyan hover:text-eclipse"
              >
                {sName} {pickCount}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-[108px] rounded-lg border border-titanium bg-carbon px-3 py-2 text-left">
      <p className={`text-lg font-bold ${highlight ? "text-plasma" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-2">{label}</p>
    </div>
  );
}

function BoardPaywallBanner({
  hasAccount,
  totalAvailableToday,
  hitDailyLimit,
  dailyPickLimit,
  tier,
}: {
  hasAccount: boolean;
  totalAvailableToday: number | null;
  hitDailyLimit: boolean;
  dailyPickLimit: number | null;
  tier: SubscriptionTier;
}) {
  const teaserSize = dailyPickLimit ?? 2;
  return (
    <div
      data-testid="picks-paywall-banner"
      className="mb-6 rounded-xl border border-orbital-cyan/30 bg-carbon p-4 shadow-[0_0_24px_rgba(194,46,26,0.08)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">
            {hasAccount && tier !== "FREE" ? `${tier} preview` : "Free preview"}
          </span>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {hitDailyLimit
              ? `Daily preview limit reached (up to ${teaserSize} picks with public Edge Index). Pro unlocks the full board.`
              : totalAvailableToday !== null && totalAvailableToday > teaserSize
                ? `Showing a daily preview of up to ${teaserSize} picks with public Edge Index (${totalAvailableToday} published for this view).`
                : `Showing a daily preview of up to ${teaserSize} picks with the public Edge Index.`}
          </p>
          <p className="mt-0.5 text-xs text-ion-2">
            Pro opens the complete slate with confidence ratings (NN/100) and plain-English factor reasoning.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-plasma px-4 py-2 text-xs font-semibold text-plasma-ink shadow-[0_0_16px_rgba(255,77,46,0.3)] transition-colors hover:bg-plasma-glow"
        >
          See Pro plans
        </Link>
      </div>
    </div>
  );
}

function BoardPicksTrustStrip() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-titanium bg-carbon/50 px-4 py-2.5 text-xs text-ion-2">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-orbital-cyan" aria-hidden="true" />
        <span className="text-ion-1">Tamper-evident record</span>
        <span className="text-ion-3">·</span>
        <span>Every pick sealed before kickoff</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/calibration" className="text-orbital-cyan transition-colors hover:text-white">
          Public calibration →
        </Link>
        <Link href="/methodology" className="text-ion-1 transition-colors hover:text-white">
          Methodology →
        </Link>
      </div>
    </div>
  );
}

function BoardDatePickerForm({
  currentDate,
  currentSport,
  currentGrade,
}: {
  currentDate: string;
  currentSport?: string;
  currentGrade?: string;
}) {
  return (
    <form method="get" action="/board" className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <input type="hidden" name="tab" value="signals" />
      {currentSport && <input type="hidden" name="sport" value={currentSport} />}
      {currentGrade && <input type="hidden" name="grade" value={currentGrade} />}
      <label htmlFor="date" className="sr-only text-xs text-ion-3">Date</label>
      <input
        id="date"
        type="date"
        name="date"
        defaultValue={currentDate}
        className="min-h-11 rounded-lg border border-titanium bg-titanium px-3 py-1.5 text-sm text-ion-1 focus:border-orbital-cyan focus:outline-none focus:ring-1 focus:ring-orbital-cyan"
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-titanium px-3 py-1.5 text-sm font-medium text-ion-1 transition-colors hover:bg-titanium hover:text-white"
      >
        Apply date
      </button>
    </form>
  );
}
