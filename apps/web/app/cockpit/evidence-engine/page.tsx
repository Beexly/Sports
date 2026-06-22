/**
 * Cockpit — Evidence Engine browser. Renders a worked courtroom case + the 10
 * reusable courtroom templates. Pure/static, admin-gated.
 */

import {
  scoreEvidenceStrength,
  scoreCounterEvidenceSeverity,
  scoreFalsifierRisk,
  scoreRecommendationConfidence,
  scoreDecisionFragility,
  buildVerdict,
  COURTROOM_TEMPLATES,
  type Evidence,
  type CounterEvidence,
  type Falsifier,
} from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Evidence Engine · Cockpit" };

const evidence: Evidence[] = [
  { evidenceId: "e1", supportsClaim: "c1", kind: "structured_data", strength: "strong", reliability: 90, freshness: 1, independent: true, sourceId: "odds", summary: "Two estimators land short of the line and agree on direction." },
  { evidenceId: "e2", supportsClaim: "c1", kind: "market_signal", strength: "moderate", reliability: 80, freshness: 0.9, independent: true, sourceId: "books", summary: "Number drifted toward the thesis without a public surge." },
];
const counter: CounterEvidence[] = [
  { counterId: "x1", challengesClaim: "c1", severity: "strong", kind: "reported_fact", reliability: 85, freshness: 1, sourceId: "beat", summary: "A questionable status sits upstream of the edge." },
];
const falsifiers: Falsifier[] = [
  { falsifierId: "f1", forClaim: "c1", condition: "Status downgraded to OUT before lock", likelihood: 0.4, monitored: true, monitoringSource: "injury-agent", timeToActionMins: 90, actionIfTriggered: "collapse to NO-PLAY" },
];

const ev = scoreEvidenceStrength(evidence);
const cs = scoreCounterEvidenceSeverity(counter);
const fr = scoreFalsifierRisk(falsifiers);
const conf = scoreRecommendationConfidence({ evidenceStrength: ev, counterSeverity: cs, falsifierRisk: fr, dataQuality: 82, modelAgreement: 0.85 });
const frag = scoreDecisionFragility({ falsifierRisk: fr, counterSeverity: cs, inputFreshness: 0.95, evidenceIndependence: 1, timeToActionMins: 90 });
const verdict = buildVerdict("play", conf, frag, {
  whatWouldChange: "Confirm the status and the edge upgrades; downgrade it and the case collapses to NO-PLAY.",
  nextMonitoringStep: "Watch the final injury report before lock.",
  alternative: "Watchlist until the status resolves.",
});

export default function EvidenceEnginePage(): JSX.Element {
  return (
    <SystemShell
      kicker="Evidence Engine"
      title="Think in evidence, not vibes"
      intro="Every major recommendation is a case: a claim, the evidence for it, the counter-evidence against it, the falsifiers that would invalidate it, and a verdict — including the honest NO-PLAY. This generalizes the Signal Courtroom (lib/courtroom) to every decision type."
    >
      <Section title="Worked case (illustrative)" blurb="A claim scored end to end. Counter-evidence and falsifier risk temper confidence multiplicatively, so a call can never look confident while its case is under attack.">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-titanium/40 bg-obsidian/50 p-4">
          <span className="text-sm font-semibold text-ion-white">Verdict:</span>
          <Pill tone={verdict.action === "play" ? "good" : verdict.action === "no_play" ? "bad" : "warn"}>
            {verdict.action.replace(/_/g, " ").toUpperCase()}
          </Pill>
          <span className="text-xs text-ion-3">·</span>
          <span className="flex items-center gap-1.5 text-xs text-ion-2">confidence <ScoreBadge score={conf} /></span>
          <span className="flex items-center gap-1.5 text-xs text-ion-2">fragility <ScoreBadge score={frag} riskOriented /></span>
        </div>
        <Table
          columns={["Layer", "Score", "Detail"]}
          rows={[
            ["Evidence strength", <ScoreBadge key="s" score={ev} />, ev.rationale.join(" · ")],
            ["Counter-evidence severity", <ScoreBadge key="s" score={cs} riskOriented />, counter[0]!.summary],
            ["Falsifier risk", <ScoreBadge key="s" score={fr} riskOriented />, falsifiers[0]!.condition],
          ]}
        />
        <p className="text-xs text-ion-3">What would change it: {verdict.whatWouldChange}</p>
      </Section>

      <Section title="Courtroom templates" blurb="One reusable template per decision type — each names the no-play path.">
        <Table
          columns={["Decision", "Claim shape", "No-play path"]}
          rows={COURTROOM_TEMPLATES.map((t) => [
            <span key="l" className="font-medium text-ion-1">{t.label}</span>,
            <span key="c">{t.claimShape}</span>,
            <span key="n" className="text-ion-3">{t.noPlayPath}</span>,
          ])}
        />
      </Section>
    </SystemShell>
  );
}
