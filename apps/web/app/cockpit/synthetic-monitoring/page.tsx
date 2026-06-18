import Link from "next/link";
import {
  loadSyntheticMonitoringDashboardFromDisk,
  type SyntheticCheck,
  type SyntheticCheckStatus,
  type SyntheticSeverity,
} from "@/lib/synthetic-monitoring/dashboard";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Readonly<Record<SyntheticCheckStatus, string>> = {
  passing: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
  warn: "border-yellow-500/30 bg-yellow-950/40 text-yellow-200",
  failing: "border-red-500/30 bg-red-950/50 text-red-200",
  pending: "border-white/[0.06] bg-white/[0.04]/70 text-ink-400",
};

const SEVERITY_STYLES: Readonly<Record<SyntheticSeverity, string>> = {
  P1: "text-red-300",
  P2: "text-yellow-300",
  P3: "text-sky-300",
};

export default async function CockpitSyntheticMonitoringPage(): Promise<JSX.Element> {
  const dashboard = await loadSyntheticMonitoringDashboardFromDisk();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Synthetic Monitoring
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Production Verification Runner</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          Continuous checks for public routes, positioning language, data freshness, trust gates,
          draft-only content surfaces, and build integrity.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Runner" value={dashboard.runnerStatus} />
        <Metric label="Environment" value={dashboard.activeEnvironment} />
        <Metric label="Last run" value={formatDate(dashboard.lastRunIso)} />
        <Metric label="Passing" value={String(dashboard.summary.passing)} />
        <Metric label="Pending" value={String(dashboard.summary.pending)} />
      </section>

      <section className="grid gap-4">
        {dashboard.categories.map((category) => (
          <div key={category.id} className="rounded-lg border border-white/[0.06] bg-obsidian/60">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">{category.name}</h2>
                <p className="text-[11px] uppercase tracking-wider text-ink-500">
                  {category.checks.length} checks
                </p>
              </div>
              <p className="mt-1 text-xs text-ink-500">{category.description}</p>
            </div>
            <div className="divide-y divide-titanium/30">
              {category.checks.map((check) => (
                <CheckRow key={check.id} check={check} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
          <h2 className="text-sm font-semibold text-white">Auto-Filed Issues</h2>
          {dashboard.issues.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No synthetic monitoring issues filed.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {dashboard.issues.map((issue) => (
                <Link
                  key={issue.id}
                  href={issue.sourcePath}
                  className="rounded-md border border-white/[0.06] bg-white/[0.04]/50 p-3 hover:bg-white/[0.03]"
                >
                  <p className={`text-xs font-semibold ${SEVERITY_STYLES[issue.severity]}`}>
                    {issue.severity}
                  </p>
                  <p className="mt-1 text-sm text-ink-300">{issue.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
          <h2 className="text-sm font-semibold text-white">Configuration</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <ConfigRow label="Enabled" value={dashboard.config.enabled ? "true" : "false"} />
            <ConfigRow label="Cadence" value={`${dashboard.config.cadenceMinutes} minutes`} />
            <ConfigRow label="Checks" value={String(dashboard.config.checks.length)} />
            <ConfigRow label="Owner channel" value={dashboard.config.ownerChannel} />
            <ConfigRow label="Owner target" value={dashboard.config.ownerTargetMasked} />
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
        <h2 className="text-sm font-semibold text-white">Manual Actions</h2>
        <p className="mt-2 text-sm text-ink-500">
          The scheduled runner writes durable history. Manual controls stay disabled until a server
          action can append a decision-log entry and run checks with the production environment.
          Pausing will require a decision-log entry before the control becomes active.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Run all checks now", "Run failing checks", "Pause runner", "Resume runner"].map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="rounded-lg border border-white/[0.06] px-3 py-2 text-xs text-ink-500"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function CheckRow({ check }: { readonly check: SyntheticCheck }): JSX.Element {
  return (
    <div className="grid gap-3 px-4 py-3 lg:grid-cols-[110px_1fr_128px_160px] lg:items-center">
      <div>
        <p className="font-mono text-xs font-semibold text-ink-300">{check.id}</p>
        <p className={`mt-1 text-[11px] font-semibold ${SEVERITY_STYLES[check.severity]}`}>
          {check.severity}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-white">{check.label}</p>
        <p className="mt-1 text-xs text-ink-500">{check.detail}</p>
      </div>
      <div>
        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${STATUS_STYLES[check.status]}`}>
          {check.status}
        </span>
      </div>
      <div>
        <Sparkline history={check.history} />
        <p className="mt-1 text-[11px] text-ink-500">{formatDate(check.lastRunIso)}</p>
      </div>
    </div>
  );
}

function Sparkline({ history }: { readonly history: readonly SyntheticCheckStatus[] }): JSX.Element {
  return (
    <div className="flex h-4 items-end gap-px" aria-label="Last 24 synthetic check results">
      {history.slice(-96).map((status, index) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={`${status}-${index}`}
          className={`h-3 w-0.5 rounded-sm ${sparkColor(status)}`}
        />
      ))}
    </div>
  );
}

function ConfigRow({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04]/40 px-3 py-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className="max-w-[16rem] truncate text-right text-ink-300">{value}</dd>
    </div>
  );
}

function sparkColor(status: SyntheticCheckStatus): string {
  if (status === "passing") return "bg-emerald-500";
  if (status === "warn") return "bg-yellow-400";
  if (status === "failing") return "bg-red-500";
  return "bg-white/[0.04]";
}

function formatDate(value: string | null): string {
  if (!value) return "not active";
  return new Date(value).toLocaleString("en-US");
}
