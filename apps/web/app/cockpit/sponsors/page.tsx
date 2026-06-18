/**
 * Cockpit · Sponsors — sponsor pipeline (Workstream M2).
 *
 * Admin-only by virtue of the cockpit layout ADMIN gate. INTERNAL only.
 *
 * HONESTY RULES:
 * - Honest-empty: all stage counts are 0 at launch. No fabricated sponsors.
 * - Every entry in the pipeline must come from real outreach.
 * - Nothing here is exposed publicly or wired to any external system.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  loadSponsorPipeline,
  PIPELINE_STAGES,
  STAGE_LABELS,
  SPONSOR_PRICING_TIERS,
  type SponsorStage,
  type Sponsor,
} from "@/lib/revenue/sponsors";

export default async function CockpitSponsorsPage(): Promise<JSX.Element> {
  const pipeline = loadSponsorPipeline();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Monetization · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Sponsor Pipeline
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/media-kit"
              className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
              target="_blank"
              rel="noopener noreferrer"
            >
              View media kit ↗
            </Link>
            <Link
              href="/cockpit/revenue"
              className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
            >
              ← Revenue
            </Link>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          The sponsor outreach pipeline — lead to active. Stages: lead → contacted
          → interested → proposal sent → active / declined. All counts are honest
          current state.{" "}
          <span className="text-ink-200">
            No sponsors in the pipeline yet — add via outreach.
          </span>{" "}
          Never fabricate an entry.
        </p>
      </header>

      {/* Honest-empty notice */}
      {pipeline.total === 0 && (
        <section className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-amber-700/60 bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Empty pipeline
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
            {pipeline.note} This is the honest starting state. Add sponsor entries
            to{" "}
            <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px]">
              lib/revenue/sponsors.ts
            </code>{" "}
            as real outreach generates leads. Rate ranges are published on the
            media kit page — link above.
          </p>
        </section>
      )}

      {/* Stage columns */}
      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Pipeline by stage</h2>
          <p className="mt-1 text-xs text-ink-500">
            All stage counts are zero at launch — this is the correct honest
            starting state. Counts update as entries are added.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/[0.04] sm:grid-cols-3 lg:grid-cols-6">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              count={pipeline.byStage[stage]}
            />
          ))}
        </div>
      </section>

      {/* Sponsor list */}
      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">All sponsors</h2>
          <p className="mt-1 text-xs text-ink-500">
            {pipeline.total === 0
              ? "No entries yet. Add via outreach."
              : `${pipeline.total} sponsor(s) in the pipeline.`}
          </p>
        </div>
        {pipeline.total === 0 ? (
          <EmptyTable />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.04] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Est. $/mo</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pipeline.sponsors.map((s) => (
                  <SponsorRow key={s.id} sponsor={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pricing reference */}
      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            Pricing tier reference
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            Founding-sponsor rate ranges from the revenue doctrine. Actual deal
            prices are negotiated — these are the published ranges.
          </p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {SPONSOR_PRICING_TIERS.map((tier) => (
            <div
              key={tier.type}
              className="flex flex-wrap items-start gap-4 px-4 py-3 hover:bg-white/[0.02]"
            >
              <div className="min-w-[120px] shrink-0">
                <p className="font-mono text-base font-bold text-white">
                  {tier.rangeUsdPerMonth}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-600">
                  per month
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{tier.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">
                  {tier.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer caveat */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. All pipeline
        entries are real. Never add a fabricated sponsor. Outreach targets
        are tracked here, not on any public surface.
      </p>
    </div>
  );
}

// ── Stage column ──────────────────────────────────────────────────────────────

function StageColumn({
  stage,
  count,
}: {
  readonly stage: SponsorStage;
  readonly count: number;
}): JSX.Element {
  const isActive = stage === "active";
  const isDeclined = stage === "declined";

  return (
    <div className="flex flex-col gap-1 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
        {STAGE_LABELS[stage]}
      </p>
      <p
        className={`mt-1 font-display text-2xl font-bold tabular-nums ${
          isActive
            ? "text-emerald-300"
            : isDeclined
            ? "text-ink-500"
            : count > 0
            ? "text-white"
            : "text-ink-600"
        }`}
      >
        {count}
      </p>
    </div>
  );
}

// ── Sponsor row ───────────────────────────────────────────────────────────────

function SponsorRow({ sponsor: s }: { readonly sponsor: Sponsor }): JSX.Element {
  return (
    <tr className="text-ink-300 hover:bg-white/[0.02]">
      <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
        {s.companyName}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">
        {s.category}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <StageBadge stage={s.stage} />
      </td>
      <td className="px-4 py-3 text-xs text-ink-400">
        {s.placementTypes.length > 0 ? s.placementTypes.join(", ") : "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">
        {s.estimatedMonthlyUsd !== null
          ? `$${s.estimatedMonthlyUsd.toLocaleString("en-US")}`
          : "—"}
      </td>
      <td className="px-4 py-3 text-xs text-ink-500">
        {s.notes ?? "—"}
      </td>
    </tr>
  );
}

function StageBadge({ stage }: { readonly stage: SponsorStage }): JSX.Element {
  const styles: Record<SponsorStage, string> = {
    lead: "border-white/[0.06] bg-white/[0.04] text-ink-500",
    contacted: "border-sky-500/30 bg-sky-950/40 text-sky-200",
    interested: "border-violet-500/30 bg-violet-950/30 text-violet-300",
    proposal_sent: "border-amber-700/40 bg-amber-950/30 text-amber-300",
    active: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
    declined: "border-white/[0.06] bg-white/[0.03] text-ink-600",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[stage]}`}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyTable(): JSX.Element {
  return (
    <div className="px-4 py-12 text-center">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-600">
        No sponsors in pipeline
      </p>
      <p className="mt-2 text-xs text-ink-600">
        Add entries to{" "}
        <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px]">
          lib/revenue/sponsors.ts
        </code>{" "}
        as real outreach generates leads.
      </p>
    </div>
  );
}
