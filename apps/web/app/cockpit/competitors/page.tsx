import type { Metadata } from "next";
import {
  WATCHLIST_THESIS,
  COMPETITORS,
  competitorsByTier,
  approvalGatedCount,
  type Competitor,
} from "@/lib/cockpit/competitor-watchlist";

// Founder-only — the cockpit layout enforces the ADMIN gate; not indexed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Competitor War Room — Cockpit",
  robots: { index: false, follow: false, nocache: true },
};

export default function CompetitorsPage(): JSX.Element {
  const groups = competitorsByTier();
  const gated = approvalGatedCount();

  return (
    <div className="flex flex-col gap-8">
      {/* Header + thesis */}
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
          Competitor War Room
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-ion-white">
          Know the field. Don&apos;t chase it.
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-ion-1">{WATCHLIST_THESIS}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Stat label="Tracked rivals" value={String(COMPETITORS.length)} />
          <Stat label="Lanes" value={String(groups.length)} />
          <Stat label="Approval-gated data paths" value={String(gated)} tone="amber" />
        </div>
        <p className="max-w-3xl text-xs leading-5 text-ion-2">
          Sourced from the competitive-expansion R&amp;D packet
          (<code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[10px] text-ion-1">docs/research/gse-competitor-*</code>).
          Public product framing only — we never scrape private drafts, copy projections/rankings,
          ingest odds/props without approved providers, or imply guaranteed wins.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.tier} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
            {g.label} <span className="text-ion-2/70">· {g.rows.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {g.rows.map((c) => (
              <CompetitorCard key={c.name} c={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" }): JSX.Element {
  return (
    <div className="rounded-ds-sm border border-surface-line bg-surface-sunken px-3 py-2 text-left">
      <p className={`text-lg font-bold ${tone === "amber" ? "text-amber-400" : "text-ion-white"}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-2">{label}</p>
    </div>
  );
}

function CompetitorCard({ c }: { c: Competitor }): JSX.Element {
  return (
    <article className="flex flex-col gap-3 rounded-ds-md border border-surface-line bg-surface-raised p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <a
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ion-white underline-offset-4 hover:text-orbital-cyan hover:underline"
        >
          {c.name}
        </a>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ion-2">{c.category}</span>
        {c.approvalGated && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Approval-gated
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-ds-sm border border-surface-line bg-surface-sunken p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ion-2">Their edge</p>
          <p className="mt-1 text-xs leading-5 text-ion-1">{c.theirEdge}</p>
        </div>
        <div className="rounded-ds-sm border border-orbital-cyan/25 bg-orbital-cyan/5 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-orbital-cyan">GSE counter</p>
          <p className="mt-1 text-xs leading-5 text-ion-1">{c.gseCounter}</p>
        </div>
      </div>

      <p className="text-[11px] leading-5 text-ion-2">
        <span className="font-semibold text-ion-2">Hard line:</span> {c.legalNote}
      </p>
    </article>
  );
}
