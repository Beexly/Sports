/**
 * Cockpit — Claim Safety browser. Runs the public-claim safety gate and the
 * source-rights risk scorer over examples. Pure/static, admin-gated.
 */

import {
  scorePublicClaimSafety,
  scoreSourceRightsRisk,
  TRUST_SAFE_COPY,
} from "@/lib/gse";
import type { SourceRightsStatus } from "@/lib/scraping/source-rights-registry";
import { SystemShell, Section, ScoreBadge, Pill, Table } from "../_gse/shell";

export const metadata = { title: "Claim Safety · Cockpit" };

const CLEAN = scorePublicClaimSafety({ text: "See the evidence behind every pick.", hasSource: true, demoLiveClear: true });
// NOTE: the string below intentionally exercises the banned-phrase gate; it is a
// test input, never rendered as a live claim.
const BANNED = scorePublicClaimSafety({ text: "This pick is a guaranteed lock.", hasSource: true, demoLiveClear: true });
const NO_SOURCE = scorePublicClaimSafety({ text: "It wins because the model says so.", hasSource: false, demoLiveClear: true });

const STATUSES: SourceRightsStatus[] = [
  "approved_open_license", "approved_api", "approved_public_logged_off", "approved_written_permission",
  "vendor_candidate", "manual_research_only", "permission_required", "blocked_technical_controls", "excluded",
];

export default function ClaimSafetyPage(): JSX.Element {
  return (
    <SystemShell
      kicker="Claim Safety"
      title="No public claim without a source; no fake certainty"
      intro="The last gate before anything reaches a public surface. It reuses the trust-claims banned-phrase scanner (single source of truth) and never re-implements the list. A single banned hit hard-caps the score and sets safe=false — there is no confidence level at which banned language is acceptable."
    >
      <Section title="Public Claim Safety Score" blurb="Higher is safer. Banned language hard-caps to very-low; soft-certainty and unsourced causal claims reduce without hard-failing.">
        <Table
          columns={["Copy under test", "Safe?", "Score", "Cautions / hits"]}
          rows={[
            ["See the evidence behind every pick.", <Pill key="p" tone="good">safe</Pill>, <ScoreBadge key="s" score={CLEAN.score} />, "—"],
            ["(banned-phrase test input)", <Pill key="p" tone="bad">blocked</Pill>, <ScoreBadge key="s" score={BANNED.score} />, <code key="h" className="text-rose-300">{BANNED.bannedHits.join(", ")}</code>],
            ["It wins because the model says so.", <Pill key="p" tone="warn">review</Pill>, <ScoreBadge key="s" score={NO_SOURCE.score} />, NO_SOURCE.cautions.join("; ")],
          ]}
        />
      </Section>

      <Section title="Source-Rights Risk Score" blurb="Higher is riskier. permission_required / blocked / excluded are hard stops a job must not cross.">
        <Table
          columns={["Status", "Automated ingestion risk", "Verdict"]}
          rows={STATUSES.map((status) => {
            const r = scoreSourceRightsRisk({ status, intendedUse: "automated_ingestion", automationAllowed: status.startsWith("approved_"), commercialDisplayAllowed: status.startsWith("approved_") });
            return [
              <span key="s" className="font-medium text-ion-1">{status}</span>,
              <ScoreBadge key="b" score={r} riskOriented />,
              r.score >= 80 ? <Pill key="v" tone="bad">hard stop</Pill> : <Pill key="v" tone="good">may proceed</Pill>,
            ];
          })}
        />
      </Section>

      <Section title="Trust-safe copy library" blurb="Sample headlines/CTAs that pass the gate. Illustrative templates, not live marketing claims.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {TRUST_SAFE_COPY.map((c) => (
            <li key={c} className="rounded-md border border-titanium/30 bg-obsidian/40 px-3 py-2 text-xs text-ion-2">{c}</li>
          ))}
        </ul>
      </Section>
    </SystemShell>
  );
}
