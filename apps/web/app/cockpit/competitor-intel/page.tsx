/**
 * Cockpit — Competitor Intelligence. Renders the competitor set + the ranked
 * feature-gap board. Pure/static, admin-gated.
 */

import { COMPETITORS, prioritizeGaps, getCompetitor } from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Competitor Intel · Cockpit" };

const SEGMENTS = [
  ["betting_analytics", "Betting analytics"],
  ["dfs_optimizer", "DFS / projections"],
  ["pick_model_site", "Pick / model sites"],
  ["fantasy_platform", "Fantasy platforms"],
  ["data_provider", "Data providers"],
  ["ai_assistant", "AI assistants"],
] as const;

const GAPS = prioritizeGaps();

export default function CompetitorIntelPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Competitor Intel"
      title="What the field has — and the white space it leaves open"
      intro="Across 30+ competitors (DFS, betting analytics, fantasy, pick/model sites, data providers, AI assistants), almost none ship an auditable, calibrated per-pick track record. That is the white space the Trust Ledger + calibration already build toward."
    >
      <Section title="Ranked feature-gap board" blurb="Build opportunity = value × copyability × status-gap, trust-gated. Things we already have score low here on purpose — the move is to make them the headline, not to rebuild.">
        <Table
          columns={["Feature", "Opportunity", "Status", "Seen in", "Build sketch"]}
          rows={GAPS.map(({ gap, opportunity }) => [
            <span key="f" className="font-medium text-ion-1">{gap.feature}</span>,
            <ScoreBadge key="o" score={opportunity} />,
            <Pill key="s" tone={gap.gseStatus === "gap" ? "warn" : gap.gseStatus === "partial" ? "info" : "good"}>{gap.gseStatus}</Pill>,
            <span key="c" className="text-ion-3">{gap.competitorsWithIt.map((id) => getCompetitor(id)?.name ?? id).slice(0, 3).join(", ")}</span>,
            <span key="b" className="text-ion-3">{gap.buildSketch}</span>,
          ])}
        />
      </Section>

      <Section title={`Competitor set (${COMPETITORS.length})`} blurb="Monetization model + standout mechanic + the weakness a trust-first product can attack.">
        {SEGMENTS.map(([seg, label]) => {
          const items = COMPETITORS.filter((c) => c.segment === seg);
          return (
            <div key={seg} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-ion-1">{label} <span className="text-ion-3">({items.length})</span></h3>
              <Table
                columns={["Name", "Threat", "Standout mechanic", "Weakness"]}
                rows={items.map((c) => [
                  <span key="n" className="font-medium text-ion-1">{c.name}</span>,
                  <Pill key="t" tone={c.threat === "high" ? "bad" : c.threat === "medium" ? "warn" : "neutral"}>{c.threat}</Pill>,
                  <span key="s">{c.standoutFeature}</span>,
                  <span key="w" className="text-ion-3">{c.weakness}</span>,
                ])}
              />
            </div>
          );
        })}
      </Section>
    </SystemShell>
  );
}
