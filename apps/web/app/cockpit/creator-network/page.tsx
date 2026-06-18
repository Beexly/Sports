/**
 * Cockpit · Creator Network — Workstream M4.
 *
 * Admin-only by virtue of the cockpit layout ADMIN gate. INTERNAL.
 *
 * HONESTY RULES (non-negotiable):
 * - Creator roster is EMPTY at launch — no fabricated creators.
 * - No follower counts, earnings, referral stats — all unknown until
 *   a creator is recruited and real data flows.
 * - Compliance guardrails are structural, not aspirational.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  CREATOR_LANES,
  CREATORS,
  CONTRIBUTOR_OFFER,
  getRosterSummary,
  type CreatorLane,
} from "@/lib/revenue/creator-network";

export default function CockpitCreatorNetworkPage(): JSX.Element {
  const summary = getRosterSummary();

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Monetization · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Creator network
            </h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            ← Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          Micro-creator recruitment by lane — NFL, CFB, NBA, MLB, fantasy, DFS,
          betting-education, Houston-local. Honest-empty roster until real
          outreach converts. Compliance guardrails enforced structurally.
        </p>
      </header>

      {/* ── Roster summary ─────────────────────────────────────────────────── */}
      <RosterSummarySection totalCreators={summary.totalCreators} note={summary.note} />

      {/* ── Lane definitions ──────────────────────────────────────────────── */}
      <LanesSection />

      {/* ── Honest-empty roster ───────────────────────────────────────────── */}
      <RosterSection />

      {/* ── Contributor offer ─────────────────────────────────────────────── */}
      <ContributorOfferSection />

      {/* ── Compliance guardrails ─────────────────────────────────────────── */}
      <ComplianceSection />

      {/* ── Caveat footer ─────────────────────────────────────────────────── */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. The roster is
        honestly empty at launch; no creator entries are fabricated. Revenue
        share percentages and offer terms are structural config — adjust before
        first outreach. Compliance guardrails apply to every creator, every
        piece of content.
      </p>
    </div>
  );
}

// ── Roster summary ────────────────────────────────────────────────────────────

function RosterSummarySection({
  totalCreators,
  note,
}: {
  readonly totalCreators: number;
  readonly note: string;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            totalCreators === 0
              ? "border-amber-700/40 bg-amber-950/30 text-amber-300"
              : "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
          }`}
        >
          {totalCreators === 0 ? "0 creators" : `${totalCreators} creator(s)`}
        </span>
        <span className="text-xs text-ink-500">
          {totalCreators === 0 ? "honest empty" : "in network"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-amber-100/80">{note}</p>
    </section>
  );
}

// ── Lanes section ─────────────────────────────────────────────────────────────

function LanesSection(): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Recruitment lanes</h2>
        <p className="mt-1 text-xs text-ink-500">
          {CREATOR_LANES.length} lanes defined. Outreach targets creators who
          are data-forward, honest about uncertainty, and avoid tout language.
        </p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {CREATOR_LANES.map((lane) => (
          <LaneRow key={lane.id} lane={lane} />
        ))}
      </div>
    </section>
  );
}

function LaneRow({ lane }: { readonly lane: CreatorLane }): JSX.Element {
  const summary = getRosterSummary();
  const count = summary.byLane[lane.id] ?? 0;

  return (
    <div className="flex flex-wrap items-start gap-4 px-4 py-3 hover:bg-white/[0.02]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">{lane.name}</p>
          <span className="font-mono text-[10px] text-ink-600">
            {count === 0 ? "0 creators" : `${count} creator(s)`}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ink-500">{lane.description}</p>
        <p className="mt-1 text-[11px] text-ink-600">
          Target: {lane.targetProfile}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          count === 0
            ? "border-white/[0.06] bg-white/[0.04] text-ink-500"
            : "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
        }`}
      >
        {count === 0 ? "empty" : `${count} active`}
      </span>
    </div>
  );
}

// ── Honest-empty roster ───────────────────────────────────────────────────────

function RosterSection(): JSX.Element {
  if (CREATORS.length === 0) {
    return (
      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Creator roster</h2>
        </div>
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <p className="text-sm text-ink-500">No creators recruited yet.</p>
          <p className="max-w-sm text-xs text-ink-600">
            Add entries to{" "}
            <code className="font-mono">lib/revenue/creator-network.ts</code>{" "}
            as real outreach converts. Never add a fabricated entry.
          </p>
        </div>
      </section>
    );
  }

  // If creators exist in the future, this renders them.
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">
          Creator roster ({CREATORS.length})
        </h2>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {CREATORS.map((creator) => (
          <div key={creator.id} className="px-4 py-3">
            <p className="text-sm font-semibold text-white">{creator.name}</p>
            <p className="text-xs text-ink-500">
              Lane: {creator.lane} · Status: {creator.status}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Contributor offer ─────────────────────────────────────────────────────────

function ContributorOfferSection(): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Contributor offer</h2>
        <p className="mt-1 text-xs text-ink-500">
          The structured offer presented to potential creator partners. Review
          and adjust terms before first outreach.
        </p>
      </div>
      <div className="px-4 py-3">
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              Revenue share
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {CONTRIBUTOR_OFFER.revenueSharePct}%
            </p>
            <p className="mt-0.5 text-[11px] text-ink-600">
              of referred subscription revenue
            </p>
          </div>
          <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              Referral code format
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-white">
              {CONTRIBUTOR_OFFER.referralCodeFormat}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-600">
              assigned at signup
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
            Assets provided to creator
          </p>
          <ul className="flex flex-col gap-1">
            {CONTRIBUTOR_OFFER.assets.map((asset) => (
              <li key={asset} className="flex items-start gap-2 text-xs text-ink-400">
                <span className="mt-0.5 text-ink-600">·</span>
                {asset}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Compliance guardrails ─────────────────────────────────────────────────────

function ComplianceSection(): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-amber-700/30 bg-amber-950/10">
      <div className="border-b border-amber-700/20 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">
          Compliance guardrails
        </h2>
        <p className="mt-1 text-xs text-amber-100/60">
          These apply to every creator, every piece of content — structurally
          enforced, not aspirational. Violations suspend the creator.
        </p>
      </div>
      <div className="divide-y divide-amber-700/10">
        {CONTRIBUTOR_OFFER.complianceGuardrails.map((guardrail, idx) => (
          <div key={idx} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-amber-500">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <p className="text-xs leading-relaxed text-amber-100/80">
              {guardrail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
