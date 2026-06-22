/**
 * Cockpit — Decision Graph browser. Renders the ontology grouped by domain plus
 * the relationship edges. Pure/static, admin-gated.
 */

import {
  ONTOLOGY_ENTITIES,
  ONTOLOGY_RELATIONSHIPS,
  groupDecisionEntitiesByDomain,
} from "@/lib/gse";
import { SystemShell, Section, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Decision Graph · Cockpit" };

const GROUPS = groupDecisionEntitiesByDomain();
const DOMAIN_ORDER = ["core", "market", "decision", "fantasy", "content", "trust", "revenue", "agents"] as const;

export default function DecisionGraphPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Decision Graph"
      title="One connected graph, not isolated tools"
      intro="A player on Today's Board, in a DFS lineup, in a draft, in a trade, and in an autopsy is the same entity, with the same source / confidence / freshness obligations everywhere. This is the typed contract layer; the Prisma schema remains the runtime source of truth."
    >
      <Section title={`Entities by domain (${ONTOLOGY_ENTITIES.length} total)`} blurb="Each entity declares its decision-relevant requirements.">
        <div className="grid gap-3 sm:grid-cols-2">
          {DOMAIN_ORDER.map((domain) => (
            <div key={domain} className="rounded-lg border border-titanium/40 bg-obsidian/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wide text-ion-white">{domain}</span>
                <Pill tone="info">{GROUPS[domain].length}</Pill>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GROUPS[domain].map((e) => (
                  <span key={e.kind} className="rounded border border-titanium/30 bg-carbon/40 px-1.5 py-0.5 text-[10px] text-ion-2" title={e.summary}>
                    {e.kind}
                    {e.sourceRequired && <span className="ml-1 text-orbital-cyan" title="source required">·s</span>}
                    {e.freshnessRequired && <span className="ml-0.5 text-amber-300" title="freshness required">·f</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ion-3">·s = source required · ·f = freshness required</p>
      </Section>

      <Section title="Relationships" blurb="The edges that connect decisions to evidence to outcomes.">
        <Table
          columns={["From", "Verb", "To", "Note"]}
          rows={ONTOLOGY_RELATIONSHIPS.map((r) => [
            <span key="f" className="font-medium text-ion-1">{r.from}</span>,
            <span key="v" className="font-mono text-orbital-cyan">{r.verb}</span>,
            <span key="t" className="font-medium text-ion-1">{r.to}</span>,
            <span key="n" className="text-ion-3">{r.note ?? "—"}</span>,
          ])}
        />
      </Section>
    </SystemShell>
  );
}
