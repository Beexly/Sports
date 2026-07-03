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
import { CapabilitySystemMap } from "@/components/cockpit/capability-system-map";
import { AgentCouncilPanel } from "@/components/cockpit/agent-council-panel";
import { CockpitPulse } from "@/components/cockpit/cockpit-pulse";
import { CockpitGreeting } from "@/components/cockpit/cockpit-greeting";
import { buildLiveMemoryStatus, type MemoryStatus } from "@/lib/jarvis/intelligence-state";
import { buildLiveLedgerStatus } from "@/lib/jarvis/ledger-types";
import { buildJarvisOperatingAssessment, type JarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";
import { summarizeAgentHealth } from "@/lib/agents/agent-health";
import { loadCommandCenterFeed } from "@/lib/command-center/feed";
import type { OwnerAttentionItem } from "@/lib/command-center/types";
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

  // Attention-first lead: reuse the Command Center's existing ranked owner-attention
  // queue (same Jarvis synthesis, same trust gates) so the overview opens with "what
  // needs you now" instead of making the owner hunt. loadCommandCenterFeed never
  // throws — on synthesis failure it returns an empty, labeled feed, so the hero
  // simply doesn't render and the rest of the deck is untouched.
  const commandFeed = await loadCommandCenterFeed();
  const topAttention = commandFeed.attention.slice(0, 2);

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

      {/* ── ATTENTION-FIRST HERO — "what needs you now" ────────────────────
           Leads the overview with the single highest-ranked owner-attention
           item (and a runner-up), drawn straight from the Command Center's
           existing ranked queue. Real score, real reason, real deep-link — no
           new data. When the queue is clear it renders a calm "all-clear" line
           instead of a blocker, so the deck still opens decisively. */}
      <AttentionFirstHero items={topAttention} total={commandFeed.counts.attentionTotal} />

      {/* ── MISSION CONTROL HEADER ─────────────────────────────────────── */}
      <header
        className={[
          "relative overflow-hidden rounded-3xl border bg-carbon/90 shadow-2xl shadow-black/30",
          ownerSummary?.overallColor === "RED"
            ? "border-alert/40"
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
              <h1 className="font-mono text-micro uppercase tracking-label text-ion-3">
                Galaxy Sports Edge · Jarvis Owner OS
              </h1>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {stubMode && (
                <span className="rounded bg-caution/10 px-2 py-0.5 text-micro font-bold uppercase tracking-widest text-caution">
                  Stub Mode · No DB
                </span>
              )}
              {assessment && <LaunchStatusBadge status={assessment.launchStatus} />}
              <span
                data-testid="jarvis-today-picks"
                aria-label="Picks generated today"
                className="rounded bg-obsidian/80 px-2 py-0.5 font-mono text-micro uppercase tracking-widest text-ion-2"
                title="Picks generated today (sample data while stub mode is active)"
              >
                picks: {todayPicksForOperator}{demoActive ? " (sample)" : ""}
              </span>
              <span className="font-mono text-micro tabular-nums text-ion-3">
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
                  <p className="font-mono text-micro uppercase tracking-label text-ion-3">
                    <CockpitGreeting /> · here&apos;s where things stand
                  </p>
                  <p className="mt-2 text-xl font-medium leading-snug text-ion-white/95 sm:text-2xl">
                    {ownerSummary.oneLiner}
                  </p>
                  {ownerSummary.criticalWarnings.length > 0 && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-alert">
                      <span className="h-1.5 w-1.5 flex-shrink-0 animate-live-pulse rounded-full bg-alert" />
                      {ownerSummary.criticalWarnings[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* QuickStat strip */}
              <div
                data-testid="owner-status-grid"
                className="grid grid-cols-2 gap-3 border-t border-titanium/30 pt-5 sm:grid-cols-4"
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
        <section className="rounded-xl border border-alert bg-alert/10 p-4 text-sm text-alert">
          <p className="font-semibold">Jarvis synthesis failed.</p>
          <p className="mt-1 text-alert/80">{jarvisError}</p>
          <p className="mt-2 text-xs text-alert/60">
            The cockpit still renders. Check the DB connection and ingestion worker logs.
          </p>
        </section>
      )}

      {/* ── Zone 1: Decision Queue (interrupt priority) ───────────────── */}
      {ownerSummary && ownerSummary.decisions.length > 0 && (
        <DecisionQueueZone decisions={ownerSummary.decisions} />
      )}

      <OperatingRuntimeZone assessment={operatingAssessment} agentReality={agentReality} />

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

      {/* ── Reference layer (collapsed by default to keep the deck calm) ──
           AI Ops, the capability registry, the agent council, and the memory
           protocol are reference truth, not daily-glance. They stay rendered
           (and their live ledger/memory still load) but sit behind a single
           disclosure so the cockpit opens to a scannable summary instead of a
           stack of dense panels. */}
      <details className="group rounded-2xl border border-titanium/40 bg-carbon/40">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ion-2 [&::-webkit-details-marker]:hidden">
          <span>System internals · AI ops · capabilities · council · memory</span>
          <span aria-hidden className="text-ion-3 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="flex flex-col gap-4 px-3 pb-4 sm:px-4">
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
      <details className="group mt-2 border-t border-titanium/30 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-label font-semibold uppercase tracking-widest text-ion-2 [&::-webkit-details-marker]:hidden">
          <span>Detail / Drilldowns · warnings · health tiles · gates · phase matrix · picks</span>
          <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-5">

        {/* Safety + config warnings */}
        {assessment && assessment.safetyWarnings.length > 0 && (
          <section className="mb-4 rounded-2xl border border-alert/60 bg-alert/20 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-alert">
              Safety warnings
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-alert">
              {assessment.safetyWarnings.map((w: string, i: number) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        {assessment && assessment.externalConfigWarnings.length > 0 && (
          <section className="mb-4 rounded-2xl border border-caution/60 bg-caution/20 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-caution">
              External config warnings
            </h2>
            <ul className="grid grid-cols-1 gap-1 text-xs text-caution sm:grid-cols-2">
              {assessment.externalConfigWarnings.map((k: string, i: number) => (
                <li key={i} className="font-mono">{k}</li>
              ))}
            </ul>
          </section>
        )}

        {assessment && assessment.missingPhaseWarnings.length > 0 && (
          <section className="mb-4 rounded-2xl border border-caution-deep/60 bg-caution-deep/20 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-caution-deep">
              Missing-phase warnings
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-caution-deep">
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
            className="mb-4 rounded-2xl border border-titanium/40 bg-eclipse/40 p-5"
          >
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
              Public performance policy
            </h2>
            <p className="text-sm text-ion-1">{policy.publicMessage}</p>
            <p className="mt-2 text-xs text-ion-3">
              Operator: <span className="text-ion-1">{policy.operatorMessage}</span>
            </p>
            {policy.minimumRequirements.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-ion-2">
                {policy.minimumRequirements.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Recommended actions */}
        {assessment && assessment.recommendedNextActions.length > 0 && (
          <section className="mb-4 rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
              Recommended next actions
            </h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ion-1">
              {assessment.recommendedNextActions.map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </section>
        )}

        {/* Phase matrix */}
        {assessment && (
          <section className="mb-4 rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
              Phase matrix
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {assessment.phaseMatrix.map((p) => (
                <div
                  key={p.key}
                  className="rounded-lg border border-titanium/40 bg-obsidian/50 px-3 py-2"
                >
                  <p className="text-xs font-semibold text-ion-1">{p.label}</p>
                  <p className="text-label uppercase tracking-widest text-ion-3">
                    {p.status}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Readiness gates */}
        <section className="mb-4 rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
            Readiness gates
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs text-ion-1 sm:grid-cols-3">
            <GateRow label="canPersistCanonicalHistory" value={gates.canPersistCanonicalHistory} />
            <GateRow label="canUseDerivedHistory" value={gates.canUseDerivedHistory} />
            <GateRow label="canExposePublicPicks" value={gates.canExposePublicPicks} />
            <GateRow label="canPromoteFeaturedPicks" value={gates.canPromoteFeaturedPicks} />
            <GateRow label="canExposePerformanceStats" value={gates.canExposePerformanceStats} />
            <GateRow label="canPublishContent" value={gates.canPublishContent} />
            <GateRow label="canLearnFromOutcomes" value={gates.canLearnFromOutcomes} />
            <GateRow label="isBootstrapMode" value={gates.isBootstrapMode} />
          </div>
          <p className="mt-3 text-label-lg text-ion-3">
            minSettledPicksForLearning ={" "}
            <span className="text-ion-2">{gates.minSettledPicksForLearning}</span>
          </p>
        </section>

        {/* Today's picks list */}
        {todaysOperatorPicks.length > 0 && (
          <section
            data-testid="cockpit-today-picks-list"
            className="mb-4 rounded-2xl border border-titanium/40 bg-eclipse/40 p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
                Today&apos;s picks — operator surface
                {demoActive && (
                  <span className="ml-2 rounded bg-caution/10 px-1.5 py-0.5 text-micro font-bold uppercase tracking-widest text-caution">
                    sample
                  </span>
                )}
              </h2>
              <Link
                href="/cockpit/history"
                className="text-label-lg text-brand-400 hover:text-brand-300"
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
                    <p className="truncate font-medium text-ion-1">
                      {p.selection}
                      {p.isFeatured && (
                        <span className="ml-2 rounded bg-brand-900/40 px-1.5 py-0.5 text-micro font-bold uppercase tracking-widest text-brand-300">
                          Featured
                        </span>
                      )}
                    </p>
                    <p className="truncate text-label-lg text-ion-3">
                      {p.game.awayTeamName} @ {p.game.homeTeamName} ·{" "}
                      {p.game.sport.name} ·{" "}
                      <span className="text-ion-2">
                        {p.pickGrade.replace("_", " ").toLowerCase()}
                      </span>{" "}
                      ·{" "}
                      <span className="text-ion-2">
                        {p.riskLevel.replace("_", " ").toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <span className="rounded bg-obsidian/70 px-2 py-0.5 font-mono text-xs text-ion-1">
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
            className="mb-4 rounded-2xl border border-titanium/40 bg-eclipse/40 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-ion-3">
              Today&apos;s slate by sport
            </p>
            <p className="mt-1 text-sm text-ion-1">
              {slateBreakdown.map((b) => `${b.name} ${b.n}`).join("  ·  ")}
            </p>
            {featuredOperatorPicks.length > 0 && (
              <p data-testid="featured-count" className="mt-2 text-label-lg text-ion-3">
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
          className="text-label uppercase tracking-widest text-ion-3"
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

      <nav aria-label="Cockpit cross-links" className="flex flex-wrap gap-2 text-xs">
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
    GREEN: { label: "Ready", hex: "var(--verify)", glow: "color-mix(in srgb, var(--verify) 30%, transparent)" },
    AMBER: { label: "Holding", hex: "var(--caution)", glow: "color-mix(in srgb, var(--caution) 26%, transparent)" },
    RED: { label: "Blocked", hex: "var(--alert)", glow: "color-mix(in srgb, var(--alert) 30%, transparent)" },
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
          className="mt-1.5 text-sm font-semibold text-ion-white"
        >
          {m.label}
        </span>
        <span className="font-mono text-micro tabular-nums text-ion-3">
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
        ? "text-caution"
        : accent === "red"
          ? "text-alert"
          : "text-ion-white";
  return (
    <div className="rounded-2xl border border-titanium/40 bg-obsidian/40 p-4 transition-colors hover:border-titanium/70">
      <p className="font-mono text-micro uppercase tracking-label text-ion-3">{label}</p>
      <p className={["mt-1 font-mono text-2xl font-semibold tabular-nums", valueClass].join(" ")}>
        {value}
      </p>
      <p className="mt-0.5 text-label-lg text-ion-3">{sub}</p>
    </div>
  );
}

// ─── Attention-first hero ────────────────────────────────────────────────────

// The overview's lead element: surfaces the top ranked owner-attention item so
// the deck opens with "what needs you now." Reuses the Command Center's existing
// ranking (score + scoreExplanation + recommendedAction + deep-link). Calm when
// the queue is clear — never manufactures urgency it can't back with a signal.
function AttentionFirstHero({
  items,
  total,
}: {
  items: readonly OwnerAttentionItem[];
  total: number;
}) {
  const lead = items[0];

  if (!lead) {
    return (
      <section
        data-testid="attention-first-hero"
        data-attention-empty="true"
        role="region"
        aria-label="What needs you now"
        className="relative overflow-hidden rounded-3xl border border-accent-900/30 bg-carbon/80 px-6 py-5"
      >
        <p className="font-mono text-micro uppercase tracking-label text-ion-3">
          What needs you now
        </p>
        <p className="mt-2 text-lg font-medium text-ion-white/95">
          Queue clear — nothing is waiting on a decision.
        </p>
        <p className="mt-1 text-[12px] text-ion-2">
          We detect. You decide. Hold the cadence — the deck below is reference, not a to-do.
        </p>
      </section>
    );
  }

  const urgencyTone =
    lead.urgency === "CRITICAL"
      ? "border-alert/70 bg-alert/10 shadow-glow-plasma"
      : lead.urgency === "HIGH"
        ? "border-caution/60 bg-caution/10"
        : "border-accent-900/40 bg-carbon/80";
  const urgencyPill =
    lead.urgency === "CRITICAL"
      ? "bg-alert/20 text-alert border-alert/60"
      : lead.urgency === "HIGH"
        ? "bg-caution/20 text-caution border-caution/50"
        : "bg-obsidian/70 text-ion-2 border-titanium/40";
  const runnerUp = items[1];

  return (
    <section
      data-testid="attention-first-hero"
      role="region"
      aria-label="What needs you now"
      className={["relative overflow-hidden rounded-3xl border px-6 py-5", urgencyTone].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {lead.urgency === "CRITICAL" && (
          <span className="relative h-2 w-2 flex-shrink-0">
            <span className="absolute inset-0 animate-live-pulse rounded-full bg-alert" />
            <span className="absolute inset-0 rounded-full bg-alert" />
          </span>
        )}
        <p className="font-mono text-micro uppercase tracking-label text-ion-3">
          What needs you now
        </p>
        <span className="ml-auto font-mono text-label text-ion-3">
          {total} in queue
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <span
          className={[
            "mt-0.5 flex-shrink-0 rounded border px-1.5 py-0.5 text-label font-bold uppercase tracking-widest",
            urgencyPill,
          ].join(" ")}
        >
          {lead.urgency}
        </span>
        <span
          data-testid="attention-hero-score"
          className="mt-0.5 hidden flex-shrink-0 font-mono text-lg tabular-nums text-ion-white sm:block"
          aria-label={`Attention score ${lead.score}`}
        >
          {lead.score}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-medium leading-snug text-ion-white/95 sm:text-xl">
            {lead.title}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-ion-2">{lead.detail}</p>
          <p className="mt-2 text-[12px] text-ion-1">
            <span className="text-ion-2">Do:</span> {lead.recommendedAction}
          </p>
          <p className="mt-0.5 text-label text-ion-3/70">{lead.scoreExplanation}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {lead.link && (
              <Link
                href={lead.link}
                className="rounded-lg border border-accent-800/50 bg-accent-950/30 px-3 py-1.5 text-label-lg font-semibold text-accent-400 transition-colors hover:border-accent-700 hover:bg-accent-950/50"
              >
                Act on it →
              </Link>
            )}
            <Link
              href="/cockpit/command-center"
              prefetch={false}
              className="rounded-lg border border-titanium/40 px-3 py-1.5 text-label-lg text-ion-2 hover:border-titanium/70 hover:bg-carbon/60"
            >
              Full ranked queue →
            </Link>
          </div>
        </div>
      </div>

      {runnerUp && (
        <div className="mt-4 border-t border-titanium/30 pt-3">
          <p className="font-mono text-micro uppercase tracking-label text-ion-3">
            Next up
          </p>
          {runnerUp.link ? (
            <Link
              href={runnerUp.link}
              className="mt-1 flex items-center gap-2 text-[12px] text-ion-2 transition-colors hover:text-ion-1"
            >
              <span className="font-mono tabular-nums text-ion-3">{runnerUp.score}</span>
              <span className="truncate">{runnerUp.title}</span>
              <span className="text-ion-3/60">→</span>
            </Link>
          ) : (
            <p className="mt-1 flex items-center gap-2 text-[12px] text-ion-2">
              <span className="font-mono tabular-nums text-ion-3">{runnerUp.score}</span>
              <span className="truncate">{runnerUp.title}</span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Zone components ─────────────────────────────────────────────────────────

function DecisionQueueZone({ decisions }: { decisions: readonly OwnerDecision[] }) {
  const topUrgency = decisions[0]?.urgency ?? "NORMAL";
  const shellClass =
    topUrgency === "CRITICAL"
      ? "border-alert/70 bg-alert/10 shadow-glow-plasma"
      : topUrgency === "HIGH"
        ? "border-caution/60 bg-caution/10"
        : "border-titanium/50 bg-carbon/80";

  return (
    <section
      data-testid="decision-queue"
      className={["rounded-2xl border p-5", shellClass].join(" ")}
    >
      <div className="mb-4 flex items-center gap-3">
        {topUrgency === "CRITICAL" && (
          <div className="relative h-2 w-2 flex-shrink-0">
            <div className="absolute inset-0 animate-live-pulse rounded-full bg-alert" />
            <div className="absolute inset-0 rounded-full bg-alert" />
          </div>
        )}
        <h2
          className={[
            "text-xs font-bold uppercase tracking-widest",
            topUrgency === "CRITICAL" ? "text-alert" : "text-ion-2",
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
                "mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-label font-bold uppercase tracking-widest",
                d.urgency === "CRITICAL"
                  ? "bg-alert/20 text-alert"
                  : d.urgency === "HIGH"
                    ? "bg-caution/20 text-caution"
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-ion-2">
            Where Are Our Picks?
          </h2>
          <p className="mt-1 text-label-lg leading-relaxed text-ion-3">
            {picks.publicReadinessExplanation}
          </p>
        </div>
        <span
          className={[
            "rounded border px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
            picks.isPublicGateOpen
              ? "border-accent-800/50 bg-accent-950/30 text-accent-400"
              : "border-caution/40 bg-caution/20 text-caution",
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
        <p className="mb-3 text-label-lg text-caution">Blocked: {picks.blockedReason}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-ion-3">
        <span>Bootstrap excluded: {picks.bootstrapExcluded}</span>
        <span>Total in system: {picks.totalInSystem}</span>
        {demoActive && <span className="text-caution">DEMO_PICKS_ENABLED active</span>}
      </div>

      {slateBreakdown.length > 0 && (
        <p
          data-testid="cockpit-slate-meta"
          aria-label="Today's slate breakdown by sport"
          className="mt-3 text-label-lg text-ion-3"
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
      <p className="text-micro font-bold uppercase tracking-widest text-ion-3">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums leading-none text-ion-white">{value}</p>
      <p className="mt-1 text-micro text-ion-3">{sub}</p>
    </div>
  );
}

function PerformanceTargetZone({ performance }: { performance: PerformanceSummary }) {
  return (
    <section
      data-testid="performance-target-zone"
      className="overflow-hidden rounded-2xl border border-titanium/40 bg-carbon/80 p-5"
      style={{ borderColor: "rgba(123,97,255,0.20)" }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-ultraviolet">
            Performance Gate
          </h2>
          <p className="mt-0.5 text-label-lg text-ion-3">
            Internal goal · Bootstrap + pending excluded
          </p>
        </div>
        <span
          className={[
            "flex-shrink-0 rounded border px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
            performance.displaySafe
              ? "border-accent-800/50 bg-accent-950/30 text-accent-400"
              : "border-caution/40 bg-caution/20 text-caution",
          ].join(" ")}
        >
          {performance.displaySafe ? "Display-Ready" : "Gated"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-2.5">
          <p className="text-label font-bold uppercase tracking-widest text-ion-3">Target</p>
          <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-ultraviolet">
            {performance.targetPct}%
          </p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-2.5">
          <p className="text-label font-bold uppercase tracking-widest text-ion-3">Win Rate</p>
          {performance.displaySafe && performance.actualWinRate !== null ? (
            <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-ion-white">
              {performance.actualWinRate}%
            </p>
          ) : (
            <p
              className="mt-1 flex items-center gap-1.5 text-sm font-semibold leading-none text-ion-2"
              title="Win rate is gated until the canonical settled-sample floor is met"
            >
              <span aria-hidden>🔒</span> Locked
            </p>
          )}
        </div>
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-2.5">
          <p className="text-label font-bold uppercase tracking-widest text-ion-3">Sample</p>
          <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-ion-white">
            {performance.canonicalSampleSize}
          </p>
          <p className="text-label text-ion-3">of {performance.minimumRequired} req.</p>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 px-3 py-2.5">
          <p className="text-label font-bold uppercase tracking-widest text-ion-3">Gate</p>
          <p
            className={[
              "mt-1 text-2xl font-bold leading-none",
              performance.isGateOpen ? "text-accent-500" : "text-caution",
            ].join(" ")}
          >
            {performance.isGateOpen ? "ON" : "OFF"}
          </p>
          <p className="text-label text-ion-3">PERF_STATS_EN</p>
        </div>
      </div>

      {!performance.displaySafe && (
        <p className="text-xs text-ion-2">
          Public performance gated.
          {performance.remainingToThreshold > 0 && (
            <span className="text-caution">
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

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-label text-ion-3">
        <span>Bootstrap: excluded</span>
        <span>Pending: excluded</span>
        {performance.smallSampleWarning && (
          <span className="text-caution">Small-sample warning</span>
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-ion-2">
            Agent Command Map
          </h2>
          <p className="mt-0.5 text-label-lg text-ion-3">
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
    GREEN: "bg-accent-500",
    AMBER: "bg-caution",
    RED: "bg-alert",
    UNKNOWN: "bg-ion-3/30",
  };

  const row = (
    <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-titanium/20">
      <span
        className={["h-2 w-2 flex-shrink-0 rounded-full", dotColor[dept.status]].join(" ")}
        aria-label={dept.status}
      />
      <span className="w-36 flex-shrink-0 text-label font-semibold leading-tight text-ion-white">
        {dept.name}
      </span>
      {dept.agentDisplayName && (
        <span className="hidden w-16 flex-shrink-0 font-mono text-label text-ion-3 sm:block">
          {dept.agentDisplayName}
        </span>
      )}
      <span className="hidden flex-1 text-label leading-snug text-ion-2 sm:block">
        {dept.oneLiner}
      </span>
      {dept.actionRequired && (
        <span className="flex-shrink-0 rounded bg-caution/10 px-1.5 py-0.5 text-label font-bold uppercase tracking-widest text-caution">
          Action
        </span>
      )}
      <span className="flex-shrink-0 font-mono text-label uppercase tracking-widest text-ion-3">
        {dept.agentMode.replace("_", " ").toLowerCase()}
      </span>
      {dept.drilldownHref && (
        <span className="flex-shrink-0 text-label text-ion-3 transition-colors group-hover:text-ion-2">
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
      style={{ borderColor: "rgba(123,97,255,0.18)" }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-ultraviolet">
            AI Ops / Build Control
          </h2>
          <p className="mt-0.5 text-label-lg text-ion-3">
            Claude API · ccusage · Model lane policy
          </p>
        </div>
        <span className="rounded border border-titanium/40 bg-obsidian/60 px-2 py-0.5 text-micro font-bold uppercase tracking-widest text-ion-3">
          Telemetry: Not wired
        </span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-ion-2">{aiOps.reason}</p>

      <div className="mb-4 rounded-xl border border-titanium/40 bg-obsidian/60 p-3">
        <p className="mb-1 text-micro font-bold uppercase tracking-widest text-ion-3">ccusage</p>
        <p className="text-label text-ion-2">{aiOps.ccusageNote}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-micro font-bold uppercase tracking-widest text-ion-3">
            Model Lane Policy
          </p>
          <ul className="space-y-1">
            {aiOps.modelLanePolicy.map((p, i) => (
              <li key={i} className="text-label text-ion-2">
                · {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-micro font-bold uppercase tracking-widest text-ion-3">
            To Instrument Next
          </p>
          <ul className="space-y-1">
            {aiOps.toInstrumentNext.map((t, i) => (
              <li key={i} className="text-label text-ion-2">
                · {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-micro text-ion-3">
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-ion-2">
            Jarvis Memory Protocol
          </h2>
          <p className="mt-0.5 text-label-lg text-ion-3">
            Persistent memory · cross-session recall · episodic decisions
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={[
              "rounded border px-2 py-0.5 text-micro font-bold uppercase tracking-widest",
              memory.wired
                ? "border-accent-800/50 bg-accent-950/30 text-accent-400"
                : "border-titanium/40 bg-obsidian/60 text-ion-3",
            ].join(" ")}
          >
            Memory: {memory.wired ? "Wired" : "Not wired"}
          </span>
          <span className="rounded border border-titanium/40 bg-obsidian/60 px-2 py-0.5 text-micro font-bold uppercase tracking-widest text-ion-3">
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
            <p className="text-label font-bold uppercase tracking-widest text-ion-3">
              {label}
            </p>
            <p className="font-mono text-label text-ion-2">
              {value ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 p-3">
          <p className="mb-1.5 text-micro font-bold uppercase tracking-widest text-ion-3">
            Protocol Docs (version-controlled)
          </p>
          <ul className="space-y-0.5">
            {memory.protocolDocs.map((d) => (
              <li key={d} className="font-mono text-micro text-ion-2">
                · {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-titanium/40 bg-obsidian/60 p-3">
          <p className="mb-1.5 text-micro font-bold uppercase tracking-widest text-ion-3">
            Next Action
          </p>
          <p className="text-label leading-relaxed text-ion-2">{memory.nextAction}</p>
        </div>
      </div>
    </section>
  );
}

// ─── Preserved drilldown primitives ──────────────────────────────────────────

function LaunchStatusBadge({ status }: { status: JarvisLaunchStatus }) {
  const styles: Record<JarvisLaunchStatus, string> = {
    LAUNCH_READY: "bg-verify/10 text-verify",
    LAUNCH_READY_PENDING_EXTERNAL_CONFIG: "bg-caution/10 text-caution",
    NOT_READY_DATA: "bg-alert/10 text-alert",
    NOT_READY_VALIDATION: "bg-caution/20 text-caution",
    NOT_READY_SAFETY: "bg-alert/20 text-alert",
    UNKNOWN: "bg-obsidian/70 text-ion-3",
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
    GREEN: "border-verify/40 bg-verify/10 text-verify",
    AMBER: "border-caution/40 bg-caution/10 text-caution",
    RED: "border-alert/40 bg-alert/10 text-alert",
    UNKNOWN: "border-titanium/40 bg-eclipse/40 text-ion-2",
  };
  return (
    <div
      role="status"
      aria-label={`${label}: ${health.toLowerCase()}`}
      className={["rounded-xl border px-3 py-2 text-xs", styles[health]].join(" ")}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-label uppercase tracking-widest opacity-80">{health}</p>
    </div>
  );
}

function GateRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-titanium/40 bg-obsidian/50 px-3 py-1.5">
      <span className="font-mono">{label}</span>
      <span
        className={value ? "font-bold text-accent-400" : "text-ion-3"}
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
