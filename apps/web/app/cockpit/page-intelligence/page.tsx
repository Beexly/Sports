/**
 * Cockpit — Page Intelligence browser. Scores every "thinking website" page
 * contract. Pure/static, admin-gated.
 */

import { PAGE_CONTRACTS, scorePageIntelligence } from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Page Intelligence · Cockpit" };

const SCORED = PAGE_CONTRACTS.map((p) => ({ p, s: scorePageIntelligence(p) })).sort((a, b) => b.s.score - a.s.score);

export default function PageIntelligencePage(): JSX.Element {
  return (
    <SystemShell
      kicker="Page Intelligence"
      title="Every page is an active cognitive system"
      intro="A surface earns its score by turning data into a supported decision. The counter-evidence layer carries the most weight because showing the other side is the discipline most products skip — a page that only ever confirms the user cannot score in the high band."
    >
      <Section title="Page contracts" blurb="Sorted by Page Intelligence score (higher is better). ✓ = layer present.">
        <Table
          columns={["Page", "Score", "Decision supported", "Evidence", "Counter", "Fresh", "Source", "No-play"]}
          rows={SCORED.map(({ p, s }) => [
            <span key="pg" className="font-medium text-ion-1">{p.page}</span>,
            <ScoreBadge key="s" score={s} />,
            <span key="d" className="text-ion-3">{p.decisionSupported}</span>,
            <Tick key="e" on={p.hasEvidenceLayer} />,
            <Tick key="c" on={p.hasCounterEvidenceLayer} />,
            <Tick key="f" on={p.showsFreshness} />,
            <Tick key="so" on={p.showsSource} />,
            <Tick key="np" on={p.hasNoPlayPath} />,
          ])}
        />
      </Section>
    </SystemShell>
  );
}

function Tick({ on }: { on: boolean }): JSX.Element {
  return on ? <Pill tone="good">✓</Pill> : <Pill tone="bad">—</Pill>;
}
