import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import {
  computeCashSnapshot,
  cashOsGreen,
  prismaCashSqlClient,
  type CashSnapshot,
  type FunnelTargets,
} from "@/lib/growth/cash-os";

/**
 * Cash OS (admin/cash) — internal revenue-tracking dashboard for the
 * Commercial Operating Layer / Independence Gates (see
 * docs/ops/INDEPENDENCE_GATES.md). Read-only: renders the live CashSnapshot
 * and whether the current Independence Gate targets are met.
 *
 * Auth: mirrors every other admin page — ADMIN role or redirect (segment
 * layout at app/admin/layout.tsx already gates the whole /admin/* tree; this
 * inline check is the same belt-and-suspenders pattern as admin/clv/page.tsx).
 * The /admin tree is robots-noindex via app/admin/layout.tsx.
 */
export const dynamic = "force-dynamic";

// Independence Gate A/B milestones (see docs/ops/INDEPENDENCE_GATES.md).
// Overridable via env for staging/testing without a code change; defaults to
// Gate A's $1k MRR figure as the near-term target this dashboard tracks.
const FUNNEL_TARGETS: FunnelTargets = {
  mrrCents: Number(process.env["CASH_OS_TARGET_MRR_CENTS"] ?? 100_000), // $1,000
  weeklyActives: Number(process.env["CASH_OS_TARGET_WEEKLY_ACTIVES"] ?? 50),
};

function dollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminCashPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  let snapshot: CashSnapshot | null = null;
  let loadError: string | null = null;
  try {
    snapshot = await computeCashSnapshot(prismaCashSqlClient(db));
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const green = snapshot ? cashOsGreen(snapshot, FUNNEL_TARGETS) : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ion-white">Cash OS</h1>
        <Link
          href="/admin"
          className="w-fit rounded-lg border border-titanium px-3 py-2 text-xs text-ion-1 hover:bg-carbon/60"
        >
          ← Back to Admin
        </Link>
      </div>

      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-caution/60 bg-caution/10 px-4 py-2 text-xs text-caution"
      >
        Internal only. Revenue tracking for the Independence Gates (see
        docs/ops/INDEPENDENCE_GATES.md) — not customer-facing.
      </p>

      {loadError && (
        <p
          data-testid="cash-os-error"
          className="rounded-lg border border-alert/60 bg-alert/10 px-4 py-2 text-xs text-alert"
        >
          Could not load CashSnapshot: {loadError}
        </p>
      )}

      {snapshot && (
        <>
          <section
            data-testid="cash-os-gate"
            className="rounded-2xl border border-titanium bg-carbon/40 p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
                Independence Gate
              </h2>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  green
                    ? "border-verify bg-verify/30 text-verify"
                    : "border-caution bg-caution/30 text-caution"
                }`}
              >
                {green ? "green" : "not yet"}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-ion-3">
              Target: {dollars(FUNNEL_TARGETS.mrrCents)} MRR and{" "}
              {FUNNEL_TARGETS.weeklyActives} weekly activations. Current:{" "}
              {dollars(snapshot.mrrCents)} MRR, {snapshot.activations7d} activations
              (7d).
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="MRR" value={dollars(snapshot.mrrCents)} />
            <StatCard
              label="MRR trend (7d)"
              value={`${snapshot.mrrTrend7d >= 0 ? "+" : ""}${dollars(snapshot.mrrTrend7d)}`}
              tone={snapshot.mrrTrend7d >= 0 ? "good" : "bad"}
            />
            <StatCard label="Activations (7d)" value={String(snapshot.activations7d)} />
            <StatCard label="Affiliate revenue (30d)" value={dollars(snapshot.affiliateCents30d)} />
            <StatCard label="Pilot revenue (30d)" value={dollars(snapshot.pilotCents30d)} />
            <StatCard label="Paying users" value={String(snapshot.payingUsers)} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const accent =
    tone === "good" ? "text-verify" : tone === "bad" ? "text-alert" : "text-ion-white";
  return (
    <div className="rounded-2xl border border-titanium bg-carbon/40 p-4">
      <span className={`block text-2xl font-bold ${accent}`}>{value}</span>
      <span className="mt-1 block text-xs text-ion-3">{label}</span>
    </div>
  );
}
