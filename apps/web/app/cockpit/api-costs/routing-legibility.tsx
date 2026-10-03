import type { ClaudeSurface, ModelTier } from "@/lib/claude-api/model-router";

/**
 * RoutingLegibility — read-only "which lane handles which surface" card for the
 * API-costs cockpit page.
 *
 * Renders the ACTIVE routing table from `model-router.ts` (SURFACE_TIER) plus
 * the model-economics view (blended $/Mtok at the active and recommended
 * tiers, from the vendored models.dev snapshot) and the free-lane eligibility
 * set. It never invents a value: every cell comes from those modules' real
 * exports, and the one measurement the repo does not record — prompt-cache hit
 * rate — is rendered as an honest "not recorded" note instead of a number.
 *
 * Pure presentation. No data fetching, no client state — safe on the server.
 * Parent page builds `rows` from live modules; this card only formats.
 */

export interface RoutingRow {
  readonly surface: ClaudeSurface;
  readonly activeTier: ModelTier;
  readonly recommendedTier: ModelTier;
  readonly activeModelId: string;
  readonly recommendedModelId: string;
  /** Blended $ per 1M tokens (75% input / 25% output) at the active tier. */
  readonly activeBlendedUsdPerM: number;
  /** Blended $ per 1M tokens at the recommended tier. */
  readonly recommendedBlendedUsdPerM: number;
  /**
   * Fraction saved by moving active → recommended (0 when the tiers are the
   * same; negative when the recommendation is an upgrade that costs more).
   */
  readonly savingsFraction: number | null;
  readonly freeLaneEligible: boolean;
}

export interface RoutingLegibilityProps {
  readonly rows: readonly RoutingRow[];
}

export function RoutingLegibility({ rows }: RoutingLegibilityProps): JSX.Element {
  return (
    <section className="rounded-lg border border-titanium/40 bg-obsidian/60">
      <div className="border-b border-titanium/40 px-4 py-3">
        <h2 className="text-sm font-semibold text-ion-white">Routing Legibility</h2>
        <p className="mt-1 text-xs text-ion-3">
          Which model lane actually serves each surface (mirror of{" "}
          <code className="text-ion-2">model-router.ts</code> SURFACE_TIER), and
          what the recommended tier would cost.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ion-3">
          No routing surfaces configured — nothing to display.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table
            aria-label="Routing legibility — active and recommended model tier per surface"
            className="min-w-full divide-y divide-titanium/30 text-sm"
          >
            <thead className="bg-eclipse/50 text-left text-[11px] uppercase tracking-wider text-ion-3">
              <tr>
                <th scope="col" className="px-4 py-3">Surface</th>
                <th scope="col" className="px-4 py-3">Active lane</th>
                <th scope="col" className="px-4 py-3">Active model</th>
                <th scope="col" className="px-4 py-3">Recommended</th>
                <th scope="col" className="px-4 py-3">Rec. model</th>
                <th scope="col" className="px-4 py-3">$/Mtok active</th>
                <th scope="col" className="px-4 py-3">$/Mtok rec.</th>
                <th scope="col" className="px-4 py-3">Savings</th>
                <th scope="col" className="px-4 py-3">Free lane</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {rows.map((row) => (
                <tr key={row.surface} className="text-ion-1">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ion-white">
                    {row.surface}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{row.activeTier}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ion-2">
                    {row.activeModelId}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{row.recommendedTier}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ion-2">
                    {row.recommendedModelId}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatUsdPerM(row.activeBlendedUsdPerM)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatUsdPerM(row.recommendedBlendedUsdPerM)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatSavings(row.savingsFraction)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {row.freeLaneEligible ? (
                      <span className="inline-flex rounded-full border border-verify/30 bg-verify/40 px-2 py-1 text-[11px] text-verify">
                        free-lane
                      </span>
                    ) : (
                      <span className="text-ion-3">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-titanium/40 px-4 py-3 text-xs text-ion-3">
        Cache-hit rate: not recorded — per-call prompt-cache usage is not tracked
        in the cost ledger, so this card shows no cache number rather than an
        invented one. Pricing is blended $/Mtok from the vendored models.dev
        snapshot (75% input / 25% output).
      </p>
    </section>
  );
}

function formatUsdPerM(value: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted}/Mtok`;
}

function formatSavings(fraction: number | null): string {
  if (fraction === null || fraction === 0) return "—";
  const pct = Math.round(fraction * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}
