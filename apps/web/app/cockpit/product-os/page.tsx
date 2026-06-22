/**
 * Cockpit — Product OS browser. Scores illustrative product ideas + launch
 * readiness + moat. Pure/static, admin-gated.
 */

import {
  summarizeProductOSPriorities,
  scoreLaunchReadiness,
  scoreMoat,
  type ProductIdea,
} from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Product OS · Cockpit" };

// Illustrative ideas drawn from existing surfaces — numbers are modeled, not real metrics.
const IDEAS: ProductIdea[] = [
  { id: "bias_mirror", name: "Bias Mirror v2", userPain: 0.85, uniqueness: 0.9, trustImpact: 0.8, revenueImpact: 0.4, retentionImpact: 0.8, dataAvailability: 0.7, rightsSafe: true, buildComplexity: 0.4, maintenanceBurden: 0.3, ecosystemFit: 0.9, firstOfKind: 0.85 },
  { id: "dfs_v2", name: "DFS Optimizer v2", userPain: 0.8, uniqueness: 0.5, trustImpact: 0.3, revenueImpact: 0.7, retentionImpact: 0.7, dataAvailability: 0.8, rightsSafe: true, buildComplexity: 0.7, maintenanceBurden: 0.6, ecosystemFit: 0.8, firstOfKind: 0.4 },
  { id: "scraped_props", name: "Scraped props from a gated source", userPain: 0.7, uniqueness: 0.6, trustImpact: 0.2, revenueImpact: 0.6, retentionImpact: 0.5, dataAvailability: 0.6, rightsSafe: false, buildComplexity: 0.5, maintenanceBurden: 0.5, ecosystemFit: 0.5, firstOfKind: 0.3 },
  { id: "fake_urgency_paywall", name: "Countdown paywall", userPain: 0.2, uniqueness: 0.1, trustImpact: -0.6, revenueImpact: 0.8, retentionImpact: 0.1, dataAvailability: 0.9, rightsSafe: true, buildComplexity: 0.2, maintenanceBurden: 0.2, ecosystemFit: 0.3, firstOfKind: 0.1 },
];

const PRIORITIES = summarizeProductOSPriorities(IDEAS, {
  scraped_props: { rightsUnclear: true },
});

const LAUNCH = scoreLaunchReadiness({
  data: true, trust: true, ux: true, mobile: false, performance: true,
  accessibility: true, legal_source: true, revenue: false, support: true, rollback: true,
});
const LAUNCH_BLOCKED = scoreLaunchReadiness({
  data: false, trust: true, ux: true, mobile: true, performance: true,
  accessibility: true, legal_source: true, revenue: true, support: true, rollback: true,
});
const MOAT = scoreMoat({ uniqueness: 0.85, dataAdvantage: 0.7, trustAdvantage: 0.85, compoundingMemory: 0.8, switchingCost: 0.6, replicability: 0.3 });

export default function ProductOsPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Product OS"
      title="Help one owner think, prioritize, and ship"
      intro="Opportunity scoring with two hard gates the revenue can never override: an idea that is not source-rights-safe, or that erodes trust, is capped into the low band no matter how lucrative. Launch readiness hard-caps when a blocking gate (data, trust, legal/source) is unmet."
    >
      <Section title="Opportunity ranking (illustrative)" blurb="Modeled inputs, not real metrics. Note the two gated ideas at the bottom.">
        <Table
          columns={["Idea", "Opportunity", "Bucket", "Gate flags"]}
          rows={[...PRIORITIES.shipNow, ...PRIORITIES.upNext, ...PRIORITIES.blocked].map((s) => [
            <span key="n" className="font-medium text-ion-1">{s.idea.name}</span>,
            <ScoreBadge key="o" score={s.opportunity} />,
            <Pill key="b" tone={s.bucket === "now" ? "good" : s.bucket.startsWith("blocked_") ? "bad" : "info"}>{s.bucket.replace(/_/g, " ")}</Pill>,
            <span key="f" className="text-rose-300">{s.opportunity.flags.join("; ") || "—"}</span>,
          ])}
        />
      </Section>

      <Section title="Launch readiness" blurb="Ten gates; blocking gates (data, trust, legal/source) can hard-cap a go.">
        <div className="flex flex-wrap items-center gap-4 text-xs text-ion-2">
          <span className="flex items-center gap-2">mobile + revenue unmet (non-blocking): <ScoreBadge score={LAUNCH} /></span>
          <span className="flex items-center gap-2">data gate unmet (blocking): <ScoreBadge score={LAUNCH_BLOCKED} /> <span className="text-rose-300">{LAUNCH_BLOCKED.flags.find((f) => f.includes("BLOCKING"))}</span></span>
        </div>
      </Section>

      <Section title="First-of-kind moat" blurb="Replicability is inverted — a thing anyone can copy tomorrow is a head start, not a moat.">
        <div className="flex items-center gap-2 text-xs text-ion-2">
          <span>Decision-intelligence + compounding memory:</span> <ScoreBadge score={MOAT} />
        </div>
      </Section>
    </SystemShell>
  );
}
