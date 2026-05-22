import Link from "next/link";
import { auth } from "@/lib/auth";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
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
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-200">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Sign in required</h1>
          <p className="mt-2 text-sm text-gray-400">
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
  ] = await Promise.all([
    db.pick
      .findMany({
        where: {
          isPublished: true,
          isBootstrap: false,
          generatedAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
        },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: [{ isFeatured: "desc" }, { confidence: "desc" }],
        take: 6,
      })
      .catch(() => [] as unknown[]) as Promise<TodayPick[]>,
    db.pick
      .count({
        where: {
          isPublished: true,
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
        },
      })
      .catch(() => 0),
    db.pick.count({ where: { result: "WIN", isPublished: true, isBootstrap: false } }).catch(() => 0),
    db.pick.count({ where: { result: "LOSS", isPublished: true, isBootstrap: false } }).catch(() => 0),
    db.pick.count({ where: { result: "PUSH", isPublished: true, isBootstrap: false } }).catch(() => 0),
    db.pick.count({ where: { result: "PENDING", isPublished: true, isBootstrap: false } }).catch(() => 0),
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
    <div className="flex min-h-screen flex-col bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-white">
            {BRAND_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/picks" className="hover:text-white">Picks</Link>
            <Link href="/performance" className="hover:text-white">Performance</Link>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">{user.email}</span>
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
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {demoActive && (
                <span
                  data-testid="dashboard-sample-mode"
                  aria-label="Sample mode — picks are deterministic samples, not live data"
                  className="rounded-md bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300"
                  title="Stub mode + demo samples — picks shown are deterministic samples, not live model output."
                >
                  Sample mode
                </span>
              )}
              <span className="rounded-full bg-gray-700 px-3 py-1 text-sm font-semibold text-gray-300">
                {user.role === "ADMIN" ? "Admin" : "Member"}
              </span>
            </div>
          </div>

          {demoActive && <SampleDataBanner />}

          <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Today's Picks" value={todayPicksCount.toString()} />
            <StatCard label="Verified Record" value={recordDisplay} />
            <StatCard label="Win Rate" value={winRateDisplay} highlight={winRateHighlight} />
            <StatCard label="Tier" value={user.role === "ADMIN" ? "Admin" : "Member"} />
          </div>

          {!performanceVisible && (
            <p
              data-testid="dashboard-performance-collecting"
              className="mb-6 rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3 text-xs text-gray-400"
            >
              {performancePolicy.publicMessage}
            </p>
          )}
          {performanceVisible && (
            <p className="mb-6 text-[11px] text-gray-600">
              Only fully-settled verified picks are counted. Pushes are
              reported separately. Pending and early-period picks are
              excluded.
            </p>
          )}

          {/* Today's picks list */}
          <section className="mb-6 rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
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
              <p className="py-6 text-center text-sm text-gray-500">
                No picks generated yet today. Check back after the ingestion
                worker runs.
              </p>
            ) : (
              <ul className="divide-y divide-gray-800">
                {todayPicks.map((p) => (
                  <PickRow key={p.id} pick={p} />
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
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
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    {label}
                    <span className="text-gray-700">{`→`}</span>
                  </Link>
                ))}
              </nav>
            </section>

            <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
                Where we are
              </h2>
              <p className="text-sm text-gray-300">{performancePolicy.publicMessage}</p>
              <p className="mt-3 text-[11px] text-gray-600">
                Pick generation, ingestion, and settlement are running.
                Your verified record will populate as canonical picks
                settle. We do not publish a win rate until we have a
                meaningful sample.
              </p>
              <p
                data-testid="dashboard-last-sync"
                className="mt-3 text-[10px] uppercase tracking-widest text-gray-700"
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
      className="mb-4 flex items-start gap-3 rounded-xl border border-yellow-900 bg-yellow-950/30 p-3 text-xs"
    >
      <span className="mt-0.5 rounded-md bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300">
        Sample data
      </span>
      <p className="flex-1 text-yellow-200/90 leading-relaxed">
        These picks are deterministic samples shown while live ingestion is
        being wired up. They never settle, they never count toward a
        verified record, and no win-rate claim is published from them.
      </p>
    </div>
  );
}

function PickRow({ pick }: { pick: TodayPick }) {
  const homeAway = `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`;
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          <span
            data-testid="dashboard-sport-pill"
            className="mr-2 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400"
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
        <p className="truncate text-xs text-gray-500">
          {homeAway} · {pick.game.sport.name}
        </p>
        <p className="truncate text-[11px] text-gray-600">
          {pick.reasoningShort}
        </p>
        <div
          data-testid="confidence-bar"
          aria-label={`Confidence ${pick.confidence}%`}
          className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-800"
        >
          <div
            className="h-full bg-brand-500/60"
            style={{ width: `${Math.max(0, Math.min(100, pick.confidence))}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <GradeBadge grade={pick.pickGrade} />
        <span className="text-xs text-gray-400">
          {pick.confidence}% conf
        </span>
        {pick.edgeScore > 0 && (
          <span
            data-testid="edge-score"
            aria-label={`Edge score ${pick.edgeScore.toFixed(1)}`}
            className="rounded bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300"
          >
            +{pick.edgeScore.toFixed(1)} edge
          </span>
        )}
        <span className="text-[10px] uppercase tracking-widest text-gray-600">
          {pick.riskLevel}
        </span>
      </div>
    </li>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    A: "bg-green-900/40 text-green-300",
    B: "bg-blue-900/40 text-blue-300",
    C: "bg-gray-800 text-gray-400",
  };
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-xs font-bold",
        styles[grade] ?? "bg-gray-800 text-gray-400",
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
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-green-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
