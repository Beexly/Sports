import Link from "next/link";
import { clsx } from "clsx";
import {
  loadIntelligenceControlPlaneView,
  type ControlPlaneDebugTraceStatus,
  type ControlPlaneFreshnessState,
} from "@/lib/cockpit/intelligence-control-plane";
import { loadOddsQuotaView } from "@/lib/cockpit/odds-quota";
import type { ReactNode } from "react";
import type {
  AutonomousSystemStatus,
  CoverageState,
  FallbackChainStatus,
  SignalCriticality,
  SourceHealthStatus,
} from "@sports/types";

export const dynamic = "force-dynamic";

const statusTone: Record<AutonomousSystemStatus, string> = {
  HEALTHY: "border-green-900/60 bg-green-950/20 text-green-300",
  DEGRADED: "border-yellow-900/60 bg-yellow-950/20 text-yellow-300",
  STALE: "border-orange-900/60 bg-orange-950/20 text-orange-300",
  FAILED: "border-red-900/60 bg-red-950/25 text-red-300",
  PAUSED: "border-gray-800 bg-gray-900/60 text-gray-400",
  UNKNOWN: "border-gray-800 bg-gray-900/60 text-gray-400",
};

const coverageTone: Record<CoverageState, string> = {
  COVERED: "border-green-900/60 bg-green-950/20 text-green-300",
  DEGRADED: "border-yellow-900/60 bg-yellow-950/20 text-yellow-300",
  BLIND_SPOT: "border-red-900/60 bg-red-950/25 text-red-300",
  MANUAL_REVIEW_REQUIRED: "border-orange-900/60 bg-orange-950/20 text-orange-300",
};

const fallbackTone: Record<FallbackChainStatus, string> = {
  READY: "border-green-900/60 bg-green-950/20 text-green-300",
  DEGRADED: "border-yellow-900/60 bg-yellow-950/20 text-yellow-300",
  NO_SOURCE: "border-red-900/60 bg-red-950/25 text-red-300",
  BLOCKED_LEGAL: "border-red-900/60 bg-red-950/25 text-red-300",
  MANUAL_REVIEW_REQUIRED: "border-orange-900/60 bg-orange-950/20 text-orange-300",
};

const sourceHealthTone: Record<SourceHealthStatus, string> = {
  HEALTHY: "border-green-900/60 bg-green-950/20 text-green-300",
  DEGRADED: "border-yellow-900/60 bg-yellow-950/20 text-yellow-300",
  STALE: "border-orange-900/60 bg-orange-950/20 text-orange-300",
  UNAVAILABLE: "border-red-900/60 bg-red-950/25 text-red-300",
  SUSPENDED: "border-red-900/60 bg-red-950/25 text-red-300",
  RETIRED: "border-gray-800 bg-gray-900/60 text-gray-400",
  UNKNOWN: "border-gray-800 bg-gray-900/60 text-gray-400",
};

const freshnessTone: Record<ControlPlaneFreshnessState, string> = {
  FRESH: "border-green-900/60 bg-green-950/20 text-green-300",
  STALE: "border-orange-900/60 bg-orange-950/20 text-orange-300",
  MISSING: "border-gray-800 bg-gray-900/60 text-gray-400",
};

const traceTone: Record<ControlPlaneDebugTraceStatus, string> = {
  READY: "border-green-900/60 bg-green-950/20 text-green-300",
  STALE: "border-orange-900/60 bg-orange-950/20 text-orange-300",
  MISSING: "border-yellow-900/60 bg-yellow-950/20 text-yellow-300",
  FAILED: "border-red-900/60 bg-red-950/25 text-red-300",
};

const criticalityTone: Record<SignalCriticality, string> = {
  P0: "bg-red-950/50 text-red-200 ring-red-800/50",
  P1: "bg-orange-950/50 text-orange-200 ring-orange-800/50",
  P2: "bg-yellow-950/50 text-yellow-200 ring-yellow-800/50",
  P3: "bg-gray-800 text-gray-300 ring-gray-700/50",
};

function formatAge(ageSec: number | null): string {
  if (ageSec === null) return "missing";
  if (ageSec < 60) return `${Math.round(ageSec)}s`;
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m`;
  if (ageSec < 86400) return `${Math.round(ageSec / 3600)}h`;
  return `${Math.round(ageSec / 86400)}d`;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "missing";
  return new Date(value).toLocaleString();
}

function Pill({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
        className
      )}
    >
      {children}
    </span>
  );
}

function ViewLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-brand-500/60 hover:text-white"
    >
      {children}
    </a>
  );
}

function Metric({
  label,
  value,
  tone = "text-white",
}: {
  readonly label: string;
  readonly value: string | number;
  readonly tone?: string;
}) {
  return (
    <div className="border-l border-gray-800 pl-3">
      <p className={clsx("text-2xl font-semibold", tone)}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-600">{label}</p>
    </div>
  );
}

export default async function CockpitSources() {
  const view = loadIntelligenceControlPlaneView();
  const quota = await loadOddsQuotaView();
  const generatedAt = new Date(view.snapshot.generatedAt).toLocaleString();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Source Control Plane</h1>
          <Pill className={statusTone[view.summary.overallStatus]}>
            {view.summary.overallStatus}
          </Pill>
          <span className="text-xs text-gray-600">Snapshot {generatedAt}</span>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-gray-400">
          Read-only view of autonomous system health, domain coverage, fallback
          activation, and debug trace readiness. Fixture-backed until the source
          registry and run tables are approved.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Healthy systems" value={view.summary.healthySystems} tone="text-green-300" />
        <Metric label="Degraded systems" value={view.summary.degradedSystems} tone="text-yellow-300" />
        <Metric label="Blind spots" value={view.summary.blindSpots} tone="text-red-300" />
        <Metric label="Manual reviews" value={view.summary.manualReviewCount} tone="text-orange-300" />
      </section>

      <section id="odds-quota" className="rounded-lg border border-gray-800 bg-gray-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Odds API Quota</h2>
            <p className="text-sm text-gray-500">
              Request-quota burn-down from the latest ingestion run.
            </p>
          </div>
          {quota.hasData && (
            <Pill
              className={
                quota.isLow
                  ? "border-red-900/60 bg-red-950/25 text-red-300"
                  : "border-green-900/60 bg-green-950/20 text-green-300"
              }
            >
              {quota.isLow ? "LOW QUOTA" : "QUOTA OK"}
            </Pill>
          )}
        </div>
        {quota.hasData ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Metric
                label="Requests remaining"
                value={quota.remainingRequests ?? "unknown"}
                tone={quota.isLow ? "text-red-300" : "text-green-300"}
              />
              <Metric label="Requests used" value={quota.usedRequests ?? "unknown"} tone="text-gray-200" />
              <Metric label="Warning threshold" value={quota.warnThreshold} tone="text-gray-400" />
            </div>
            {quota.isLow && (
              <p className="mt-4 text-sm text-red-300">
                Remaining requests are below the warning threshold ({quota.warnThreshold}).
                Upcoming refresh and settlement cycles may exhaust the key — review refresh
                cadence or the plan tier before the quota runs out.
              </p>
            )}
            <p className="mt-3 text-xs text-gray-600">
              Recorded {formatTimestamp(quota.recordedAt)}
              {quota.sport ? ` — run sport ${quota.sport}` : ""}. Threshold is env-tunable via
              ODDS_QUOTA_WARN_THRESHOLD.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            No quota data yet — quota headers are persisted per ingestion run, so this tile
            populates after the next odds refresh completes.
          </p>
        )}
      </section>

      {view.summary.recommendedActions.length > 0 && (
        <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Operator actions
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-200">
            {view.summary.recommendedActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>
      )}

      <nav aria-label="Control-plane views" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <ViewLink href="#source-health">Source Health</ViewLink>
        <ViewLink href="#domain-coverage">Domain Coverage</ViewLink>
        <ViewLink href="#fallback-chain">Fallback Chain</ViewLink>
        <ViewLink href="#debug-trace">Debug Trace</ViewLink>
      </nav>

      <section id="source-health" className="flex scroll-mt-6 flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Source Health</h2>
            <p className="text-sm text-gray-500">
              Source status, activation, freshness, legal posture, and active fallback assignment.
            </p>
          </div>
          <Link href="/cockpit/synthetic-monitoring" className="text-xs text-brand-400 hover:text-brand-300">
            Open synthetic monitoring
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="min-w-full divide-y divide-gray-800 text-left text-sm">
            <thead className="bg-gray-900/70 text-[10px] uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Domain</th>
                <th className="px-4 py-3 font-semibold">Health</th>
                <th className="px-4 py-3 font-semibold">Freshness</th>
                <th className="px-4 py-3 font-semibold">Activation</th>
                <th className="px-4 py-3 font-semibold">Legal</th>
                <th className="px-4 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {view.sourceHealth.map((source) => (
                <tr key={`${source.chainId}-${source.sourceId}`} className="bg-gray-950/40 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-100">{source.sourceName}</p>
                    <p className="mt-1 text-[11px] text-gray-600">{source.mode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill className={criticalityTone[source.criticality]}>{source.criticality}</Pill>
                      <span className="font-mono text-xs text-gray-300">{source.domain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Pill className={sourceHealthTone[source.healthStatus]}>{source.healthStatus}</Pill>
                    <p className="mt-2 text-xs text-gray-500">confidence {Math.round(source.confidence * 100)}%</p>
                  </td>
                  <td className="px-4 py-3">
                    <Pill className={freshnessTone[source.freshnessState]}>{source.freshnessState}</Pill>
                    <p className="mt-2 text-xs text-gray-500">{formatAge(source.ageSec)} old</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-gray-300">{source.activationState}</p>
                    {source.activeForChain && <p className="mt-2 text-xs font-semibold text-green-300">ACTIVE CHAIN</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{source.legalState}</td>
                  <td className="px-4 py-3 text-xs leading-5 text-gray-500">
                    {source.operatorNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="domain-coverage" className="flex scroll-mt-6 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Domain Coverage</h2>
          <p className="text-sm text-gray-500">
            What the engine can safely know right now, and what must stay withheld.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {view.domains.map(({ requirement, snapshot, evaluation }) => (
            <article key={requirement.requirementId} className="rounded-lg border border-gray-800 bg-gray-900/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className={criticalityTone[requirement.criticality]}>{requirement.criticality}</Pill>
                  <h3 className="font-semibold text-white">{requirement.domain}</h3>
                </div>
                <Pill className={coverageTone[evaluation.state]}>{evaluation.state}</Pill>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-400">{requirement.description}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-600">Active</p>
                  <p className="mt-1 text-gray-200">
                    {snapshot.activeSourceCount}/{requirement.minActiveSources}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Stale</p>
                  <p className="mt-1 text-gray-200">{snapshot.staleSourceCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Blocked</p>
                  <p className="mt-1 text-gray-200">{snapshot.blockedSourceCount}</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">{evaluation.reason}</p>
              {snapshot.notes && <p className="mt-2 text-xs text-gray-600">{snapshot.notes}</p>}
            </article>
          ))}
        </div>
      </section>

      <section id="fallback-chain" className="flex scroll-mt-6 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Fallback Chain</h2>
          <p className="text-sm text-gray-500">
            Active source selection and no-data behavior by high-value domain.
          </p>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {view.fallbackChains.map(({ chain, evaluation }) => (
            <article key={chain.chainId} className="rounded-lg border border-gray-800 bg-gray-900/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className={criticalityTone[chain.criticality]}>{chain.criticality}</Pill>
                  <h3 className="font-semibold text-white">{chain.domain}</h3>
                </div>
                <Pill className={fallbackTone[evaluation.status]}>{evaluation.status}</Pill>
              </div>
              <p className="mt-3 text-sm text-gray-400">{evaluation.reason}</p>
              <div className="mt-4 space-y-2">
                {chain.steps.map((step) => (
                  <div
                    key={`${chain.chainId}-${step.sourceId}`}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-gray-200">{step.sourceName}</p>
                      <p className="mt-1 text-gray-600">{step.mode} / {step.legalState}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300">{step.healthStatus}</p>
                      <p className="mt-1 text-gray-600">confidence {Math.round(step.confidence * 100)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="debug-trace" className="flex scroll-mt-6 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Debug Trace</h2>
          <p className="text-sm text-gray-500">
            Trace IDs, heartbeat age, failure state, and runbook links for autonomous systems.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="min-w-full divide-y divide-gray-800 text-left text-sm">
            <thead className="bg-gray-900/70 text-[10px] uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">System</th>
                <th className="px-4 py-3 font-semibold">System Status</th>
                <th className="px-4 py-3 font-semibold">Trace Status</th>
                <th className="px-4 py-3 font-semibold">Heartbeat</th>
                <th className="px-4 py-3 font-semibold">Trace ID</th>
                <th className="px-4 py-3 font-semibold">Runbook</th>
                <th className="px-4 py-3 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {view.debugTraces.map((trace) => (
                <tr key={trace.systemId} className="bg-gray-950/40 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-100">{trace.systemName}</p>
                    <p className="mt-1 text-[11px] text-gray-600">{trace.kind}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Pill className={statusTone[trace.effectiveStatus]}>{trace.effectiveStatus}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <Pill className={traceTone[trace.traceStatus]}>{trace.traceStatus}</Pill>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    <p>{formatTimestamp(trace.lastHeartbeatAt)}</p>
                    <p className="mt-1 text-gray-600">{formatAge(trace.ageSec)} old</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {trace.telemetryTraceId ?? "missing"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {trace.runbookUrl ?? "missing"}
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-gray-500">
                    {trace.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
