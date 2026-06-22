/**
 * Cockpit — Autonomy & Self-Learning. Renders the autonomy ladder, the capability
 * map, and worked drift + model-promotion gates. Pure/static, admin-gated.
 */

import {
  AUTONOMY_LADDER,
  CAPABILITY_AUTONOMY,
  populationStabilityIndex,
  scoreDriftRisk,
  scoreModelPromotionReadiness,
  SELF_LEARNING_LOOP,
} from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Autonomy & Self-Learning · Cockpit" };

const STABLE_PSI = populationStabilityIndex([25, 25, 25, 25], [24, 26, 25, 25]);
const DRIFTED_PSI = populationStabilityIndex([40, 30, 20, 10], [10, 20, 30, 40]);

const PROMOTE_OK = scoreModelPromotionReadiness({ settledSampleSize: 200, minSample: 100, challengerBrier: 0.15, championBrier: 0.2, shadowDays: 14, requiredShadowDays: 7, inputDriftPsi: 0.05 });
const PROMOTE_REGRESSION = scoreModelPromotionReadiness({ settledSampleSize: 200, minSample: 100, challengerBrier: 0.25, championBrier: 0.2, shadowDays: 14, requiredShadowDays: 7, inputDriftPsi: 0.05 });

export default function AutonomyPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Autonomy & Self-Learning"
      title="More self-working, without removing the human from what matters"
      intro="Self-learning: capture outcome → settle → recalibrate → detect drift → propose candidate → shadow-eval → promotion gate → deploy → monitor → rollback. Autonomy is a ladder (L0–L5); every capability is pinned to the highest level its guardrails permit. External actions (publish, price, bet) stay owner-gated — there is no path to L5 here by design."
    >
      <Section title="The self-learning loop">
        <p className="rounded-lg border border-titanium/40 bg-obsidian/50 p-3 font-mono text-[11px] text-ion-2">
          {SELF_LEARNING_LOOP.join("  →  ")}
        </p>
      </Section>

      <Section title="Autonomy ladder">
        <Table
          columns={["Level", "Name", "Description", "Human role"]}
          rows={AUTONOMY_LADDER.map((r) => [
            <Pill key="l" tone={r.level === "L5" ? "bad" : r.level === "L4" ? "warn" : "neutral"}>{r.level}</Pill>,
            <span key="n" className="font-medium text-ion-1">{r.name}</span>,
            <span key="d" className="text-ion-3">{r.description}</span>,
            <span key="h" className="text-ion-3">{r.humanRole}</span>,
          ])}
        />
      </Section>

      <Section title="Capability autonomy map" blurb="Current vs target, with the guardrail that unlocks the target.">
        <Table
          columns={["Capability", "Now", "Target", "External?", "Guardrail"]}
          rows={CAPABILITY_AUTONOMY.map((c) => [
            <span key="c" className="font-medium text-ion-1">{c.capability}</span>,
            <Pill key="n" tone="neutral">{c.current}</Pill>,
            <Pill key="t" tone="info">{c.target}</Pill>,
            c.externalAction ? <Pill key="e" tone="warn">owner-gated</Pill> : <Pill key="e" tone="good">internal</Pill>,
            <span key="g" className="text-ion-3">{c.guardrail}</span>,
          ])}
        />
      </Section>

      <Section title="Worked gates (illustrative)" blurb="Drift risk (PSI) and the champion/challenger promotion gate.">
        <div className="flex flex-col gap-2 text-xs text-ion-2">
          <div className="flex items-center gap-2">Stable distribution (PSI {STABLE_PSI.toFixed(3)}): <ScoreBadge score={scoreDriftRisk(STABLE_PSI)} riskOriented /></div>
          <div className="flex items-center gap-2">Reversed distribution (PSI {DRIFTED_PSI.toFixed(2)}): <ScoreBadge score={scoreDriftRisk(DRIFTED_PSI)} riskOriented /> <span className="text-rose-300">{scoreDriftRisk(DRIFTED_PSI).flags.join("")}</span></div>
          <div className="flex items-center gap-2">Challenger better, gates met: <ScoreBadge score={PROMOTE_OK} /> <Pill tone={PROMOTE_OK.score >= 60 ? "good" : "bad"}>{PROMOTE_OK.score >= 60 ? "promote" : "hold"}</Pill></div>
          <div className="flex items-center gap-2">Challenger regresses calibration: <ScoreBadge score={PROMOTE_REGRESSION} /> <span className="text-rose-300">{PROMOTE_REGRESSION.flags.find((f) => f.includes("regression"))}</span></div>
        </div>
      </Section>
    </SystemShell>
  );
}
