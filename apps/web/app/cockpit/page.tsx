import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import type { JarvisAssessment, JarvisHealth, JarvisLaunchStatus } from "@/lib/cockpit/jarvis";
import type { PublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import {
  buildOwnerSummary,
  type OwnerSummary,
  type OwnerStatusColor,
  type AiOpsSummary,
} from "@/lib/cockpit/owner-summary";
import { CapabilitySystemMap } from "@/components/cockpit/capability-system-map";
import { AgentCouncilPanel } from "@/components/cockpit/agent-council-panel";
import { CockpitPulse } from "@/components/cockpit/cockpit-pulse";
import { CockpitGreeting } from "@/components/cockpit/cockpit-greeting";
import { buildJarvisOperatingAssessment, type JarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";
import { summarizeAgentHealth } from "@/lib/agents/agent-health";
import { buildLiveMemoryStatus, type MemoryStatus } from "@/lib/jarvis/intelligence-state";
import { buildLiveLedgerStatus } from "@/lib/jarvis/ledger-types";
import { Atmosphere } from "@/components/ui/atmosphere";
import { loadDailyCommand } from "@/lib/cockpit/daily-command/loader";
import { buildAuthorityMatrix } from "@/lib/cockpit/daily-command/authority-matrix";
import { CommandDeck } from "@/components/cockpit/daily-command/command-deck";
import { AuthorityMatrixView } from "@/components/cockpit/daily-command/authority-matrix";
import { JarvisChat } from "@/components/cockpit/jarvis-chat";
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
  const operatingAssessment = buildJarvisOperatingAssessment();
  const agentReality = summarizeAgentHealth();

  const ownerSummary: OwnerSummary | null =
    jarvis
      ? buildOwnerSummary({
          assessment: jarvis.assessment,
          performancePolicy: jarvis.performancePolicy,
          gates,
          todayPickCount: todayPicksForOperator,
        })
      : null;

  // Daily Command — the five-lane owner console + the L0–L5 authority matrix.
  // loadDailyCommand never throws; the matrix is a pure projection.
  const command = await loadDailyCommand();
  const authorityMatrix = buildAuthorityMatrix();

  return (
    <div className="relative flex flex-col gap-4 pb-8">
      <Atmosphere />
      {/* Atmospheric backdrop — a slow ambient breath so the whole deck feels alive */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-80 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-stadium-glow opacity-80" />
        <div
          className="absolute -top-16 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-orbital-cyan/[0.07] blur-3xl"
        />
      </div>

      {/* ── Watch-live banner — the flagship motion surface ─────────────── */}
      <Link
        href="/cockpit/live"
        prefetch={false}
        className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-500/30 bg-accent-950/20 px-5 py-3 transition-colors hover:border-accent-400/50 hover:bg-accent-950/30"
      >
        <span className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-accent-400/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-400" />
          </span>
          <span className="text-sm font-semibold text-white">▶ Watch the operation live</span>
          <span className="hidden text-[11px] text-ink-400 sm:inline">
            Jarvis, gauges, agents — moving, not a wall of text
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-300 group-hover:text-accent-200">
          Open Live Command Center →
        </span>
      </Link>

      {/* ── MISSION CONTROL HEADER ─────────────────────────────────────── */}
      <header
        className={[
          "relative overflow-hidden rounded-3xl border bg-white/[0.03]/90 shadow-2xl shadow-black/30",
          ownerSummary?.overallColor === "RED"
            ? "border-rose-900/40"
            : ownerSummary?.overallColor === "GREEN"
              ? "border-accent-900/40"
              : "border-white/[0.06]",
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
              <h1 className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
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
                className="rounded bg-obsidian/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ink-400"
                title="Picks generated today (sample data while stub mode is active)"
              >
                picks: {todayPicksForOperator}{demoActive ? " (sample)" : ""}
              </span>
              <span className="font-mono text-[9px] tabular-nums text-ink-500">
                {now.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {ownerSummary ? (
            <>
              {/* Greeting + posture medallion + current state */}
              <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-center">
                <PostureMedallion
                  color={ownerSummary.overallColor}
                  open={assessment?.readinessGateSummary.openCount ?? 0}
                  total={assessment?.readinessGateSummary.totalCount ?? 0}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
                    <CockpitGreeting /> · here&apos;s where things stand
                  </p>
                  <p className="mt-2 text-xl font-medium leading-snug text-white/95 sm:text-2xl">
                    {ownerSummary.oneLiner}
                  </p>
                  {ownerSummary.criticalWarnings.length > 0 && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-rose-300">
                      <span className="h-1.5 w-1.5 flex-shrink-0 animate-live-pulse rounded-full bg-rose-400" />
                      {ownerSummary.criticalWarnings[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* QuickStat strip */}
              <div
                data-testid="owner-status-grid"
                className="grid grid-cols-2 gap-3 border-t border-white/[0.10]/30 pt-5 sm:grid-cols-4"
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
            <p className="text-base text-ink-500">Jarvis synthesis pending…</p>
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

      {/* ── Daily Command — five-lane, exception-based owner console ───── */}
      <section data-testid="daily-command" aria-label="Daily Command">
        <p
          data-testid="daily-command-headline"
          className="mb-3 text-sm font-medium text-white/90"
        >
          {command.headline}
        </p>
        <CommandDeck command={command} />
      </section>

      {/* ── Ask Jarvis — real Claude-powered, voice-capable, advisory-only ──
           Grounded in the live operating assessment via the server endpoint.
           Read-only: it never transitions tasks, publishes, or spends beyond
           the metered model call. Voice degrades to text-only when the Web
           Speech APIs are absent. */}
      <section aria-label="Ask Jarvis">
        <JarvisChat />
      </section>

      {/* ── L0–L5 Authority Matrix ───────────────────────────────────── */}
      <AuthorityMatrixView matrix={authorityMatrix} />

      {/* ── Reference layer (collapsed by default to keep the deck calm) ──
           AI Ops, the capability registry, the agent council, and the memory
           protocol are reference truth, not daily-glance. They stay rendered
           (and their live ledger/memory still load) but sit behind a single
           disclosure so the cockpit opens to a scannable summary instead of a
           stack of dense panels. */}
      <details className="group rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-400 [&::-webkit-details-marker]:hidden">
          <span>References · System internals · AI ops · capabilities · council · memory</span>
          <span aria-hidden className="text-ink-500 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="flex flex-col gap-4 px-3 pb-4 sm:px-4">
          {/* Operating runtime — the living CockpitPulse centerpiece (reference view) */}
          <OperatingRuntimeZone assessment={operatingAssessment} agentReality={agentReality} />

          {/* ── Zone 5: AI Ops / Build Control ─────────────────────────── */}
          {ownerSummary && <AiOpsZone aiOps={ownerSummary.aiOps} />}

          {/* ── Zone 6–8: Intelligence OS — architecture truth ───────────
               The capability registry, agent council, and memory protocol are
               static truth, independent of DB state. */}
          <CapabilitySystemMap />
          <AgentCouncilPanel ledger={await buildLiveLedgerStatus()} />
          <MemoryProtocolZone memory={await buildLiveMemoryStatus()} />
        </div>
      </details>

      {/* ── Zone 9: Drilldowns (collapsed by default) ────────────────────
           The full forensic detail — warnings, health tiles, readiness gates,
           phase matrix, today's picks, slate — lives behind one disclosure so
           the default view stays calm. Critical safety items are already
           surfaced up top in the Decision Queue. */}
      <details className="group mt-2 border-t border-white/[0.10]/30 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-widest text-ink-400 [&::-webkit-details-marker]:hidden">
          <span>Detail / Drilldowns · warnings · health tiles · gates · phase matrix · picks</span>
          <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-5">

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
            className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5"
          >
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              Public performance policy
            </h2>
            <p className="text-sm text-ink-300">{policy.publicMessage}</p>
            <p className="mt-2 text-xs text-ink-500">
              Operator: <span className="text-ink-300">{policy.operatorMessage}</span>
            </p>
            {policy.minimumRequirements.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-ink-400">
                {policy.minimumRequirements.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Recommended actions */}
        {assessment && assessment.recommendedNextActions.length > 0 && (
          <section className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              Recommended next actions
            </h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-300">
              {assessment.recommendedNextActions.map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </section>
        )}

        {/* Phase matrix */}
        {assessment && (
          <section className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              Phase matrix
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {assessment.phaseMatrix.map((p) => (
                <div
                  key={p.key}
                  className="rounded-lg border border-white/[0.06] bg-obsidian/50 px-3 py-2"
                >
                  <p className="text-xs font-semibold text-ink-300">{p.label}</p>
                  <p className="text-[10px] uppercase tracking-widest text-ink-500">
                    {p.status}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Readiness gates */}
        <section className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
            Readiness gates
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs text-ink-300 sm:grid-cols-3">
            <GateRow label="canPersistCanonicalHistory" value={gates.canPersistCanonicalHistory} />
            <GateRow label="canUseDerivedHistory" value={gates.canUseDerivedHistory} />
            <GateRow label="canExposePublicPicks" value={gates.canExposePublicPicks} />
            <GateRow label="canPromoteFeaturedPicks" value={gates.canPromoteFeaturedPicks} />
            <GateRow label="canExposePerformanceStats" value={gates.canExposePerformanceStats} />
            <GateRow label="canPublishContent" value={gates.canPublishContent} />
            <GateRow label="canLearnFromOutcomes" value={gates.canLearnFromOutcomes} />
            <GateRow label="isBootstrapMode" value={gates.isBootstrapMode} />
          </div>
          <p className="mt-3 text-[11px] text-ink-500">
            minSettledPicksForLearning ={" "}
            <span className="text-ink-400">{gates.minSettledPicksForLearning}</span>
          </p>
        </section>

        {/* Today's picks list */}
        {todaysOperatorPicks.length > 0 && (
          <section
            data-testid="cockpit-today-picks-list"
            className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-500">
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
            <ul className="divide-y divide-titanium/30 text-sm">
              {todaysOperatorPicks.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-300">
                      {p.selection}
                      {p.isFeatured && (
                        <span className="ml-2 rounded bg-brand-900/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-300">
                          Featured
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-ink-500">
                      {p.game.awayTeamName} @ {p.game.homeTeamName} ·{" "}
                      {p.game.sport.name} ·{" "}
                      <span className="text-ink-400">
                        {p.pickGrade.replace("_", " ").toLowerCase()}
                      </span>{" "}
                      ·{" "}
                      <span className="text-ink-400">
                        {p.riskLevel.replace("_", " ").toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <span className="rounded bg-obsidian/70 px-2 py-0.5 font-mono text-xs text-ink-300">
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
            className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
              Today&apos;s slate by sport
            </p>
            <p className="mt-1 text-sm text-ink-300">
              {slateBreakdown.map((b) => `${b.name} ${b.n}`).join("  ·  ")}
            </p>
            {featuredOperatorPicks.length > 0 && (
              <p data-testid="featured-count" className="mt-2 text-[11px] text-ink-500">
                Featured today: {featuredOperatorPicks.length} —{" "}
                {featuredOperatorPicks
                  .map((p) => p.selection.replace(/\s+[-+]?\d.*$/, ""))
                  .join(", ")}
              </p>
            )}
          </section>
        )}
        </div>
      </details>

      {/* Footer */}
      {assessment && (
        <p
          data-testid="cockpit-generated-at"
          className="text-[10px] uppercase tracking-widest text-ink-500"
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
          className="rounded-lg border border-white/[0.06] px-3 py-2 text-ink-400 hover:border-white/[0.10]/70 hover:bg-white/[0.03]"
        >
          Pick history →
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-white/[0.06] px-3 py-2 text-ink-400 hover:border-white/[0.10]/70 hover:bg-white/[0.03]"
        >
          Customer dashboard →
        </Link>
        <Link
          href="/performance"
          className="rounded-lg border border-white/[0.06] px-3 py-2 text-ink-400 hover:border-white/[0.10]/70 hover:bg-white/[0.03]"
        >
          Performance →
        </Link>
      </nav>

      <JarvisAutoRefresh />
    </div>
  );
}

// ─── Mission Control primitives ───────────────────────────────────────────────

// Thin wrapper: the living "command deck" centerpiece now lives in CockpitPulse
// (CSS-only motion, server-safe). Kept as a named seam so the call site and tests
// (data-testid="jarvis-operating-runtime") stay stable.
function OperatingRuntimeZone({
  assessment,
  agentReality,
}: {
  assessment: JarvisOperatingAssessment;
  agentReality: ReturnType<typeof summarizeAgentHealth>;
}) {
  return <CockpitPulse assessment={assessment} agentReality={agentReality} />;
}

// Posture medallion — the header's living centerpiece. A gate-fill ring (SVG,
// server-safe, no JS) colored by the honest operating posture: RED only on real
// safety/data blockers, GREEN only when genuinely LAUNCH_READY, AMBER otherwise.
function PostureMedallion({
  color,
  open,
  total,
}: {
  color: OwnerStatusColor;
  open: number;
  total: number;
}) {
  const meta: Record<OwnerStatusColor, { label: string; hex: string; glow: string }> = {
    GREEN: { label: "Ready", hex: "#34d399", glow: "rgba(52,211,153,0.30)" },
    AMBER: { label: "Holding", hex: "#fbbf24", glow: "rgba(251,191,36,0.26)" },
    RED: { label: "Blocked", hex: "#fb7185", glow: "rgba(251,113,133,0.30)" },
  };
  const m = meta[color];
  const ratio = total > 0 ? Math.min(Math.max(open / total, 0), 1) : 0;
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <div
        aria-hidden
        className="absolute h-24 w-24 rounded-full blur-2xl"
        style={{ background: m.glow }}
      />
      <svg viewBox="0 0 80 80" className="h-28 w-28 -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke={m.hex}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="h-2 w-2 rounded-full animate-live-pulse"
          style={{ background: m.hex, boxShadow: `0 0 12px ${m.hex}` }}
        />
        <span
          data-testid="owner-status-pill"
          className="mt-1.5 text-sm font-semibold text-white"
        >
          {m.label}
        </span>
        <span className="font-mono text-[9px] tabular-nums text-ink-500">
          {open}/{total} gates
        </span>
      </div>
    </div>
  );
}

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
      ? "text-accent-400"
      : accent === "amber"
        ? "text-amber-300"
        : accent === "red"
          ? "text-rose-300"
          : "text-white";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-obsidian/40 p-4 transition-colors hover:border-white/[0.10]/70">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">{label}</p>
      <p className={["mt-1 font-mono text-2xl font-semibold tabular-nums", valueClass].join(" ")}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-500">{sub}</p>
    </div>
  );
}


function AiOpsZone({ aiOps }: { aiOps: AiOpsSummary }) {
  return (
    <section
      data-testid="ai-ops-zone"
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5"
      style={{ borderColor: "rgba(122,92,255,0.18)" }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-ultraviolet">
            AI Ops / Build Control
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-500">
            Claude API · ccusage · Model lane policy
          </p>
        </div>
        <span className="rounded border border-white/[0.06] bg-obsidian/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-500">
          Telemetry: Not wired
        </span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-ink-400">{aiOps.reason}</p>

      <div className="mb-4 rounded-xl border border-white/[0.06] bg-obsidian/60 p-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-ink-500">ccusage</p>
        <p className="text-[10px] text-ink-400">{aiOps.ccusageNote}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-ink-500">
            Model Lane Policy
          </p>
          <ul className="space-y-1">
            {aiOps.modelLanePolicy.map((p, i) => (
              <li key={i} className="text-[10px] text-ink-400">
                · {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-ink-500">
            To Instrument Next
          </p>
          <ul className="space-y-1">
            {aiOps.toInstrumentNext.map((t, i) => (
              <li key={i} className="text-[10px] text-ink-400">
                · {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-[9px] text-ink-500">
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
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-400">
            Jarvis Memory Protocol
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-500">
            Persistent memory · cross-session recall · episodic decisions
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={[
              "rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
              memory.wired
                ? "border-accent-800/50 bg-accent-950/30 text-accent-400"
                : "border-white/[0.06] bg-obsidian/60 text-ink-500",
            ].join(" ")}
          >
            Memory: {memory.wired ? "Wired" : "Not wired"}
          </span>
          <span className="rounded border border-white/[0.06] bg-obsidian/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ink-500">
            Store: {memory.store}
          </span>
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-ink-400">{memory.truth}</p>

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
            className="rounded-lg border border-white/[0.10]/30 bg-obsidian/40 px-2 py-1.5 text-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
              {label}
            </p>
            <p className="font-mono text-[10px] text-ink-400">
              {value ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-obsidian/60 p-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-ink-500">
            Protocol Docs (version-controlled)
          </p>
          <ul className="space-y-0.5">
            {memory.protocolDocs.map((d) => (
              <li key={d} className="font-mono text-[9px] text-ink-400">
                · {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-obsidian/60 p-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-ink-500">
            Next Action
          </p>
          <p className="text-[10px] leading-relaxed text-ink-400">{memory.nextAction}</p>
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
    UNKNOWN: "bg-obsidian/70 text-ink-500",
  };
  return (
    <span
      className={[
        "rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-widest",
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
    UNKNOWN: "border-white/[0.06] bg-white/[0.04]/40 text-ink-400",
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
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-obsidian/50 px-3 py-1.5">
      <span className="font-mono">{label}</span>
      <span
        className={value ? "font-bold text-accent-400" : "text-ink-500"}
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
