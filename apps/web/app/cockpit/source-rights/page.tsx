import {
  GSE_SOURCE_REGISTRY,
  INTEGRITY_INVARIANTS,
  approvedSources,
  excludedSources,
  fantasyPlatformSources,
  automatedSources,
  type SourceStatus,
} from "@/lib/gse/source-rights-gates";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<SourceStatus, string> = {
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

const STATUS_LABEL: Record<SourceStatus, string> = {
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

export default function SourceRightsPage(): JSX.Element {
  const approved = approvedSources();
  const excluded = excludedSources();
  const fantasyPlatforms = fantasyPlatformSources();
  const automated = automatedSources();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-300">
            Source Rights
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ion-white">GSE Source Rights Gates</h1>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ion-2">
          Every extraction job must pass through the Scraping Clearance Engine before running.
          This page is the operator view of the GSE source rights registry.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total sources" value={String(GSE_SOURCE_REGISTRY.length)} detail="In GSE source registry" />
        <Metric label="Approved" value={String(approved.length)} detail="Automation or API access permitted" />
        <Metric label="Fantasy platforms" value={String(fantasyPlatforms.length)} detail="With legal posture documented" />
        <Metric label="Excluded" value={String(excluded.length)} detail="Permanently blocked — no path to approval" />
      </section>

      <section className="rounded-2xl border border-red-900/40 bg-red-950/10 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-red-300">
          Integrity invariants (non-negotiable)
        </h2>
        <p className="mt-2 text-sm leading-6 text-red-100/70">
          These rules are enforced in code via checkClearance() and wrapExtractedRecord().
          Violating them creates legal and reputational risk.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {INTEGRITY_INVARIANTS.map((inv, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-red-900/30 bg-obsidian/70 p-2">
              <span className="mt-0.5 text-[10px] font-semibold text-red-400">{i + 1}.</span>
              <p className="text-xs leading-5 text-ion-1">{inv}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">Source registry</h2>
          <p className="mt-1 text-xs text-ion-3">
            Every source has a status, data category, and explicit lists of what can and cannot be extracted.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] divide-y divide-titanium/30 text-left text-sm">
            <thead className="bg-eclipse/50 text-[11px] uppercase tracking-wider text-ion-3">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Auto</th>
                <th className="px-4 py-3">API</th>
                <th className="px-4 py-3">Fantasy</th>
                <th className="px-4 py-3">Key use case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {GSE_SOURCE_REGISTRY.map((src) => (
                <tr key={src.sourceId} className="align-top text-ion-1">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ion-white">{src.name}</p>
                    <code className="font-mono text-[10px] text-ion-3">{src.sourceId}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] ${STATUS_TONE[src.status]}`}>
                      {STATUS_LABEL[src.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-ion-3">
                    {src.dataCategory.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    <Flag value={src.automationAllowed} />
                  </td>
                  <td className="px-4 py-3">
                    <Flag value={src.apiAvailable} />
                  </td>
                  <td className="px-4 py-3">
                    <Flag value={src.fantasyPlatform} />
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-ion-2">
                    {src.gseUseCases[0] ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/10 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Approved sources</h2>
          <div className="mt-4 space-y-2">
            {approved.map((src) => (
              <div key={src.sourceId} className="rounded-lg border border-emerald-900/30 bg-obsidian/70 p-3">
                <p className="font-semibold text-ion-white">{src.name}</p>
                <p className="mt-1 text-[11px] text-ion-3">{src.licenseType ?? "No license info"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {src.gseUseCases.slice(0, 3).map((uc) => (
                    <span key={uc} className="rounded bg-obsidian px-1.5 py-0.5 text-[9px] text-ion-3">{uc}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-red-300">Fantasy platform postures</h2>
          <div className="mt-4 space-y-2">
            {fantasyPlatforms.map((src) => (
              <div key={src.sourceId} className="rounded-lg border border-red-900/30 bg-obsidian/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ion-white">{src.name}</p>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] ${STATUS_TONE[src.status]}`}>
                    {STATUS_LABEL[src.status]}
                  </span>
                </div>
                <div className="mt-2">
                  {src.complianceNotes.slice(0, 2).map((note, i) => (
                    <p key={i} className="text-[11px] text-ion-3">• {note}</p>
                  ))}
                </div>
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-ion-3">Prohibited</p>
                  {src.prohibitedDataTypes.slice(0, 2).map((p, i) => (
                    <p key={i} className="text-[11px] text-red-400/80">× {p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Flag({ value }: { value: boolean }): JSX.Element {
  return value ? (
    <span className="text-xs font-semibold text-emerald-400">yes</span>
  ) : (
    <span className="text-xs text-red-400/70">no</span>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ion-3">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold text-ion-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ion-3">{detail}</p>
    </div>
  );
}
