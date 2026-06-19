import Link from "next/link";
import { auth } from "@/lib/auth";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BillingNoticeBanner } from "@/components/ui/billing-notice-banner";
import { getBillingNotice } from "@/lib/billing/notice";
import { getUserEntitlements } from "@/lib/entitlements";
import { BRAND_NAME } from "@/lib/brand";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import type { Metadata } from "next";

// Authenticated surface — a real title for the tab/bookmark, kept out of search
// since the dashboard is per-user and gated.
export const metadata: Metadata = {
  title: "Your dashboard",
  description: `Your ${BRAND_NAME} board — today's slate, your tier, and your tracked picks.`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type TodayPick = {
  id: string;
  pickType: string;
  selection: string;
  line: number;
  confidence: number;
  edgeScore: number;
  pickGrade: string;
  riskLevel: string;
  reasoningShort: string;
  tier: "FREE" | "PREMIUM";
  isFeatured: boolean;
  result: string;
  generatedAt: Date;
  game: {
    homeTeamName: string;
    awayTeamName: string;
    commenceTime: Date;
    sport: { name: string };
  };
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { upgraded?: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian text-ink-300">
        <div className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Sign in required</h1>
          <p className="mt-2 text-sm text-ink-400">
            The customer dashboard requires an authenticated session.
          </p>
          <Link
            href="/auth/signin?callbackUrl=/dashboard"
            className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Continue to sign in
          </Link>
        </div>
      </div>
    );
  }

  const user = session.user;
  const gates = getReadinessGates();
  const recentSince = subDays(new Date(), 14);
  const stubMode = isStubMode();
  const demoActive = isDemoPicksEnabled() && stubMode;

  // Production seed-row exclusion (defense-in-depth), mirroring
  // lib/dashboard/load-performance.ts. The dev seed tags rows with
  // modelVersion="v5.0.0-seed"; in production there should be zero, but these
  // inline counts feed the member-facing Today's Picks list and the canonical
  // settled/win/loss/push totals, so a stray seed row must not leak into them.
  // Empty spread in dev/test → behavior unchanged.
  const excludeSeedInProd =
    process.env.NODE_ENV === "production"
      ? { NOT: { modelVersion: "v5.0.0-seed" } }
      : {};

  // Server-side tier gate (rule #3): FREE members see their 1 daily FREE
  // pick without confidence; PRO+ sees the full slate with confidence.
  const entitlements = await getUserEntitlements(user.id);

  const [
    todayPicks,
    todayPicksCount,
    canonicalSettledCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    canonicalPendingCount,
    bootstrapSettledCount,
    recentTotalCount,
    recentBootstrapCount,
    billingNotice,
  ] = await Promise.all([
    db.pick
      .findMany({
        where: {
          isPublished: true,
          isBootstrap: false,
          ...excludeSeedInProd,
          generatedAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
          ...(entitlements.canSeePremiumPicks ? {} : { tier: "FREE" }),
          // Confidence-band ceiling (Workstream G1) — PRO/ELITE defense, scoped to
          // premium viewers. FREE picks are tier:"FREE" (confidence < 70) and some
          // sit in [57,70), so a 57 ceiling must never apply to them; FREE stays
          // selected by tier:"FREE" + take:dailyPickLimit. hasApexAccess is
          // fail-closed (false) → APEX [92,100] stays hidden until an Apex model ships.
          ...(entitlements.canSeePremiumPicks
            ? { confidence: { lt: entitlements.hasApexAccess ? 101 : entitlements.maxConfidence } }
            : {}),
        },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: [{ isFeatured: "desc" }, { confidence: "desc" }],
        take: entitlements.canSeePremiumPicks ? 6 : (entitlements.dailyPickLimit ?? 1),
      })
      .catch(() => [] as unknown[]) as Promise<TodayPick[]>,
    db.pick
      .count({
        where: {
          isPublished: true,
          ...excludeSeedInProd,
          generatedAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
        },
      })
      .catch(() => 0),
    db.pick
      .count({
        where: {
          result: { in: ["WIN", "LOSS", "PUSH"] },
          isPublished: true,
          isBootstrap: false,
          ...excludeSeedInProd,
        },
      })
      .catch(() => 0),
    db.pick.count({ where: { result: "WIN", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(() => 0),
    db.pick.count({ where: { result: "LOSS", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(() => 0),
    db.pick.count({ where: { result: "PUSH", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(() => 0),
    db.pick.count({ where: { result: "PENDING", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(() => 0),
    db.pick
      .count({
        where: {
          result: { in: ["WIN", "LOSS", "PUSH"] },
          isPublished: true,
          isBootstrap: true,
        },
      })
      .catch(() => 0),
    db.pick.count({ where: { generatedAt: { gte: recentSince } } }).catch(() => 0),
    db.pick.count({ where: { generatedAt: { gte: recentSince }, isBootstrap: true } }).catch(() => 0),
    getBillingNotice(user.id),
  ]);

  const performancePolicy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: gates.canExposePerformanceStats,
    minSettledPicksForLearning: gates.minSettledPicksForLearning,
    canonicalSettledCount,
    bootstrapCount: bootstrapSettledCount,
    pendingCount: canonicalPendingCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    recentTotalCount,
    recentBootstrapCount,
  });

  const performanceVisible = performancePolicy.canExposePerformanceStats;
  const recordDisplay = performanceVisible ? performancePolicy.publicRecord : "Collecting…";
  const winRateDisplay =
    performanceVisible && performancePolicy.publicWinRate !== null
      ? `${performancePolicy.publicWinRate}%`
      : "—";
  const winRateHighlight =
    performanceVisible &&
    performancePolicy.publicWinRate !== null &&
    performancePolicy.publicWinRate >= 55;

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <header className="border-b border-white/[0.10] bg-obsidian/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-white">
            {BRAND_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-xs text-ink-400">
            <Link href="/board" className="hover:text-white">Picks</Link>
            <Link href="/performance" className="hover:text-white">Performance</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <span className="text-ink-500">|</span>
            <span className="text-ink-500">{user.email}</span>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {searchParams.upgraded === "true" && (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 flex items-start gap-3 rounded-xl border border-verify/40 bg-verify/10 px-4 py-3"
            >
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-verify" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-verify">
                  You&apos;re in — {entitlements.tier === "ELITE" ? "Elite" : "Pro"} is active.
                </p>
                <p className="mt-0.5 text-xs text-verify/80">
                  Every signal, the full factor trail, and{entitlements.tier === "ELITE" ? " real-time alerts are now " : " confidence on all picks are now "}live for your account.
                </p>
              </div>
            </div>
          )}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {user.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
              </h1>
              <p className="text-sm text-ink-400">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {demoActive && (
                <span
                  data-testid="dashboard-sample-mode"
                  aria-label="Sample mode — picks are deterministic samples, not live data"
                  className="rounded-md bg-caution/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution"
                  title="Stub mode + demo samples — picks shown are deterministic samples, not live model output."
                >
                  Sample mode
                </span>
              )}
              <span className="rounded-full bg-white/[0.08] px-3 py-1 text-sm font-semibold text-ink-300">
                {user.role === "ADMIN" ? "Admin" : "Member"}
              </span>
            </div>
          </div>

          {demoActive && <SampleDataBanner />}

          {billingNotice && <BillingNoticeBanner notice={billingNotice} />}

          <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Today's Picks" value={todayPicksCount.toString()} />
            <StatCard label="Verified Record" value={recordDisplay} />
            <StatCard label="Win Rate" value={winRateDisplay} highlight={winRateHighlight} />
            <StatCard
              label="Tier"
              value={
                user.role === "ADMIN"
                  ? "Admin"
                  : entitlements.tier.charAt(0) + entitlements.tier.slice(1).toLowerCase()
              }
            />
          </div>

          {!performanceVisible && (
            <p
              data-testid="dashboard-performance-collecting"
              className="mb-6 rounded-lg border border-white/[0.10] bg-white/[0.02] px-4 py-3 text-xs text-ink-400"
            >
              {performancePolicy.publicMessage}
            </p>
          )}
          {performanceVisible && (
            <p className="mb-6 text-[11px] text-ink-500">
              Only fully-settled verified picks are counted. Pushes are
              reported separately. Pending and early-period picks are
              excluded.
            </p>
          )}

          {/* Today's picks list */}
          <section className="mb-6 rounded-2xl border border-white/[0.10] bg-white/[0.03] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-500">
                Today's picks
              </h2>
              <Link
                href="/board"
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                View all →
              </Link>
            </div>
            {todayPicks.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">
                No picks generated yet today. Check back after the ingestion
                worker runs.
              </p>
            ) : (
              <ul className="divide-y divide-titanium">
                {todayPicks.map((p) => (
                  <PickRow key={p.id} pick={p} showConfidence={entitlements.canSeeConfidence || p.tier === "FREE"} />
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ink-500">
                Quick Links
              </h2>
              <nav className="flex flex-col gap-1">
                {[
                  { href: "/picks", label: "Today's Picks" },
                  { href: "/performance", label: "Performance" },
                  { href: "/pricing", label: "View Plans" },
                  { href: "/blog", label: "Analysis Blog" },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-400 hover:bg-white/[0.08] hover:text-white"
                  >
                    {label}
                    <span className="text-ink-500">{`→`}</span>
                  </Link>
                ))}
              </nav>
            </section>

            <section className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ink-500">
                Where we are
              </h2>
              <p className="text-sm text-ink-300">{performancePolicy.publicMessage}</p>
              <p className="mt-3 text-[11px] text-ink-500">
                Pick generation, ingestion, and settlement are running.
                Your verified record will populate as canonical picks
                settle. We do not publish a win rate until we have a
                meaningful sample.
              </p>
              <p
                data-testid="dashboard-last-sync"
                className="mt-3 text-[10px] uppercase tracking-widest text-ink-500"
              >
                As of {format(new Date(), "MMM d, yyyy · h:mm a")}
              </p>
            </section>
          </div>

          <div className="mt-8">
            <RiskDisclosure variant="card" includePastPerformance />
          </div>
        </div>
      </main>
    </div>
  );
}

function SampleDataBanner() {
  return (
    <div
      data-testid="sample-data-banner"
      role="status"
      aria-live="polite"
      className="mb-4 flex items-start gap-3 rounded-xl border border-caution/40 bg-caution/10 p-3 text-xs"
    >
      <span className="mt-0.5 rounded-md bg-caution/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution">
        Sample data
      </span>
      <p className="flex-1 leading-relaxed text-caution/90">
        These picks are deterministic samples shown while live ingestion is
        being wired up. They never settle, they never count toward a
        verified record, and no win-rate claim is published from them.
      </p>
    </div>
  );
}

function PickRow({ pick, showConfidence }: { pick: TodayPick; showConfidence: boolean }) {
  const homeAway = `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`;
  const conf = Math.max(0, Math.min(100, pick.confidence));
  // Color for confidence bar
  const confBarColor =
    conf >= 80 ? "bg-verify" : conf >= 70 ? "bg-orbital-cyan" : conf >= 60 ? "bg-plasma" : "bg-white/[0.08]";

  return (
    <li className="group flex items-start justify-between gap-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          <span
            data-testid="dashboard-sport-pill"
            className="mr-2 rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-400"
          >
            {pick.game.sport.name}
          </span>
          {pick.selection}
          {pick.isFeatured && (
            <span className="ml-2 rounded bg-plasma/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-plasma">
              Featured
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-500">{homeAway}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-500 italic">
          {pick.reasoningShort}
        </p>
        {showConfidence && (
          <div className="mt-1.5 flex items-center gap-2">
            <div
              data-testid="confidence-bar"
              aria-label={`Confidence ${pick.confidence}%`}
              className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.08]"
            >
              <div
                className={`h-full rounded-full ${confBarColor} transition-all duration-500`}
                style={{ width: `${conf}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-ink-400 tabular-nums">{conf}%</span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        <GradeBadge grade={pick.pickGrade} />
        {!showConfidence && (
          <Link
            href="/pricing"
            className="text-[10px] font-semibold uppercase tracking-widest text-brand-400 transition-colors hover:text-plasma"
          >
            Conf · Pro
          </Link>
        )}
        {showConfidence && pick.edgeScore > 0 && (
          <span
            data-testid="edge-score"
            aria-label={`Edge score ${pick.edgeScore.toFixed(1)}`}
            className="rounded-full bg-verify/10 px-2 py-0.5 text-[10px] font-bold text-verify"
          >
            +{pick.edgeScore.toFixed(1)} edge
          </span>
        )}
        <span className="text-[10px] uppercase tracking-widest text-ink-500">
          {pick.riskLevel.replace(/_/g, " ")}
        </span>
      </div>
    </li>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    ELITE_PLAY:  "bg-plasma/10 text-plasma shadow-[0_0_8px_rgba(255,45,214,0.4)]",
    STRONG_PLAY: "bg-verify/10 text-verify",
    SOLID_PLAY:  "bg-orbital-cyan/10 text-orbital-cyan",
    LEAN:        "bg-white/[0.08] text-ink-400",
    // Legacy letter grades (backwards-compatible)
    A: "bg-verify/15 text-verify",
    B: "bg-orbital-cyan/15 text-orbital-cyan",
    C: "bg-white/[0.08] text-ink-400",
  };
  const label: Record<string, string> = {
    ELITE_PLAY:  "Elite",
    STRONG_PLAY: "Strong",
    SOLID_PLAY:  "Solid",
    LEAN:        "Lean",
  };
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-[10px] font-bold",
        styles[grade] ?? "bg-white/[0.08] text-ink-400",
      ].join(" ")}
    >
      {label[grade] ?? grade}
    </span>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4 transition-shadow",
        highlight
          ? "border-verify/30 bg-verify/5 shadow-[0_0_20px_rgba(95,217,163,0.12)]"
          : "border-white/[0.10] bg-white/[0.03]",
      ].join(" ")}
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${highlight ? "text-verify" : "text-white"}`}>{value}</p>
    </div>
  );
}
