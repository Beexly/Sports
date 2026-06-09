import Link from "next/link";
import { clsx } from "clsx";
import { loadIntelligenceControlPlaneView } from "@/lib/cockpit/intelligence-control-plane";
import type { ReactNode } from "react";
import type {
  AutonomousSystemStatus,
  CoverageState,
  FallbackChainStatus,
  SignalCriticality,
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

const criticalityTone: Record<SignalCriticality, string> = {
  P0: "bg-red-950/50 text-red-200 ring-red-800/50",
  P1: "bg-orange-950/50 text-orange-200 ring-orange-800/50",
  P2: "bg-yellow-950/50 text-yellow-200 ring-yellow-800/50",
  P3: "bg-gray-800 text-gray-300 ring-gray-700/50",
};

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

export default function CockpitSources() {
  const view = loadIntelligenceControlPlaneView();
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

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Autonomous systems</h2>
            <p className="text-sm text-gray-500">
              Worker heartbeat, failure budget, and trace/runbook status.
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
                <th className="px-4 py-3 font-semibold">System</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Failures</th>
                <th className="px-4 py-3 font-semibold">Trace</th>
                <th className="px-4 py-3 font-semibold">Runbook</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {view.systems.map(({ run, effectiveStatus }) => (
                <tr key={run.systemId} className="bg-gray-950/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-100">{run.systemName}</p>
                    <p className="mt-1 text-[11px] text-gray-600">{run.kind}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Pill className={statusTone[effectiveStatus]}>{effectiveStatus}</Pill>
                    {run.lastError && <p className="mt-2 max-w-xs text-xs text-gray-500">{run.lastError}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {run.consecutiveFailures}/{run.maxAllowedFailures}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {run.telemetryTraceId ?? "missing"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {run.runbookUrl ?? "missing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Domain coverage</h2>
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

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Fallback chains</h2>
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
    </div>
  );
}
