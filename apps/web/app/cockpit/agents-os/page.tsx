/**
 * Cockpit — Agents OS browser. Lists the constrained agent council with trust
 * scores (cold-start, no observed runs). Pure/static, admin-gated.
 */

import { AGENT_ROLES, scoreAgentTrust } from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Agents OS · Cockpit" };

export default function AgentsOsPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Agents OS"
      title="A council of constrained agents, not one prompt"
      intro="Each agent declares allowed and forbidden inputs, allowed tools, an output schema, escalation triggers, failure modes, and owner-gated actions. Trust is earned, not declared: contract completeness earns up to ~70; the rest is earned from a calibrated track record. With no observed runs, no agent reaches the very-high band — and owner-gated actions always require the human approval gate."
    >
      <Section title="Agent council" blurb="Cold-start trust (no observed runs). Owner-gated actions stay owner-gated regardless of score.">
        <Table
          columns={["Agent", "Trust (cold)", "Owner-gated", "Boundary"]}
          rows={AGENT_ROLES.map((a) => [
            <span key="l" className="font-medium text-ion-1">{a.label}</span>,
            <ScoreBadge key="t" score={scoreAgentTrust({ role: a })} />,
            a.ownerGatedActions.length > 0
              ? <Pill key="g" tone="warn">{a.ownerGatedActions.length} gated</Pill>
              : <Pill key="g" tone="neutral">none</Pill>,
            a.publicBoundary === "may_inform_public"
              ? <Pill key="b" tone="info">may inform public</Pill>
              : <Pill key="b" tone="neutral">internal only</Pill>,
          ])}
        />
      </Section>

      <Section title="Orchestration objects" blurb="How verdicts compose and escalate.">
        <div className="flex flex-wrap gap-2 text-xs text-ion-2">
          {["AgentRun", "AgentVerdict", "AgentDisagreement", "AgentEscalation", "HumanApprovalGate", "MultiAgentDebateSummary"].map((o) => (
            <span key={o} className="rounded-md border border-titanium/40 bg-obsidian/50 px-2 py-1 font-mono">{o}</span>
          ))}
        </div>
      </Section>
    </SystemShell>
  );
}
