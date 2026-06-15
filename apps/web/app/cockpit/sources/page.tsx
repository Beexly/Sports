import Link from "next/link";
import {
  DATA_SOURCE_STACK,
  TREND_BACKLOG,
  sourceCostLabel,
  sourceStatusLabel,
  type DataSourceCard,
  type SourceStatus,
} from "@/lib/data-sources/catalog";
import { loadSourceLiveEvidence, type SourceLiveEvidence } from "@/lib/data-sources/live-evidence";
import { providerStatuses, readinessSummary } from "@/lib/integrations/providers";
import {
  SOURCE_RIGHTS_REGISTRY,
  getRegistrySummary,
  getSourcesByStatus,
  getVendorCandidates,
  getApprovedSources,
  type SourceRightsEntry,
  type SourceRightsStatus,
} from "@/lib/scraping/source-rights-registry";

export const dynamic = "force-dynamic";

const STATUS_ORDER: readonly SourceStatus[] = [
  "wired",
  "adapter-ready",
  "scheduled-code",
  "manual-ingest",
  "founder-gated",
  "permission-required",
  "planned",
];

const STATUS_ACTION: Record<SourceStatus, string> = {
  wired: "Monitor freshness and row counts.",
  "adapter-ready": "Connect writer, scheduler, and row-count proof.",
  "scheduled-code": "Verify run history and failure alerts.",
  "manual-ingest": "Keep review queue and source citation visible.",
  "founder-gated": "Requires owner/legal approval before activation.",
  "permission-required": "Do not automate until consent or partnership exists.",
  planned: "Backlog until the free base layer proves value.",
};

const STATUS_TONE: Record<SourceStatus, string> = {
  wired: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  "adapter-ready": "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  "scheduled-code": "border-blue-500/30 bg-blue-950/30 text-blue-200",
  "manual-ingest": "border-violet-500/30 bg-violet-950/30 text-violet-200",
  "founder-gated": "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  "permission-required": "border-red-500/30 bg-red-950/30 text-red-200",
  planned: "border-titanium/40 bg-eclipse/60 text-ion-1",
};

const RIGHTS_STATUS_TONE: Record<SourceRightsStatus, string> = {
  approved_public_logged_off: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  approved_api: "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  approved_open_license: "border-teal-500/30 bg-teal-950/30 text-teal-200",
  approved_written_permission: "border-blue-500/30 bg-blue-950/30 text-blue-200",
  vendor_candidate: "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  manual_research_only: "border-violet-500/30 bg-violet-950/30 text-violet-200",
  permission_required: "border-orange-500/30 bg-orange-950/30 text-orange-200",
  blocked_technical_controls: "border-red-600/40 bg-red-950/30 text-red-300",
  excluded: "border-red-900/60 bg-red-950/40 text-red-400",
};

const RIGHTS_STATUS_LABEL: Record<SourceRightsStatus, string> = {
  approved_public_logged_off: "Approved: public logged-off",
  approved_api: "Approved: licensed API",
  approved_open_license: "Approved: open license",
  approved_written_permission: "Approved: written permission",
  vendor_candidate: "Vendor candidate",
  manual_research_only: "Manual research only",
  permission_required: "Permission required",
  blocked_technical_controls: "Blocked: technical controls",
  excluded: "Excluded",
};

export default async function CockpitSourcesPage(): Promise<JSX.Element> {
  const providers = providerStatuses();
  const providerSummary = readinessSummary();
  const liveEvidence = await loadSourceLiveEvidence({ timeoutMs: 12000 });
  const evidenceByKey = new Map(liveEvidence.datasets.map((dataset) => [dataset.key, dataset]));
  const statusGroups = STATUS_ORDER.map((status) => ({
    status,
    sources: DATA_SOURCE_STACK.filter((source) => source.status === status),
  })).filter((group) => group.sources.length > 0);
  const blockedSources = DATA_SOURCE_STACK.filter((source) =>
    ["founder-gated", "permission-required", "planned"].includes(source.status)
  );
  const trendCoverage = TREND_BACKLOG.map((trend) => ({
    trend,
    knownSources: trend.requiredSources.filter((key) =>
      DATA_SOURCE_STACK.some((source) => source.key === key || source.key.endsWith(key))
    ),
  }));

  const rightsRegistrySummary = getRegistrySummary();
  const approvedSources = getApprovedSources();
  const permissionRequiredSources = getSourcesByStatus("permission_required");
  const vendorCandidates = getVendorCandidates();
  const excludedSources = getSourcesByStatus("excluded");
  const legalReviewQueue = [
    ...permissionRequiredSources.map((s) => ({ source: s, action: "outreach" as const })),
    ...vendorCandidates.map((s) => ({ source: s, action: "questionnaire" as const })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Source Intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Source Readiness Board</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/integrations"
              className="rounded-lg border border-titanium/40 px-3 py-1.5 text-ion-1 hover:bg-carbon/60"
            >
              Public ledger
            </Link>
            <Link
              href="/api/sources/catalog"
              className="rounded-lg border border-titanium/40 px-3 py-1.5 text-ion-1 hover:bg-carbon/60"
            >
              JSON catalog
            </Link>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ion-2">
          Read-only operator surface. This page does not touch the database or start ingestion.
          It shows what the code knows about sources, which provider slots are configured,
          and what must stay blocked until data rights are clear.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Tracked sources" value={String(DATA_SOURCE_STACK.length)} detail="Catalog entries, not populated rows." />
        <Metric label="Provider slots" value={`${providerSummary.configured}/${providerSummary.total}`} detail="Env slots configured; values hidden." />
        <Metric label="Live source rows" value={formatNumber(liveEvidence.summary.totalSourceRows)} detail="Read-only nflverse readiness proof." />
        <Metric label="Cohort observations" value={formatNumber(liveEvidence.summary.cohortObservations)} detail="QB-age/RB-target-share team weeks." />
        <Metric label="Narrative checks" value={formatNumber(liveEvidence.summary.birthdayWindowObservations)} detail={`${formatNumber(liveEvidence.summary.careerMilestone50Observations)} 50-game milestone rows also rejected.`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Live proof gates</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <ProofLine
              label="Usage pulse"
              value={formatNumber(liveEvidence.summary.usagePlayerStatsRows)}
              detail={`Season ${formatNumber(liveEvidence.summary.latestUsageSeason)}, week ${formatNumber(liveEvidence.summary.latestUsageWeek)}.`}
            />
            <ProofLine
              label="QB age 34+ sample"
              value={formatNumber(liveEvidence.summary.qbAge34Sample)}
              detail={`Lift ${formatPercent(liveEvidence.summary.qbAge34Lift)}; p ${formatScientific(liveEvidence.summary.qbAge34PValue)}.`}
            />
            <ProofLine
              label="Narrative usage"
              value={liveEvidence.summary.birthdayUsageConclusion === "not-publishable" ? "rejected" : "watch"}
              detail={`Birthday p ${formatScientific(liveEvidence.summary.birthdayUsagePValue)}; milestone p ${formatScientific(liveEvidence.summary.careerMilestone50PValue)}.`}
            />
            <ProofLine label="Publication" value="blocked" detail="Evidence does not enable scoring or publishing." />
          </div>
        </div>

        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Evidence routes</h2>
              <p className="mt-2 text-sm leading-6 text-ion-2">
                Use these machine-readable routes to inspect the row proof. None of them writes data.
              </p>
            </div>
            <span className="rounded border border-cyan-500/30 bg-cyan-950/30 px-2 py-1 text-[11px] uppercase tracking-widest text-cyan-200">
              {liveEvidence.status}
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <EvidenceLink href={liveEvidence.routes.usagePulse} label="Usage pulse" />
            <EvidenceLink href={liveEvidence.routes.qbAgeTrend} label="QB age trend" />
            <EvidenceLink href={liveEvidence.routes.birthdayUsageTrend} label="Narrative check" />
            <EvidenceLink href={liveEvidence.routes.trendReadiness} label="Trend readiness" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Status actions</h2>
          <div className="mt-4 space-y-3">
            {statusGroups.map((group) => (
              <div key={group.status} className={`rounded-xl border p-3 ${STATUS_TONE[group.status]}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{sourceStatusLabel(group.status)}</p>
                  <span className="font-numerals text-xl font-semibold">{group.sources.length}</span>
                </div>
                <p className="mt-2 text-xs leading-5 opacity-85">{STATUS_ACTION[group.status]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Provider gates</h2>
          <p className="mt-2 text-sm text-ion-2">
            Configured means the env slot is filled. It does not prove rows, schedules, or successful runs.
          </p>
          <div className="mt-4 grid gap-2">
            {providers.map((provider) => (
              <div key={provider.key} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ion-white">{provider.name}</p>
                  <span className={provider.configured ? "text-xs font-semibold text-emerald-300" : "text-xs font-semibold text-yellow-300"}>
                    {provider.configured ? "configured" : "founder gated"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ion-3">{provider.unlocks}</p>
                <code className="mt-2 block font-mono text-[11px] text-ion-3">{provider.envVar}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Source stack</h2>
          <p className="mt-1 text-xs text-ion-3">
            The action column is the operator next move. It is deliberately separate from public marketing copy.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] divide-y divide-titanium/30 text-left text-sm">
            <thead className="bg-eclipse/50 text-[11px] uppercase tracking-wider text-ion-3">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Grain</th>
                <th className="px-4 py-3">Unlocks</th>
                <th className="px-4 py-3">Operator action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {DATA_SOURCE_STACK.map((source) => (
                <SourceRow key={source.key} source={source} evidence={evidenceByKey.get(source.key)} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Source Rights Clearance ── */}
      <section data-testid="source-rights-clearance">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-300">
              Source Rights Clearance
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">Scraping Rights Registry</h2>
          </div>
          <span className="rounded border border-titanium/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-ion-2">
            {rightsRegistrySummary.total} sources tracked
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RightsMetric
            label="Approved"
            value={String(approvedSources.length)}
            tone="text-emerald-300"
            detail="Facts may be extracted per source constraints."
          />
          <RightsMetric
            label="Permission required"
            value={String(permissionRequiredSources.length)}
            tone="text-orange-300"
            detail="Manual research allowed. No automation until consent obtained."
          />
          <RightsMetric
            label="Vendor candidates"
            value={String(vendorCandidates.length)}
            tone="text-yellow-300"
            detail="Questionnaire pending. No ingestion until contract signed."
          />
          <RightsMetric
            label="Excluded"
            value={String(excludedSources.length)}
            tone="text-red-400"
            detail="No safe path. Permanently blocked."
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Rights registry</h2>
          <p className="mt-1 text-xs text-ion-3">
            Every extraction job must pass through the Clearance Engine before running.
            A{" "}
            <code className="font-mono text-[11px] text-ion-2">ClearanceResult.allowed=false</code>{" "}
            stops the job. Every extracted record carries a{" "}
            <code className="font-mono text-[11px] text-ion-2">RightsSnapshot</code>.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[860px] divide-y divide-titanium/30 text-left text-sm">
            <thead className="bg-eclipse/50 text-[11px] uppercase tracking-wider text-ion-3">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Jurisdiction</th>
                <th className="px-4 py-3">Rights status</th>
                <th className="px-4 py-3">Auto</th>
                <th className="px-4 py-3">Display</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Train</th>
                <th className="px-4 py-3">Unlock / action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {SOURCE_RIGHTS_REGISTRY.map((entry) => (
                <RightsRow key={entry.source_id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {legalReviewQueue.length > 0 && (
        <section className="rounded-2xl border border-orange-900/40 bg-orange-950/10 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-300">
            Legal action queue
          </h2>
          <p className="mt-2 text-sm leading-6 text-orange-100/70">
            These sources require outreach or vendor evaluation before any automated use.
            Manual research is permitted on permission_required sources.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {legalReviewQueue.map(({ source, action }) => (
              <LegalActionCard key={source.source_id} source={source} action={action} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Trend coverage gaps</h2>
          <div className="mt-4 space-y-3">
            {trendCoverage.map(({ trend, knownSources }) => (
              <div key={trend.key} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <p className="text-sm font-semibold text-ion-white">{trend.title}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ion-3">
                    {knownSources.length}/{trend.requiredSources.length} mapped
                  </p>
                </div>
                <p className="mt-2 text-xs leading-5 text-ion-3">{trend.question}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ion-3">
                  {trend.requiredSources.join(" + ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-red-300">Do-not-automate list</h2>
          <p className="mt-2 text-sm leading-6 text-red-100/80">
            These sources are valuable, but automation would be the wrong default until the owner
            or legal boundary is explicit.
          </p>
          <div className="mt-4 space-y-3">
            {blockedSources.map((source) => (
              <div key={source.key} className="rounded-lg border border-red-900/40 bg-obsidian/70 p-3">
                <p className="text-sm font-semibold text-ion-white">{source.name}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-red-300">
                  {sourceStatusLabel(source.status)}
                </p>
                <p className="mt-2 text-xs leading-5 text-ion-2">
                  {source.complianceNote ?? STATUS_ACTION[source.status]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function formatNumber(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  return `${(value * 100).toFixed(1)}%`;
}

function formatScientific(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  return value.toExponential(2);
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ion-3">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ion-3">{detail}</p>
    </div>
  );
}

function ProofLine({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="border-b border-titanium/40 pb-3 last:border-b-0 last:pb-0">
      <p className="text-[11px] uppercase tracking-wider text-ion-3">{label}</p>
      <p className="mt-1 font-numerals text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ion-3">{detail}</p>
    </div>
  );
}

function EvidenceLink({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <Link
      href={href}
      className="rounded-lg border border-titanium/40 bg-obsidian/60 px-3 py-2 text-xs font-semibold text-ion-1 hover:border-cyan-500/50"
    >
      {label}
    </Link>
  );
}

function RightsMetric({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: string;
  detail: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ion-3">{label}</p>
      <p className={`mt-2 font-numerals text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-ion-3">{detail}</p>
    </div>
  );
}

function RightsRow({ entry }: { entry: SourceRightsEntry }): JSX.Element {
  const tone = RIGHTS_STATUS_TONE[entry.status];
  const flag = (v: boolean) =>
    v ? (
      <span className="text-xs font-semibold text-emerald-400">yes</span>
    ) : (
      <span className="text-xs text-red-400/80">no</span>
    );
  return (
    <tr className="align-top text-ion-1">
      <td className="px-4 py-3">
        <p className="font-medium text-white">{entry.source_name}</p>
        <code className="font-mono text-[10px] text-ion-3">{entry.source_id}</code>
      </td>
      <td className="px-4 py-3 text-xs text-ion-3">{entry.jurisdiction}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded border px-2 py-1 text-[10px] ${tone}`}>
          {RIGHTS_STATUS_LABEL[entry.status]}
        </span>
      </td>
      <td className="px-4 py-3">{flag(entry.automation_allowed)}</td>
      <td className="px-4 py-3">{flag(entry.commercial_display_allowed)}</td>
      <td className="px-4 py-3">{flag(entry.storage_allowed)}</td>
      <td className="px-4 py-3">{flag(entry.model_training_allowed)}</td>
      <td className="px-4 py-3 text-xs leading-5 text-ion-2">
        {entry.unlock_condition ?? entry.notes.slice(0, 80)}
      </td>
    </tr>
  );
}

function LegalActionCard({
  source,
  action,
}: {
  source: SourceRightsEntry;
  action: "outreach" | "questionnaire";
}): JSX.Element {
  return (
    <div className="rounded-lg border border-orange-900/30 bg-obsidian/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ion-white">{source.source_name}</p>
        <span
          className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
            action === "outreach"
              ? "border-orange-500/30 text-orange-300"
              : "border-yellow-500/30 text-yellow-300"
          }`}
        >
          {action === "outreach" ? "Outreach needed" : "Questionnaire needed"}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-ion-3">{source.source_id}</p>
      {source.unlock_condition && (
        <p className="mt-2 text-xs leading-5 text-ion-2">{source.unlock_condition}</p>
      )}
      {source.vendor_contact && (
        <p className="mt-2 font-mono text-[11px] text-cyan-400">{source.vendor_contact}</p>
      )}
    </div>
  );
}

function SourceRow({
  source,
  evidence,
}: {
  source: DataSourceCard;
  evidence: SourceLiveEvidence["datasets"][number] | undefined;
}): JSX.Element {
  return (
    <tr className="align-top text-ion-1">
      <td className="px-4 py-3 font-medium text-white">{source.name}</td>
      <td className="px-4 py-3 font-mono text-xs text-cyan-300">{sourceCostLabel(source.cost)}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded border px-2 py-1 text-[11px] ${STATUS_TONE[source.status]}`}>
          {sourceStatusLabel(source.status)}
        </span>
      </td>
      <td className="px-4 py-3">
        {evidence ? (
          <Link href={evidence.route} className="font-mono text-[11px] uppercase tracking-widest text-cyan-300">
            {evidence.status} / {formatNumber(evidence.rowCount)}
          </Link>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-widest text-ion-3">UNKNOWN</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-ion-3">{source.grain}</td>
      <td className="px-4 py-3 text-xs leading-5 text-ion-2">{source.unlocks}</td>
      <td className="px-4 py-3 text-xs leading-5 text-ion-2">
        {source.complianceNote ?? STATUS_ACTION[source.status]}
      </td>
    </tr>
  );
}
