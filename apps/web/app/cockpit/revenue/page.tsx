import {
  REVENUE_MODELS,
  COMPETITOR_PRICING,
  GSE_REVENUE_PHASES,
  SPORTSBOOK_AFFILIATE_PROGRAMS,
  coreRevenueModels,
  highRiskModels,
  competitorPricingRange,
} from "@/lib/research/revenue-intelligence";
import {
  TRUST_TIER_DEFINITIONS,
  UNIT_ECONOMICS,
  ARR_PROJECTIONS,
} from "@/lib/gse/revenue-operating-model";

export const dynamic = "force-dynamic";

const RELEVANCE_TONE: Record<string, string> = {
  core: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  secondary: "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  future: "border-violet-500/30 bg-violet-950/30 text-violet-200",
  excluded: "border-red-500/30 bg-red-950/30 text-red-300",
};

const RISK_TONE: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export default function RevenueCockpitPage(): JSX.Element {
  const coreModels = coreRevenueModels();
  const riskyModels = highRiskModels();
  const pricingRange = competitorPricingRange();
  const currentTier = TRUST_TIER_DEFINITIONS[0]!;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
            Revenue Intelligence
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ion-white">Revenue Operating Model</h1>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-ion-2">
          Proof-gated pricing ladder, unit economics, competitor pricing, and affiliate risk map.
          All competitor pricing labeled as public-page estimates.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Current tier" value={currentTier.tier} detail={currentTier.description.slice(0, 60) + "…"} />
        <Metric label="Pro (founding)" value={`$${currentTier.proMonthlyUsd}/mo`} detail={`$${currentTier.proAnnualUsd}/yr · grandfathered forever`} />
        <Metric label="Elite (founding)" value={`$${currentTier.eliteMonthlyUsd}/mo`} detail={`$${currentTier.eliteAnnualUsd}/yr · grandfathered forever`} />
        <Metric label="Core revenue models" value={String(coreModels.length)} detail="Active at FOUNDING tier" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Trust ladder</h2>
          <div className="mt-4 space-y-3">
            {TRUST_TIER_DEFINITIONS.map((tier) => (
              <div key={tier.tier} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ion-white">{tier.label}</p>
                    <p className="mt-1 text-xs text-ion-3">
                      Pro: ${tier.proMonthlyUsd}/mo · ${tier.proAnnualUsd}/yr
                    </p>
                    <p className="text-xs text-ion-3">
                      Elite: ${tier.eliteMonthlyUsd}/mo · ${tier.eliteAnnualUsd}/yr
                    </p>
                  </div>
                  {tier.foundingMembersGrandfathered && (
                    <span className="rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] text-emerald-200">
                      grandfathered
                    </span>
                  )}
                </div>
                {tier.milestoneGates.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {tier.milestoneGates.map((gate) => (
                      <p key={gate.id} className="text-[11px] text-ion-3">
                        Gate: {gate.description}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">Revenue phases</h2>
          <div className="mt-4 space-y-3">
            {GSE_REVENUE_PHASES.map((phase) => (
              <div key={phase.phase} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold capitalize text-ion-white">{phase.phase}</p>
                  <span className="font-mono text-[10px] text-emerald-300">{phase.targetArr}</span>
                </div>
                <p className="mt-1 text-[11px] text-ion-3">{phase.milestoneTrigger}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {phase.primaryRevenue.map((r) => (
                    <span key={r} className="rounded bg-obsidian px-1.5 py-0.5 font-mono text-[9px] text-ion-3">
                      {r.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">Competitor pricing</h2>
          <p className="mt-1 text-xs text-ion-3">
            All values are public-page estimates — source gap: verify before publishing.
            Market monthly range: ${pricingRange.minMonthly}–${pricingRange.maxMonthly} · Median annual: ${pricingRange.medianAnnual}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[700px] divide-y divide-titanium/30 text-left text-sm">
            <thead className="bg-eclipse/50 text-[11px] uppercase tracking-wider text-ion-3">
              <tr>
                <th className="px-4 py-3">Competitor</th>
                <th className="px-4 py-3">Monthly</th>
                <th className="px-4 py-3">Annual</th>
                <th className="px-4 py-3">Seasonal</th>
                <th className="px-4 py-3">Free tier</th>
                <th className="px-4 py-3">Key gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-titanium/30">
              {COMPETITOR_PRICING.map((c) => (
                <tr key={c.name} className="text-ion-1">
                  <td className="px-4 py-3 font-medium text-ion-white">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan-300">
                    {c.monthlyUsd !== null ? `$${c.monthlyUsd}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan-300">
                    {c.annualUsd !== null ? `$${c.annualUsd}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan-300">
                    {c.seasonalUsd !== null ? `$${c.seasonalUsd}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.hasFree ? (
                      <span className="text-xs text-emerald-400">yes</span>
                    ) : (
                      <span className="text-xs text-red-400/70">no</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-ion-2">{c.paidGates.slice(0, 60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-orange-900/30 bg-orange-950/10 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-300">
          High-risk revenue models
        </h2>
        <p className="mt-2 text-sm leading-6 text-orange-100/70">
          These models require legal review before implementation. Do NOT implement sportsbook affiliate
          without full compliance review, FTC disclosure framework, and explicit owner approval.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {riskyModels.map((m) => (
            <div key={m.id} className="rounded-lg border border-orange-900/30 bg-obsidian/70 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-ion-white">{m.name}</p>
                <span className={`text-xs font-semibold ${RISK_TONE[m.regulatoryRisk]}`}>
                  {m.regulatoryRisk} risk
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-ion-2">{m.gseNote}</p>
              <div className="mt-2 space-y-1">
                {m.risks.slice(0, 2).map((r, i) => (
                  <p key={i} className="text-[11px] text-ion-3">• {r}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-titanium/40 bg-obsidian/60">
        <div className="border-b border-titanium/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-ion-white">All revenue models</h2>
        </div>
        <div className="divide-y divide-titanium/30">
          {REVENUE_MODELS.map((m) => (
            <div key={m.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="min-w-[14rem] flex-1">
                <p className="font-medium text-ion-white">{m.name}</p>
                <p className="mt-1 text-xs leading-5 text-ion-2">{m.mechanics.slice(0, 100)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded border px-2 py-0.5 text-[10px] ${RELEVANCE_TONE[m.gseRelevance]}`}>
                  {m.gseRelevance}
                </span>
                <span className={`text-xs font-semibold ${RISK_TONE[m.regulatoryRisk]}`}>
                  {m.regulatoryRisk} risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ion-3">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold text-ion-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ion-3">{detail}</p>
    </div>
  );
}
