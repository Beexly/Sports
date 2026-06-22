/**
 * Cockpit — Revenue OS browser. Renders the funnel + the revenue-readiness gate
 * over trust-safe vs dark-pattern copy. Pure/static, admin-gated.
 */

import { FUNNEL_STAGES, scoreRevenueReadiness } from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Table } from "../_gse/shell";

export const metadata = { title: "Revenue OS · Cockpit" };

const CLEAN = scoreRevenueReadiness({
  surface: "pricing", valueClarity: 0.9, disclosuresComplete: true,
  copy: "Pro adds the full factor trail and line-movement context. Cancel any time.",
  priceFromSourceOfTruth: true, refundClarity: true,
  usesCountdownUrgency: false, usesUnverifiedSocialProof: false,
});
const DARK = scoreRevenueReadiness({
  surface: "pricing", valueClarity: 0.9, disclosuresComplete: true,
  copy: "Pro adds the full factor trail and line-movement context. Cancel any time.",
  priceFromSourceOfTruth: true, refundClarity: true,
  usesCountdownUrgency: true, usesUnverifiedSocialProof: true,
});

export default function RevenueOsPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Revenue OS"
      title="Think for the business without betraying trust"
      intro="Free proves trust; paid unlocks deeper decision intelligence. The readiness score hard-caps any surface whose copy trips the claim-safety gate, and carves deep penalties for fake urgency and unverified social proof — you cannot buy conversion with trust. Prices come from one source of truth: pricing-phases.ts."
    >
      <Section title="Trust-gated funnel" blurb="Each stage advances only when its trust signal is true.">
        <Table
          columns={["Stage", "User intent", "Trust signal to advance"]}
          rows={FUNNEL_STAGES.map((s) => [
            <span key="l" className="font-medium text-ion-1">{s.label}</span>,
            <span key="i">{s.userIntent}</span>,
            <span key="t" className="text-ion-3">{s.trustSignal}</span>,
          ])}
        />
      </Section>

      <Section title="Revenue readiness" blurb="Same value-clear copy; the only difference is the dark patterns.">
        <div className="flex flex-wrap items-center gap-6 text-xs text-ion-2">
          <span className="flex items-center gap-2">Trust-safe surface: <ScoreBadge score={CLEAN} /></span>
          <span className="flex items-center gap-2">
            + countdown urgency + unverified social proof: <ScoreBadge score={DARK} />
            <span className="text-rose-300">{DARK.flags.join("; ")}</span>
          </span>
        </div>
      </Section>
    </SystemShell>
  );
}
