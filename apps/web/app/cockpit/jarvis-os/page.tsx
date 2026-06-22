/**
 * Cockpit — Jarvis OS browser. Lists the decision-copilot mode contracts with
 * readiness scores. Pure/static, admin-gated.
 */

import { JARVIS_MODES, scoreJarvisReadiness } from "@/lib/gse";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Jarvis OS · Cockpit" };

export default function JarvisOsPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Jarvis OS"
      title="A decision copilot, not a chatbot"
      intro="Each Jarvis mode is a contract: a forbidden-claims list, a source protocol, a confidence protocol, a fallback, and an audit requirement. The cardinal rule — Jarvis must never sound more certain than the evidence supports — is enforced by the readiness score: a mode with no forbidden-claims list or no source protocol cannot reach the high band."
    >
      <Section title="Modes & readiness" blurb="Readiness (higher is better) measures whether a mode is safe to expose.">
        <Table
          columns={["Mode", "Readiness", "Length", "Confidence protocol", "Forbidden claims"]}
          rows={JARVIS_MODES.map((m) => [
            <span key="l" className="font-medium text-ion-1">{m.label}</span>,
            <ScoreBadge key="r" score={scoreJarvisReadiness(m)} />,
            <Pill key="len" tone="info">{m.responseLength.replace(/_/g, " ")}</Pill>,
            <span key="c" className="text-ion-3">{m.confidenceProtocol}</span>,
            <span key="f" className="text-ion-3">{m.forbiddenClaims.length}</span>,
          ])}
        />
      </Section>

      <Section title="Answer contract" blurb="Every Jarvis answer layers three depths.">
        <ol className="flex flex-col gap-2 text-sm text-ion-2">
          <li className="rounded-md border border-titanium/30 bg-obsidian/40 px-3 py-2"><strong className="text-ion-white">5-second:</strong> the direct recommendation or status.</li>
          <li className="rounded-md border border-titanium/30 bg-obsidian/40 px-3 py-2"><strong className="text-ion-white">30-second:</strong> why · key evidence · key counter-evidence · risk.</li>
          <li className="rounded-md border border-titanium/30 bg-obsidian/40 px-3 py-2"><strong className="text-ion-white">Deep dive:</strong> sources · model trace · alternatives · falsifiers · history · next action.</li>
        </ol>
      </Section>
    </SystemShell>
  );
}
