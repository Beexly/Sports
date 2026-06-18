import Link from "next/link";
import {
  loadGateAudit,
  type GateAuditRow,
  type GateRecommendation,
  type GateKind,
} from "@/lib/data-reliability/gate-audit";

/**
 * Cockpit · Readiness Gate Audit (B2).
 *
 * Admin-only by virtue of the cockpit layout's ADMIN gate. Renders every
 * readiness gate with its requirement, live satisfaction (real flags/counts),
 * and a recommendation — WITHOUT flipping anything. Env changes are owner-only;
 * this surface only tells the owner what currently qualifies.
 */
export const dynamic = "force-dynamic";

const RECOMMENDATION_STYLES: Readonly<Record<GateRecommendation, string>> = {
  qualifies: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
  blocked: "border-yellow-500/30 bg-yellow-950/40 text-yellow-200",
  "founder-gated": "border-violet-500/30 bg-violet-950/40 text-violet-200",
  unknown: "border-white/[0.06] bg-white/[0.04]/70 text-ink-400",
};

const RECOMMENDATION_LABEL: Readonly<Record<GateRecommendation, string>> = {
  qualifies: "Qualifies",
  blocked: "Blocked",
  "founder-gated": "Founder-gated",
  unknown: "Unknown",
};

const KIND_STYLES: Readonly<Record<GateKind, string>> = {
  "env-flip": "border-sky-500/30 bg-sky-950/40 text-sky-200",
  "founder-gated": "border-violet-500/30 bg-violet-950/40 text-violet-200",
};

const KIND_LABEL: Readonly<Record<GateKind, string>> = {
  "env-flip": "Env flip (owner)",
  "founder-gated": "Founder-gated",
};

function formatCount(n: number | null): string {
  return n == null ? "unknown" : String(n);
}

export default async function CockpitGatesPage(): Promise<JSX.Element> {
  const report = await loadGateAudit();

  const qualifyCount = report.rows.filter((r) => r.recommendation === "qualifies").length;
  const blockedCount = report.rows.filter((r) => r.recommendation === "blocked").length;
  const founderCount = report.rows.filter((r) => r.kind === "founder-gated").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Readiness Gates
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Gate Audit</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          Every readiness gate, its requirement, and live satisfaction. This is a read-only
          audit — <span className="text-ink-200">nothing here flips a gate.</span> Env changes are
          owner-only. Founder-gated gates (calibration / derived model) additionally require a
          MODEL_VERSION bump + audit trail, not just an env change.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Gates" value={String(report.rows.length)} />
        <Metric label="Qualify now" value={String(qualifyCount)} />
        <Metric label="Blocked" value={String(blockedCount)} />
        <Metric label="Founder-gated" value={String(founderCount)} />
        <Metric
          label="Canonical settled"
          value={formatCount(report.counts.canonicalSettled)}
        />
      </section>

      <section className="rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">All readiness gates</h2>
          <p className="mt-1 text-xs text-ink-500">
            Learning-eligible snapshots: {formatCount(report.counts.learningEligibleSettled)} ·
            min settled for learning: {report.counts.minSettledForLearning} · generated{" "}
            {report.generatedAt}
          </p>
        </div>
        <div className="divide-y divide-titanium/30">
          {report.rows.map((row) => (
            <GateRowView key={row.id} row={row} />
          ))}
        </div>
      </section>

      <p className="text-[11px] text-ink-600">
        Counts are read live from settled-pick records. &ldquo;unknown&rdquo; means the count was
        unavailable (e.g. DB unreachable) — never silently treated as zero. No fabricated numbers.
      </p>
    </div>
  );
}

function GateRowView({ row }: { row: GateAuditRow }): JSX.Element {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-sm font-semibold text-white">{row.name}</code>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${KIND_STYLES[row.kind]}`}
            >
              {KIND_LABEL[row.kind]}
            </span>
          </div>
          <p className="mt-1.5 max-w-3xl text-xs text-ink-400">{row.requirement}</p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${RECOMMENDATION_STYLES[row.recommendation]}`}
        >
          {RECOMMENDATION_LABEL[row.recommendation]}
        </span>
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
            Current satisfaction
          </dt>
          <dd className="mt-1 text-xs text-ink-200">{row.currentState}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
            Recommendation
          </dt>
          <dd className="mt-1 text-xs text-ink-200">{row.recommendationText}</dd>
        </div>
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
