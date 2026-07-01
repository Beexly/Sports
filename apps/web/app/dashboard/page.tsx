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

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian text-ion-1">
        <div className="rounded-2xl border border-titanium bg-carbon/60 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Sign in required</h1>
          <p className="mt-2 text-sm text-ion-2">
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
      <header className="border-b border-titanium bg-obsidian/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-white">
            {BRAND_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-xs text-ion-2">
            <Link href="/picks" className="hover:text-white">Picks</Link>
            <Link href="/performance" className="hover:text-white">Performance</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <span className="text-ion-3">|</span>
            <span className="text-ion-3">{user.email}</span>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {user.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
              </h1>
              <p className="text-sm text-ion-2">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {demoActive && (
                <span
                  data-testid="dashboard-sample-mode"
                  aria-label="Sample mode — picks are deterministic samples, not live data"
                  className="rounded-md bg-caution/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution"
                  title="Stub mode + demo samples — picks shown are deterministic samples, not live model output."
                >
                  Sample mode
                </span>
              )}
              <span className="rounded-full bg-titanium px-3 py-1 text-sm font-semibold text-ion-1">
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
              className="mb-6 rounded-lg border border-titanium bg-carbon/40 px-4 py-3 text-xs text-ion-2"
            >
              {performancePolicy.publicMessage}
            </p>
          )}
          {performanceVisible && (
            <p className="mb-6 text-[11px] text-ion-3">
              Only fully-settled verified picks are counted. Pushes are
              reported separately. Pending and early-period picks are
              excluded.
            </p>
          )}

          {/* Today's picks list */}
          <section className="mb-6 rounded-2xl border border-titanium bg-carbon/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-3">
                Today's picks
              </h2>
              <Link
                href="/picks"
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                View all →
              </Link>
            </div>
            {todayPicks.length === 0 ? (
              <p className="py-6 text-center text-sm text-ion-3">
                No picks generated yet today. Check back after the ingestion
                worker runs.
              </p>
            ) : (
              <ul className="divide-y divide-titanium">
                {todayPicks.map((p) => (
                  <PickRow key={p.id} pick={p} showConfidence={entitlements.canSeeConfidence} />
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-titanium bg-carbon/60 p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-3">
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
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ion-2 hover:bg-titanium hover:text-white"
                  >
                    {label}
                    <span className="text-ion-3">{`→`}</span>
                  </Link>
                ))}
              </nav>
            </section>

            <section className="rounded-2xl border border-titanium bg-carbon/60 p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-3">
                Where we are
              </h2>
              <p className="text-sm text-ion-1">{performancePolicy.publicMessage}</p>
              <p className="mt-3 text-[11px] text-ion-3">
                Pick generation, ingestion, and settlement are running.
                Your verified record will populate as canonical picks
                settle. We do not publish a win rate until we have a
                meaningful sample.
              </p>
              <p
                data-testid="dashboard-last-sync"
                className="mt-3 text-[10px] uppercase tracking-widest text-ion-3"
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
      <span className="mt-0.5 rounded-md bg-caution/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution">
        Sample data
      </span>
      <p className="flex-1 text-caution/90 leading-relaxed">
        These picks are deterministic samples shown while live ingestion is
        being wired up. They never settle, they never count toward a
        verified record, and no win-rate claim is published from them.
      </p>
    </div>
  );
}

function PickRow({ pick, showConfidence }: { pick: TodayPick; showConfidence: boolean }) {
  const homeAway = `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`;
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          <span
            data-testid="dashboard-sport-pill"
            className="mr-2 rounded bg-titanium px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ion-2"
          >
            {pick.game.sport.name}
          </span>
          {pick.selection}
          {pick.isFeatured && (
            <span className="ml-2 rounded bg-brand-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-300">
              Featured
            </span>
          )}
        </p>
        <p className="truncate text-xs text-ion-3">
          {homeAway} · {pick.game.sport.name}
        </p>
        <p className="truncate text-[11px] text-ion-3">
          {pick.reasoningShort}
        </p>
        {showConfidence && (
          <div
            data-testid="confidence-bar"
            aria-label={`Confidence ${pick.confidence}%`}
            className="mt-1 h-1 w-full overflow-hidden rounded-full bg-titanium"
          >
            <div
              className="h-full bg-brand-500/60"
              style={{ width: `${Math.max(0, Math.min(100, pick.confidence))}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <GradeBadge grade={pick.pickGrade} />
        {showConfidence ? (
          <span className="text-xs text-ion-2">
            {pick.confidence}% conf
          </span>
        ) : (
          <Link
            href="/pricing"
            className="text-[10px] font-semibold uppercase tracking-widest text-brand-400 hover:text-brand-300"
          >
            Conf · Pro
          </Link>
        )}
        {showConfidence && pick.edgeScore > 0 && (
          <span
            data-testid="edge-score"
            aria-label={`Edge score ${pick.edgeScore.toFixed(1)}`}
            className="rounded bg-verify/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-verify"
          >
            +{pick.edgeScore.toFixed(1)} edge
          </span>
        )}
        <span className="text-[10px] uppercase tracking-widest text-ion-3">
          {pick.riskLevel}
        </span>
      </div>
    </li>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    A: "bg-verify/15 text-verify",
    B: "bg-orbital-cyan/15 text-orbital-cyan",
    C: "bg-titanium text-ion-2",
  };
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-xs font-bold",
        styles[grade] ?? "bg-titanium text-ion-2",
      ].join(" ")}
    >
      {grade}
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
    <div className="rounded-xl border border-titanium bg-carbon/60 p-4">
      <p className="text-xs text-ion-3">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-orbital-cyan" : "text-white"}`}>{value}</p>
    </div>
  );
}
