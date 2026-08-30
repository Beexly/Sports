// DISPLAY ONLY. This page reads owner-supplied numbers from environment
// variables and renders derived math (lib/growth/runway.ts). It must NEVER
// write, transfer, or move any money — no Stripe payout calls, no bank API
// calls, no writes of any kind. If you are tempted to add a mutation here,
// put it somewhere else and leave this page read-only.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { runwayMonths, canHitFamilyFloor, type RunwayInput } from "@/lib/growth/runway";

/**
 * Runway (admin/runway) — owner-only cash-runway dashboard.
 *
 * Inputs come from env vars (no owner-input UI/DB table exists yet — env is
 * the simplest source of truth for a single-operator business). Required:
 *   RUNWAY_CASH_IN_BANK_CENTS   — current cash on hand, in cents
 *   RUNWAY_MRR_CENTS            — current MRR, in cents (falls back to 0)
 *   RUNWAY_MONTHLY_BURN_CENTS   — current monthly burn, in cents
 *   RUNWAY_FAMILY_FLOOR_CENTS   — the owner's minimum monthly draw, in cents
 * Unset vars default to 0, which renders honestly (e.g. $0 cash → 0 months
 * runway if burn is net-negative) rather than crashing the page.
 *
 * Auth: mirrors every other admin page — ADMIN role or redirect (segment
 * layout at app/admin/layout.tsx already gates the whole /admin/* tree).
 */
export const dynamic = "force-dynamic";

function centsFromEnv(name: string): number {
  const raw = process.env[name];
  const n = raw === undefined ? 0 : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function dollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminRunwayPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const input: RunwayInput = {
    cashInBankCents: centsFromEnv("RUNWAY_CASH_IN_BANK_CENTS"),
    mrrCents: centsFromEnv("RUNWAY_MRR_CENTS"),
    monthlyBurnCents: centsFromEnv("RUNWAY_MONTHLY_BURN_CENTS"),
    familyFloorCents: centsFromEnv("RUNWAY_FAMILY_FLOOR_CENTS"),
  };

  const months = runwayMonths(input);
  const hitsFloor = canHitFamilyFloor(input);
  const net = input.mrrCents - input.monthlyBurnCents;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ion-white">Runway</h1>
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
        Internal only, display-only. Numbers come from RUNWAY_* env vars, set
        manually by the owner — this page never writes, transfers, or moves
        money.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Runway"
          value={months === Infinity ? "∞ (net-positive)" : `${months.toFixed(1)} months`}
        />
        <StatCard
          label="Net (MRR − burn)"
          value={`${net >= 0 ? "+" : ""}${dollars(net)}`}
          tone={net >= 0 ? "good" : "bad"}
        />
        <StatCard
          label="Hits family floor?"
          value={hitsFloor ? "yes" : "no"}
          tone={hitsFloor ? "good" : "bad"}
        />
        <StatCard label="Cash in bank" value={dollars(input.cashInBankCents)} />
        <StatCard label="MRR" value={dollars(input.mrrCents)} />
        <StatCard label="Monthly burn" value={dollars(input.monthlyBurnCents)} />
        <StatCard label="Family floor" value={dollars(input.familyFloorCents)} />
      </div>
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
