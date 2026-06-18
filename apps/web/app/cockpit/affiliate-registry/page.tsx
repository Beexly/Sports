/**
 * Cockpit · Affiliate Registry — compliance-first partner registry (Workstream M2).
 *
 * Admin-only by virtue of the cockpit layout ADMIN gate. INTERNAL only.
 *
 * HONESTY RULES:
 * - Honest-empty: no active affiliate relationships at launch. Zero fabrication.
 * - Every partner requires: owner approval + disclosure language + geo review.
 * - Sportsbook/casino = high-risk, deferred — cannot activate without full compliance.
 * - Nothing here is exposed publicly or auto-activates anything.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  loadAffiliateRegistry,
  ACTIVATION_REQUIREMENTS,
  HIGH_RISK_CATEGORIES,
  type AffiliatePartner,
  type OwnerApprovalStatus,
  type RiskRating,
} from "@/lib/revenue/affiliate-registry";

export default async function CockpitAffiliateRegistryPage(): Promise<JSX.Element> {
  const registry = loadAffiliateRegistry();

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
              Affiliate Registry
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/affiliate-disclosure"
              className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
              target="_blank"
              rel="noopener noreferrer"
            >
              Public disclosure ↗
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
          Compliance-first affiliate partner registry. Every partner requires
          owner approval, FTC-compliant disclosure language, geo restrictions
          confirmed, and an approved placement before activation. Sportsbook and
          casino affiliates are deferred.{" "}
          <span className="text-ink-200">
            No affiliate relationships active or in review at launch.
          </span>
        </p>
      </header>

      {/* Headline metrics */}
      <section className="grid gap-3 sm:grid-cols-4">
        <RegistryMetric
          label="Total partners"
          value={registry.total === 0 ? "—" : String(registry.total)}
          sub={registry.total === 0 ? "none yet" : "in registry"}
          unknown={registry.total === 0}
        />
        <RegistryMetric
          label="Active"
          value={registry.active === 0 ? "0" : String(registry.active)}
          sub="owner-approved"
          unknown={registry.active === 0}
        />
        <RegistryMetric
          label="Pending approval"
          value={
            registry.pendingApproval === 0
              ? "0"
              : String(registry.pendingApproval)
          }
          sub="awaiting owner gate"
          unknown={false}
        />
        <RegistryMetric
          label="High-risk / deferred"
          value={
            registry.deferred === 0 ? "0" : String(registry.deferred)
          }
          sub="sportsbook / casino"
          unknown={false}
        />
      </section>

      {/* Honest-empty notice */}
      {registry.total === 0 && (
        <section className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-amber-700/60 bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Empty registry
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
            {registry.note} Add entries to{" "}
            <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px]">
              lib/revenue/affiliate-registry.ts
            </code>{" "}
            only after passing the full compliance gate below.
          </p>
        </section>
      )}

      {/* Compliance posture */}
      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            Compliance posture
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            The gate every partner must clear before activation. This is not
            optional and it is not a formality.
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-xs leading-relaxed text-ink-300">
            {registry.compliancePosture}
          </p>
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Required before activation
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {ACTIVATION_REQUIREMENTS.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink-300">
                  <span className="mt-0.5 shrink-0 rounded-full bg-amber-900/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                    {i + 1}
                  </span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Deferred categories — cannot activate
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-ink-400">
              {HIGH_RISK_CATEGORIES.map((cat) => (
                <li key={cat} className="flex items-center gap-2">
                  <span className="rounded-full border border-rose-700/40 bg-rose-950/30 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                    deferred
                  </span>
                  {cat}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Partner table */}
      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">All partners</h2>
          <p className="mt-1 text-xs text-ink-500">
            {registry.total === 0
              ? "No partners in registry. Add via compliance-gated outreach only."
              : `${registry.total} partner(s) in registry.`}
          </p>
        </div>
        {registry.total === 0 ? (
          <EmptyTable />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.04] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Owner approval</th>
                  <th className="px-4 py-3">Disclosure set</th>
                  <th className="px-4 py-3">Geo confirmed</th>
                  <th className="px-4 py-3">Placement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {registry.partners.map((p) => (
                  <PartnerRow key={p.id} partner={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Footer caveat */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. All partner
        entries are real. The compliance gate is non-negotiable. Never add a
        fabricated partner or activate without owner approval and disclosure
        language.
      </p>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function RegistryMetric({
  label,
  value,
  sub,
  unknown,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly unknown: boolean;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-bold ${unknown ? "text-ink-400" : "text-white"}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-600">{sub}</p>
    </div>
  );
}

// ── Partner row ───────────────────────────────────────────────────────────────

function PartnerRow({
  partner: p,
}: {
  readonly partner: AffiliatePartner;
}): JSX.Element {
  return (
    <tr className="text-ink-300 hover:bg-white/[0.02]">
      <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
        {p.partner}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">
        {p.category}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">
        {p.commissionType ?? "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <RiskBadge rating={p.riskRating} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <ApprovalBadge status={p.ownerApprovalStatus} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs">
        {p.disclosureLanguage !== null ? (
          <span className="text-emerald-300">set</span>
        ) : (
          <span className="text-amber-300">missing</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs">
        {p.geoRestrictions !== null ? (
          <span className="text-emerald-300">confirmed</span>
        ) : (
          <span className="text-amber-300">not confirmed</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-ink-400">
        {p.approvedPlacement ?? "—"}
      </td>
    </tr>
  );
}

function RiskBadge({ rating }: { readonly rating: RiskRating }): JSX.Element {
  const styles: Record<RiskRating, string> = {
    low: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
    medium: "border-amber-700/40 bg-amber-950/30 text-amber-300",
    high: "border-rose-700/40 bg-rose-950/30 text-rose-300",
    deferred: "border-white/[0.06] bg-white/[0.04] text-ink-500",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[rating]}`}
    >
      {rating}
    </span>
  );
}

function ApprovalBadge({
  status,
}: {
  readonly status: OwnerApprovalStatus;
}): JSX.Element {
  const styles: Record<OwnerApprovalStatus, string> = {
    approved: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
    pending: "border-amber-700/40 bg-amber-950/30 text-amber-300",
    not_submitted: "border-white/[0.06] bg-white/[0.04] text-ink-500",
    declined: "border-rose-700/40 bg-rose-950/30 text-rose-300",
  };

  const labels: Record<OwnerApprovalStatus, string> = {
    approved: "approved",
    pending: "pending",
    not_submitted: "not submitted",
    declined: "declined",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyTable(): JSX.Element {
  return (
    <div className="px-4 py-12 text-center">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-600">
        No partners in registry
      </p>
      <p className="mt-2 text-xs text-ink-600">
        Add entries to{" "}
        <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px]">
          lib/revenue/affiliate-registry.ts
        </code>{" "}
        after passing the full compliance gate: owner approval + disclosure
        language + geo restrictions confirmed.
      </p>
    </div>
  );
}
