import Link from "next/link";
import { BudgetOverrideControl } from "./budget-override-control";
import {
  loadClaudeApiCostsDashboard,
  type ClaudeApiCostSurfaceSummary,
} from "@/lib/claude-api/dashboard";
import type { ClaudeBudgetStatus } from "@/lib/claude-api/cost-monitor";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Readonly<Record<ClaudeBudgetStatus, string>> = {
  green: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
  yellow: "border-yellow-500/30 bg-yellow-950/40 text-yellow-200",
  orange: "border-orange-500/30 bg-orange-950/40 text-orange-200",
  red: "border-red-500/30 bg-red-950/40 text-red-200",
  hard_cap: "border-red-400/50 bg-red-950 text-red-100",
};

export default async function CockpitApiCostsPage(): Promise<JSX.Element> {
  const dashboard = await loadClaudeApiCostsDashboard();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Claude API Costs
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Generation Budget Monitor</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-mineral px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-900/60"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-gray-400">
          Current-month spend by content surface. Red and hard-cap states stop new generation
          unless an operator override is active.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Month spend" value={formatUsd(dashboard.totalSpentUsd)} />
        <Metric label="Monthly budget" value={formatUsd(dashboard.totalBudgetUsd)} />
        <Metric label="Generated" value={new Date(dashboard.generatedAtIso).toLocaleString("en-US")} />
      </section>

      <section className="overflow-hidden rounded-lg border border-mineral bg-carbon">
        <div className="border-b border-mineral px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Surface Budgets</h2>
          <p className="mt-1 text-xs text-gray-500">
            Window: {new Date(dashboard.monthStartIso).toLocaleDateString("en-US")} to{" "}
            {new Date(dashboard.monthEndIso).toLocaleDateString("en-US")}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800 text-sm">
            <thead className="bg-gray-900/60 text-left text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Surface</th>
                <th className="px-4 py-3">Spend</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Calls</th>
                <th className="px-4 py-3">Errors</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {dashboard.surfaces.map((surface) => (
                <SurfaceRow key={surface.surface} surface={surface} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-mineral bg-carbon p-4">
        <h2 className="text-sm font-semibold text-white">Recent Errors</h2>
        {dashboard.recentErrors.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No Claude API errors recorded.</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {dashboard.recentErrors.map((error) => (
              <div key={error.id} className="rounded-md border border-mineral bg-gray-900/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-200">{error.surface}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(error.observedAtIso).toLocaleString("en-US")}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {error.errorKind ?? "unknown"} - {error.modelName}
                  {error.gameId ? ` - game ${error.gameId}` : ""}
                  {error.templateKind ? ` - ${error.templateKind}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-mineral bg-carbon p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SurfaceRow({ surface }: { readonly surface: ClaudeApiCostSurfaceSummary }): JSX.Element {
  const pct = Number.isFinite(surface.ratio) ? Math.round(surface.ratio * 100) : 100;
  return (
    <tr className="text-gray-300">
      <td className="whitespace-nowrap px-4 py-3 font-medium text-white">{surface.surface}</td>
      <td className="whitespace-nowrap px-4 py-3">{formatUsd(surface.spentUsd)}</td>
      <td className="whitespace-nowrap px-4 py-3">{formatUsd(surface.budgetUsd)}</td>
      <td className="whitespace-nowrap px-4 py-3">{pct}%</td>
      <td className="whitespace-nowrap px-4 py-3">{surface.callCount}</td>
      <td className="whitespace-nowrap px-4 py-3">{surface.errorCount}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${STATUS_STYLES[surface.status]}`}>
          {surface.overrideActive ? "override" : surface.requestAllowed ? surface.status : "blocked"}
        </span>
      </td>
      <td className="min-w-[340px] px-4 py-3">
        <BudgetOverrideControl surface={surface.surface} overrideActive={surface.overrideActive} />
      </td>
    </tr>
  );
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
