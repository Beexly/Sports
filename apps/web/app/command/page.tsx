import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadBoardState } from "@/lib/board/state";
import { loadBoardPasses } from "@/lib/board/passes";
import { db, isStubMode } from "@sports/db";
import { TrustStrip, SourceFreshnessLabel, UncertaintyState } from "@/components/trust";
import { NextBestSurface } from "@/components/experience/NextBestSurface";
import { recommendNextModule } from "@/lib/understanding/learning-state";
import { emptySnapshot } from "@/lib/understanding/user-understanding";

export const metadata: Metadata = {
  title: "Command Center — Galaxy Sports Edge",
  description:
    "What do you need to understand before acting today? Decision home — briefing, passes, academy, risk patterns.",
  alternates: { canonical: "/command" },
};

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// Data loaders
// ─────────────────────────────────────────────

async function loadCommandData() {
  const now = new Date();

  const [stateResult, passesResult, autopsyQueue] = await Promise.all([
    loadBoardState(now),
    loadBoardPasses(now),
    isStubMode()
      ? Promise.resolve([])
      : db.pick
          .findMany({
            where: { result: "PENDING" },
            select: { id: true, selection: true, generatedAt: true },
            orderBy: { generatedAt: "desc" },
            take: 3,
          })
          .catch(() => []),
  ]);

  const isSample =
    stateResult.meta.isSampleData || passesResult.meta.isSampleData;

  const academyRec = recommendNextModule(emptySnapshot(0, now.toISOString()));

  return {
    board: stateResult.data,
    passes: passesResult.data.passes,
    autopsyQueue,
    academyRec,
    isSample,
  };
}

// ─────────────────────────────────────────────
// Widget — wired status badge
// ─────────────────────────────────────────────

type WiringStatus = "wired" | "sample" | "pending";

function WiringBadge({ status }: { status: WiringStatus }) {
  const config = {
    wired: { label: "Wired", dotClass: "bg-emerald-500", textClass: "text-emerald-400" },
    sample: { label: "Sample", dotClass: "bg-violet-500", textClass: "text-violet-400" },
    pending: { label: "Pending", dotClass: "bg-amber-500", textClass: "text-amber-400" },
  }[status];

  return (
    <span className="inline-flex items-center gap-1">
      <span className={["h-1.5 w-1.5 rounded-full", config.dotClass].join(" ")} aria-hidden="true" />
      <span className={["font-mono text-[8px] uppercase tracking-widest", config.textClass].join(" ")}>
        {config.label}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function CommandPage() {
  const [session, { board, passes, autopsyQueue, academyRec, isSample }] =
    await Promise.all([
      auth().catch(() => null),
      loadCommandData(),
    ]);

  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : null;

  const gateOpen = (board.openPicks ?? 0) > 0;
  const publishedCount = board.publishedToday?.length ?? 0;
  const passCount = passes.length;

  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">

          {/* ── Trust strip ──────────────────────────────────── */}
          <TrustStrip
            surfaceId="command"
            source="galaxy-model"
            freshness={isSample ? "sample" : "fresh"}
            surfaceKind="habit-loop"
            tier="all"
            uncertainty={isSample ? "sample" : "live"}
            showMethodology
            showResponsiblePlay
            className="mb-8"
          />

          {/* ── Hero ─────────────────────────────────────────── */}
          <header className="mb-12">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Command Center
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              What do you need to understand before acting?
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-400">
              Your decision home for today. Briefing, discipline, academy, and risk — all in one view.
            </p>
          </header>

          {/* ── 12-Widget Grid ───────────────────────────────── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {/* 1. Today's Briefing — WIRED */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Today&apos;s Briefing
                </span>
                <WiringBadge status="wired" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Gate: {gateOpen ? "Open" : "Closed"}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {publishedCount} signal{publishedCount !== 1 ? "s" : ""} published today
                </p>
                {isSample && (
                  <p className="mt-1 font-mono text-[9px] text-violet-400 uppercase tracking-widest">
                    Sample data
                  </p>
                )}
              </div>
              <Link
                href="/today"
                className="mt-auto font-mono text-[9px] uppercase tracking-widest text-accent-300 hover:text-accent-200 transition-colors"
              >
                Open board →
              </Link>
            </div>

            {/* 2. What Changed — SAMPLE */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  What Changed
                </span>
                <WiringBadge status="sample" />
              </div>
              <p className="text-sm text-gray-400">
                Line movement, roster updates, and weather flags since your last visit.
              </p>
              <SourceFreshnessLabel source="aggregate" freshness="sample" className="mt-auto" />
            </div>

            {/* 3. What to Ignore — WIRED */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  What to Ignore
                </span>
                <WiringBadge status="wired" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {passCount} pass{passCount !== 1 ? "es" : ""} today
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Games the model gated — don&apos;t bet what Galaxy skipped.
                </p>
              </div>
              <Link
                href="/no-bet"
                className="mt-auto font-mono text-[9px] uppercase tracking-widest text-accent-300 hover:text-accent-200 transition-colors"
              >
                Pass list →
              </Link>
            </div>

            {/* 4. Saved Cards — SAMPLE */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Saved Cards
                </span>
                <WiringBadge status="sample" />
              </div>
              <p className="text-sm text-gray-400">
                Picks and no-bets you bookmarked for later review.
              </p>
              <UncertaintyState kind="pending" detail="Requires auth wiring" className="mt-auto" />
            </div>

            {/* 5. Open Decisions — SAMPLE */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Open Decisions
                </span>
                <WiringBadge status="sample" />
              </div>
              <p className="text-sm text-gray-400">
                Picks you&apos;ve noted but haven&apos;t acted on. Reminder before game time.
              </p>
              <UncertaintyState kind="pending" detail="Requires schema" className="mt-auto" />
            </div>

            {/* 6. No-Bet Credits — SAMPLE */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  No-Bet Credits
                </span>
                <WiringBadge status="sample" />
              </div>
              <p className="text-sm text-gray-400">
                Times you passed on a gated game. Good discipline is tracked too.
              </p>
              <UncertaintyState kind="sample" className="mt-auto" />
            </div>

            {/* 7. Parlay MRI Warnings — SAMPLE */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Parlay MRI Warnings
                </span>
                <WiringBadge status="sample" />
              </div>
              <p className="text-sm text-gray-400">
                Correlation alerts on open parlay legs you&apos;re tracking.
              </p>
              <Link
                href="/parlay-mri"
                className="mt-auto font-mono text-[9px] uppercase tracking-widest text-accent-300 hover:text-accent-200 transition-colors"
              >
                Parlay MRI →
              </Link>
            </div>

            {/* 8. Autopsy Queue — WIRED */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Autopsy Queue
                </span>
                <WiringBadge status={autopsyQueue.length > 0 ? "wired" : "sample"} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {autopsyQueue.length} settled pick{autopsyQueue.length !== 1 ? "s" : ""} to review
                </p>
                {autopsyQueue.length > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    {autopsyQueue[0]?.selection}
                  </p>
                )}
              </div>
              <Link
                href="/autopsy"
                className="mt-auto font-mono text-[9px] uppercase tracking-widest text-accent-300 hover:text-accent-200 transition-colors"
              >
                Grade decisions →
              </Link>
            </div>

            {/* 9. Academy Recommendation — WIRED */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Academy
                </span>
                <WiringBadge status="wired" />
              </div>
              <div>
                {academyRec ? (
                  <>
                    <p className="text-sm font-semibold text-white">
                      Recommended: {academyRec.module.replace(/-/g, " ")}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {academyRec.rationale}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    All foundation concepts covered. Advanced tracks available.
                  </p>
                )}
              </div>
              <Link
                href="/academy"
                className="mt-auto font-mono text-[9px] uppercase tracking-widest text-accent-300 hover:text-accent-200 transition-colors"
              >
                Open academy →
              </Link>
            </div>

            {/* 10. Risk Pattern — SAMPLE */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Risk Pattern
                </span>
                <WiringBadge status="sample" />
              </div>
              <p className="text-sm text-gray-400">
                Behavioral flags from your recent session: tilt, evidence bypass, over-parlaying.
              </p>
              <Link
                href="/profile"
                className="mt-auto font-mono text-[9px] uppercase tracking-widest text-accent-300 hover:text-accent-200 transition-colors"
              >
                Betting Brain →
              </Link>
            </div>

            {/* 11. Source Freshness Status — WIRED */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Source Freshness
                </span>
                <WiringBadge status="wired" />
              </div>
              <div className="flex flex-col gap-2">
                <SourceFreshnessLabel
                  source="galaxy-model"
                  freshness={isSample ? "sample" : "fresh"}
                />
                <SourceFreshnessLabel
                  source="provider"
                  freshness={isStubMode() ? "unknown" : "fresh"}
                />
              </div>
              <p className="mt-auto text-xs text-gray-500">
                {isStubMode()
                  ? "Odds API not connected — bootstrap mode"
                  : "Data sources current"}
              </p>
            </div>

            {/* 12. Next Best Surface — WIRED */}
            <div className="flex flex-col gap-3 rounded-2xl border border-mineral bg-gray-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Next Best Surface
                </span>
                <WiringBadge status="wired" />
              </div>
              <p className="text-xs text-gray-400">
                Orchestrator recommendation based on your mode and maturity.
              </p>
              <div className="mt-auto">
                <NextBestSurface route="/command" />
              </div>
            </div>

          </div>

          {/* ── Access gate ───────────────────────────────────── */}
          {!entitlements && (
            <section aria-label="Access" className="mt-12 rounded-2xl border border-mineral bg-gray-900/40 p-6">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                Personalization
              </p>
              <p className="text-sm text-gray-400">
                Sign in to unlock personalized recommendations, saved cards, and risk patterns.
              </p>
              <Link
                href="/auth/signin?callbackUrl=/command"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
              >
                Sign in
              </Link>
            </section>
          )}

          <div className="mt-10">
            <RiskDisclosure variant="compact" />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
