import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import type { JarvisAssessment, JarvisHealth, JarvisLaunchStatus } from "@/lib/cockpit/jarvis";
import type { PublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";

/**
 * Cockpit Overview — the Jarvis launch observatory.
 *
 * Read-only. Synthesizes launch-readiness from live evidence (or empty
 * stub data when no DB is connected). Failures are caught so the page
 * always renders.
 */

export const dynamic = "force-dynamic";

export default async function CockpitOverview() {
  const gates = getReadinessGates();
  const stubMode = isStubMode();
  const demoActive = stubMode && isDemoPicksEnabled();
  const now = new Date();

  const todayPicksForOperator = await db.pick
    .count({
      where: {
        isPublished: true,
        generatedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    })
    .catch(() => 0);

  const todaysOperatorPicks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        generatedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: [{ isFeatured: "desc" }, { confidence: "desc" }],
      take: 12,
    })
    .catch(() => [] as unknown[]) as Array<{
      id: string;
      selection: string;
      confidence: number;
      pickGrade: string;
      riskLevel: string;
      isFeatured: boolean;
      result: string;
      game: { homeTeamName: string; awayTeamName: string; sport: { name: string } };
    }>;

  const sportBreakdown = new Map<string, number>();
  for (const p of todaysOperatorPicks) {
    sportBreakdown.set(p.game.sport.name, (sportBreakdown.get(p.game.sport.name) ?? 0) + 1);
  }
  const slateBreakdown = Array.from(sportBreakdown.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, n }));

  const featuredOperatorPicks = todaysOperatorPicks.filter((p) => p.isFeatured);

  let jarvis: { assessment: JarvisAssessment; performancePolicy: PublicPerformancePolicy } | null = null;
  let jarvisError: string | null = null;
  try {
    jarvis = await loadJarvisAssessment();
  } catch (err) {
    jarvisError = err instanceof Error ? err.message : "Jarvis synthesis failed.";
  }

  const assessment = jarvis?.assessment;
  const policy = jarvis?.performancePolicy;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Jarvis Launch Observatory</h1>
          {stubMode && (
            <span
              className="rounded-md bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300"
              title="DATABASE_URL not configured — using empty-result stub. All counts will read 0."
            >
              Stub Mode · No DB
            </span>
          )}
          {assessment && <LaunchStatusBadge status={assessment.launchStatus} />}
          <span
            data-testid="jarvis-today-picks"
            aria-label="Picks generated today"
            className="rounded-md bg-gray-800/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-200"
            title="Picks generated today (sample data while stub mode is active)"
          >
            Today's picks: {todayPicksForOperator}
            {demoActive ? " (sample)" : ""}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Read-only operator surface. Refresh to recompute.{" "}
          <span className="text-gray-600">Last computed: {now.toLocaleTimeString()}</span>
        </p>
      </header>

      {jarvisError && (
        <section className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
          <p className="font-semibold">Jarvis synthesis failed.</p>
          <p className="mt-1 text-red-400/80">{jarvisError}</p>
          <p className="mt-2 text-xs text-red-400/60">
            The cockpit still renders. Check the DB connection and the ingestion worker logs.
          </p>
        </section>
      )}

      {assessment && (
        <section
          data-testid="jarvis-assessment"
          className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6"
        >
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white">Assessment:</span>{" "}
            {assessment.oneSentenceAssessment}
          </p>
          <p data-testid="cockpit-generated-at" className="mt-2 text-[10px] uppercase tracking-widest text-gray-600">
            Last sync {now.toLocaleString()} ·{" "}
            <Link
              href="/cockpit"
              data-testid="cockpit-refresh-link"
              prefetch={false}
              className="text-brand-400 hover:text-brand-300"
            >
              refresh now
            </Link>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Confidence:{" "}
            <span className="text-gray-300">{assessment.confidenceLevel}</span>
            {" · "}
            Gates open:{" "}
            <span className="text-gray-300">
              {assessment.readinessGateSummary.openCount} of{" "}
              {assessment.readinessGateSummary.totalCount}
            </span>
          </p>
        </section>
      )}

      {assessment && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Public surface", assessment.publicSurfaceStatus],
              ["Customer dashboard", assessment.customerDashboardStatus],
              ["Picks", assessment.picksStatus],
              ["Performance", assessment.performanceStatus],
              ["Cockpit", assessment.cockpitStatus],
              ["Historical picks", assessment.historicalPickStatus],
              ["Ingestion", assessment.ingestionStatus],
              ["Settlement", assessment.settlementStatus],
              ["Canonical history", assessment.canonicalHistoryStatus],
              ["Bootstrap", assessment.bootstrapStatus],
              ["Signal coverage", assessment.signalCoverageStatus],
            ] as ReadonlyArray<[string, JarvisHealth]>
          ).map(([label, health]) => (
            <HealthTile key={label} label={label} health={health} />
          ))}
        </section>
      )}

      {policy && (
        <section
          data-testid="cockpit-public-performance"
          className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
        >
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Public performance policy
          </h2>
          <p className="text-sm text-gray-300">{policy.publicMessage}</p>
          <p className="mt-2 text-xs text-gray-500">
            Operator: <span className="text-gray-300">{policy.operatorMessage}</span>
          </p>
          {policy.minimumRequirements.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-gray-400">
              {policy.minimumRequirements.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {assessment && assessment.safetyWarnings.length > 0 && (
        <section className="rounded-2xl border border-red-900/60 bg-red-950/20 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">
            Safety warnings
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-200">
            {assessment.safetyWarnings.map((w: string, i: number) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {assessment && assessment.externalConfigWarnings.length > 0 && (
        <section className="rounded-2xl border border-yellow-900/60 bg-yellow-950/20 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-400">
            External config warnings
          </h2>
          <ul className="grid grid-cols-1 gap-1 text-xs text-yellow-200 sm:grid-cols-2">
            {assessment.externalConfigWarnings.map((k: string, i: number) => (
              <li key={i} className="font-mono">
                {k}
              </li>
            ))}
          </ul>
        </section>
      )}

      {assessment && assessment.missingPhaseWarnings.length > 0 && (
        <section className="rounded-2xl border border-orange-900/60 bg-orange-950/20 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-orange-400">
            Missing-phase warnings
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-orange-200">
            {assessment.missingPhaseWarnings.map((m: string, i: number) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      {assessment && assessment.recommendedNextActions.length > 0 && (
        <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Recommended next actions
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-200">
            {assessment.recommendedNextActions.map((a: string, i: number) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </section>
      )}

      {assessment && (
        <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Phase matrix
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {assessment.phaseMatrix.map((p) => (
              <div
                key={p.key}
                className="rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2"
              >
                <p className="text-xs font-semibold text-gray-300">{p.label}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-600">
                  {p.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Readiness gates
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 sm:grid-cols-3">
          <GateRow label="canPersistCanonicalHistory" value={gates.canPersistCanonicalHistory} />
          <GateRow label="canUseDerivedHistory" value={gates.canUseDerivedHistory} />
          <GateRow label="canExposePublicPicks" value={gates.canExposePublicPicks} />
          <GateRow label="canPromoteFeaturedPicks" value={gates.canPromoteFeaturedPicks} />
          <GateRow label="canExposePerformanceStats" value={gates.canExposePerformanceStats} />
          <GateRow label="canPublishContent" value={gates.canPublishContent} />
          <GateRow label="canLearnFromOutcomes" value={gates.canLearnFromOutcomes} />
          <GateRow label="isBootstrapMode" value={gates.isBootstrapMode} />
        </div>
        <p className="mt-3 text-[11px] text-gray-600">
          minSettledPicksForLearning ={" "}
          <span className="text-gray-400">{gates.minSettledPicksForLearning}</span>
        </p>
      </section>

      {slateBreakdown.length > 0 && (
        <section
          data-testid="cockpit-slate-meta"
          aria-label="Today's slate breakdown by sport"
          className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Today's slate
          </p>
          <p className="mt-1 text-sm text-gray-300">
            {slateBreakdown
              .map((b) => `${b.name} ${b.n}`)
              .join("  ·  ")}
          </p>
          {featuredOperatorPicks.length > 0 && (
            <p
              data-testid="featured-count"
              className="mt-2 text-[11px] text-gray-500"
            >
              Featured today: {featuredOperatorPicks.length} — {" "}
              {featuredOperatorPicks
                .map((p) => p.selection.replace(/\s+[-+]?\d.*$/, ""))
                .join(", ")}
            </p>
          )}
        </section>
      )}

      {todaysOperatorPicks.length > 0 && (
        <section
          data-testid="cockpit-today-picks-list"
          className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Today's picks the operator surface is publishing
              {demoActive && (
                <span className="ml-2 rounded bg-yellow-900/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-yellow-300">
                  sample
                </span>
              )}
            </h2>
            <Link
              href="/cockpit/history"
              className="text-[11px] text-brand-400 hover:text-brand-300"
            >
              Full ledger →
            </Link>
          </div>
          <ul className="divide-y divide-gray-800/60 text-sm">
            {todaysOperatorPicks.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-200">
                    {p.selection}
                    {p.isFeatured && (
                      <span className="ml-2 rounded bg-brand-900/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-300">
                        Featured
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    {p.game.awayTeamName} @ {p.game.homeTeamName} ·{" "}
                    {p.game.sport.name} ·{" "}
                    <span className="text-gray-400">
                      {p.pickGrade.replace("_", " ").toLowerCase()}
                    </span>{" "}
                    ·{" "}
                    <span className="text-gray-400">
                      {p.riskLevel.replace("_", " ").toLowerCase()}
                    </span>
                  </p>
                </div>
                <span className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-gray-300">
                  {p.confidence}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <JarvisAutoRefresh />

      <nav className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/cockpit/history"
          className="rounded-lg border border-gray-800 px-3 py-2 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60"
        >
          Pick history →
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-800 px-3 py-2 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60"
        >
          Customer dashboard →
        </Link>
        <Link
          href="/performance"
          className="rounded-lg border border-gray-800 px-3 py-2 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60"
        >
          Performance →
        </Link>
      </nav>
    </div>
  );
}

function LaunchStatusBadge({ status }: { status: JarvisLaunchStatus }) {
  const styles: Record<JarvisLaunchStatus, string> = {
    LAUNCH_READY: "bg-green-900/40 text-green-300",
    LAUNCH_READY_PENDING_EXTERNAL_CONFIG: "bg-yellow-900/40 text-yellow-300",
    NOT_READY_DATA: "bg-orange-900/40 text-orange-300",
    NOT_READY_VALIDATION: "bg-red-900/40 text-red-300",
    NOT_READY_SAFETY: "bg-red-900/40 text-red-300",
    UNKNOWN: "bg-gray-800 text-gray-400",
  };
  return (
    <span
      className={[
        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
        styles[status],
      ].join(" ")}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function HealthTile({ label, health }: { label: string; health: JarvisHealth }) {
  const styles: Record<JarvisHealth, string> = {
    GREEN: "border-green-900 bg-green-950/30 text-green-300",
    AMBER: "border-yellow-900 bg-yellow-950/30 text-yellow-300",
    RED: "border-red-900 bg-red-950/30 text-red-300",
    UNKNOWN: "border-gray-800 bg-gray-900/40 text-gray-400",
  };
  return (
    <div
      role="status"
      aria-label={`${label}: ${health.toLowerCase()}`}
      className={[
        "rounded-xl border px-3 py-2 text-xs",
        styles[health],
      ].join(" ")}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest opacity-80">
        {health}
      </p>
    </div>
  );
}

function GateRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-1.5">
      <span className="font-mono">{label}</span>
      <span
        className={value ? "font-bold text-green-400" : "text-gray-500"}
        aria-label={value ? "enabled" : "disabled"}
      >
        {value ? "ON" : "off"}
      </span>
    </div>
  );
}


/**
 * Client-side auto-refresh: reload the cockpit every 60 seconds so the
 * operator sees fresh Jarvis output without having to hit reload. Stops
 * if the document goes hidden (tab background).
 */
function JarvisAutoRefresh() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              if (document.hidden) return;
              setTimeout(function() {
                if (!document.hidden) location.reload();
              }, 60000);
            } catch (_) {}
          })();
        `,
      }}
    />
  );
}
