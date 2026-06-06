import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  CONTEXT_INTELLIGENCE_SOURCES,
  DATA_SOURCE_STACK,
  PUBLIC_DATA_SOURCES,
  TREND_BACKLOG,
  sourceCostLabel,
  sourceStatusLabel,
  type DataSourceCard,
  type SourceStatus,
} from "@/lib/data-sources/catalog";
import { loadSourceLiveEvidence, type SourceLiveEvidence } from "@/lib/data-sources/live-evidence";
import { providerStatuses, readinessSummary, type ProviderCategory } from "@/lib/integrations/providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Source Control - Data, Gates, and Legal Boundaries",
  description:
    "A source-control ledger for Galaxy Sports Edge: free feeds, owned workflows, licensed references, env-gated providers, and the legal gates that prevent fake data activation.",
  alternates: { canonical: "/integrations" },
};

const CATEGORY_LABEL: Record<ProviderCategory, string> = {
  projections: "Fantasy projections",
  "image-safety": "Media moderation",
  "league-oauth": "League sync",
  "avatar-tts": "Studio rendering",
  odds: "Odds and lines",
  pickem: "Pick'em lines",
};

const STATUS_ORDER: readonly SourceStatus[] = [
  "wired",
  "adapter-ready",
  "scheduled-code",
  "manual-ingest",
  "founder-gated",
  "permission-required",
  "planned",
];

const COST_ORDER: readonly DataSourceCard["cost"][] = ["free", "low-cost", "paid-optional", "owned", "licensed"];

export default async function IntegrationsPage(): Promise<JSX.Element> {
  const providers = providerStatuses();
  const providerSummary = readinessSummary();
  const liveEvidence = await loadSourceLiveEvidence({ timeoutMs: 12000 });
  const evidenceByKey = new Map(liveEvidence.datasets.map((dataset) => [dataset.key, dataset]));
  const sourceStatusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: DATA_SOURCE_STACK.filter((source) => source.status === status).length,
  })).filter((item) => item.count > 0);
  const sourceCostCounts = COST_ORDER.map((cost) => ({
    cost,
    count: DATA_SOURCE_STACK.filter((source) => source.cost === cost).length,
  })).filter((item) => item.count > 0);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-carbon text-ion">
      <Nav />
      <main id="main-content">
        <section className="border-b border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
                Source control for the engine.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
                Every useful sports product starts here: what feeds exist, what they cost,
                what is actually wired, what still needs a key, and what cannot be touched
                until the legal boundary is explicit.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/trends" className="btn-primary min-h-11 px-5 py-3">
                  Open Trend Lab
                </Link>
                <Link
                  href="/board"
                  className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
                >
                  View public board
                </Link>
              </div>
            </div>

            <div className="grid gap-px overflow-hidden border border-mineral bg-mineral sm:grid-cols-2">
              <SummaryTile label="Structured feeds" value={String(PUBLIC_DATA_SOURCES.length)} detail="API, file, or adapter-backed sources tracked for model inputs." />
              <SummaryTile label="Context feeds" value={String(CONTEXT_INTELLIGENCE_SOURCES.length)} detail="Owned, licensed, or permission-gated intelligence workflows." />
              <SummaryTile label="Env providers live" value={`${providerSummary.configured}/${providerSummary.total}`} detail="Configured means an env slot is filled. Values are never printed." />
              <SummaryTile label="Legal gates" value={String(DATA_SOURCE_STACK.filter((source) => source.status === "permission-required").length)} detail="Research-only until consent, API terms, or partnership exists." />
            </div>
          </div>
        </section>

        <section className="border-b border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Readiness distribution
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                The ledger separates code, keys, consent, and rows.
              </h2>
              <p className="mt-4 text-sm leading-6 text-ion-1">
                A source being listed here does not mean it is populated. Adapter-ready means
                code can fetch. Wired means the product can call it. Permission-required means
                no automated ingestion should run.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden border border-mineral bg-mineral md:grid-cols-2">
              <div className="bg-eclipse p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ion-white">By status</h3>
                <div className="mt-4 space-y-3">
                  {sourceStatusCounts.map((item) => (
                    <CountRow key={item.status} label={sourceStatusLabel(item.status)} value={item.count} />
                  ))}
                </div>
              </div>
              <div className="bg-eclipse p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ion-white">By cost</h3>
                <div className="mt-4 space-y-3">
                  {sourceCostCounts.map((item) => (
                    <CountRow key={item.cost} label={sourceCostLabel(item.cost)} value={item.count} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Live source proof
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                  Row counts are evidence, not permission to score.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-ion-1">
                These counts come from read-only nflverse release assets and public JSON evidence routes.
                The gates below stay closed until persistence, backtests, and model review exist.
              </p>
            </div>

            <div className="mt-6 grid gap-px overflow-hidden border border-mineral bg-mineral md:grid-cols-2 xl:grid-cols-5">
              <SummaryTile
                label="nflverse rows"
                value={formatNumber(liveEvidence.summary.usagePlayerStatsRows)}
                detail={`Latest pulse: ${formatNumber(liveEvidence.summary.latestWeekPlayerRows)} rows for week ${formatNumber(liveEvidence.summary.latestUsageWeek)}.`}
              />
              <SummaryTile
                label="cohort observations"
                value={formatNumber(liveEvidence.summary.cohortObservations)}
                detail={`${formatNumber(liveEvidence.summary.qbAge34Sample)} QB-age-34+ team weeks.`}
              />
              <SummaryTile
                label="QB age 34+ lift"
                value={formatPercent(liveEvidence.summary.qbAge34Lift)}
                detail={`p-value ${formatScientific(liveEvidence.summary.qbAge34PValue)} from read-only research.`}
              />
              <SummaryTile
                label="publication gate"
                value={liveEvidence.gates.publicationEnabled ? "open" : "blocked"}
                detail="No database writer, scorer, or public-trend publisher is enabled."
              />
              <SummaryTile
                label="narrative myth check"
                value={liveEvidence.summary.birthdayUsageConclusion === "not-publishable" ? "rejected" : "watch"}
                detail={`${formatNumber(liveEvidence.summary.birthdayWindowObservations)} birthday-window and ${formatNumber(liveEvidence.summary.careerMilestone50Observations)} milestone observations rejected.`}
              />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-4">
              <EvidenceLink href={liveEvidence.routes.usagePulse} label="Usage Pulse JSON" />
              <EvidenceLink href={liveEvidence.routes.qbAgeTrend} label="QB-age cohort JSON" />
              <EvidenceLink href={liveEvidence.routes.birthdayUsageTrend} label="Narrative myth JSON" />
              <EvidenceLink href={liveEvidence.routes.trendReadiness} label="Trend readiness JSON" />
            </div>
          </div>
        </section>

        <section className="border-b border-mineral px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                  Source stack
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                  What the engine can eventually know
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-ion-1">
                The table is intentionally explicit. It distinguishes free feeds from owned workflows,
                paid overlays, licensed sources, and references that require consent before use.
              </p>
            </div>

            <div className="mt-6 overflow-x-auto border border-mineral">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-mineral bg-eclipse font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Cost</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Proof</th>
                    <th className="px-4 py-3">Grain</th>
                    <th className="px-4 py-3">Use</th>
                    <th className="px-4 py-3">Boundary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {DATA_SOURCE_STACK.map((source) => (
                    <SourceTableRow key={source.key} source={source} evidence={evidenceByKey.get(source.key)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-b border-mineral px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Trend dependencies
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Questions need source coverage.</h2>
              <div className="mt-5 flex flex-col divide-y divide-mineral border border-mineral">
                {TREND_BACKLOG.map((item) => (
                  <div key={item.key} className="p-4">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <p className="font-semibold text-ion-white">{item.title}</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-orbital-cyan">
                        {item.status.replaceAll("-", " ")}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ion-1">{item.question}</p>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                      {item.requiredSources.join(" + ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Env provider gates
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Keys enable capability, not claims.</h2>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                This list reads whether env slots are filled. It never prints secret values and
                does not imply the database has real rows.
              </p>
              <div className="mt-5 space-y-3">
                {providers.map((provider) => (
                  <div key={provider.key} className="border border-mineral bg-carbon p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-ion-white">{provider.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ion-2">
                          {CATEGORY_LABEL[provider.category]}
                        </p>
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-orbital-cyan">
                        {provider.configured ? "configured" : "founder gated"}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ion-1">{provider.unlocks}</p>
                    <div className="mt-3 flex flex-col gap-2 border-t border-mineral pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <code className="font-mono text-[11px] text-ion-2">{provider.envVar}</code>
                      <p className="text-xs leading-5 text-ion-2">{provider.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl border border-mineral bg-eclipse p-5 sm:p-7">
            <h2 className="text-2xl font-semibold text-ion-white">Permission is part of the architecture.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              Scores24, satellite-radio transcripts, paid charting, and reporter networks can be valuable
              only when they are licensed, consented, or reduced to lawful references. The engine should
              prefer free public datasets and owned workflows first, then pay only where a source compounds.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {DATA_SOURCE_STACK.filter((source) => source.complianceNote).map((source) => (
                <div key={source.key} className="border border-mineral bg-carbon p-4">
                  <p className="font-semibold text-ion-white">{source.name}</p>
                  <p className="mt-2 text-sm leading-6 text-ion-1">{source.complianceNote}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
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

function SummaryTile({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="bg-eclipse p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">{label}</p>
      <p className="mt-3 font-numerals text-4xl font-semibold tabular-nums text-orbital-cyan">{value}</p>
      <p className="mt-3 text-sm leading-6 text-ion-1">{detail}</p>
    </div>
  );
}

function EvidenceLink({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <Link
      href={href}
      className="border border-mineral bg-eclipse px-4 py-3 text-sm font-semibold text-ion-white hover:border-orbital-cyan"
    >
      {label}
    </Link>
  );
}

function SourceTableRow({
  source,
  evidence,
}: {
  source: DataSourceCard;
  evidence: SourceLiveEvidence["datasets"][number] | undefined;
}): JSX.Element {
  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-ion-white">{source.name}</td>
      <td className="px-4 py-3 font-mono text-orbital-cyan">{sourceCostLabel(source.cost)}</td>
      <td className="px-4 py-3 font-mono text-ion">{sourceStatusLabel(source.status)}</td>
      <td className="px-4 py-3">
        {evidence ? (
          <Link href={evidence.route} className="font-mono text-[11px] uppercase tracking-[0.12em] text-orbital-cyan">
            {evidence.status} / {formatNumber(evidence.rowCount)}
          </Link>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ion-2">UNKNOWN</span>
        )}
      </td>
      <td className="px-4 py-3 text-ion-1">{source.grain}</td>
      <td className="px-4 py-3 text-ion-1">{source.unlocks}</td>
      <td className="px-4 py-3 text-ion-2">{source.complianceNote ?? source.liveClaim}</td>
    </tr>
  );
}

function CountRow({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-mineral pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-ion-1">{label}</span>
      <span className="font-numerals text-xl font-semibold text-ion-white">{value}</span>
    </div>
  );
}
