import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import type { JarvisAssessment, JarvisHealth, JarvisLaunchStatus } from "@/lib/cockpit/jarvis";
import type { PublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import {
  buildOwnerSummary,
  type OwnerSummary,
  type OwnerStatusColor,
  type DepartmentSummary,
  type OwnerDecision,
  type PerformanceSummary,
  type PicksSummary,
  type AiOpsSummary,
} from "@/lib/cockpit/owner-summary";
import { AskJarvisPanel } from "@/components/cockpit/ask-jarvis-panel";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CockpitOverview() {
  const gates = getReadinessGates();
  const stubMode = isStubMode();
  const demoActive = isDemoPicksEnabled() && stubMode;
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

  let jarvis: { assessment: JarvisAssessment; performancePolicy: PublicPerformancePolicy } | null =
    null;
  let jarvisError: string | null = null;
  try {
    jarvis = await loadJarvisAssessment();
  } catch (err) {
    jarvisError = err instanceof Error ? err.message : "Jarvis synthesis failed.";
  }

  const assessment = jarvis?.assessment;
  const policy = jarvis?.performancePolicy;

  const ownerSummary: OwnerSummary | null =
    jarvis
      ? buildOwnerSummary({
          assessment: jarvis.assessment,
          performancePolicy: jarvis.performancePolicy,
          gates,
          todayPickCount: todayPicksForOperator,
        })
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Owner Command Strip ────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-white">Jarvis Owner OS</h1>
          {stubMode && (
            <span className="rounded-md bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300">
              Stub Mode · No DB
            </span>
          )}
          {ownerSummary && <StatusPill color={ownerSummary.overallColor} />}
          {assessment && <LaunchStatusBadge status={assessment.launchStatus} />}
          <span
            data-testid="jarvis-today-picks"
            aria-label="Picks generated today"
            className="rounded-md bg-gray-800/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-200"
            title="Picks generated today (sample data while stub mode is active)"
          >
            Today&apos;s picks: {todayPicksForOperator}
            {demoActive ? " (sample)" : ""}
          </span>
          <span className="text-[10px] text-gray-600">{now.toLocaleTimeString()}</span>
        </div>
        {ownerSummary && (
          <p className="text-sm text-gray-300">{ownerSummary.oneLiner}</p>
        )}
      </header>

      {/* ── Synthesis error ───────────────────────────────────────────── */}
      {jarvisError && (
        <section className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
          <p className="font-semibold">Jarvis synthesis failed.</p>
          <p className="mt-1 text-red-400/80">{jarvisError}</p>
          <p className="mt-2 text-xs text-red-400/60">
            The cockpit still renders. Check the DB connection and ingestion worker logs.
          </p>
        </section>
      )}

      {/* ── Zone 1: Status Grid ───────────────────────────────────────── */}
      {ownerSummary && (
        <section
          data-testid="owner-status-grid"
          className="grid gap-4 sm:grid-cols-3"
        >
          <StatusCard
            label="Picks Desk"
            badge={ownerSummary.picks.isPublicGateOpen ? "Gate Open" : "Gate Closed"}
            badgeTone={ownerSummary.picks.isPublicGateOpen ? "green" : "amber"}
            lines={[
              `Today: ${ownerSummary.picks.today} published`,
              `Canonical settled: ${ownerSummary.picks.canonicalSettled}`,
              `Pending: ${ownerSummary.picks.canonicalPending}`,
            ]}
            href="/cockpit/history"
          />
          <StatusCard
            label="Performance"
            badge={ownerSummary.performance.displaySafe ? "Display-Ready" : "Gated"}
            badgeTone={ownerSummary.performance.displaySafe ? "green" : "amber"}
            lines={[
              `Target: ${ownerSummary.performance.targetPct}% (internal goal)`,
              ownerSummary.performance.displaySafe && ownerSummary.performance.actualWinRate !== null
                ? `Win rate: ${ownerSummary.performance.actualWinRate}%`
                : `Sample: ${ownerSummary.performance.canonicalSampleSize}/${ownerSummary.performance.minimumRequired}`,
              ownerSummary.performance.remainingToThreshold > 0
                ? `Need ${ownerSummary.performance.remainingToThreshold} more picks`
                : "Threshold met",
            ]}
            href="/cockpit/calibration"
          />
          <StatusCard
            label="Pipeline"
            badge={assessment?.ingestionStatus === "GREEN" ? "Healthy" : assessment?.ingestionStatus === "RED" ? "Issues" : "Amber"}
            badgeTone={assessment?.ingestionStatus === "GREEN" ? "green" : assessment?.ingestionStatus === "RED" ? "red" : "amber"}
            lines={[
              `Ingestion: ${assessment?.ingestionStatus ?? "UNKNOWN"}`,
              `Settlement: ${assessment?.settlementStatus ?? "UNKNOWN"}`,
              `Signal: ${assessment?.signalCoverageStatus ?? "UNKNOWN"}`,
            ]}
            href="/admin/dashboard"
          />
        </section>
      )}

      {/* ── Zone 2: Decision Queue ────────────────────────────────────── */}
      {ownerSummary && ownerSummary.decisions.length > 0 && (
        <DecisionQueueZone decisions={ownerSummary.decisions} />
      )}

      {/* ── Zone 3: Picks Desk ────────────────────────────────────────── */}
      {ownerSummary && (
        <PicksDeskZone
          picks={ownerSummary.picks}
          demoActive={demoActive}
          slateBreakdown={slateBreakdown}
          featuredCount={featuredOperatorPicks.length}
        />
      )}

      {/* ── Zone 4: 70% Target ───────────────────────────────────────── */}
      {ownerSummary && (
        <PerformanceTargetZone performance={ownerSummary.performance} />
      )}

      {/* ── Zone 5: Departments ──────────────────────────────────────── */}
      {ownerSummary && (
        <DepartmentsZone departments={ownerSummary.departments} />
      )}

      {/* ── Zone 6: Ask Jarvis ───────────────────────────────────────── */}
      {ownerSummary && <AskJarvisPanel summary={ownerSummary} />}

      {/* ── Zone 7: AI Ops ───────────────────────────────────────────── */}
      {ownerSummary && <AiOpsZone aiOps={ownerSummary.aiOps} />}

      {/* ── Zone 8: Drilldowns (existing detail) ─────────────────────── */}
      <div className="mt-2 border-t border-gray-800/60 pt-6">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          Detail / Drilldowns
        </p>

        {/* Safety + config warnings */}
        {assessment && assessment.safetyWarnings.length > 0 && (
          <section className="mb-4 rounded-2xl border border-red-900/60 bg-red-950/20 p-5">
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
          <section className="mb-4 rounded-2xl border border-yellow-900/60 bg-yellow-950/20 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-yellow-400">
              External config warnings
            </h2>
            <ul className="grid grid-cols-1 gap-1 text-xs text-yellow-200 sm:grid-cols-2">
              {assessment.externalConfigWarnings.map((k: string, i: number) => (
                <li key={i} className="font-mono">{k}</li>
              ))}
            </ul>
          </section>
        )}

        {assessment && assessment.missingPhaseWarnings.length > 0 && (
          <section className="mb-4 rounded-2xl border border-orange-900/60 bg-orange-950/20 p-5">
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

        {/* Health tiles */}
        {assessment && (
          <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Performance policy detail */}
        {policy && (
          <section
            data-testid="cockpit-public-performance"
            className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
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

        {/* Recommended actions */}
        {assessment && assessment.recommendedNextActions.length > 0 && (
          <section className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
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

        {/* Phase matrix */}
        {assessment && (
          <section className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
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

        {/* Readiness gates */}
        <section className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
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

        {/* Today's picks list */}
        {todaysOperatorPicks.length > 0 && (
          <section
            data-testid="cockpit-today-picks-list"
            className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Today's picks — operator surface
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

        {/* Slate breakdown */}
        {slateBreakdown.length > 0 && (
          <section
            data-testid="cockpit-slate-meta"
            aria-label="Today's slate breakdown by sport"
            className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Today's slate by sport
            </p>
            <p className="mt-1 text-sm text-gray-300">
              {slateBreakdown.map((b) => `${b.name} ${b.n}`).join("  ·  ")}
            </p>
            {featuredOperatorPicks.length > 0 && (
              <p data-testid="featured-count" className="mt-2 text-[11px] text-gray-500">
                Featured today: {featuredOperatorPicks.length} —{" "}
                {featuredOperatorPicks
                  .map((p) => p.selection.replace(/\s+[-+]?\d.*$/, ""))
                  .join(", ")}
              </p>
            )}
          </section>
        )}
      </div>

      {/* Jarvis confidence + gates open count */}
      {assessment && (
        <p
          data-testid="cockpit-generated-at"
          className="text-[10px] uppercase tracking-widest text-gray-600"
        >
          Jarvis {assessment.version} · confidence {assessment.confidenceLevel} · gates open{" "}
          {assessment.readinessGateSummary.openCount}/{assessment.readinessGateSummary.totalCount} ·
          last sync {now.toLocaleString()} ·{" "}
          <Link
            href="/cockpit"
            data-testid="cockpit-refresh-link"
            prefetch={false}
            className="text-brand-400 hover:text-brand-300"
          >
            refresh
          </Link>
        </p>
      )}

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

      <JarvisAutoRefresh />
    </div>
  );
}

// ─── Zone components ─────────────────────────────────────────────────────────

function StatusPill({ color }: { color: OwnerStatusColor }) {
  const styles: Record<OwnerStatusColor, string> = {
    GREEN: "bg-green-900/40 text-green-300 ring-green-700/40",
    AMBER: "bg-yellow-900/40 text-yellow-300 ring-yellow-700/40",
    RED: "bg-red-900/50 text-red-300 ring-red-700/40",
  };
  const dots: Record<OwnerStatusColor, string> = {
    GREEN: "bg-green-400",
    AMBER: "bg-yellow-300",
    RED: "bg-red-400",
  };
  return (
    <span
      data-testid="owner-status-pill"
      className={[
        "flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1",
        styles[color],
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", dots[color]].join(" ")} />
      {color}
    </span>
  );
}

function StatusCard({
  label,
  badge,
  badgeTone,
  lines,
  href,
}: {
  label: string;
  badge: string;
  badgeTone: "green" | "amber" | "red" | "unknown";
  lines: string[];
  href: string;
}) {
  const badgeStyles: Record<string, string> = {
    green: "bg-green-900/30 text-green-300",
    amber: "bg-yellow-900/30 text-yellow-300",
    red: "bg-red-900/30 text-red-300",
    unknown: "bg-gray-800 text-gray-500",
  };
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-800 bg-gray-900/40 p-4 hover:border-gray-700 hover:bg-gray-900/60"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          {label}
        </p>
        <span
          className={[
            "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest",
            badgeStyles[badgeTone],
          ].join(" ")}
        >
          {badge}
        </span>
      </div>
      <ul className="space-y-0.5">
        {lines.map((line, i) => (
          <li key={i} className="text-[11px] text-gray-300">
            {line}
          </li>
        ))}
      </ul>
    </Link>
  );
}

function DecisionQueueZone({ decisions }: { decisions: readonly OwnerDecision[] }) {
  const urgencyStyles: Record<string, string> = {
    CRITICAL: "text-red-300",
    HIGH: "text-yellow-300",
    NORMAL: "text-gray-300",
  };
  const urgencyBg: Record<string, string> = {
    CRITICAL: "bg-red-950/30 border-red-900/60",
    HIGH: "bg-yellow-950/20 border-yellow-900/60",
    NORMAL: "bg-gray-900/40 border-gray-800",
  };
  const topUrgency = decisions[0]?.urgency ?? "NORMAL";
  return (
    <section
      data-testid="decision-queue"
      className={[
        "rounded-2xl border p-5",
        urgencyBg[topUrgency],
      ].join(" ")}
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Decision Queue — {decisions.length} item{decisions.length === 1 ? "" : "s"} need your attention
      </h2>
      <ol className="space-y-2">
        {decisions.map((d, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={[
                "mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                urgencyStyles[d.urgency],
              ].join(" ")}
            >
              {d.urgency}
            </span>
            <span className="text-gray-200">{d.description}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PicksDeskZone({
  picks,
  demoActive,
  slateBreakdown,
  featuredCount,
}: {
  picks: PicksSummary;
  demoActive: boolean;
  slateBreakdown: { name: string; n: number }[];
  featuredCount: number;
}) {
  return (
    <section
      data-testid="picks-desk-zone"
      className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Where Are Our Picks?
      </h2>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PicksStatCell label="Today" value={String(picks.today)} sub={picks.isPublicGateOpen ? "public" : "internal"} />
        <PicksStatCell label="Public-Ready" value={String(picks.publicReadyCount)} sub={picks.isPublicGateOpen ? "gate open" : "gate closed"} />
        <PicksStatCell label="Canonical Settled" value={String(picks.canonicalSettled)} sub="excl. bootstrap" />
        <PicksStatCell label="Pending Settlement" value={String(picks.canonicalPending)} sub="canonical only" />
      </div>

      <p className="text-sm text-gray-300">{picks.publicReadinessExplanation}</p>

      {picks.blockedReason && (
        <p className="mt-2 text-[11px] text-yellow-300">
          Blocked: {picks.blockedReason}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
        <span>Bootstrap excluded: {picks.bootstrapExcluded}</span>
        <span>Total in system: {picks.totalInSystem}</span>
        {demoActive && <span className="text-yellow-400">DEMO_PICKS_ENABLED active</span>}
      </div>

      {slateBreakdown.length > 0 && (
        <p
          data-testid="cockpit-slate-meta"
          aria-label="Today's slate breakdown by sport"
          className="mt-3 text-[11px] text-gray-400"
        >
          Slate:{" "}
          {slateBreakdown.map((b) => `${b.name} ×${b.n}`).join(" · ")}
          {featuredCount > 0 && ` · ${featuredCount} featured`}
        </p>
      )}
    </section>
  );
}

function PicksStatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-gray-500">{sub}</p>
    </div>
  );
}

function PerformanceTargetZone({ performance }: { performance: PerformanceSummary }) {
  return (
    <section
      data-testid="performance-target-zone"
      className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        70% Target Status
      </h2>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Target</p>
          <p className="mt-1 text-lg font-bold text-white">{performance.targetPct}%</p>
          <p className="text-[10px] text-gray-500">internal goal</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Actual Win Rate</p>
          <p
            className={[
              "mt-1 text-lg font-bold",
              performance.displaySafe ? "text-white" : "text-gray-500",
            ].join(" ")}
          >
            {performance.displaySafe && performance.actualWinRate !== null
              ? `${performance.actualWinRate}%`
              : "Gated"}
          </p>
          <p className="text-[10px] text-gray-500">
            {performance.displaySafe ? `${performance.record}` : "not yet displayable"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Sample</p>
          <p className="mt-1 text-lg font-bold text-white">{performance.canonicalSampleSize}</p>
          <p className="text-[10px] text-gray-500">of {performance.minimumRequired} required</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Gate</p>
          <p
            className={[
              "mt-1 text-lg font-bold",
              performance.isGateOpen ? "text-green-400" : "text-yellow-300",
            ].join(" ")}
          >
            {performance.isGateOpen ? "Open" : "Closed"}
          </p>
          <p className="text-[10px] text-gray-500">PERFORMANCE_STATS_ENABLED</p>
        </div>
      </div>

      {!performance.displaySafe && (
        <p className="text-sm text-gray-400">
          Public performance remains gated.
          {performance.remainingToThreshold > 0 && (
            <span className="text-yellow-300">
              {" "}
              {performance.remainingToThreshold} more canonical picks needed before display threshold.
            </span>
          )}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
        <span>Bootstrap excluded: always</span>
        <span>Pending excluded: always</span>
        {performance.smallSampleWarning && (
          <span className="text-yellow-400">Small-sample warning active</span>
        )}
        {performance.gateBlockers.length > 0 && (
          <span>Blockers: {performance.gateBlockers.join(", ")}</span>
        )}
      </div>
    </section>
  );
}

function DepartmentsZone({ departments }: { departments: readonly DepartmentSummary[] }) {
  return (
    <section
      data-testid="departments-zone"
      className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Departments
      </h2>
      <div className="divide-y divide-gray-800/60">
        {departments.map((dept) => (
          <DepartmentRow key={dept.id} dept={dept} />
        ))}
      </div>
    </section>
  );
}

function DepartmentRow({ dept }: { dept: DepartmentSummary }) {
  const healthDot: Record<JarvisHealth, string> = {
    GREEN: "bg-green-400",
    AMBER: "bg-yellow-300",
    RED: "bg-red-400",
    UNKNOWN: "bg-gray-600",
  };

  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span
          className={["mt-1 h-2 w-2 flex-shrink-0 rounded-full", healthDot[dept.status]].join(" ")}
          aria-label={dept.status}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-200">{dept.name}</p>
          <p className="truncate text-[11px] text-gray-500">{dept.oneLiner}</p>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        {dept.agentDisplayName && (
          <span className="text-[10px] text-gray-600">
            {dept.agentDisplayName} · {dept.agentMode.replace("_", " ").toLowerCase()}
          </span>
        )}
        {!dept.agentDisplayName && (
          <span className="text-[10px] text-gray-600">
            {dept.agentMode.replace("_", " ").toLowerCase()}
          </span>
        )}
        {dept.actionRequired ? (
          <span className="rounded bg-yellow-900/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-yellow-300">
            Action needed
          </span>
        ) : (
          <span className="text-[10px] text-gray-700">—</span>
        )}
      </div>
    </div>
  );
}

function AiOpsZone({ aiOps }: { aiOps: AiOpsSummary }) {
  return (
    <section
      data-testid="ai-ops-zone"
      className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          AI Ops / Build Control
        </h2>
        <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">
          Telemetry: Not instrumented
        </span>
      </div>

      <p className="mb-3 text-[11px] text-gray-400">{aiOps.reason}</p>

      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        ccusage
      </p>
      <p className="mb-4 text-[11px] text-gray-300">{aiOps.ccusageNote}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Model lane policy
          </p>
          <ul className="space-y-1">
            {aiOps.modelLanePolicy.map((p, i) => (
              <li key={i} className="text-[11px] text-gray-400">
                • {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Instrument next
          </p>
          <ul className="space-y-1">
            {aiOps.toInstrumentNext.map((t, i) => (
              <li key={i} className="text-[11px] text-gray-400">
                • {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-gray-600">
        See /cockpit/api-costs for manual cost tracking ·{" "}
        <Link href="/cockpit/api-costs" className="text-brand-400 hover:text-brand-300">
          API Costs →
        </Link>
      </p>
    </section>
  );
}

// ─── Preserved drilldown primitives ──────────────────────────────────────────

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
      className={["rounded-xl border px-3 py-2 text-xs", styles[health]].join(" ")}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest opacity-80">{health}</p>
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
