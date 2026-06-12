import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import type { JarvisAssessment, JarvisHealth, JarvisLaunchStatus } from "@/lib/cockpit/jarvis";
import type { PublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import {
  buildOwnerSummary,
  type OwnerSummary,
  type DepartmentSummary,
  type OwnerDecision,
  type PerformanceSummary,
  type PicksSummary,
  type AiOpsSummary,
} from "@/lib/cockpit/owner-summary";
import { AskJarvisPanel } from "@/components/cockpit/ask-jarvis-panel";
import { CapabilitySystemMap } from "@/components/cockpit/capability-system-map";
import { AgentCouncilPanel } from "@/components/cockpit/agent-council-panel";
import { buildMemoryStatus, type MemoryStatus } from "@/lib/jarvis/intelligence-state";
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
    <div className="relative flex flex-col gap-4 pb-8">
      {/* Atmospheric backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-80 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-stadium-glow opacity-80" />
      </div>

      {/* ── MISSION CONTROL HEADER ─────────────────────────────────────── */}
      <header
        className={[
          "relative overflow-hidden rounded-2xl border bg-carbon/90",
          ownerSummary?.overallColor === "RED"
            ? "border-red-900/60 shadow-glow-plasma"
            : ownerSummary?.overallColor === "GREEN"
              ? "border-accent-900/40"
              : "border-titanium/60",
        ].join(" ")}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-stadium-glow opacity-50"
          aria-hidden="true"
        />

        <div className="relative px-6 py-5">
          {/* Identity strip */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative h-2 w-2 flex-shrink-0">
                <div className="absolute inset-0 animate-live-pulse rounded-full bg-accent-500" />
                <div className="absolute inset-0 rounded-full bg-accent-500" />
              </div>
              <h1 className="font-mono text-[9px] uppercase tracking-[0.18em] text-ion-3">
                Galaxy Sports Edge · Jarvis Owner OS
              </h1>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {stubMode && (
                <span className="rounded bg-yellow-900/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-yellow-300">
                  Stub Mode · No DB
                </span>
              )}
              {assessment && <LaunchStatusBadge status={assessment.launchStatus} />}
              <span
                data-testid="jarvis-today-picks"
                aria-label="Picks generated today"
                className="rounded bg-obsidian/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ion-2"
                title="Picks generated today (sample data while stub mode is active)"
              >
                picks: {todayPicksForOperator}{demoActive ? " (sample)" : ""}
              </span>
              <span className="font-mono text-[9px] tabular-nums text-ion-3">
                {now.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {ownerSummary ? (
            <>
              {/* Posture + one-liner + gate bar */}
              <div className="mb-5 flex flex-wrap items-start gap-6">
                {/* Large status text */}
                <div>
                  <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-ion-3">
                    Posture
                  </p>
                  <p
                    data-testid="owner-status-pill"
                    className={[
                      "text-5xl font-black leading-none tracking-tighter",
                      ownerSummary.overallColor === "GREEN"
                        ? "text-accent-500"
                        : ownerSummary.overallColor === "RED"
                          ? "text-red-400"
                          : "text-yellow-300",
                    ].join(" ")}
                  >
                    {ownerSummary.overallColor}
                  </p>
                </div>

                {/* One-liner + critical warning */}
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-ion-3">
                    Current State
                  </p>
                  <p className="text-base font-medium leading-snug text-ion-white/90">
                    {ownerSummary.oneLiner}
                  </p>
                  {ownerSummary.criticalWarnings.length > 0 && (
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-300">
                      <span className="h-1.5 w-1.5 flex-shrink-0 animate-live-pulse rounded-full bg-red-400" />
                      {ownerSummary.criticalWarnings[0]}
                    </p>
                  )}
                </div>

                {/* Gate progress */}
                {assessment && (() => {
                  const ratio = assessment.readinessGateSummary.openCount / Math.max(assessment.readinessGateSummary.totalCount, 1);
                  const barColor = ratio === 1 ? "bg-accent-500" : ratio >= 0.5 ? "bg-yellow-300" : "bg-red-400";
                  return (
                    <div className="min-w-[140px]">
                      <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-ion-3">
                        Readiness Gates
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-titanium/50">
                          <div
                            className={["h-full rounded-full transition-all", barColor].join(" ")}
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[9px] tabular-nums text-ion-2">
                          {assessment.readinessGateSummary.openCount}/
                          {assessment.readinessGateSummary.totalCount}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* QuickStat strip */}
              <div
                data-testid="owner-status-grid"
                className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-titanium/30 pt-4 sm:grid-cols-4"
              >
                <QuickStat
                  label="Picks Today"
                  value={String(ownerSummary.picks.today)}
                  sub={ownerSummary.picks.isPublicGateOpen ? "public" : "internal"}
                />
                <QuickStat
                  label="Public Gate"
                  value={ownerSummary.picks.isPublicGateOpen ? "OPEN" : "CLOSED"}
                  sub="PUBLIC_PICKS_ENABLED"
                  accent={ownerSummary.picks.isPublicGateOpen ? "cyan" : "amber"}
                />
                <QuickStat
                  label="Readiness"
                  value={
                    assessment
                      ? `${assessment.readinessGateSummary.openCount}/${assessment.readinessGateSummary.totalCount}`
                      : "—/—"
                  }
                  sub="gates open"
                />
                <QuickStat
                  label="Decisions"
                  value={String(ownerSummary.decisions.length)}
                  sub={ownerSummary.decisions.length > 0 ? "need attention" : "queue clear"}
                  accent={ownerSummary.decisions.length > 0 ? "amber" : "cyan"}
                />
              </div>
            </>
          ) : (
            <p className="text-base text-ion-3">Jarvis synthesis pending…</p>
          )}
        </div>
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

      {/* ── Zone 1: Decision Queue (interrupt priority) ───────────────── */}
      {ownerSummary && ownerSummary.decisions.length > 0 && (
        <DecisionQueueZone decisions={ownerSummary.decisions} />
      )}

      {/* ── Zone 2: Tactical Row — Picks + Performance ───────────────── */}
      {ownerSummary && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <PicksDeskZone
            picks={ownerSummary.picks}
            demoActive={demoActive}
            slateBreakdown={slateBreakdown}
            featuredCount={featuredOperatorPicks.length}
          />
          <PerformanceTargetZone performance={ownerSummary.performance} />
        </div>
      )}

      {/* ── Zone 3: Department Command Map ───────────────────────────── */}
      {ownerSummary && (
        <DepartmentsZone departments={ownerSummary.departments} />
      )}

      {/* ── Zone 4: Ask Jarvis Console ───────────────────────────────── */}
      {ownerSummary && <AskJarvisPanel summary={ownerSummary} />}

      {/* ── Zone 5: AI Ops / Build Control ───────────────────────────── */}
      {ownerSummary && <AiOpsZone aiOps={ownerSummary.aiOps} />}

      {/* ── Zone 6–8: Intelligence OS — architecture truth ──────────────
           Rendered unconditionally: the capability registry, agent council,
           and memory protocol are static truth, independent of DB state. */}
      <CapabilitySystemMap />
      <AgentCouncilPanel />
      <MemoryProtocolZone memory={buildMemoryStatus()} />

      {/* ── Zone 9: Drilldowns ───────────────────────────────────────── */}
      <div className="mt-2 border-t border-titanium/30 pt-6">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-ion-3/40">
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
                Today&apos;s picks — operator surface
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
              Today&apos;s slate by sport
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

      {/* Footer */}
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
          className="rounded-lg border border-titanium/40 px-3 py-2 text-ion-2 hover:border-titanium/70 hover:bg-carbon/60"
        >
          Pick history →
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-titanium/40 px-3 py-2 text-ion-2 hover:border-titanium/70 hover:bg-carbon/60"
        >
          Customer dashboard →
        </Link>
        <Link
          href="/performance"
          className="rounded-lg border border-titanium/40 px-3 py-2 text-ion-2 hover:border-titanium/70 hover:bg-carbon/60"
        >
          Performance →
        </Link>
      </nav>

      <JarvisAutoRefresh />
    </div>
  );
}

// ─── Mission Control primitives ───────────────────────────────────────────────

function QuickStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "cyan" | "amber" | "red";
}) {
  const valueClass =
    accent === "cyan"
      ? "text-accent-500"
      : accent === "amber"
        ? "text-yellow-300"
        : accent === "red"
          ? "text-red-400"
          : "text-ion-white";
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-mono text-[8px] uppercase tracking-widest text-ion-3">{label}</p>
      <p className={["text-xl font-black tabular-nums leading-none", valueClass].join(" ")}>
        {value}
      </p>
      <p className="text-[8px] text-ion-3">{sub}</p>
    </div>
  );
}

// ─── Zone components ─────────────────────────────────────────────────────────

function DecisionQueueZone({ decisions }: { decisions: readonly OwnerDecision[] }) {
  const topUrgency = decisions[0]?.urgency ?? "NORMAL";
  const shellClass =
    topUrgency === "CRITICAL"
      ? "border-red-900/70 bg-red-950/20 shadow-glow-plasma"
      : topUrgency === "HIGH"
        ? "border-yellow-900/60 bg-yellow-950/10"
        : "border-titanium/50 bg-carbon/80";

  return (
    <section
      data-testid="decision-queue"
      className={["rounded-2xl border p-5", shellClass].join(" ")}
    >
      <div className="mb-4 flex items-center gap-3">
        {topUrgency === "CRITICAL" && (
          <div className="relative h-2 w-2 flex-shrink-0">
            <div className="absolute inset-0 animate-live-pulse rounded-full bg-red-400" />
            <div className="absolute inset-0 rounded-full bg-red-400" />
          </div>
        )}
        <h2
          className={[
            "text-xs font-bold uppercase tracking-widest",
            topUrgency === "CRITICAL" ? "text-red-300" : "text-ion-2",
          ].join(" ")}
        >
          Decision Queue — {decisions.length} item{decisions.length === 1 ? "" : "s"} need your
          attention
        </h2>
      </div>
      <ol className="space-y-3">
        {decisions.map((d, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className={[
                "mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest",
                d.urgency === "CRITICAL"
                  ? "bg-red-950/50 text-red-300"
                  : d.urgency === "HIGH"
                    ? "bg-yellow-950/50 text-yellow-300"
                    : "bg-titanium/60 text-ion-2",
              ].join(" ")}
            >
              {d.urgency}
            </span>
            <span className="text-sm text-ion-white">{d.description}</span>
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
      className="rounded-2xl border border-accent-900/30 bg-carbon/80 p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ion-2">
            Where Are Our Picks?
          </h2>
          <p className="mt-0.5 text-[9px] leading-relaxed text-ion-3">
            {picks.publicReadinessExplanation}
          </p>
        </div>
        <span
          className={[
            "rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
            picks.isPublicGateOpen
              ? "border-accent-800/50 bg-accent-950/30 text-accent-400"
              : "border-yellow-900/40 bg-yellow-950/20 text-yellow-300",
          ].join(" ")}
        >
          {picks.isPublicGateOpen ? "Gate Open" : "Gate Closed"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PicksStatCell
          label="Today"
          value={String(picks.today)}
          sub={picks.isPublicGateOpen ? "public" : "internal"}
        />
        <PicksStatCell
          label="Public-Ready"
          value={String(picks.publicReadyCount)}
          sub={picks.isPublicGateOpen ? "gate open" : "gate closed"}
        />
        <PicksStatCell
          label="Canonical Settled"
          value={String(picks.canonicalSettled)}
          sub="excl. bootstrap"
        />
        <PicksStatCell
          label="Pending Settlement"
          value={String(picks.canonicalPending)}
          sub="canonical only"
        />
      </div>

      {picks.blockedReason && (
        <p className="mb-3 text-[11px] text-yellow-300">Blocked: {picks.blockedReason}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-ion-3">
        <span>Bootstrap excluded: {picks.bootstrapExcluded}</span>
        <span>Total in system: {picks.totalInSystem}</span>
        {demoActive && <span className="text-yellow-400">DEMO_PICKS_ENABLED active</span>}
      </div>

      {slateBreakdown.length > 0 && (
        <p
          data-testid="cockpit-slate-meta"
          aria-label="Today's slate breakdown by sport"
          className="mt-3 text-[11px] text-ion-3"
        >
          Slate: {slateBreakdown.map((b) => `${b.name} ×${b.n}`).join(" · ")}
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
    <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-ion-3">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums leading-none text-ion-white">{value}</p>
      <p className="mt-1 text-[9px] text-ion-3">{sub}</p>
    </div>
  );
}

function PerformanceTargetZone({ performance }: { performance: PerformanceSummary }) {
  return (
    <section
      data-testid="performance-target-zone"
      className="overflow-hidden rounded-2xl border border-titanium/40 bg-carbon/80 p-5"
      style={{ borderColor: "rgba(122,92,255,0.20)" }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ultraviolet">
            Performance Gate
          </h2>
          <p className="mt-0.5 text-[9px] text-ion-3">
            Internal goal · Bootstrap + pending excluded
          </p>
        </div>
        <span
          className={[
            "flex-shrink-0 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
            performance.displaySafe
              ? "border-accent-800/50 bg-accent-950/30 text-accent-400"
              : "border-yellow-900/40 bg-yellow-950/20 text-yellow-300",
          ].join(" ")}
        >
          {performance.displaySafe ? "Display-Ready" : "Gated"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-2.5">
          <p className="text-[8px] font-bold uppercase tracking-widest text-ion-3">Target</p>
          <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-ultraviolet">
            {performance.targetPct}%
          </p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-2.5">
          <p className="text-[8px] font-bold uppercase tracking-widest text-ion-3">Win Rate</p>
          <p
            className={[
              "mt-1 text-2xl font-bold tabular-nums leading-none",
              performance.displaySafe ? "text-ion-white" : "text-ion-3",
            ].join(" ")}
          >
            {performance.displaySafe && performance.actualWinRate !== null
              ? `${performance.actualWinRate}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-2.5">
          <p className="text-[8px] font-bold uppercase tracking-widest text-ion-3">Sample</p>
          <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-ion-white">
            {performance.canonicalSampleSize}
          </p>
          <p className="text-[8px] text-ion-3">of {performance.minimumRequired} req.</p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-2.5">
          <p className="text-[8px] font-bold uppercase tracking-widest text-ion-3">Gate</p>
          <p
            className={[
              "mt-1 text-2xl font-bold leading-none",
              performance.isGateOpen ? "text-accent-500" : "text-yellow-300",
            ].join(" ")}
          >
            {performance.isGateOpen ? "ON" : "OFF"}
          </p>
          <p className="text-[8px] text-ion-3">PERF_STATS_EN</p>
        </div>
      </div>

      {!performance.displaySafe && (
        <p className="text-xs text-ion-2">
          Public performance gated.
          {performance.remainingToThreshold > 0 && (
            <span className="text-yellow-300">
              {" "}
              {performance.remainingToThreshold} more canonical picks needed.
            </span>
          )}
        </p>
      )}

      {performance.displaySafe && (
        <p className="text-xs text-ion-2">
          {performance.record} · Display-safe.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] text-ion-3">
        <span>Bootstrap: excluded</span>
        <span>Pending: excluded</span>
        {performance.smallSampleWarning && (
          <span className="text-yellow-400">Small-sample warning</span>
        )}
      </div>
    </section>
  );
}

function DepartmentsZone({ departments }: { departments: readonly DepartmentSummary[] }) {
  return (
    <section
      data-testid="departments-zone"
      className="overflow-hidden rounded-2xl border border-titanium/40 bg-carbon/80"
    >
      <div className="flex items-center justify-between border-b border-titanium/30 px-5 py-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ion-2">
            Agent Command Map
          </h2>
          <p className="mt-0.5 text-[9px] text-ion-3">
            {departments.length} departments · All agents draft-only · No external actions without
            approval
          </p>
        </div>
      </div>
      <div className="divide-y divide-titanium/20">
        {departments.map((dept) => (
          <DepartmentReportRow key={dept.id} dept={dept} />
        ))}
      </div>
    </section>
  );
}

function DepartmentReportRow({ dept }: { dept: DepartmentSummary }) {
  const dotColor: Record<JarvisHealth, string> = {
    GREEN: "bg-accent-500 animate-live-pulse",
    AMBER: "bg-yellow-300",
    RED: "bg-red-400 animate-live-pulse",
    UNKNOWN: "bg-ion-3/30",
  };

  const row = (
    <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-titanium/20">
      <span
        className={["h-2 w-2 flex-shrink-0 rounded-full", dotColor[dept.status]].join(" ")}
        aria-label={dept.status}
      />
      <span className="w-36 flex-shrink-0 text-[10px] font-semibold leading-tight text-ion-white">
        {dept.name}
      </span>
      {dept.agentDisplayName && (
        <span className="hidden w-16 flex-shrink-0 font-mono text-[8px] text-ion-3/60 sm:block">
          {dept.agentDisplayName}
        </span>
      )}
      <span className="hidden flex-1 text-[10px] leading-snug text-ion-2 sm:block">
        {dept.oneLiner}
      </span>
      {dept.actionRequired && (
        <span className="flex-shrink-0 rounded bg-yellow-900/40 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-yellow-300">
          Action
        </span>
      )}
      <span className="flex-shrink-0 font-mono text-[8px] uppercase tracking-widest text-ion-3/40">
        {dept.agentMode.replace("_", " ").toLowerCase()}
      </span>
      {dept.drilldownHref && (
        <span className="flex-shrink-0 text-[10px] text-ion-3/30 transition-colors group-hover:text-ion-2">
          →
        </span>
      )}
    </div>
  );

  if (dept.drilldownHref) {
    return (
      <Link href={dept.drilldownHref} className="group block">
        {row}
      </Link>
    );
  }
  return <div>{row}</div>;
}

function AiOpsZone({ aiOps }: { aiOps: AiOpsSummary }) {
  return (
    <section
      data-testid="ai-ops-zone"
      className="overflow-hidden rounded-2xl border border-titanium/40 bg-carbon/80 p-5"
      style={{ borderColor: "rgba(122,92,255,0.18)" }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ultraviolet">
            AI Ops / Build Control
          </h2>
          <p className="mt-0.5 text-[9px] text-ion-3">
            Claude API · ccusage · Model lane policy
          </p>
        </div>
        <span className="rounded border border-titanium/40 bg-obsidian/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ion-3">
          Telemetry: Not wired
        </span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-ion-2">{aiOps.reason}</p>

      <div className="mb-4 rounded-xl border border-titanium/40 bg-obsidian/60 p-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-ion-3">ccusage</p>
        <p className="text-[10px] text-ion-2">{aiOps.ccusageNote}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-ion-3">
            Model Lane Policy
          </p>
          <ul className="space-y-1">
            {aiOps.modelLanePolicy.map((p, i) => (
              <li key={i} className="text-[10px] text-ion-2">
                · {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-ion-3">
            To Instrument Next
          </p>
          <ul className="space-y-1">
            {aiOps.toInstrumentNext.map((t, i) => (
              <li key={i} className="text-[10px] text-ion-2">
                · {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-[9px] text-ion-3">
        See /cockpit/api-costs for manual cost tracking ·{" "}
        <Link href="/cockpit/api-costs" className="text-ultraviolet hover:text-ultraviolet-glow">
          API Costs →
        </Link>
      </p>
    </section>
  );
}

function MemoryProtocolZone({ memory }: { memory: MemoryStatus }) {
  return (
    <section
      data-testid="memory-protocol-zone"
      className="overflow-hidden rounded-2xl border border-titanium/40 bg-carbon/80 p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ion-2">
            Jarvis Memory Protocol
          </h2>
          <p className="mt-0.5 text-[9px] text-ion-3">
            Persistent memory · cross-session recall · episodic decisions
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded border border-titanium/40 bg-obsidian/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ion-3">
            Memory: Not wired
          </span>
          <span className="rounded border border-titanium/40 bg-obsidian/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ion-3">
            Store: {memory.store}
          </span>
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-ion-2">{memory.truth}</p>

      <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-7">
        {[
          ["Last written", memory.lastWritten],
          ["Last recalled", memory.lastRecalled],
          ["Candidates", memory.candidatesAwaitingApproval],
          ["Conflicted", memory.conflicted],
          ["Stale", memory.stale],
          ["Expired", memory.expired],
          ["Health", memory.healthScore],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-lg border border-titanium/30 bg-obsidian/40 px-2 py-1.5 text-center"
          >
            <p className="text-[8px] font-bold uppercase tracking-widest text-ion-3">
              {label}
            </p>
            <p className="font-mono text-[10px] text-ion-2">
              {value ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 p-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-ion-3">
            Protocol Docs (version-controlled)
          </p>
          <ul className="space-y-0.5">
            {memory.protocolDocs.map((d) => (
              <li key={d} className="font-mono text-[9px] text-ion-2">
                · {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 p-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-ion-3">
            Next Action
          </p>
          <p className="text-[10px] leading-relaxed text-ion-2">{memory.nextAction}</p>
        </div>
      </div>
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
